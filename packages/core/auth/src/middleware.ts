import { getServerSession } from 'next-auth/next';
import { authOptions, AuthSession } from './config';
import { PermissionManager } from './permissions';
import { auditLogger } from '@bizbox/core-database';
import { withTenantContext } from '@bizbox/core-database';

export interface AuthenticatedRequest {
  user: AuthSession['user'];
  tenant: AuthSession['tenant'];
  session: AuthSession;
  headers: Record<string, string | string[] | undefined>;
  method: string;
  url: string;
  ip?: string;
}

export interface AuthMiddlewareOptions {
  required?: boolean;
  roles?: string[];
  permissions?: Array<{ resource: string; action: string }>;
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
}

// Simple in-memory rate limiter (in production, use Redis)
class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();

  isAllowed(key: string, windowMs: number, maxRequests: number): boolean {
    const now = Date.now();
    const record = this.requests.get(key);

    if (!record || now > record.resetTime) {
      this.requests.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (record.count >= maxRequests) {
      return false;
    }

    record.count++;
    return true;
  }

  getRemainingRequests(key: string, maxRequests: number): number {
    const record = this.requests.get(key);
    if (!record) return maxRequests;
    return Math.max(0, maxRequests - record.count);
  }

  getResetTime(key: string): number {
    const record = this.requests.get(key);
    return record?.resetTime || Date.now();
  }
}

const rateLimiter = new RateLimiter();

/**
 * Authentication middleware for API routes
 */
export function createAuthMiddleware(options: AuthMiddlewareOptions = {}) {
  return async (req: any, res: any, next: any) => {
    try {
      // Rate limiting
      if (options.rateLimit) {
        const clientId = req.ip || req.connection?.remoteAddress || 'unknown';
        const rateLimitKey = `${clientId}:${req.url}`;
        
        const isAllowed = rateLimiter.isAllowed(
          rateLimitKey,
          options.rateLimit.windowMs,
          options.rateLimit.maxRequests
        );

        if (!isAllowed) {
          const resetTime = rateLimiter.getResetTime(rateLimitKey);
          const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

          res.setHeader('Retry-After', retryAfter);
          res.setHeader('X-RateLimit-Limit', options.rateLimit.maxRequests);
          res.setHeader('X-RateLimit-Remaining', 0);
          res.setHeader('X-RateLimit-Reset', resetTime);

          return res.status(429).json({
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests',
              retryAfter,
            },
          });
        }

        // Set rate limit headers
        const remaining = rateLimiter.getRemainingRequests(rateLimitKey, options.rateLimit.maxRequests);
        const resetTime = rateLimiter.getResetTime(rateLimitKey);
        
        res.setHeader('X-RateLimit-Limit', options.rateLimit.maxRequests);
        res.setHeader('X-RateLimit-Remaining', remaining);
        res.setHeader('X-RateLimit-Reset', resetTime);
      }

      // Get session
      const session = await getServerSession(req, res, authOptions) as AuthSession | null;

      if (!session && options.required !== false) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      if (session) {
        // Attach user and tenant to request
        req.user = session.user;
        req.tenant = session.tenant;
        req.session = session;

        // Set tenant context for database operations
        await withTenantContext(
          { tenantId: session.user.tenantId, userId: session.user.id },
          async () => {
            // Role-based access control
            if (options.roles && options.roles.length > 0) {
              if (!options.roles.includes(session.user.role)) {
                await auditLogger.logAuthEvent('PERMISSION_DENIED', session.user.id, {
                  requiredRoles: options.roles,
                  userRole: session.user.role,
                  resource: req.url,
                  method: req.method,
                });

                return res.status(403).json({
                  error: {
                    code: 'FORBIDDEN',
                    message: `Role '${options.roles.join(' or ')}' required`,
                  },
                });
              }
            }

            // Permission-based access control
            if (options.permissions && options.permissions.length > 0) {
              for (const permission of options.permissions) {
                const hasPermission = PermissionManager.hasPermission(
                  session.user.role,
                  session.user.permissions,
                  permission.resource,
                  permission.action,
                  {
                    userId: session.user.id,
                    tenantId: session.user.tenantId,
                    ...req.params,
                    ...req.query,
                  }
                );

                if (!hasPermission) {
                  await auditLogger.logAuthEvent('PERMISSION_DENIED', session.user.id, {
                    requiredPermission: permission,
                    userRole: session.user.role,
                    resource: req.url,
                    method: req.method,
                  });

                  return res.status(403).json({
                    error: {
                      code: 'FORBIDDEN',
                      message: `Permission to ${permission.action} ${permission.resource} required`,
                    },
                  });
                }
              }
            }

            next();
          }
        );
      } else {
        next();
      }
    } catch (error) {
      console.error('Auth middleware error:', error);
      
      if (session?.user) {
        await withTenantContext(
          { tenantId: session.user.tenantId, userId: session.user.id },
          async () => {
            await auditLogger.logAuthEvent('AUTH_ERROR', session.user.id, {
              error: error instanceof Error ? error.message : 'Unknown error',
              resource: req.url,
              method: req.method,
            });
          }
        );
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Authentication middleware error',
        },
      });
    }
  };
}

