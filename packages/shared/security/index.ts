/**
 * BizBox Security Framework
 * 
 * Comprehensive security module providing enterprise-grade protection against:
 * - XSS attacks through content sanitization
 * - SQL injection through input validation
 * - CSRF attacks through token validation
 * - Clickjacking through security headers
 * - Data breaches through secure configuration
 * - Rate limiting and DDoS protection
 * - Authentication and authorization
 */

// Core security modules
export * from './content-sanitizer';
export * from './security-headers';
export * from './config-manager';
export * from './input-validator';

// Re-export main instances for convenience
export { contentSanitizer } from './content-sanitizer';
export { securityHeaders, securityHeaderPresets } from './security-headers';
export { configManager, configPresets } from './config-manager';
export { inputValidator, commonSchemas } from './input-validator';

// Security utilities
import { NextApiRequest, NextApiResponse } from 'next';
import { securityHeaders } from './security-headers';
import { inputValidator } from './input-validator';
import { contentSanitizer } from './content-sanitizer';

/**
 * Apply comprehensive security middleware to API routes
 */
export function createSecurityMiddleware(options: {
  enableCSP?: boolean;
  enableHSTS?: boolean;
  enableRateLimit?: boolean;
  enableInputValidation?: boolean;
  enableContentSanitization?: boolean;
} = {}) {
  const {
    enableCSP = true,
    enableHSTS = true,
    enableRateLimit = true,
    enableInputValidation = true,
    enableContentSanitization = true,
  } = options;

  return (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    // Apply security headers
    if (enableCSP || enableHSTS) {
      const headerMiddleware = securityHeaders.createMiddleware({
        enableCSP,
        enableHsts: enableHSTS,
      });
      
      headerMiddleware(req, res, () => {
        // Continue with next middleware
      });
    }

    // Input validation and sanitization
    if (enableInputValidation && req.body) {
      try {
        // Basic validation for common patterns
        const result = inputValidator.validateApiParams(req.query, {
          userId: (req as any).user?.id,
          tenantId: (req as any).tenant?.id,
          userRole: (req as any).user?.role,
          ipAddress: req.headers['x-forwarded-for'] as string || req.connection?.remoteAddress,
        });

        if (!result.success) {
          return res.status(400).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid input parameters',
              details: result.errors,
              timestamp: new Date().toISOString(),
            },
          });
        }

        // Apply sanitization if enabled
        if (enableContentSanitization && req.body) {
          try {
            req.body = contentSanitizer.sanitizeJson(req.body);
          } catch (error) {
            return res.status(400).json({
              error: {
                code: 'SANITIZATION_ERROR',
                message: 'Request body contains invalid content',
                timestamp: new Date().toISOString(),
              },
            });
          }
        }
      } catch (error) {
        console.error('Security middleware error:', error);
        return res.status(500).json({
          error: {
            code: 'SECURITY_ERROR',
            message: 'Security validation failed',
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    next();
  };
}

/**
 * Secure route wrapper that applies all security measures
 */
export function secureRoute(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void,
  options: {
    requireAuth?: boolean;
    requiredRoles?: string[];
    enableRateLimit?: boolean;
    rateLimitKey?: string;
    rateLimitMax?: number;
    validateInput?: boolean;
    sanitizeOutput?: boolean;
  } = {}
) {
  const {
    requireAuth = true,
    requiredRoles = [],
    enableRateLimit = true,
    rateLimitKey,
    rateLimitMax = 100,
    validateInput = true,
    sanitizeOutput = true,
  } = options;

  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Apply security middleware
      const securityMiddleware = createSecurityMiddleware({
        enableInputValidation: validateInput,
      });

      await new Promise<void>((resolve) => {
        securityMiddleware(req, res, resolve);
      });

      // Authentication check
      if (requireAuth) {
        const user = (req as any).user;
        if (!user) {
          return res.status(401).json({
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required',
              timestamp: new Date().toISOString(),
            },
          });
        }

        // Role check
        if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
          return res.status(403).json({
            error: {
              code: 'FORBIDDEN',
              message: 'Insufficient permissions',
              timestamp: new Date().toISOString(),
            },
          });
        }
      }

      // Rate limiting
      if (enableRateLimit) {
        const key = rateLimitKey || `${req.method}:${req.url}:${(req as any).user?.id || 'anonymous'}`;
        const rateLimitResult = (inputValidator as any).checkRateLimit(key, rateLimitMax, 3600000);
        
        if (!rateLimitResult.allowed) {
          return res.status(429).json({
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests',
              timestamp: new Date().toISOString(),
            },
          });
        }

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', rateLimitMax);
        res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
      }

      // Execute the handler
      await handler(req, res);

    } catch (error) {
      console.error('Secure route error:', error);
      
      if (!res.headersSent) {
        res.status(500).json({
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred',
            timestamp: new Date().toISOString(),
          },
        });
      }
    }
  };
}

/**
 * Security audit logger
 */
export class SecurityAuditLogger {
  private static instance: SecurityAuditLogger;
  private auditLog: Array<{
    timestamp: Date;
    event: string;
    userId?: string;
    tenantId?: string;
    ipAddress?: string;
    userAgent?: string;
    details?: any;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }> = [];

  public static getInstance(): SecurityAuditLogger {
    if (!SecurityAuditLogger.instance) {
      SecurityAuditLogger.instance = new SecurityAuditLogger();
    }
    return SecurityAuditLogger.instance;
  }

