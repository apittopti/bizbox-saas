import { z } from 'zod';
import { contentSanitizer } from './content-sanitizer';

/**
 * Comprehensive Input Validation Framework
 * 
 * This framework provides enterprise-grade input validation with:
 * - Zod schema-based validation with custom rules
 * - Rate limiting integration
 * - Content sanitization integration
 * - SQL injection prevention
 * - XSS protection
 * - Business rule validation
 * - Multi-tenant context validation
 */

export interface ValidationOptions {
  sanitize?: boolean;
  maxLength?: number;
  allowHtml?: boolean;
  allowedHtmlTags?: string[];
  requiredRole?: string[];
  tenantContext?: string;
  rateLimit?: {
    key: string;
    limit: number;
    windowMs: number;
  };
  customValidators?: Array<(value: any, context?: any) => string | null>;
}

export interface ValidationContext {
  userId?: string;
  tenantId?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: number;
}

export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  errors?: string[];
  sanitized?: boolean;
  rateLimited?: boolean;
  securityIssues?: string[];
}

export class InputValidator {
  private static instance: InputValidator;
  private rateLimitStore = new Map<string, { count: number; resetTime: number }>();

  // Common validation patterns
  private readonly patterns = {
    // Basic patterns
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    phone: /^[\+]?[1-9][\d]{0,15}$/,
    url: /^https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w\/_.])*(?:\?(?:[\w&=%.])*)?(?:\#(?:[\w.])*)?)?$/,
    
    // Security patterns
    sqlInjection: /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
    xssPattern: /<[^>]*>?/gi,
    pathTraversal: /\.\.[\/\\]/,
    
    // Business patterns
    tenantId: /^[a-zA-Z0-9_-]{1,50}$/,
    userId: /^[a-zA-Z0-9_-]{1,50}$/,
    slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    
    // File patterns
    safeFileName: /^[a-zA-Z0-9._-]+$/,
    imageFile: /\.(jpg|jpeg|png|gif|webp)$/i,
    documentFile: /\.(pdf|doc|docx|txt|csv|xlsx)$/i,
  };

  public static getInstance(): InputValidator {
    if (!InputValidator.instance) {
      InputValidator.instance = new InputValidator();
    }
    return InputValidator.instance;
  }

  /**
   * Validate user registration input
   */
  public validateUserRegistration(input: any, context?: ValidationContext): ValidationResult {
    const schema = z.object({
      email: z.string()
        .email('Invalid email format')
        .max(255, 'Email too long')
        .transform(email => email.toLowerCase().trim()),
      
      password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password too long')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
          'Password must contain uppercase, lowercase, number, and special character'),
      
      firstName: z.string()
        .min(1, 'First name is required')
        .max(50, 'First name too long')
        .transform(name => contentSanitizer.sanitizeText(name, { maxLength: 50 })),
      
      lastName: z.string()
        .min(1, 'Last name is required')
        .max(50, 'Last name too long')
        .transform(name => contentSanitizer.sanitizeText(name, { maxLength: 50 })),
      
      phone: z.string()
        .optional()
        .refine(phone => !phone || this.patterns.phone.test(phone), 'Invalid phone format'),
      
      tenantId: z.string()
        .optional()
        .refine(id => !id || this.patterns.tenantId.test(id), 'Invalid tenant ID format'),
    });

    return this.validateWithSchema(schema, input, {
      rateLimit: { key: `registration:${context?.ipAddress}`, limit: 5, windowMs: 900000 }, // 5 attempts per 15 minutes
      ...context
    });
  }

  /**
   * Validate user login input
   */
  public validateUserLogin(input: any, context?: ValidationContext): ValidationResult {
    const schema = z.object({
      email: z.string()
        .email('Invalid email format')
        .max(255, 'Email too long')
        .transform(email => email.toLowerCase().trim()),
      
      password: z.string()
        .min(1, 'Password is required')
        .max(128, 'Password too long'),
      
      rememberMe: z.boolean().optional().default(false),
      
      mfaCode: z.string()
        .optional()
        .refine(code => !code || /^\d{6}$/.test(code), 'Invalid MFA code format'),
    });

    return this.validateWithSchema(schema, input, {
      rateLimit: { key: `login:${context?.ipAddress}`, limit: 10, windowMs: 900000 }, // 10 attempts per 15 minutes
      ...context
    });
  }

  /**
   * Validate business information input
   */
  public validateBusinessInfo(input: any, context?: ValidationContext): ValidationResult {
    const schema = z.object({
      name: z.string()
        .min(1, 'Business name is required')
        .max(100, 'Business name too long')
        .transform(name => contentSanitizer.sanitizeText(name, { maxLength: 100 })),
      
      description: z.string()
        .optional()
        .max(1000, 'Description too long')
        .transform(desc => desc ? contentSanitizer.sanitizeHtml(desc, { 
          maxLength: 1000,
          allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li']
        }) : undefined),
      
      email: z.string()
        .email('Invalid email format')
        .max(255, 'Email too long'),
      
      phone: z.string()
        .optional()
        .refine(phone => !phone || this.patterns.phone.test(phone), 'Invalid phone format'),
      
      website: z.string()
        .optional()
        .refine(url => !url || this.patterns.url.test(url), 'Invalid website URL')
        .transform(url => url ? contentSanitizer.sanitizeUrl(url) : undefined),
      
      address: z.object({
        street: z.string().max(200, 'Street address too long'),
        city: z.string().max(100, 'City name too long'),
        region: z.string().max(100, 'Region name too long'),
        postalCode: z.string().max(20, 'Postal code too long'),
        country: z.string().max(100, 'Country name too long'),
      }).optional(),
      
      socialMedia: z.object({
        facebook: z.string().url().optional(),
        instagram: z.string().url().optional(),
        twitter: z.string().url().optional(),
        linkedin: z.string().url().optional(),
      }).optional(),
    });

    return this.validateWithSchema(schema, input, context);
  }

  /**
   * Validate content creation input
   */
  public validateContentInput(input: any, context?: ValidationContext): ValidationResult {
    const schema = z.object({
      title: z.string()
        .min(1, 'Title is required')
        .max(200, 'Title too long')
        .transform(title => contentSanitizer.sanitizeText(title, { maxLength: 200 })),
      
      slug: z.string()
        .optional()
        .refine(slug => !slug || this.patterns.slug.test(slug), 'Invalid slug format'),
      
      content: z.string()
        .optional()
        .max(50000, 'Content too long')
        .transform(content => content ? contentSanitizer.sanitizeHtml(content, {
          maxLength: 50000,
          allowedTags: [
            'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a', 'img'
          ]
        }) : undefined),
      
      excerpt: z.string()
        .optional()
        .max(500, 'Excerpt too long')
        .transform(excerpt => excerpt ? contentSanitizer.sanitizeText(excerpt, { maxLength: 500 }) : undefined),
      
      tags: z.array(z.string().max(50, 'Tag too long'))
        .optional()
        .transform(tags => tags ? tags.map(tag => 
          contentSanitizer.sanitizeText(tag, { maxLength: 50 })
        ).filter(tag => tag.length > 0) : undefined),
      
      status: z.enum(['draft', 'published', 'archived']).default('draft'),
      
      featuredImage: z.string()
        .optional()
        .refine(url => !url || this.patterns.url.test(url), 'Invalid image URL'),
      
      seoTitle: z.string()
        .optional()
        .max(60, 'SEO title too long')
        .transform(title => title ? contentSanitizer.sanitizeText(title, { maxLength: 60 }) : undefined),
      
      seoDescription: z.string()
        .optional()
        .max(160, 'SEO description too long')
        .transform(desc => desc ? contentSanitizer.sanitizeText(desc, { maxLength: 160 }) : undefined),
    });

    return this.validateWithSchema(schema, input, {
      requiredRole: ['admin', 'editor'],
      ...context
    });
  }

  /**
   * Validate file upload input
   */
  public validateFileUpload(file: any, context?: ValidationContext): ValidationResult {
    const schema = z.object({
      name: z.string()
        .min(1, 'Filename is required')
        .max(255, 'Filename too long')
        .refine(name => this.patterns.safeFileName.test(name), 'Invalid filename format'),
      
      type: z.string()
        .min(1, 'File type is required')
        .refine(type => [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp',
          'application/pdf', 'text/plain', 'application/json',
          'text/csv', 'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ].includes(type), 'File type not allowed'),
      
      size: z.number()
        .min(1, 'File cannot be empty')
        .max(10 * 1024 * 1024, 'File size too large (max 10MB)'),
    });

    const result = this.validateWithSchema(schema, file, {
      rateLimit: { key: `upload:${context?.userId}`, limit: 50, windowMs: 3600000 }, // 50 uploads per hour
      ...context
    });

    // Additional file validation
    if (result.success && file.buffer) {
      const fileValidation = contentSanitizer.validateFileUpload(file, {
        allowedTypes: [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp',
          'application/pdf', 'text/plain', 'application/json'
        ],
        maxSize: 10 * 1024 * 1024,
        scanForMalware: true,
      });

      if (!fileValidation.isValid) {
        result.success = false;
        result.errors = (result.errors || []).concat(fileValidation.errors);
        result.securityIssues = fileValidation.errors;
      }
    }

    return result;
  }

  /**
   * Validate API parameters
   */
  public validateApiParams(input: any, context?: ValidationContext): ValidationResult {
    const schema = z.object({
      page: z.coerce.number().int().min(1).max(1000).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      sort: z.string().optional().refine(sort => 
        !sort || /^[a-zA-Z_][a-zA-Z0-9_]*(\.(asc|desc))?$/.test(sort), 
        'Invalid sort parameter'
      ),
      filter: z.string().optional().max(500, 'Filter too long'),
      search: z.string()
        .optional()
        .max(200, 'Search query too long')
        .transform(query => query ? contentSanitizer.sanitizeText(query, { maxLength: 200 }) : undefined),
    });

    return this.validateWithSchema(schema, input, {
      rateLimit: { key: `api:${context?.userId}`, limit: 1000, windowMs: 3600000 }, // 1000 API calls per hour
      ...context
    });
  }

  /**
   * Validate payment information
   */
  public validatePaymentInfo(input: any, context?: ValidationContext): ValidationResult {
    const schema = z.object({
      amount: z.number()
        .min(0.5, 'Amount too small')
        .max(50000, 'Amount too large')
        .multipleOf(0.01, 'Invalid amount precision'),
      
      currency: z.string()
        .length(3, 'Invalid currency code')
        .regex(/^[A-Z]{3}$/, 'Currency must be uppercase letters'),
      
      paymentMethodId: z.string()
        .min(1, 'Payment method is required')
        .max(100, 'Payment method ID too long'),
      
      billingAddress: z.object({
        name: z.string().min(1).max(100),
        line1: z.string().min(1).max(200),
        line2: z.string().optional().max(200),
        city: z.string().min(1).max(100),
        state: z.string().optional().max(100),
        postal_code: z.string().min(1).max(20),
        country: z.string().length(2, 'Invalid country code'),
      }),
      
      metadata: z.record(z.string().max(500)).optional(),
    });

    return this.validateWithSchema(schema, input, {
      requiredRole: ['admin', 'user'],
      rateLimit: { key: `payment:${context?.userId}`, limit: 10, windowMs: 3600000 }, // 10 payments per hour
      ...context
    });
  }

  /**
   * Generic validation with schema
   */
  private validateWithSchema<T>(
    schema: z.ZodSchema<T>, 
    input: any, 
    options?: ValidationOptions & ValidationContext
  ): ValidationResult<T> {
    const result: ValidationResult<T> = {
      success: false,
      errors: [],
      securityIssues: [],
    };

    try {
      // Rate limiting check
      if (options?.rateLimit) {
        const rateLimitResult = this.checkRateLimit(
          options.rateLimit.key,
          options.rateLimit.limit,
          options.rateLimit.windowMs
        );
        
        if (!rateLimitResult.allowed) {
          result.rateLimited = true;
          result.errors?.push('Rate limit exceeded. Please try again later.');
          return result;
        }
      }

      // Role-based access check
      if (options?.requiredRole && options.userRole) {
        if (!options.requiredRole.includes(options.userRole)) {
          result.errors?.push('Insufficient permissions');
          return result;
        }
      }

      // Security pattern check
      const securityIssues = this.checkSecurityPatterns(input);
      if (securityIssues.length > 0) {
        result.securityIssues = securityIssues;
        result.errors?.push('Input contains potentially malicious content');
        return result;
      }

      // Schema validation
      const validated = schema.parse(input);
      
      result.success = true;
      result.data = validated;
      result.sanitized = true;

    } catch (error) {
      if (error instanceof z.ZodError) {
        result.errors = error.errors.map(err => err.message);
      } else {
        result.errors = ['Validation failed'];
        console.error('Validation error:', error);
      }
    }

    return result;
  }

  /**
   * Check for security patterns in input
   */
  private checkSecurityPatterns(input: any): string[] {
    const issues: string[] = [];
    
    if (typeof input === 'string') {
      if (this.patterns.sqlInjection.test(input)) {
        issues.push('Potential SQL injection detected');
      }
      
      if (this.patterns.xssPattern.test(input)) {
        issues.push('Potential XSS content detected');
      }
      
      if (this.patterns.pathTraversal.test(input)) {
        issues.push('Path traversal attempt detected');
      }
    } else if (typeof input === 'object' && input !== null) {
      for (const value of Object.values(input)) {
        issues.push(...this.checkSecurityPatterns(value));
      }
    }
    
    return issues;
  }

  /**
   * Simple rate limiting implementation
   */
  private checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const record = this.rateLimitStore.get(key);
    
    if (!record || now > record.resetTime) {
      this.rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return { allowed: true, remaining: limit - 1 };
    }
    
    if (record.count >= limit) {
      return { allowed: false, remaining: 0 };
    }
    
    record.count++;
    return { allowed: true, remaining: limit - record.count };
  }

  /**
   * Clear rate limit records (for maintenance)
   */
  public clearRateLimitRecords(): void {
    const now = Date.now();
    for (const [key, record] of this.rateLimitStore.entries()) {
      if (now > record.resetTime) {
        this.rateLimitStore.delete(key);
      }
    }
  }
}

/**
 * Common validation schemas for reuse
 */
export const commonSchemas = {
  tenantId: z.string().regex(/^[a-zA-Z0-9_-]{1,50}$/, 'Invalid tenant ID'),
  userId: z.string().regex(/^[a-zA-Z0-9_-]{1,50}$/, 'Invalid user ID'),
  email: z.string().email().max(255).transform(email => email.toLowerCase().trim()),
  url: z.string().url().max(2000),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format'),
  phone: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone format'),
  currency: z.string().length(3).regex(/^[A-Z]{3}$/, 'Invalid currency code'),
  countryCode: z.string().length(2).regex(/^[A-Z]{2}$/, 'Invalid country code'),
  
  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().min(1).max(1000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
  
  // Timestamps
  dateRange: z.object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  }).refine(data => data.startDate <= data.endDate, 'End date must be after start date'),
};

// Export singleton instance
export const inputValidator = InputValidator.getInstance();