/**
 * Convenience middleware functions
 */
export const requireAuth = createAuthMiddleware({ required: true });

export const requireRole = (roles: string | string[]) =>
  createAuthMiddleware({
    required: true,
    roles: Array.isArray(roles) ? roles : [roles],
  });

export const requirePermission = (resource: string, action: string) =>
  createAuthMiddleware({
    required: true,
    permissions: [{ resource, action }],
  });

export const withRateLimit = (windowMs: number, maxRequests: number) =>
  createAuthMiddleware({
    rateLimit: { windowMs, maxRequests },
  });

export const requireSuperAdmin = requireRole('super_admin');
export const requireTenantAdmin = requireRole(['super_admin', 'tenant_admin']);
export const requireStaff = requireRole(['super_admin', 'tenant_admin', 'staff']);

/**
 * JWT token utilities for API authentication
 */
export class JWTAuth {
  private static secret = process.env.NEXTAUTH_SECRET || 'fallback-secret';

  /**
   * Generate API token for programmatic access
   */
  static async generateApiToken(
    userId: string,
    tenantId: string,
    permissions: string[] = [],
    expiresIn: string = '30d'
  ): Promise<string> {
    const jwt = await import('jsonwebtoken');
    
    const payload = {
      sub: userId,
      tenantId,
      permissions,
      type: 'api_token',
      iat: Math.floor(Date.now() / 1000),
    };

    return jwt.sign(payload, this.secret, { expiresIn });
  }

  /**
   * Verify API token
   */
  static async verifyApiToken(token: string): Promise<{
    userId: string;
    tenantId: string;
    permissions: string[];
  } | null> {
    try {
      const jwt = await import('jsonwebtoken');
      const payload = jwt.verify(token, this.secret) as any;

      if (payload.type !== 'api_token') {
        return null;
      }

      return {
        userId: payload.sub,
        tenantId: payload.tenantId,
        permissions: payload.permissions || [],
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Middleware for API token authentication
   */
  static createApiTokenMiddleware() {
    return async (req: any, res: any, next: any) => {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'API token required',
          },
        });
      }

      const token = authHeader.substring(7);
      const payload = await this.verifyApiToken(token);

      if (!payload) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid API token',
          },
        });
      }

      // Set user context for API requests
      req.apiUser = {
        id: payload.userId,
        tenantId: payload.tenantId,
        permissions: payload.permissions,
        type: 'api',
      };

      // Set tenant context
      await withTenantContext(
        { tenantId: payload.tenantId, userId: payload.userId },
        async () => {
          next();
        }
      );
    };
  }
}

export const requireApiToken = JWTAuth.createApiTokenMiddleware();