  public logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details?: any,
    userId?: string,
    tenantId?: string,
    ipAddress?: string,
    userAgent?: string
  ): void {
    const logEntry = {
      timestamp: new Date(),
      event,
      severity,
      userId,
      tenantId,
      ipAddress,
      userAgent,
      details,
    };

    this.auditLog.push(logEntry);

    // Keep only last 10000 entries
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-10000);
    }

    // Log to console for immediate visibility
    console.log(`[SECURITY AUDIT] ${severity.toUpperCase()}: ${event}`, {
      userId,
      tenantId,
      ipAddress,
      details,
    });

    // In production, you would also send this to your logging service
  }

  public getAuditLog(filters?: {
    severity?: 'low' | 'medium' | 'high' | 'critical';
    userId?: string;
    tenantId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Array<any> {
    let filteredLog = [...this.auditLog];

    if (filters?.severity) {
      filteredLog = filteredLog.filter(entry => entry.severity === filters.severity);
    }

    if (filters?.userId) {
      filteredLog = filteredLog.filter(entry => entry.userId === filters.userId);
    }

    if (filters?.tenantId) {
      filteredLog = filteredLog.filter(entry => entry.tenantId === filters.tenantId);
    }

    if (filters?.startDate) {
      filteredLog = filteredLog.filter(entry => entry.timestamp >= filters.startDate!);
    }

    if (filters?.endDate) {
      filteredLog = filteredLog.filter(entry => entry.timestamp <= filters.endDate!);
    }

    return filteredLog;
  }

  public getCriticalEvents(): Array<any> {
    return this.getAuditLog({ severity: 'critical' });
  }

  public clearAuditLog(): void {
    this.auditLog = [];
  }
}

// Export singleton instance
export const securityAuditLogger = SecurityAuditLogger.getInstance();

/**
 * Security configuration presets
 */
export const securityPresets = {
  /**
   * Maximum security configuration for production environments
   */
  maximum: {
    csp: {
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'nonce-{nonce}'"],
        'style-src': ["'self'"],
        'img-src': ["'self'", 'data:', 'https:'],
        'font-src': ["'self'"],
        'connect-src': ["'self'"],
        'media-src': ["'self'"],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'none'"],
        'upgrade-insecure-requests': [],
        'block-all-mixed-content': [],
      },
      useNonces: true,
      allowInlineScripts: false,
      allowEval: false,
    },
    frameOptions: 'DENY' as const,
    referrerPolicy: 'no-referrer' as const,
    enableHsts: true,
    enableInputValidation: true,
    enableContentSanitization: true,
    enableRateLimit: true,
  },

  /**
   * Balanced security for most applications
   */
  balanced: {
    csp: {
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'nonce-{nonce}'", 'https://cdn.jsdelivr.net'],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'img-src': ["'self'", 'data:', 'https:'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'connect-src': ["'self'"],
        'media-src': ["'self'", 'data:', 'blob:'],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'self'"],
        'upgrade-insecure-requests': [],
      },
      useNonces: true,
    },
    frameOptions: 'SAMEORIGIN' as const,
    referrerPolicy: 'strict-origin-when-cross-origin' as const,
    enableHsts: true,
    enableInputValidation: true,
    enableContentSanitization: true,
    enableRateLimit: true,
  },

  /**
   * Development configuration with relaxed security
   */
  development: {
    csp: {
      directives: {
        'default-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'localhost:*'],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'http:', 'https:'],
        'connect-src': ["'self'", 'ws:', 'localhost:*'],
      },
      useNonces: false,
      allowInlineScripts: true,
      allowEval: true,
    },
    enableHsts: false,
    frameOptions: 'SAMEORIGIN' as const,
    enableInputValidation: true,
    enableContentSanitization: false,
    enableRateLimit: false,
  },
};

/**
 * Quick security check function
 */
export function performSecurityCheck(): {
  status: 'secure' | 'warning' | 'critical';
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check environment
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Check for required environment variables
  const requiredEnvVars = [
    'JWT_SECRET',
    'SESSION_SECRET',
    'DB_PASSWORD',
    'NEXTAUTH_SECRET',
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      issues.push(`Missing required environment variable: ${envVar}`);
      recommendations.push(`Set the ${envVar} environment variable`);
    }
  }

  // Check for weak secrets in production
  if (isProduction) {
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      issues.push('JWT_SECRET is too short for production');
      recommendations.push('Use a JWT_SECRET with at least 32 characters');
    }

    if (!process.env.ALLOWED_ORIGINS) {
      issues.push('ALLOWED_ORIGINS not set in production');
      recommendations.push('Set ALLOWED_ORIGINS to specific domains');
    }

    if (!process.env.HTTPS) {
      issues.push('HTTPS not enforced in production');
      recommendations.push('Enable HTTPS enforcement');
    }
  }

  let status: 'secure' | 'warning' | 'critical' = 'secure';
  
  if (issues.length > 0) {
    const criticalIssues = issues.filter(issue => 
      issue.includes('Missing required') || 
      issue.includes('too short') ||
      issue.includes('HTTPS not enforced')
    );
    
    status = criticalIssues.length > 0 ? 'critical' : 'warning';
  }

  return {
    status,
    issues,
    recommendations,
  };
}