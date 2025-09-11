import { createHash, randomBytes } from 'crypto';

export interface CSRFOptions {
  secret: string;
  cookieName?: string;
  headerName?: string;
  tokenLength?: number;
  sameSite?: 'strict' | 'lax' | 'none';
  secure?: boolean;
  httpOnly?: boolean;
}

export class CSRFProtection {
  private options: Required<CSRFOptions>;

  constructor(options: CSRFOptions) {
    this.options = {
      cookieName: 'csrf-token',
      headerName: 'x-csrf-token',
      tokenLength: 32,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false, // Client needs to read this for AJAX requests
      ...options,
    };
  }

  /**
   * Generate a CSRF token
   */
  generateToken(sessionId?: string): string {
    const randomToken = randomBytes(this.options.tokenLength).toString('hex');
    const payload = sessionId ? `${sessionId}:${randomToken}` : randomToken;
    
    return createHash('sha256')
      .update(`${this.options.secret}:${payload}`)
      .digest('hex');
  }

  /**
   * Verify a CSRF token
   */
  verifyToken(token: string, sessionId?: string): boolean {
    try {
      const expectedToken = this.generateToken(sessionId);
      return token === expectedToken;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create CSRF middleware for Express/Next.js
   */
  createMiddleware() {
    return (req: any, res: any, next: any) => {
      const method = req.method?.toUpperCase();
      
      // Skip CSRF check for safe methods
      if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        // Generate and set token for safe methods
        const token = this.generateToken(req.session?.id);
        
        res.setHeader('Set-Cookie', [
          `${this.options.cookieName}=${token}; Path=/; SameSite=${this.options.sameSite}${
            this.options.secure ? '; Secure' : ''
          }${this.options.httpOnly ? '; HttpOnly' : ''}`,
        ]);
        
        return next();
      }

      // Check CSRF token for unsafe methods
      const token = req.headers[this.options.headerName] || 
                   req.body?._csrf || 
                   req.query._csrf;

      if (!token) {
        return res.status(403).json({
          error: {
            code: 'CSRF_TOKEN_MISSING',
            message: 'CSRF token is required',
          },
        });
      }

      const isValid = this.verifyToken(token, req.session?.id);
      
      if (!isValid) {
        return res.status(403).json({
          error: {
            code: 'CSRF_TOKEN_INVALID',
            message: 'Invalid CSRF token',
          },
        });
      }

      next();
    };
  }

  /**
   * Get CSRF token from request
   */
  getTokenFromRequest(req: any): string | null {
    return req.cookies?.[this.options.cookieName] || null;
  }
}

// Default CSRF protection instance
export const csrfProtection = new CSRFProtection({
  secret: process.env.NEXTAUTH_SECRET || 'fallback-csrf-secret',
});

export const csrfMiddleware = csrfProtection.createMiddleware();