import { NextApiRequest, NextApiResponse } from 'next';
import { createHash } from 'crypto';

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: NextApiRequest) => string;
  skip?: (req: NextApiRequest) => boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  onLimitReached?: (req: NextApiRequest, res: NextApiResponse) => void;
  store?: RateLimitStore;
  message?: string | Record<string, any>;
  statusCode?: number;
  headers?: boolean;
}

export interface RateLimitStore {
  get(key: string): Promise<RateLimitInfo | undefined>;
  set(key: string, info: RateLimitInfo): Promise<void>;
  increment(key: string): Promise<RateLimitInfo>;
  reset(key: string): Promise<void>;
  cleanup(): Promise<void>;
}

export interface RateLimitInfo {
  count: number;
  resetTime: number;
  firstRequest: number;
}

export interface RateLimitMiddleware {
  (req: NextApiRequest, res: NextApiResponse, next: () => void): Promise<void> | void;
}

/**
 * Redis-backed rate limiting store
 */
export class RedisRateLimitStore implements RateLimitStore {
  private redis: any;
  private keyPrefix: string;

  constructor(redisClient: any, keyPrefix: string = 'rate_limit:') {
    this.redis = redisClient;
    this.keyPrefix = keyPrefix;
  }

  async get(key: string): Promise<RateLimitInfo | undefined> {
    try {
      const data = await this.redis.get(`${this.keyPrefix}${key}`);
      if (!data) return undefined;
      
      const parsed = JSON.parse(data);
      return {
        count: parsed.count,
        resetTime: parsed.resetTime,
        firstRequest: parsed.firstRequest,
      };
    } catch (error) {
      console.error('Redis rate limit get error:', error);
      return undefined;
    }
  }

  async set(key: string, info: RateLimitInfo): Promise<void> {
    try {
      const ttl = Math.ceil((info.resetTime - Date.now()) / 1000);
      if (ttl > 0) {
        await this.redis.setex(
          `${this.keyPrefix}${key}`,
          ttl,
          JSON.stringify(info)
        );
      }
    } catch (error) {
      console.error('Redis rate limit set error:', error);
    }
  }

  async increment(key: string): Promise<RateLimitInfo> {
    try {
      const fullKey = `${this.keyPrefix}${key}`;
      const multi = this.redis.multi();
      
      // Try to increment existing key
      multi.incr(fullKey);
      multi.ttl(fullKey);
      multi.get(fullKey);
      
      const results = await multi.exec();
      const count = results[0][1];
      const ttl = results[1][1];
      
      const now = Date.now();
      
      if (ttl === -1) {
        // Key exists but has no expiration, this shouldn't happen
        // Set a default window
        const windowMs = 15 * 60 * 1000; // 15 minutes
        const resetTime = now + windowMs;
        await this.redis.expire(fullKey, Math.ceil(windowMs / 1000));
        
        return {
          count,
          resetTime,
          firstRequest: now,
        };
      } else if (ttl > 0) {
        // Key exists with TTL
        const resetTime = now + (ttl * 1000);
        const firstRequest = resetTime - (15 * 60 * 1000); // Approximate
        
        return {
          count,
          resetTime,
          firstRequest,
        };
      } else {
        // New key
        const windowMs = 15 * 60 * 1000; // Default 15 minutes
        const resetTime = now + windowMs;
        await this.redis.expire(fullKey, Math.ceil(windowMs / 1000));
        
        return {
          count: 1,
          resetTime,
          firstRequest: now,
        };
      }
    } catch (error) {
      console.error('Redis rate limit increment error:', error);
      
      // Fallback to basic increment
      const now = Date.now();
      return {
        count: 1,
        resetTime: now + (15 * 60 * 1000),
        firstRequest: now,
      };
    }
  }

  async reset(key: string): Promise<void> {
    try {
      await this.redis.del(`${this.keyPrefix}${key}`);
    } catch (error) {
      console.error('Redis rate limit reset error:', error);
    }
  }

