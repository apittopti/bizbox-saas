export interface SecurityHeadersOptions {
  contentSecurityPolicy?: {
    directives?: Record<string, string | string[]>;
    reportOnly?: boolean;
  };
  hsts?: {
    maxAge?: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  };
  frameOptions?: 'DENY' | 'SAMEORIGIN' | string;
  contentTypeOptions?: boolean;
  referrerPolicy?: string;
  permissionsPolicy?: Record<string, string>;
  crossOriginEmbedderPolicy?: 'require-corp' | 'unsafe-none';
  crossOriginOpenerPolicy?: 'same-origin' | 'same-origin-allow-popups' | 'unsafe-none';
  crossOriginResourcePolicy?: 'same-site' | 'same-origin' | 'cross-origin';
}

export class SecureHeaders {
  private options: SecurityHeadersOptions;

  constructor(options: SecurityHeadersOptions = {}) {
    this.options = {
      contentSecurityPolicy: {
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:', 'https:'],
          'font-src': ["'self'", 'https:', 'data:'],
          'connect-src': ["'self'"],
          'media-src': ["'self'"],
          'object-src': ["'none'"],
          'child-src': ["'self'"],
          'worker-src': ["'self'"],
          'frame-ancestors': ["'none'"],
          'form-action': ["'self'"],
          'base-uri': ["'self'"],
          'manifest-src': ["'self'"],
        },
        reportOnly: false,
        ...options.contentSecurityPolicy,
      },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
        ...options.hsts,
      },
      frameOptions: options.frameOptions || 'DENY',
      contentTypeOptions: options.contentTypeOptions !== false,
      referrerPolicy: options.referrerPolicy || 'strict-origin-when-cross-origin',
      permissionsPolicy: options.permissionsPolicy || {
        camera: 'none',
        microphone: 'none',
        geolocation: 'none',
        payment: 'none',
        usb: 'none',
      },
      crossOriginEmbedderPolicy: options.crossOriginEmbedderPolicy || 'require-corp',
      crossOriginOpenerPolicy: options.crossOriginOpenerPolicy || 'same-origin',
      crossOriginResourcePolicy: options.crossOriginResourcePolicy || 'same-origin',
    };
  }

  /**
   * Generate Content Security Policy header value
   */
  private generateCSP(): string {
    const directives = this.options.contentSecurityPolicy?.directives || {};
    
    return Object.entries(directives)
      .map(([directive, sources]) => {
        const sourceList = Array.isArray(sources) ? sources.join(' ') : sources;
        return `${directive} ${sourceList}`;
      })
      .join('; ');
  }

  /**
   * Generate HSTS header value
   */
  private generateHSTS(): string {
    const hsts = this.options.hsts!;
    let value = `max-age=${hsts.maxAge}`;
    
    if (hsts.includeSubDomains) {
      value += '; includeSubDomains';
    }
    
    if (hsts.preload) {
      value += '; preload';
    }
    
    return value;
  }

  /**
   * Generate Permissions Policy header value
   */
  private generatePermissionsPolicy(): string {
    const policies = this.options.permissionsPolicy || {};
    
    return Object.entries(policies)
      .map(([feature, allowlist]) => `${feature}=(${allowlist})`)
      .join(', ');
  }

  /**
   * Get all security headers
   */
  getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    // Content Security Policy
    if (this.options.contentSecurityPolicy) {
      const cspHeader = this.options.contentSecurityPolicy.reportOnly
        ? 'Content-Security-Policy-Report-Only'
        : 'Content-Security-Policy';
      headers[cspHeader] = this.generateCSP();
    }

    // HTTP Strict Transport Security
    if (this.options.hsts && process.env.NODE_ENV === 'production') {
      headers['Strict-Transport-Security'] = this.generateHSTS();
    }

    // X-Frame-Options
    if (this.options.frameOptions) {
      headers['X-Frame-Options'] = this.options.frameOptions;
    }

    // X-Content-Type-Options
    if (this.options.contentTypeOptions) {
      headers['X-Content-Type-Options'] = 'nosniff';
    }

    // Referrer Policy
    if (this.options.referrerPolicy) {
      headers['Referrer-Policy'] = this.options.referrerPolicy;
    }

    // Permissions Policy
    if (this.options.permissionsPolicy) {
      headers['Permissions-Policy'] = this.generatePermissionsPolicy();
    }

    // Cross-Origin Embedder Policy
    if (this.options.crossOriginEmbedderPolicy) {
      headers['Cross-Origin-Embedder-Policy'] = this.options.crossOriginEmbedderPolicy;
    }

    // Cross-Origin Opener Policy
    if (this.options.crossOriginOpenerPolicy) {
      headers['Cross-Origin-Opener-Policy'] = this.options.crossOriginOpenerPolicy;
    }

    // Cross-Origin Resource Policy
    if (this.options.crossOriginResourcePolicy) {
      headers['Cross-Origin-Resource-Policy'] = this.options.crossOriginResourcePolicy;
    }

    // Additional security headers
    headers['X-DNS-Prefetch-Control'] = 'off';
    headers['X-Download-Options'] = 'noopen';
    headers['X-Permitted-Cross-Domain-Policies'] = 'none';

    return headers;
  }

  /**
   * Create middleware to set security headers
   */
  createMiddleware() {
    const headers = this.getHeaders();
    
    return (req: any, res: any, next: any) => {
      // Set all security headers
      Object.entries(headers).forEach(([name, value]) => {
        res.setHeader(name, value);
      });

      // Remove potentially dangerous headers
      res.removeHeader('X-Powered-By');
      res.removeHeader('Server');

      next();
    };
  }

  /**
   * Create CSP nonce for inline scripts/styles
   */
  static generateNonce(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(16).toString('base64');
  }

  /**
   * Add nonce to CSP directives
   */
  addNonce(nonce: string): void {
    const csp = this.options.contentSecurityPolicy;
    if (csp && csp.directives) {
      if (csp.directives['script-src']) {
        const scriptSrc = Array.isArray(csp.directives['script-src'])
          ? csp.directives['script-src']
          : [csp.directives['script-src']];
        scriptSrc.push(`'nonce-${nonce}'`);
        csp.directives['script-src'] = scriptSrc;
      }

      if (csp.directives['style-src']) {
        const styleSrc = Array.isArray(csp.directives['style-src'])
          ? csp.directives['style-src']
          : [csp.directives['style-src']];
        styleSrc.push(`'nonce-${nonce}'`);
        csp.directives['style-src'] = styleSrc;
      }
    }
  }
}

