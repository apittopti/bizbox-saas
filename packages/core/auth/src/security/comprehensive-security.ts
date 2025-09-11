import { csrfMiddleware } from './csrf';
import { securityHeadersMiddleware } from './secure-headers';
import { securityCheckMiddleware } from './incident-response';
import { createValidationMiddleware } from './input-validation';
import { createAuthMiddleware } from '../middleware';
import { z } from 'zod';

export interface ComprehensiveSecurityOptions {
  // Authentication options
  requireAuth?: boolean;
  roles?: string[];
  permissions?: Array<{ resource: string; action: string }>;
  
  // Rate limiting options
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  
  // CSRF protection
  enableCSRF?: boolean;
  
  // Input validation
  validation?: {
    body?: z.ZodSchema;
    query?: z.ZodSchema;
    params?: z.ZodSchema;
  };
  
  // Security headers
  enableSecurityHeaders?: boolean;
  
  // Incident monitoring
  enableIncidentMonitoring?: boolean;
  
  // Custom security checks
  customChecks?: Array<(req: any, res: any, next: any) => void>;
}

/**
 * Comprehensive security middleware that combines all security features
 */
export function createComprehensiveSecurityMiddleware(options: ComprehensiveSecurityOptions = {}) {
  const middlewares: Array<(req: any, res: any, next: any) => void> = [];

  // 1. Security headers (should be first)
  if (options.enableSecurityHeaders !== false) {
    middlewares.push(securityHeadersMiddleware);
  }

  // 2. Security checks (blocked IPs, suspended users)
  if (options.enableIncidentMonitoring !== false) {
    middlewares.push(securityCheckMiddleware);
  }

  // 3. CSRF protection
  if (options.enableCSRF) {
    middlewares.push(csrfMiddleware);
  }

  // 4. Input validation
  if (options.validation) {
    if (options.validation.body) {
      middlewares.push(createValidationMiddleware(options.validation.body, 'body'));
    }
    if (options.validation.query) {
      middlewares.push(createValidationMiddleware(options.validation.query, 'query'));
    }
    if (options.validation.params) {
      middlewares.push(createValidationMiddleware(options.validation.params, 'params'));
    }
  }

  // 5. Authentication and authorization
  if (options.requireAuth !== false) {
    middlewares.push(createAuthMiddleware({
      required: options.requireAuth,
      roles: options.roles,
      permissions: options.permissions,
      rateLimit: options.rateLimit,
    }));
  }

  // 6. Custom security checks
  if (options.customChecks) {
    middlewares.push(...options.customChecks);
  }

  // Return composed middleware
  return (req: any, res: any, next: any) => {
    let index = 0;

    function runNext() {
      if (index >= middlewares.length) {
        return next();
      }

      const middleware = middlewares[index++];
      middleware(req, res, runNext);
    }

    runNext();
  };
}

/**
 * Predefined security configurations for common use cases
 */
export const securityPresets = {
  // Maximum security for sensitive endpoints
  maximum: createComprehensiveSecurityMiddleware({
    requireAuth: true,
    enableCSRF: true,
    enableSecurityHeaders: true,
    enableIncidentMonitoring: true,
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 10,
    },
  }),

  // High security for admin endpoints
  admin: createComprehensiveSecurityMiddleware({
    requireAuth: true,
    roles: ['super_admin', 'tenant_admin'],
    enableCSRF: true,
    enableSecurityHeaders: true,
    enableIncidentMonitoring: true,
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
    },
  }),

  // Standard security for authenticated endpoints
  standard: createComprehensiveSecurityMiddleware({
    requireAuth: true,
    enableSecurityHeaders: true,
    enableIncidentMonitoring: true,
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 1000,
    },
  }),

  // Basic security for public endpoints
  public: createComprehensiveSecurityMiddleware({
    requireAuth: false,
    enableSecurityHeaders: true,
    enableIncidentMonitoring: true,
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 10000,
    },
  }),

  // API security for external integrations
  api: createComprehensiveSecurityMiddleware({
    requireAuth: true,
    enableSecurityHeaders: false, // APIs don't need browser security headers
    enableIncidentMonitoring: true,
    rateLimit: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 10000,
    },
  }),
};

/**
 * Security audit middleware that logs security-relevant events
 */
export function createSecurityAuditMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    const originalSend = res.send;

    // Capture security-relevant request data
    const securityContext = {
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent'),
      method: req.method,
      url: req.url,
      headers: {
        authorization: req.get('Authorization') ? '[PRESENT]' : '[ABSENT]',
        contentType: req.get('Content-Type'),
        origin: req.get('Origin'),
        referer: req.get('Referer'),
      },
      user: req.user ? {
        id: req.user.id,
        role: req.user.role,
        tenantId: req.user.tenantId,
      } : null,
    };

    // Override response to capture response data
    res.send = function(body: any) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Log security events
      if (res.statusCode >= 400) {
        console.warn('Security audit - Failed request:', {
          ...securityContext,
          statusCode: res.statusCode,
          duration,
          responseSize: body ? body.length : 0,
        });
      }

      // Log successful authentication events
      if (req.user && res.statusCode < 400) {
        console.info('Security audit - Authenticated request:', {
          userId: req.user.id,
          role: req.user.role,
          tenantId: req.user.tenantId,
          resource: req.url,
          method: req.method,
          duration,
        });
      }

      return originalSend.call(this, body);
    };

    next();
  };
}

/**
 * Create a security middleware stack for specific use cases
 */
export function createSecurityStack(
  preset: keyof typeof securityPresets,
  customOptions?: Partial<ComprehensiveSecurityOptions>
) {
  if (customOptions) {
    // Merge preset with custom options
    return createComprehensiveSecurityMiddleware({
      ...getPresetOptions(preset),
      ...customOptions,
    });
  }
  
  return securityPresets[preset];
}

function getPresetOptions(preset: keyof typeof securityPresets): ComprehensiveSecurityOptions {
  switch (preset) {
    case 'maximum':
      return {
        requireAuth: true,
        enableCSRF: true,
        enableSecurityHeaders: true,
        enableIncidentMonitoring: true,
        rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 10 },
      };
    case 'admin':
      return {
        requireAuth: true,
        roles: ['super_admin', 'tenant_admin'],
        enableCSRF: true,
        enableSecurityHeaders: true,
        enableIncidentMonitoring: true,
        rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 100 },
      };
    case 'standard':
      return {
        requireAuth: true,
        enableSecurityHeaders: true,
        enableIncidentMonitoring: true,
        rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 1000 },
      };
    case 'public':
      return {
        requireAuth: false,
        enableSecurityHeaders: true,
        enableIncidentMonitoring: true,
        rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 10000 },
      };
    case 'api':
      return {
        requireAuth: true,
        enableSecurityHeaders: false,
        enableIncidentMonitoring: true,
        rateLimit: { windowMs: 60 * 60 * 1000, maxRequests: 10000 },
      };
    default:
      return {};
  }
}

// Export convenience functions
export const maxSecurity = securityPresets.maximum;
export const adminSecurity = securityPresets.admin;
export const standardSecurity = securityPresets.standard;
export const publicSecurity = securityPresets.public;
export const apiSecurity = securityPresets.api;
export const securityAudit = createSecurityAuditMiddleware();