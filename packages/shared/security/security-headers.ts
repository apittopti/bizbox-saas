import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

/**
 * Comprehensive Security Headers Middleware
 * 
 * Implements all critical security headers including:
 * - Content Security Policy (CSP) with nonce support
 * - X-Frame-Options for clickjacking protection
 * - X-Content-Type-Options for MIME sniffing protection
 * - Strict-Transport-Security for HTTPS enforcement
 * - Referrer-Policy for privacy protection
 * - Permissions-Policy for feature access control
 */

export interface SecurityHeadersOptions {
  // CSP Configuration
  csp?: {
    directives?: Record<string, string | string[]>;
    reportOnly?: boolean;
    reportUri?: string;
    useNonces?: boolean;
    allowInlineScripts?: boolean;
    allowInlineStyles?: boolean;
    allowEval?: boolean;
  };
  
  // HSTS Configuration
  hsts?: {
    maxAge?: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  };
  
  // Frame Options
  frameOptions?: 'DENY' | 'SAMEORIGIN' | string; // string for ALLOW-FROM
  
  // Referrer Policy
  referrerPolicy?: 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url';
  
  // Permissions Policy
  permissionsPolicy?: Record<string, string | string[]>;
  
  // Environment-specific overrides
  development?: Partial<SecurityHeadersOptions>;
  production?: Partial<SecurityHeadersOptions>;
  
  // Feature toggles
  enableHsts?: boolean;
  enableCSP?: boolean;
  enableFrameOptions?: boolean;
  enableContentTypeOptions?: boolean;
  enableReferrerPolicy?: boolean;
  enablePermissionsPolicy?: boolean;
  enableXSSProtection?: boolean;
}

export interface SecurityContext {
  nonce?: string;
  tenantId?: string;
  isPreview?: boolean;
  isDevelopment?: boolean;
  userRole?: string;
}

export class SecurityHeaders {
  private static instance: SecurityHeaders;
  private nonceCache = new Map<string, { nonce: string; timestamp: number }>();
  private readonly nonceMaxAge = 300000; // 5 minutes

