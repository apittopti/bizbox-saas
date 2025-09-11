import { NextApiRequest, NextApiResponse } from 'next';
import { createHash } from 'crypto';

export interface CorsOptions {
  origin?: string | string[] | ((origin: string | undefined, req: NextApiRequest) => boolean);
  methods?: string[];
  allowedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
  optionsSuccessStatus?: number;
}

export interface LoggingOptions {
  includeBody?: boolean;
  includeHeaders?: boolean;
  includeQuery?: boolean;
  maxBodySize?: number;
  sensitiveHeaders?: string[];
  logger?: (logData: any) => void | Promise<void>;
  enableMetrics?: boolean;
}

export interface CompressionOptions {
  threshold?: number;
  level?: number;
  enableBrotli?: boolean;
  enableGzip?: boolean;
  mimeTypes?: string[];
}

export interface SecurityOptions {
  enableCSP?: boolean;
  cspDirectives?: Record<string, string[]>;
  enableHSTS?: boolean;
  hstsMaxAge?: number;
  enableXFrameOptions?: boolean;
  xFrameOptions?: 'DENY' | 'SAMEORIGIN' | string;
  enableXContentTypeOptions?: boolean;
  enableReferrerPolicy?: boolean;
  referrerPolicy?: string;
  enablePermissionsPolicy?: boolean;
  permissionsPolicy?: Record<string, string[]>;
}

export type UtilityMiddleware = (req: NextApiRequest, res: NextApiResponse, next: () => void) => Promise<void> | void;

/**
 * CORS middleware with advanced configuration
 */
export function createCorsMiddleware(options: CorsOptions = {}): UtilityMiddleware {
  const {
    origin = '*',
    methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-API-Version'],
    credentials = true,
    maxAge = 86400, // 24 hours
    optionsSuccessStatus = 204,
  } = options;

  return (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    try {
      // Handle origin
      if (typeof origin === 'function') {
        const requestOrigin = req.headers.origin;
        if (origin(requestOrigin, req)) {
          res.setHeader('Access-Control-Allow-Origin', requestOrigin || '*');
        }
      } else if (Array.isArray(origin)) {
        const requestOrigin = req.headers.origin;
        if (requestOrigin && origin.includes(requestOrigin)) {
          res.setHeader('Access-Control-Allow-Origin', requestOrigin);
        }
      } else if (origin !== false) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }

      // Set other CORS headers
      if (methods.length > 0) {
        res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
      }

      if (allowedHeaders.length > 0) {
        res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));
      }

      if (credentials) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }

      if (maxAge > 0) {
        res.setHeader('Access-Control-Max-Age', maxAge.toString());
      }

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.status(optionsSuccessStatus).end();
        return;
      }

      next();
    } catch (error) {
      console.error('CORS middleware error:', error);
      next();
    }
  };
}

/**
 * Enhanced logging middleware with performance metrics
 */
