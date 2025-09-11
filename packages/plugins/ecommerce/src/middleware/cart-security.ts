import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// Security configuration constants
const CART_SESSION_KEY = process.env.CART_SESSION_KEY || 'default-cart-session-key-change-in-production';
const CSRF_TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 100; // Max requests per window

export interface SecureCartSession {
  cartId: string;
  tenantId: string;
  customerId?: string;
  sessionId: string;
  createdAt: number;
  lastActivity: number;
  csrfToken: string;
  encrypted: boolean;
}

export interface CartSecurityContext {
  session: SecureCartSession;
  isValidSession: boolean;
  isRateLimited: boolean;
  hasValidCSRF: boolean;
  sanitizedData: any;
  auditLog: CartAuditLog;
}

export interface CartAuditLog {
  timestamp: number;
  action: string;
  tenantId: string;
  sessionId: string;
  customerId?: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  errorMessage?: string;
  riskScore: number;
}

// Cart operation validation schemas
export const cartOperationSchemas = {
  addItem: z.object({
    productId: z.string().uuid('Invalid product ID format'),
    quantity: z.number().int().min(1).max(999, 'Quantity must be between 1 and 999'),
    variantId: z.string().uuid().optional(),
    customizations: z.record(z.any()).optional(),
  }),
  updateQuantity: z.object({
    itemId: z.string().uuid('Invalid item ID format'),
    quantity: z.number().int().min(0).max(999, 'Invalid quantity'),
  }),
  applyCoupon: z.object({
    couponCode: z.string().min(1).max(50).regex(/^[A-Z0-9-_]+$/, 'Invalid coupon format'),
  }),
  updateAddress: z.object({
    firstName: z.string().min(1).max(50, 'First name too long'),
    lastName: z.string().min(1).max(50, 'Last name too long'),
    company: z.string().max(100).optional(),
    address1: z.string().min(1).max(255, 'Address line 1 too long'),
    address2: z.string().max(255).optional(),
    city: z.string().min(1).max(100, 'City name too long'),
    province: z.string().min(1).max(100, 'Province/state too long'),
    country: z.string().length(2, 'Invalid country code'),
    postalCode: z.string().min(1).max(20, 'Invalid postal code'),
    phone: z.string().max(20).regex(/^[\+\-\(\)\d\s]+$/, 'Invalid phone format').optional(),
  }),
};

export class CartSecurityMiddleware {
  private csrfTokens: Map<string, { token: string; expires: number }> = new Map();
  private rateLimitStore: Map<string, { requests: number; resetTime: number }> = new Map();
  private auditLogs: CartAuditLog[] = [];