// Predefined security configurations
export const securityConfigs = {
  // Strict security for production
  strict: new SecureHeaders({
    contentSecurityPolicy: {
      directives: {
        'default-src': ["'none'"],
        'script-src': ["'self'"],
        'style-src': ["'self'"],
        'img-src': ["'self'", 'data:'],
        'font-src': ["'self'"],
        'connect-src': ["'self'"],
        'media-src': ["'none'"],
        'object-src': ["'none'"],
        'child-src': ["'none'"],
        'worker-src': ["'none'"],
        'frame-ancestors': ["'none'"],
        'form-action': ["'self'"],
        'base-uri': ["'none'"],
        'manifest-src': ["'self'"],
      },
    },
    frameOptions: 'DENY',
    crossOriginEmbedderPolicy: 'require-corp',
    crossOriginOpenerPolicy: 'same-origin',
    crossOriginResourcePolicy: 'same-origin',
  }),

  // Balanced security for most applications
  balanced: new SecureHeaders({
    contentSecurityPolicy: {
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'"],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'img-src': ["'self'", 'data:', 'https:'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'connect-src': ["'self'", 'https://api.stripe.com'],
        'frame-ancestors': ["'none'"],
        'form-action': ["'self'"],
        'base-uri': ["'self'"],
      },
    },
    frameOptions: 'SAMEORIGIN',
  }),

  // Development-friendly configuration
  development: new SecureHeaders({
    contentSecurityPolicy: {
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'localhost:*'],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'https:', 'http:'],
        'font-src': ["'self'", 'data:', 'https:', 'http:'],
        'connect-src': ["'self'", 'ws:', 'wss:', 'http:', 'https:'],
        'frame-ancestors': ["'self'"],
      },
      reportOnly: true, // Don't block in development
    },
    frameOptions: 'SAMEORIGIN',
    hsts: {
      maxAge: 0, // Disable HSTS in development
    },
  }),
};

// Default security headers middleware
export const securityHeadersMiddleware = securityConfigs.balanced.createMiddleware();