export function createLoggingMiddleware(options: LoggingOptions = {}): UtilityMiddleware {
  const {
    includeBody = false,
    includeHeaders = false,
    includeQuery = true,
    maxBodySize = 1024, // 1KB
    sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'],
    logger = defaultLogger,
    enableMetrics = true,
  } = options;

  const requestMetrics = {
    totalRequests: 0,
    requestsByMethod: new Map<string, number>(),
    requestsByPath: new Map<string, number>(),
    averageResponseTime: 0,
    responseTimeHistory: [] as number[],
  };

  return async (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    const startTime = Date.now();
    const requestId = (req as any).requestId || generateRequestId();

    try {
      // Prepare log data
      const logData: any = {
        requestId,
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
        ip: getClientIP(req),
        timestamp: new Date().toISOString(),
        userId: (req as any).user?.id,
        tenantId: (req as any).user?.tenantId || req.headers['x-tenant-id'],
      };

      // Include query parameters
      if (includeQuery && Object.keys(req.query).length > 0) {
        logData.query = req.query;
      }

      // Include headers (filtered)
      if (includeHeaders) {
        logData.headers = Object.entries(req.headers).reduce((filtered, [key, value]) => {
          if (!sensitiveHeaders.includes(key.toLowerCase())) {
            filtered[key] = value;
          } else {
            filtered[key] = '[REDACTED]';
          }
          return filtered;
        }, {} as Record<string, any>);
      }

      // Include body (truncated if too large)
      if (includeBody && req.body) {
        const bodyString = JSON.stringify(req.body);
        if (bodyString.length <= maxBodySize) {
          logData.body = req.body;
        } else {
          logData.body = `[TRUNCATED - ${bodyString.length} characters]`;
          logData.bodyPreview = bodyString.substring(0, maxBodySize);
        }
      }

      // Wrap response to capture response data
      const originalJson = res.json;
      const originalSend = res.send;
      const originalEnd = res.end;

      res.json = function(obj: any) {
        logData.responseStatusCode = res.statusCode;
        logData.responseTime = Date.now() - startTime;
        
        if (enableMetrics) {
          updateRequestMetrics(req, logData.responseTime);
        }

        logger({ ...logData, response: 'JSON' });
        return originalJson.call(this, obj);
      };

      res.send = function(body: any) {
        logData.responseStatusCode = res.statusCode;
        logData.responseTime = Date.now() - startTime;
        
        if (enableMetrics) {
          updateRequestMetrics(req, logData.responseTime);
        }

        logger({ ...logData, response: 'BODY' });
        return originalSend.call(this, body);
      };

      res.end = function(chunk?: any) {
        if (!logData.responseStatusCode) {
          logData.responseStatusCode = res.statusCode;
          logData.responseTime = Date.now() - startTime;
          
          if (enableMetrics) {
            updateRequestMetrics(req, logData.responseTime);
          }

          logger({ ...logData, response: 'END' });
        }
        return originalEnd.call(this, chunk);
      };

      next();
    } catch (error) {
      console.error('Logging middleware error:', error);
      next();
    }

    function updateRequestMetrics(req: NextApiRequest, responseTime: number) {
      requestMetrics.totalRequests++;
      
      // Update method counts
      const method = req.method || 'UNKNOWN';
      const methodCount = requestMetrics.requestsByMethod.get(method) || 0;
      requestMetrics.requestsByMethod.set(method, methodCount + 1);
      
      // Update path counts
      const path = req.url?.split('?')[0] || 'unknown';
      const pathCount = requestMetrics.requestsByPath.get(path) || 0;
      requestMetrics.requestsByPath.set(path, pathCount + 1);
      
      // Update response time metrics
      requestMetrics.responseTimeHistory.push(responseTime);
      if (requestMetrics.responseTimeHistory.length > 1000) {
        requestMetrics.responseTimeHistory.shift();
      }
      
      requestMetrics.averageResponseTime = 
        requestMetrics.responseTimeHistory.reduce((sum, time) => sum + time, 0) / 
        requestMetrics.responseTimeHistory.length;
    }
  };

  function getMetrics() {
    return {
      ...requestMetrics,
      requestsByMethod: Object.fromEntries(requestMetrics.requestsByMethod),
      requestsByPath: Object.fromEntries(requestMetrics.requestsByPath),
    };
  }

  // Expose metrics getter
  (createLoggingMiddleware as any).getMetrics = getMetrics;
}

/**
 * Response compression middleware
 */