  /**
   * Main security middleware for cart operations
   */
  async secureCartOperation(
    request: NextRequest,
    operation: keyof typeof cartOperationSchemas,
    data: any
  ): Promise<CartSecurityContext> {
    const startTime = Date.now();
    const ipAddress = this.getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Initialize audit log
    const auditLog: CartAuditLog = {
      timestamp: startTime,
      action: operation,
      tenantId: '',
      sessionId: '',
      ipAddress,
      userAgent,
      success: false,
      riskScore: 0,
    };

    try {
      // 1. Rate limiting check
      const rateLimitResult = await this.checkRateLimit(ipAddress);
      if (!rateLimitResult.allowed) {
        auditLog.errorMessage = 'Rate limit exceeded';
        auditLog.riskScore = 10;
        this.logAudit(auditLog);
        
        return {
          session: {} as SecureCartSession,
          isValidSession: false,
          isRateLimited: true,
          hasValidCSRF: false,
          sanitizedData: null,
          auditLog,
        };
      }

      // 2. Extract and validate session
      const session = await this.extractSecureSession(request);
      if (!session) {
        auditLog.errorMessage = 'Invalid or missing session';
        auditLog.riskScore = 8;
        this.logAudit(auditLog);

        return {
          session: {} as SecureCartSession,
          isValidSession: false,
          isRateLimited: false,
          hasValidCSRF: false,
          sanitizedData: null,
          auditLog,
        };
      }

      auditLog.tenantId = session.tenantId;
      auditLog.sessionId = session.sessionId;
      auditLog.customerId = session.customerId;

      // 3. CSRF token validation
      const csrfValid = await this.validateCSRFToken(request, session);
      if (!csrfValid) {
        auditLog.errorMessage = 'Invalid CSRF token';
        auditLog.riskScore = 9;
        this.logAudit(auditLog);

        return {
          session,
          isValidSession: true,
          isRateLimited: false,
          hasValidCSRF: false,
          sanitizedData: null,
          auditLog,
        };
      }

      // 4. Input validation and sanitization
      const sanitizedData = await this.validateAndSanitizeInput(operation, data);
      if (!sanitizedData.success) {
        auditLog.errorMessage = `Input validation failed: ${sanitizedData.error}`;
        auditLog.riskScore = 6;
        this.logAudit(auditLog);

        return {
          session,
          isValidSession: true,
          isRateLimited: false,
          hasValidCSRF: true,
          sanitizedData: null,
          auditLog,
        };
      }

      // 5. Calculate risk score
      auditLog.riskScore = this.calculateRiskScore(request, session, operation);

      // Success
      auditLog.success = true;
      this.logAudit(auditLog);

      return {
        session,
        isValidSession: true,
        isRateLimited: false,
        hasValidCSRF: true,
        sanitizedData: sanitizedData.data,
        auditLog,
      };

    } catch (error) {
      auditLog.errorMessage = `Security middleware error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      auditLog.riskScore = 10;
      this.logAudit(auditLog);

      return {
        session: {} as SecureCartSession,
        isValidSession: false,
        isRateLimited: false,
        hasValidCSRF: false,
        sanitizedData: null,
        auditLog,
      };
    }
  }

  /**
   * Create a new secure cart session
   */
  async createSecureSession(tenantId: string, customerId?: string): Promise<SecureCartSession> {
    const sessionId = this.generateSecureId();
    const cartId = this.generateSecureId('cart');
    const csrfToken = this.generateCSRFToken();

    const session: SecureCartSession = {
      cartId,
      tenantId,
      customerId,
      sessionId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      csrfToken,
      encrypted: true,
    };

    // Store CSRF token
    this.csrfTokens.set(sessionId, {
      token: csrfToken,
      expires: Date.now() + CSRF_TOKEN_EXPIRY,
    });

    return session;
  }

  /**
   * Encrypt cart session data
   */
  encryptSession(session: SecureCartSession): string {
    const cipher = crypto.createCipher('aes-256-cbc', CART_SESSION_KEY);
    let encrypted = cipher.update(JSON.stringify(session), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  /**
   * Decrypt cart session data
   */
  decryptSession(encryptedSession: string): SecureCartSession | null {
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', CART_SESSION_KEY);
      let decrypted = decipher.update(encryptedSession, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return JSON.parse(decrypted);
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract and validate secure session from request
   */
  private async extractSecureSession(request: NextRequest): Promise<SecureCartSession | null> {
    // Try cookie first
    const sessionCookie = request.cookies.get('cart_session')?.value;
    if (sessionCookie) {
      const session = this.decryptSession(sessionCookie);
      if (session && this.isSessionValid(session)) {
        // Update last activity
        session.lastActivity = Date.now();
        return session;
      }
    }

    // Try header
    const sessionHeader = request.headers.get('x-cart-session');
    if (sessionHeader) {
      const session = this.decryptSession(sessionHeader);
      if (session && this.isSessionValid(session)) {
        session.lastActivity = Date.now();
        return session;
      }
    }

    return null;
  }

  /**
   * Validate session is still valid
   */
  private isSessionValid(session: SecureCartSession): boolean {
    const now = Date.now();
    const sessionAge = now - session.createdAt;
    const inactivityTime = now - session.lastActivity;

    // Session expires after 24 hours or 2 hours of inactivity
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const maxInactivity = 2 * 60 * 60 * 1000; // 2 hours

    return sessionAge < maxAge && inactivityTime < maxInactivity;
  }

  /**
   * Validate CSRF token
   */
  private async validateCSRFToken(request: NextRequest, session: SecureCartSession): Promise<boolean> {
    const tokenFromHeader = request.headers.get('x-csrf-token');
    const tokenFromBody = request.headers.get('content-type')?.includes('application/json') 
      ? (await request.json())._csrfToken 
      : undefined;

    const providedToken = tokenFromHeader || tokenFromBody;
    
    if (!providedToken) {
      return false;
    }

    const storedTokenData = this.csrfTokens.get(session.sessionId);
    if (!storedTokenData) {
      return false;
    }

    // Check token expiry
    if (Date.now() > storedTokenData.expires) {
      this.csrfTokens.delete(session.sessionId);
      return false;
    }

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(providedToken, 'utf8'),
      Buffer.from(storedTokenData.token, 'utf8')
    );
  }

  /**
   * Rate limiting check
   */
  private async checkRateLimit(identifier: string): Promise<{ allowed: boolean; resetTime?: number }> {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;

    let rateLimitData = this.rateLimitStore.get(identifier);
    
    if (!rateLimitData || rateLimitData.resetTime < windowStart) {
      // Reset or create new rate limit data
      rateLimitData = {
        requests: 1,
        resetTime: now + RATE_LIMIT_WINDOW,
      };
      this.rateLimitStore.set(identifier, rateLimitData);
      return { allowed: true };
    }

    if (rateLimitData.requests >= RATE_LIMIT_MAX_REQUESTS) {
      return { allowed: false, resetTime: rateLimitData.resetTime };
    }

    rateLimitData.requests++;
    this.rateLimitStore.set(identifier, rateLimitData);
    return { allowed: true };
  }

  /**
   * Validate and sanitize input data
   */
  private async validateAndSanitizeInput(
    operation: keyof typeof cartOperationSchemas,
    data: any
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const schema = cartOperationSchemas[operation];
    
    try {
      // First, sanitize string inputs
      const sanitizedData = this.sanitizeObject(data);
      
      // Then validate with schema
      const validatedData = schema.parse(sanitizedData);
      
      return { success: true, data: validatedData };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { 
          success: false, 
          error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        };
      }
      return { success: false, error: 'Validation error' };
    }
  }

  /**
   * Sanitize object recursively
   */
  private sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      // Remove potential XSS vectors
      return DOMPurify.sanitize(obj, { 
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true,
      }).trim();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }
    
    if (obj !== null && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Sanitize key names to prevent prototype pollution
        const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '');
        if (safeKey && !['__proto__', 'constructor', 'prototype'].includes(safeKey)) {
          sanitized[safeKey] = this.sanitizeObject(value);
        }
      }
      return sanitized;
    }
    
    return obj;
  }

  /**
   * Calculate risk score for the operation
   */
  private calculateRiskScore(request: NextRequest, session: SecureCartSession, operation: string): number {
    let score = 0;

    // Check for suspicious patterns
    const userAgent = request.headers.get('user-agent') || '';
    if (!userAgent || userAgent.length < 10) {
      score += 3; // Suspicious user agent
    }

    // Check session age
    const sessionAge = Date.now() - session.createdAt;
    if (sessionAge < 1000) { // Very new session
      score += 2;
    }

    // Check for high-risk operations
    if (['applyCoupon', 'updateAddress'].includes(operation)) {
      score += 1;
    }

    // Check for rapid requests
    const recentLogs = this.auditLogs
      .filter(log => 
        log.sessionId === session.sessionId && 
        Date.now() - log.timestamp < 60000 // Last minute
      );
    
    if (recentLogs.length > 10) {
      score += 4; // Very high frequency
    } else if (recentLogs.length > 5) {
      score += 2; // High frequency
    }

    return Math.min(score, 10); // Max score of 10
  }

  /**
   * Generate secure random ID
   */
  private generateSecureId(prefix: string = 'sess'): string {
    const timestamp = Date.now().toString(36);
    const randomBytes = crypto.randomBytes(16).toString('hex');
    return `${prefix}_${timestamp}_${randomBytes}`;
  }

  /**
   * Generate CSRF token
   */
  private generateCSRFToken(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Get client IP address
   */
  private getClientIP(request: NextRequest): string {
    // Check various headers for the real IP
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfIP = request.headers.get('cf-connecting-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    if (realIP) {
      return realIP;
    }
    
    if (cfIP) {
      return cfIP;
    }
    
    return 'unknown';
  }

  /**
   * Log audit event
   */
  private logAudit(auditLog: CartAuditLog): void {
    this.auditLogs.push(auditLog);
    
    // Keep only last 1000 logs in memory
    if (this.auditLogs.length > 1000) {
      this.auditLogs = this.auditLogs.slice(-1000);
    }

    // In production, send to secure logging service
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify({
        ...auditLog,
        type: 'cart_security_audit',
      }));
    }
  }

  /**
   * Get audit logs for analysis
   */
  getAuditLogs(sessionId?: string, tenantId?: string): CartAuditLog[] {
    return this.auditLogs.filter(log => {
      if (sessionId && log.sessionId !== sessionId) return false;
      if (tenantId && log.tenantId !== tenantId) return false;
      return true;
    });
  }

  /**
   * Clean up expired tokens and rate limit data
   */
  cleanup(): void {
    const now = Date.now();
    
    // Clean up expired CSRF tokens
    for (const [sessionId, tokenData] of this.csrfTokens.entries()) {
      if (now > tokenData.expires) {
        this.csrfTokens.delete(sessionId);
      }
    }
    
    // Clean up old rate limit data
    for (const [identifier, rateLimitData] of this.rateLimitStore.entries()) {
      if (now > rateLimitData.resetTime) {
        this.rateLimitStore.delete(identifier);
      }
    }
  }

  /**
   * Create security headers for responses
   */
  createSecurityHeaders(): HeadersInit {
    return {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com;",
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    };
  }
}

// Singleton instance
export const cartSecurityMiddleware = new CartSecurityMiddleware();

// Cleanup interval - run every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    cartSecurityMiddleware.cleanup();
  }, 5 * 60 * 1000);
}