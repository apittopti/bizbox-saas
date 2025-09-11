import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

export interface ValidationOptions {
  stripHtml?: boolean;
  allowedTags?: string[];
  maxLength?: number;
  trimWhitespace?: boolean;
}

export class InputValidator {
  /**
   * Sanitize HTML input to prevent XSS attacks
   */
  static sanitizeHtml(input: string, options: ValidationOptions = {}): string {
    const {
      allowedTags = ['b', 'i', 'em', 'strong', 'p', 'br'],
      stripHtml = false,
    } = options;

    if (stripHtml) {
      return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
    }

    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: allowedTags,
      ALLOWED_ATTR: ['href', 'title', 'alt'],
    });
  }

  /**
   * Validate and sanitize string input
   */
  static sanitizeString(input: string, options: ValidationOptions = {}): string {
    const {
      maxLength = 1000,
      trimWhitespace = true,
      stripHtml = true,
    } = options;

    let sanitized = input;

    if (trimWhitespace) {
      sanitized = sanitized.trim();
    }

    if (stripHtml) {
      sanitized = this.sanitizeHtml(sanitized, { stripHtml: true });
    }

    if (sanitized.length > maxLength) {
      throw new Error(`Input exceeds maximum length of ${maxLength} characters`);
    }

    return sanitized;
  }

  /**
   * Validate email format and sanitize
   */
  static validateEmail(email: string): string {
    const sanitized = this.sanitizeString(email.toLowerCase(), {
      maxLength: 254,
      stripHtml: true,
    });

    const emailSchema = z.string().email();
    const result = emailSchema.safeParse(sanitized);

    if (!result.success) {
      throw new Error('Invalid email format');
    }

    return result.data;
  }

  /**
   * Validate URL and prevent malicious redirects
   */
  static validateUrl(url: string, allowedDomains?: string[]): string {
    const sanitized = this.sanitizeString(url, {
      maxLength: 2048,
      stripHtml: true,
    });

    try {
      const urlObj = new URL(sanitized);
      
      // Only allow HTTP and HTTPS protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Invalid URL protocol');
      }

      // Check allowed domains if specified
      if (allowedDomains && allowedDomains.length > 0) {
        const isAllowed = allowedDomains.some(domain => 
          urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
        );

        if (!isAllowed) {
          throw new Error('URL domain not allowed');
        }
      }

      return urlObj.toString();
    } catch (error) {
      throw new Error('Invalid URL format');
    }
  }

  /**
   * Validate file upload
   */
  static validateFileUpload(file: {
    name: string;
    size: number;
    type: string;
  }, options: {
    maxSize?: number;
    allowedTypes?: string[];
    allowedExtensions?: string[];
  } = {}): void {
    const {
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    } = options;

    // Check file size
    if (file.size > maxSize) {
      throw new Error(`File size exceeds maximum of ${maxSize} bytes`);
    }

    // Check MIME type
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} not allowed`);
    }

    // Check file extension
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!allowedExtensions.includes(extension)) {
      throw new Error(`File extension ${extension} not allowed`);
    }

    // Validate filename
    const sanitizedName = this.sanitizeString(file.name, {
      maxLength: 255,
      stripHtml: true,
    });

    // Check for dangerous patterns in filename
    const dangerousPatterns = [
      /\.\./,  // Directory traversal
      /[<>:"|?*]/,  // Invalid filename characters
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i,  // Windows reserved names
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(sanitizedName)) {
        throw new Error('Invalid filename');
      }
    }
  }

  /**
   * Prevent SQL injection by validating database identifiers
   */
  static validateDbIdentifier(identifier: string): string {
    const sanitized = identifier.trim();
    
    // Only allow alphanumeric characters, underscores, and hyphens
    if (!/^[a-zA-Z0-9_-]+$/.test(sanitized)) {
      throw new Error('Invalid database identifier');
    }

    // Prevent SQL keywords (basic check)
    const sqlKeywords = [
      'select', 'insert', 'update', 'delete', 'drop', 'create', 'alter',
      'union', 'where', 'from', 'join', 'having', 'group', 'order',
    ];

    if (sqlKeywords.includes(sanitized.toLowerCase())) {
      throw new Error('Database identifier cannot be a SQL keyword');
    }

    return sanitized;
  }

  /**
   * Create validation middleware
   */
  static createValidationMiddleware(schema: z.ZodSchema, target: 'body' | 'query' | 'params' = 'body') {
    return (req: any, res: any, next: any) => {
      try {
        const dataToValidate = req[target];
        
        // Sanitize strings in the data
        const sanitizedData = this.sanitizeObject(dataToValidate);
        
        // Validate with schema
        const result = schema.safeParse(sanitizedData);
        
        if (!result.success) {
          return res.status(400).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Input validation failed',
              details: result.error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
              })),
            },
          });
        }

        // Replace original data with validated data
        req[target] = result.data;
        next();
      } catch (error) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error instanceof Error ? error.message : 'Validation failed',
          },
        });
      }
    };
  }

  /**
   * Recursively sanitize object properties
   */
  private static sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeString(key, { maxLength: 100 });
        sanitized[sanitizedKey] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  }
}

// SQL injection prevention
export class SQLInjectionPrevention {
  /**
   * Escape SQL string literals
   */
  static escapeString(value: string): string {
    return value.replace(/'/g, "''");
  }

  /**
   * Validate SQL parameters (use with parameterized queries)
   */
  static validateSqlParams(params: any[]): any[] {
    return params.map(param => {
      if (typeof param === 'string') {
        return InputValidator.sanitizeString(param);
      }
      return param;
    });
  }

  /**
   * Create safe SQL query builder (basic implementation)
   */
  static buildSafeQuery(
    template: string,
    params: Record<string, any>
  ): { query: string; values: any[] } {
    const values: any[] = [];
    let paramIndex = 1;

    const query = template.replace(/:(\w+)/g, (match, paramName) => {
      if (!(paramName in params)) {
        throw new Error(`Missing parameter: ${paramName}`);
      }

      const value = params[paramName];
      
      // Validate parameter
      if (typeof value === 'string') {
        InputValidator.validateDbIdentifier(value);
      }

      values.push(value);
      return `$${paramIndex++}`;
    });

    return { query, values };
  }
}

// Export convenience functions
export const sanitizeHtml = InputValidator.sanitizeHtml;
export const sanitizeString = InputValidator.sanitizeString;
export const validateEmail = InputValidator.validateEmail;
export const validateUrl = InputValidator.validateUrl;
export const createValidationMiddleware = InputValidator.createValidationMiddleware;