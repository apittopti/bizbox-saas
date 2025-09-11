// Example: Comprehensive security implementation
import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import {
  createComprehensiveSecurityMiddleware,
  securityPresets,
  SecurityMonitor,
  InputValidator,
  CSRFProtection,
  SecureHeaders,
  IncidentResponseSystem,
} from '@bizbox/core-auth';

// Example 1: Maximum security endpoint (admin operations)
const adminEndpointSecurity = createComprehensiveSecurityMiddleware({
  requireAuth: true,
  roles: ['super_admin', 'tenant_admin'],
  enableCSRF: true,
  enableSecurityHeaders: true,
  enableIncidentMonitoring: true,
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
  },
  validation: {
    body: z.object({
      action: z.enum(['create', 'update', 'delete']),
      resourceId: z.string().uuid(),
      data: z.record(z.any()),
    }),
  },
});

export const adminEndpoint = adminEndpointSecurity(
  async (req: NextApiRequest, res: NextApiResponse) => {
    // Highly secure admin operation
    res.json({ message: 'Admin operation completed', user: req.user });
  }
);

// Example 2: Standard API endpoint with validation
const apiEndpointSecurity = createComprehensiveSecurityMiddleware({
  requireAuth: true,
  enableIncidentMonitoring: true,
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  },
  validation: {
    query: z.object({
      page: z.string().transform(Number).optional(),
      limit: z.string().transform(Number).optional(),
    }),
    body: z.object({
      name: z.string().min(1).max(100),
      email: z.string().email(),
    }).optional(),
  },
});

export const apiEndpoint = apiEndpointSecurity(
  async (req: NextApiRequest, res: NextApiResponse) => {
    // Standard API operation with validation
    res.json({ data: 'API response' });
  }
);

// Example 3: Public endpoint with basic protection
export const publicEndpoint = securityPresets.public(
  async (req: NextApiRequest, res: NextApiResponse) => {
    // Public endpoint with basic security
    res.json({ message: 'Public data' });
  }
);

// Example 4: Custom security middleware with specific checks
const customSecurityMiddleware = createComprehensiveSecurityMiddleware({
  requireAuth: true,
  permissions: [{ resource: 'bookings', action: 'read' }],
  customChecks: [
    // Custom business hours check
    (req, res, next) => {
      const hour = new Date().getHours();
      if (hour < 9 || hour > 17) {
        return res.status(403).json({
          error: {
            code: 'OUTSIDE_BUSINESS_HOURS',
            message: 'API access is only allowed during business hours (9 AM - 5 PM)',
          },
        });
      }
      next();
    },
    
    // Custom tenant plan check
    (req, res, next) => {
      if (req.tenant?.plan === 'basic' && req.method === 'POST') {
        return res.status(403).json({
          error: {
            code: 'PLAN_LIMITATION',
            message: 'Basic plan does not allow creating new resources',
          },
        });
      }
      next();
    },
  ],
});

export const customSecureEndpoint = customSecurityMiddleware(
  async (req: NextApiRequest, res: NextApiResponse) => {
    // Endpoint with custom security checks
    res.json({ message: 'Custom secure endpoint' });
  }
);

// Example 5: Manual security monitoring
export async function manualSecurityExample(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Manual input validation
    const email = InputValidator.validateEmail(req.body.email);
    const url = InputValidator.validateUrl(req.body.website, ['example.com', 'trusted-domain.com']);
    
    // Manual CSRF protection
    const csrf = new CSRFProtection({ secret: 'my-secret' });
    const isValidCSRF = csrf.verifyToken(req.headers['x-csrf-token'] as string);
    
    if (!isValidCSRF) {
      // Report security incident
      await SecurityMonitor.reportXssAttempt(
        req.ip || 'unknown',
        req.get('User-Agent') || 'unknown',
        req.body.website,
        req.user?.id,
        req.user?.tenantId
      );
      
      return res.status(403).json({ error: 'CSRF token invalid' });
    }
    
    // Process request
    res.json({ email, url });
    
  } catch (error) {
    // Report validation error as potential attack
    if (error instanceof Error && error.message.includes('Invalid')) {
      await SecurityMonitor.reportSqlInjectionAttempt(
        req.ip || 'unknown',
        req.get('User-Agent') || 'unknown',
        JSON.stringify(req.body),
        req.user?.id,
        req.user?.tenantId
      );
    }
    
    res.status(400).json({ error: error instanceof Error ? error.message : 'Validation failed' });
  }
}

// Example 6: Security headers configuration
export function configureSecurityHeaders() {
  // Custom security headers for specific needs
  const customHeaders = new SecureHeaders({
    contentSecurityPolicy: {
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", 'https://js.stripe.com'],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'img-src': ["'self'", 'data:', 'https://images.unsplash.com'],
        'connect-src': ["'self'", 'https://api.stripe.com'],
        'frame-src': ['https://js.stripe.com'],
      },
    },
    permissionsPolicy: {
      camera: 'none',
      microphone: 'none',
      geolocation: 'self',
      payment: 'self',
    },
  });
  
  return customHeaders.createMiddleware();
}

// Example 7: Incident response monitoring
export function setupIncidentMonitoring() {
  const incidentSystem = IncidentResponseSystem.getInstance();
  
  // Monitor for suspicious patterns
  setInterval(async () => {
    const incidents = incidentSystem.getAllIncidents();
    const recentIncidents = incidents.filter(
      incident => Date.now() - incident.timestamp.getTime() < 60 * 60 * 1000 // Last hour
    );
    
    if (recentIncidents.length > 10) {
      console.warn('High number of security incidents detected in the last hour:', recentIncidents.length);
      
      // Could trigger additional security measures here
      // - Increase rate limiting
      // - Send alerts to security team
      // - Temporarily block suspicious IPs
    }
  }, 5 * 60 * 1000); // Check every 5 minutes
}

// Example 8: File upload security
export const secureFileUpload = createComprehensiveSecurityMiddleware({
  requireAuth: true,
  permissions: [{ resource: 'media', action: 'create' }],
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // Limit file uploads
  },
  customChecks: [
    (req, res, next) => {
      // Validate file upload
      try {
        if (req.file) {
          InputValidator.validateFileUpload(req.file, {
            maxSize: 5 * 1024 * 1024, // 5MB
            allowedTypes: ['image/jpeg', 'image/png', 'image/gif'],
            allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif'],
          });
        }
        next();
      } catch (error) {
        // Report malware upload attempt
        SecurityMonitor.reportMalwareUpload(
          req.ip || 'unknown',
          req.get('User-Agent') || 'unknown',
          req.file?.originalname || 'unknown',
          req.user?.id,
          req.user?.tenantId
        );
        
        res.status(400).json({
          error: {
            code: 'INVALID_FILE',
            message: error instanceof Error ? error.message : 'File validation failed',
          },
        });
      }
    },
  ],
});

// Initialize security monitoring
setupIncidentMonitoring();