  // Secure default configuration
  private readonly defaultOptions: Required<SecurityHeadersOptions> = {
    csp: {
      directives: {
        'default-src': ["'self'"],
        'script-src': [
          "'self'",
          "'unsafe-inline'", // Only for development
          'https://cdn.jsdelivr.net',
          'https://unpkg.com',
          'https://cdnjs.cloudflare.com'
        ],
        'style-src': [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://cdn.jsdelivr.net'
        ],
        'font-src': [
          "'self'",
          'https://fonts.gstatic.com',
          'data:'
        ],
        'img-src': [
          "'self'",
          'data:',
          'blob:',
          'https:',
          'http:'
        ],
        'media-src': ["'self'", 'data:', 'blob:'],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'self'"],
        'upgrade-insecure-requests': [],
        'block-all-mixed-content': [],
      },
      reportOnly: false,
      reportUri: '/api/security/csp-report',
      useNonces: true,
      allowInlineScripts: false,
      allowInlineStyles: true, // Often needed for CSS-in-JS
      allowEval: false,
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    frameOptions: 'SAMEORIGIN',
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissionsPolicy: {
      'camera': ['self'],
      'microphone': ['self'],
      'geolocation': ['self'],
      'payment': ['self'],
      'usb': ['none'],
      'bluetooth': ['none'],
      'accelerometer': ['none'],
      'gyroscope': ['none'],
      'magnetometer': ['none'],
    },
    development: {
      csp: {
        directives: {
          'script-src': [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'", // Allow eval for hot reloading
            'localhost:*',
            '127.0.0.1:*',
            'https://cdn.jsdelivr.net'
          ],
          'connect-src': [
            "'self'",
            'ws://localhost:*',
            'ws://127.0.0.1:*',
            'http://localhost:*',
            'http://127.0.0.1:*'
          ],
        },
      },
      enableHsts: false, // Disable HSTS in development
    },
    production: {
      csp: {
        directives: {
          'script-src': ["'self'", "'nonce-{nonce}'"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'upgrade-insecure-requests': [],
          'block-all-mixed-content': [],
        },
        useNonces: true,
        allowInlineScripts: false,
        allowEval: false,
      },
      enableHsts: true,
    },
    enableHsts: true,
    enableCSP: true,
    enableFrameOptions: true,
    enableContentTypeOptions: true,
    enableReferrerPolicy: true,
    enablePermissionsPolicy: true,
    enableXSSProtection: true,
  };

  public static getInstance(): SecurityHeaders {
    if (!SecurityHeaders.instance) {
      SecurityHeaders.instance = new SecurityHeaders();
    }
    return SecurityHeaders.instance;
  }

  /**
   * Create security headers middleware
   */
  public createMiddleware(options: SecurityHeadersOptions = {}) {
    return (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
      const context = this.extractSecurityContext(req);
      const finalOptions = this.mergeOptions(options, context);
      
      // Set all security headers
      this.setSecurityHeaders(res, finalOptions, context);
      
      // Store nonce in request for use in templates
      if (finalOptions.csp?.useNonces && context.nonce) {
        (req as any).nonce = context.nonce;
      }
      
      next();
    };
  }

  /**
   * Generate a secure nonce for CSP
   */
  public generateNonce(tenantId?: string): string {
    const key = tenantId || 'global';
    const now = Date.now();
    
    // Clean expired nonces
    for (const [k, v] of this.nonceCache.entries()) {
      if (now - v.timestamp > this.nonceMaxAge) {
        this.nonceCache.delete(k);
      }
    }
    
    // Generate new nonce
    const nonce = crypto.randomBytes(16).toString('base64');
    this.nonceCache.set(key, { nonce, timestamp: now });
    
    return nonce;
  }

  /**
   * Get current nonce for a tenant
   */
  public getNonce(tenantId?: string): string | undefined {
    const key = tenantId || 'global';
    const cached = this.nonceCache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.nonceMaxAge) {
      return cached.nonce;
    }
    
    return this.generateNonce(tenantId);
  }

  /**
   * Build Content Security Policy header value
   */
  public buildCSPHeader(
    directives: Record<string, string | string[]>,
    nonce?: string
  ): string {
    const cspDirectives: string[] = [];
    
    for (const [directive, values] of Object.entries(directives)) {
      if (Array.isArray(values)) {
        if (values.length === 0) {
          // Directive without values (like upgrade-insecure-requests)
          cspDirectives.push(directive);
        } else {
          // Replace nonce placeholder if present
          const processedValues = values.map(value => {
            if (value === "'nonce-{nonce}'" && nonce) {
              return `'nonce-${nonce}'`;
            }
            return value;
          });
          cspDirectives.push(`${directive} ${processedValues.join(' ')}`);
        }
      } else {
        // Single value directive
        let processedValue = values;
        if (processedValue === "'nonce-{nonce}'" && nonce) {
          processedValue = `'nonce-${nonce}'`;
        }
        cspDirectives.push(`${directive} ${processedValue}`);
      }
    }
    
    return cspDirectives.join('; ');
  }

  /**
   * Build Permissions Policy header value
   */
  public buildPermissionsPolicyHeader(
    permissions: Record<string, string | string[]>
  ): string {
    const policies: string[] = [];
    
    for (const [feature, allowlist] of Object.entries(permissions)) {
      if (Array.isArray(allowlist)) {
        if (allowlist.length === 0 || allowlist.includes('none')) {
          policies.push(`${feature}=()`);
        } else {
          const processedAllowlist = allowlist.map(origin => 
            origin === 'self' ? 'self' : `"${origin}"`
          );
          policies.push(`${feature}=(${processedAllowlist.join(' ')})`);
        }
      } else {
        if (allowlist === 'none') {
          policies.push(`${feature}=()`);
        } else if (allowlist === 'self') {
          policies.push(`${feature}=(self)`);
        } else {
          policies.push(`${feature}=("${allowlist}")`);
        }
      }
    }
    
    return policies.join(', ');
  }

  // Private helper methods

  private extractSecurityContext(req: NextApiRequest): SecurityContext {
    const tenantId = req.headers['x-tenant-id'] as string || undefined;
    const isPreview = req.query.preview === 'true' || req.headers['x-preview'] === 'true';
    const isDevelopment = process.env.NODE_ENV === 'development';
    const userRole = (req as any).user?.role;
    
    // Generate or retrieve nonce
    const nonce = this.getNonce(tenantId);
    
    return {
      nonce,
      tenantId,
      isPreview,
      isDevelopment,
      userRole,
    };
  }

  private mergeOptions(
    options: SecurityHeadersOptions,
    context: SecurityContext
  ): Required<SecurityHeadersOptions> {
    let merged = { ...this.defaultOptions, ...options };
    
    // Apply environment-specific overrides
    if (context.isDevelopment && merged.development) {
      merged = this.deepMerge(merged, merged.development);
    } else if (!context.isDevelopment && merged.production) {
      merged = this.deepMerge(merged, merged.production);
    }
    
    return merged;
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  private setSecurityHeaders(
    res: NextApiResponse,
    options: Required<SecurityHeadersOptions>,
    context: SecurityContext
  ): void {
    // Content Security Policy
    if (options.enableCSP && options.csp) {
      const cspHeader = this.buildCSPHeader(options.csp.directives, context.nonce);
      const headerName = options.csp.reportOnly 
        ? 'Content-Security-Policy-Report-Only' 
        : 'Content-Security-Policy';
      
      res.setHeader(headerName, cspHeader);
      
      // Set report URI if provided
      if (options.csp.reportUri) {
        res.setHeader('Report-To', JSON.stringify({
          group: 'csp-endpoint',
          max_age: 10886400,
          endpoints: [{ url: options.csp.reportUri }]
        }));
      }
    }

    // Strict Transport Security (HTTPS only)
    if (options.enableHsts && options.hsts && !context.isDevelopment) {
      let hstsValue = `max-age=${options.hsts.maxAge}`;
      
      if (options.hsts.includeSubDomains) {
        hstsValue += '; includeSubDomains';
      }
      
      if (options.hsts.preload) {
        hstsValue += '; preload';
      }
      
      res.setHeader('Strict-Transport-Security', hstsValue);
    }

    // X-Frame-Options
    if (options.enableFrameOptions) {
      res.setHeader('X-Frame-Options', options.frameOptions);
    }

    // X-Content-Type-Options
    if (options.enableContentTypeOptions) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    // X-XSS-Protection (legacy, but still useful)
    if (options.enableXSSProtection) {
      res.setHeader('X-XSS-Protection', '1; mode=block');
    }

    // Referrer Policy
    if (options.enableReferrerPolicy) {
      res.setHeader('Referrer-Policy', options.referrerPolicy);
    }

    // Permissions Policy
    if (options.enablePermissionsPolicy && options.permissionsPolicy) {
      const permissionsPolicyHeader = this.buildPermissionsPolicyHeader(options.permissionsPolicy);
      res.setHeader('Permissions-Policy', permissionsPolicyHeader);
    }

    // Additional security headers
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    
    // Cross-Origin headers for better isolation
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  }
}

/**
 * Utility functions for common security header patterns
 */
export const securityHeaderPresets = {
  // Strict security for production
  strict: (): SecurityHeadersOptions => ({
    csp: {
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'nonce-{nonce}'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'https:'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
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
    frameOptions: 'DENY',
    referrerPolicy: 'no-referrer',
    enableHsts: true,
  }),

  // Balanced security for most applications
  balanced: (): SecurityHeadersOptions => ({
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
    frameOptions: 'SAMEORIGIN',
    referrerPolicy: 'strict-origin-when-cross-origin',
  }),

  // Relaxed security for development
  development: (): SecurityHeadersOptions => ({
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
    frameOptions: 'SAMEORIGIN',
  }),
};

// Export singleton instance
export const securityHeaders = SecurityHeaders.getInstance();