export function createCompressionMiddleware(options: CompressionOptions = {}): UtilityMiddleware {
  const {
    threshold = 1024, // 1KB
    level = 6, // Compression level
    enableBrotli = true,
    enableGzip = true,
    mimeTypes = [
      'text/html',
      'text/css',
      'text/javascript',
      'application/javascript',
      'application/json',
      'application/xml',
      'text/xml',
    ],
  } = options;

  return (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    try {
      const acceptEncoding = req.headers['accept-encoding'] || '';
      const supportsCompression = enableBrotli && acceptEncoding.includes('br') ||
                                 enableGzip && acceptEncoding.includes('gzip');

      if (!supportsCompression) {
        return next();
      }

      const originalJson = res.json;
      const originalSend = res.send;

      const compressResponse = (data: any, encoding: string) => {
        const contentType = res.getHeader('content-type') as string || 'application/json';
        const shouldCompress = mimeTypes.some(type => contentType.includes(type));
        
        if (!shouldCompress) {
          return data;
        }

        const dataString = typeof data === 'string' ? data : JSON.stringify(data);
        if (dataString.length < threshold) {
          return data;
        }

        // In a real implementation, you would use zlib to compress
        // For now, just set the headers
        res.setHeader('Content-Encoding', encoding);
        res.setHeader('Vary', 'Accept-Encoding');
        
        return data; // Would be compressed data in real implementation
      };

      res.json = function(obj: any) {
        const preferredEncoding = enableBrotli && acceptEncoding.includes('br') ? 'br' : 'gzip';
        const processedData = compressResponse(obj, preferredEncoding);
        return originalJson.call(this, processedData);
      };

      res.send = function(body: any) {
        const preferredEncoding = enableBrotli && acceptEncoding.includes('br') ? 'br' : 'gzip';
        const processedData = compressResponse(body, preferredEncoding);
        return originalSend.call(this, processedData);
      };

      next();
    } catch (error) {
      console.error('Compression middleware error:', error);
      next();
    }
  };
}

/**
 * Security headers middleware
 */
export function createSecurityMiddleware(options: SecurityOptions = {}): UtilityMiddleware {
  const {
    enableCSP = true,
    cspDirectives = {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'connect-src': ["'self'"],
    },
    enableHSTS = true,
    hstsMaxAge = 31536000, // 1 year
    enableXFrameOptions = true,
    xFrameOptions = 'DENY',
    enableXContentTypeOptions = true,
    enableReferrerPolicy = true,
    referrerPolicy = 'strict-origin-when-cross-origin',
    enablePermissionsPolicy = false,
    permissionsPolicy = {},
  } = options;

  return (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    try {
      // Content Security Policy
      if (enableCSP) {
        const cspValue = Object.entries(cspDirectives)
          .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
          .join('; ');
        res.setHeader('Content-Security-Policy', cspValue);
      }

      // HTTP Strict Transport Security
      if (enableHSTS) {
        res.setHeader('Strict-Transport-Security', `max-age=${hstsMaxAge}; includeSubDomains`);
      }

      // X-Frame-Options
      if (enableXFrameOptions) {
        res.setHeader('X-Frame-Options', xFrameOptions);
      }

      // X-Content-Type-Options
      if (enableXContentTypeOptions) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
      }

      // X-XSS-Protection (legacy but still useful)
      res.setHeader('X-XSS-Protection', '1; mode=block');

      // Referrer Policy
      if (enableReferrerPolicy) {
        res.setHeader('Referrer-Policy', referrerPolicy);
      }

      // Permissions Policy (experimental)
      if (enablePermissionsPolicy && Object.keys(permissionsPolicy).length > 0) {
        const permissionsPolicyValue = Object.entries(permissionsPolicy)
          .map(([directive, allowlist]) => `${directive}=(${allowlist.join(' ')})`)
          .join(', ');
        res.setHeader('Permissions-Policy', permissionsPolicyValue);
      }

      // Remove potentially sensitive headers
      res.removeHeader('X-Powered-By');
      res.removeHeader('Server');

      next();
    } catch (error) {
      console.error('Security middleware error:', error);
      next();
    }
  };
}

/**
 * Request timeout middleware
 */