  async cleanup(): Promise<void> {
    try {
      const keys = await this.redis.keys(`${this.keyPrefix}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Redis rate limit cleanup error:', error);
    }
  }
}

/**
 * In-memory rate limiting store (fallback)
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private store: Map<string, RateLimitInfo> = new Map();
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60 * 1000);
  }

  async get(key: string): Promise<RateLimitInfo | undefined> {
    const info = this.store.get(key);
    if (info && Date.now() > info.resetTime) {
      this.store.delete(key);
      return undefined;
    }
    return info;
  }

  async set(key: string, info: RateLimitInfo): Promise<void> {
    this.store.set(key, info);
  }

  async increment(key: string): Promise<RateLimitInfo> {
    const now = Date.now();
    const existing = await this.get(key);
    
    if (existing) {
      existing.count++;
      this.store.set(key, existing);
      return existing;
    } else {
      const windowMs = 15 * 60 * 1000; // Default 15 minutes
      const info: RateLimitInfo = {
        count: 1,
        resetTime: now + windowMs,
        firstRequest: now,
      };
      this.store.set(key, info);
      return info;
    }
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  async cleanup(): Promise<void> {
    this.store.clear();
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, info] of this.store.entries()) {
      if (now > info.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

/**
 * Create rate limiting middleware
 */
export function createRateLimitMiddleware(options: RateLimitOptions): RateLimitMiddleware {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = 1000,
    keyGenerator = defaultKeyGenerator,
    skip = () => false,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    onLimitReached,
    store = new MemoryRateLimitStore(),
    message = 'Too many requests',
    statusCode = 429,
    headers = true,
  } = options;

  return async (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    try {
      // Skip rate limiting if specified
      if (skip(req)) {
        return next();
      }

      const key = keyGenerator(req);
      let info = await store.get(key);
      
      if (!info) {
        // First request
        info = {
          count: 1,
          resetTime: Date.now() + windowMs,
          firstRequest: Date.now(),
        };
        await store.set(key, info);
      } else if (Date.now() > info.resetTime) {
        // Window expired, reset
        info = {
          count: 1,
          resetTime: Date.now() + windowMs,
          firstRequest: Date.now(),
        };
        await store.set(key, info);
      } else {
        // Increment counter
        info = await store.increment(key);
      }

      // Set rate limit headers
      if (headers) {
        setRateLimitHeaders(res, info, maxRequests);
      }

      // Check if limit exceeded
      if (info.count > maxRequests) {
        if (onLimitReached) {
          onLimitReached(req, res);
        }

        const resetIn = Math.ceil((info.resetTime - Date.now()) / 1000);
        res.setHeader('Retry-After', resetIn);

        return res.status(statusCode).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: typeof message === 'string' ? message : message.message || 'Too many requests',
            retryAfter: resetIn,
            limit: maxRequests,
            remaining: 0,
            reset: info.resetTime,
            timestamp: new Date().toISOString(),
            ...(typeof message === 'object' ? message : {}),
          },
        });
      }

      // Optionally skip counting based on response
      if (skipSuccessfulRequests || skipFailedRequests) {
        const originalSend = res.send;
        res.send = function(body: any) {
          const shouldSkip = 
            (skipSuccessfulRequests && res.statusCode < 400) ||
            (skipFailedRequests && res.statusCode >= 400);
          
          if (shouldSkip && info) {
            info.count = Math.max(0, info.count - 1);
            store.set(key, info);
          }
          
          return originalSend.call(this, body);
        };
      }

      next();
    } catch (error) {
      console.error('Rate limit middleware error:', error);
      // Continue without rate limiting on error
      next();
    }
  };
}

/**
 * Default key generator
 */
function defaultKeyGenerator(req: NextApiRequest): string {
  const ip = getClientIP(req);
  const userAgent = req.headers['user-agent'] || '';
  const tenantId = req.headers['x-tenant-id'] || '';
  const userId = (req as any).user?.id || '';
  
  // Create a composite key for better granularity
  const keyParts = [ip, tenantId, userId].filter(Boolean);
  const baseKey = keyParts.join(':');
  
  // Hash long keys for consistent length
  if (baseKey.length > 50) {
    return createHash('sha256').update(baseKey).digest('hex').substring(0, 32);
  }
  
  return baseKey;
}

/**
 * Get client IP address
 */
function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? String(forwarded).split(',')[0] : req.connection?.remoteAddress;
  return ip || 'unknown';
}

/**
 * Set rate limit headers
 */
function setRateLimitHeaders(res: NextApiResponse, info: RateLimitInfo, maxRequests: number): void {
  res.setHeader('X-RateLimit-Limit', maxRequests);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - info.count));
  res.setHeader('X-RateLimit-Reset', Math.ceil(info.resetTime / 1000));
  res.setHeader('X-RateLimit-ResetTime', new Date(info.resetTime).toISOString());
}

/**
 * Pre-configured rate limit middleware
 */
export const rateLimitMiddleware = {
  // Very strict rate limiting for sensitive endpoints
  strict: createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
    message: 'Too many requests to sensitive endpoint',
  }),

  // Standard API rate limiting
  standard: createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000,
  }),

  // Generous rate limiting for public endpoints
  generous: createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5000,
  }),

  // Per-user rate limiting
  perUser: createRateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 1 request per second
    keyGenerator: (req: NextApiRequest) => {
      const userId = (req as any).user?.id || getClientIP(req);
      return `user:${userId}`;
    },
  }),

  // Per-tenant rate limiting
  perTenant: createRateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 1000,
    keyGenerator: (req: NextApiRequest) => {
      const tenantId = req.headers['x-tenant-id'] || (req as any).user?.tenantId || 'unknown';
      return `tenant:${tenantId}`;
    },
  }),

  // Login attempt rate limiting
  login: createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    keyGenerator: (req: NextApiRequest) => {
      const ip = getClientIP(req);
      const email = req.body?.email || 'unknown';
      return `login:${ip}:${email}`;
    },
    skipSuccessfulRequests: true, // Only count failed login attempts
    message: 'Too many login attempts',
  }),

  // Password reset rate limiting
  passwordReset: createRateLimitMiddleware({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 attempts per hour
    keyGenerator: (req: NextApiRequest) => {
      const email = req.body?.email || getClientIP(req);
      return `password_reset:${email}`;
    },
    message: 'Too many password reset attempts',
  }),
};

/**
 * Advanced rate limiting strategies
 */
export class AdaptiveRateLimiter {
  private baseOptions: RateLimitOptions;
  private adaptiveRules: Array<{
    condition: (req: NextApiRequest) => boolean;
    modifier: number; // Multiplier for max requests
  }> = [];

  constructor(baseOptions: RateLimitOptions) {
    this.baseOptions = baseOptions;
  }

  addRule(condition: (req: NextApiRequest) => boolean, modifier: number): this {
    this.adaptiveRules.push({ condition, modifier });
    return this;
  }

  create(): RateLimitMiddleware {
    return (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
      let maxRequests = this.baseOptions.maxRequests;
      
      // Apply adaptive rules
      for (const rule of this.adaptiveRules) {
        if (rule.condition(req)) {
          maxRequests = Math.floor(maxRequests * rule.modifier);
        }
      }

      const adaptedOptions = {
        ...this.baseOptions,
        maxRequests,
      };

      return createRateLimitMiddleware(adaptedOptions)(req, res, next);
    };
  }
}

/**
 * Create adaptive rate limiter
 */
export function createAdaptiveRateLimiter(baseOptions: RateLimitOptions): AdaptiveRateLimiter {
  return new AdaptiveRateLimiter(baseOptions);
}

/**
 * Circuit breaker pattern for rate limiting
 */
export class RateLimitCircuitBreaker {
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60000, // 1 minute
    private testRequestThreshold: number = 3
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'half-open';
        this.failureCount = 0;
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  getState(): string {
    return this.state;
  }
}

/**
 * Distributed rate limiting with consensus
 */
export class DistributedRateLimiter {
  private stores: RateLimitStore[];
  private consensusThreshold: number;

  constructor(stores: RateLimitStore[], consensusThreshold?: number) {
    this.stores = stores;
    this.consensusThreshold = consensusThreshold || Math.ceil(stores.length / 2);
  }

  async checkLimit(key: string, maxRequests: number): Promise<{
    allowed: boolean;
    info: RateLimitInfo;
  }> {
    const results = await Promise.allSettled(
      this.stores.map(store => store.get(key))
    );

    const validResults = results
      .filter((result): result is PromiseFulfilledResult<RateLimitInfo | undefined> => 
        result.status === 'fulfilled' && result.value !== undefined
      )
      .map(result => result.value!);

    if (validResults.length === 0) {
      // No existing data, allow request
      const info: RateLimitInfo = {
        count: 1,
        resetTime: Date.now() + 15 * 60 * 1000,
        firstRequest: Date.now(),
      };
      
      // Write to all stores
      await Promise.allSettled(
        this.stores.map(store => store.set(key, info))
      );
      
      return { allowed: true, info };
    }

    // Use the highest count among stores for safety
    const maxCount = Math.max(...validResults.map(info => info.count));
    const latestResetTime = Math.max(...validResults.map(info => info.resetTime));
    const earliestFirstRequest = Math.min(...validResults.map(info => info.firstRequest));

    const consensusInfo: RateLimitInfo = {
      count: maxCount + 1,
      resetTime: latestResetTime,
      firstRequest: earliestFirstRequest,
    };

    const allowed = consensusInfo.count <= maxRequests;

    // Update all stores with consensus data
    if (allowed) {
      await Promise.allSettled(
        this.stores.map(store => store.set(key, consensusInfo))
      );
    }

    return { allowed, info: consensusInfo };
  }
}

/**
 * Utility function to create Redis store with connection fallback
 */
export async function createRedisStore(
  redisConfig?: {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
  }
): Promise<RateLimitStore> {
  try {
    // Dynamically import Redis (optional dependency)
    const Redis = await import('ioredis');
    const redis = new Redis.default({
      host: redisConfig?.host || process.env.REDIS_HOST || 'localhost',
      port: redisConfig?.port || parseInt(process.env.REDIS_PORT || '6379'),
      password: redisConfig?.password || process.env.REDIS_PASSWORD,
      db: redisConfig?.db || parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });

    // Test connection
    await redis.ping();
    
    console.log('Connected to Redis for rate limiting');
    return new RedisRateLimitStore(redis);
  } catch (error) {
    console.warn('Failed to connect to Redis, falling back to memory store:', error);
    return new MemoryRateLimitStore();
  }
}

export default createRateLimitMiddleware;