export function createTimeoutMiddleware(timeoutMs: number = 30000): UtilityMiddleware {
  return (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          error: {
            code: 'REQUEST_TIMEOUT',
            message: 'Request timeout',
            timeout: timeoutMs,
            timestamp: new Date().toISOString(),
          },
        });
      }
    }, timeoutMs);

    // Clear timeout when response is sent
    const originalEnd = res.end;
    res.end = function(...args: any[]) {
      clearTimeout(timeout);
      return originalEnd.apply(this, args);
    };

    const originalJson = res.json;
    res.json = function(obj: any) {
      clearTimeout(timeout);
      return originalJson.call(this, obj);
    };

    next();
  };
}

/**
 * Request size limit middleware
 */
export function createSizeLimitMiddleware(maxSizeBytes: number = 10 * 1024 * 1024): UtilityMiddleware {
  return (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    try {
      const contentLength = req.headers['content-length'];
      
      if (contentLength && parseInt(contentLength) > maxSizeBytes) {
        return res.status(413).json({
          error: {
            code: 'PAYLOAD_TOO_LARGE',
            message: `Request size exceeds maximum allowed size of ${maxSizeBytes} bytes`,
            maxSize: maxSizeBytes,
            receivedSize: parseInt(contentLength),
            timestamp: new Date().toISOString(),
          },
        });
      }

      // For requests with body, check actual size
      if (req.body) {
        const bodySize = Buffer.byteLength(JSON.stringify(req.body));
        if (bodySize > maxSizeBytes) {
          return res.status(413).json({
            error: {
              code: 'PAYLOAD_TOO_LARGE',
              message: `Request body size exceeds maximum allowed size of ${maxSizeBytes} bytes`,
              maxSize: maxSizeBytes,
              receivedSize: bodySize,
              timestamp: new Date().toISOString(),
            },
          });
        }
      }

      next();
    } catch (error) {
      console.error('Size limit middleware error:', error);
      next();
    }
  };
}

// Utility functions
function generateRequestId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? String(forwarded).split(',')[0] : req.connection?.remoteAddress;
  return ip || 'unknown';
}

function defaultLogger(logData: any): void {
  const logLevel = logData.responseStatusCode >= 400 ? 'error' : 'info';
  const logMethod = logLevel === 'error' ? console.error : console.log;
  
  logMethod(`[${logData.timestamp}] ${logData.method} ${logData.url} - ${logData.responseStatusCode} - ${logData.responseTime}ms`, {
    requestId: logData.requestId,
    userId: logData.userId,
    tenantId: logData.tenantId,
    ip: logData.ip,
    userAgent: logData.userAgent,
  });
}

/**
 * Middleware composition utility
 */
export function composeMiddleware(...middlewares: UtilityMiddleware[]): UtilityMiddleware {
  return (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    let index = 0;

    const runNext = (): void => {
      if (index >= middlewares.length) {
        return next();
      }

      const currentMiddleware = middlewares[index++];
      currentMiddleware(req, res, runNext);
    };

    runNext();
  };
}

/**
 * Pre-configured middleware combinations
 */
export const middlewarePresets = {
  // Basic API middleware stack
  basic: composeMiddleware(
    createCorsMiddleware(),
    createLoggingMiddleware(),
    createSecurityMiddleware()
  ),

  // Production API middleware stack
  production: composeMiddleware(
    createSecurityMiddleware(),
    createCorsMiddleware(),
    createCompressionMiddleware(),
    createLoggingMiddleware({ enableMetrics: true }),
    createTimeoutMiddleware(30000),
    createSizeLimitMiddleware(10 * 1024 * 1024)
  ),

  // Development API middleware stack
  development: composeMiddleware(
    createCorsMiddleware({ origin: true }),
    createLoggingMiddleware({
      includeBody: true,
      includeHeaders: true,
      enableMetrics: true,
    }),
    createSecurityMiddleware({ enableHSTS: false })
  ),
};

export {
  createTimeoutMiddleware,
  createSizeLimitMiddleware,
  composeMiddleware,
  middlewarePresets,
};