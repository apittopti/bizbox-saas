import DOMPurify from 'isomorphic-dompurify';

export interface ValidationResult {
  isValid: boolean;
  sanitizedContent?: string;
  errors: string[];
  warnings: string[];
}

export interface SecurityConfig {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  maxLength?: number;
  allowImages?: boolean;
  allowLinks?: boolean;
  allowScripts?: boolean;
  enforceHttps?: boolean;
  rateLimiting?: {
    maxRequests: number;
    windowMs: number;
  };
}

export class SecurityValidator {
  private static readonly DEFAULT_CONFIG: SecurityConfig = {
    allowedTags: [
      'p', 'br', 'strong', 'em', 'u', 'i', 'b',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code',
      'div', 'span',
      'a', 'img',
    ],
    allowedAttributes: {
      'a': ['href', 'title', 'target', 'rel'],
      'img': ['src', 'alt', 'title', 'width', 'height'],
      'div': ['class', 'id'],
      'span': ['class', 'id'],
      'p': ['class', 'id'],
      'h1': ['class', 'id'],
      'h2': ['class', 'id'],
      'h3': ['class', 'id'],
      'h4': ['class', 'id'],
      'h5': ['class', 'id'],
      'h6': ['class', 'id'],
    },
    maxLength: 10000,
    allowImages: true,
    allowLinks: true,
    allowScripts: false,
    enforceHttps: true,
    rateLimiting: {
      maxRequests: 100,
      windowMs: 60000, // 1 minute
    },
  };

  /**
   * Validate and sanitize user-generated HTML content
   */
  static validateHTML(content: string, config?: Partial<SecurityConfig>): ValidationResult {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check content length
    if (content.length > finalConfig.maxLength!) {
      errors.push(`Content exceeds maximum length of ${finalConfig.maxLength} characters`);
      return { isValid: false, errors, warnings };
    }

    // Configure DOMPurify
    const purifyConfig = {
      ALLOWED_TAGS: finalConfig.allowedTags,
      ALLOWED_ATTR: Object.values(finalConfig.allowedAttributes || {}).flat(),
      KEEP_CONTENT: true,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      RETURN_DOM_IMPORT: false,
    };

    // Additional security checks
    if (!finalConfig.allowScripts) {
      // Remove all script-related content
      content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      content = content.replace(/on\w+\s*=\s*["'][^"']*["']/gi, ''); // Remove event handlers
      content = content.replace(/javascript:/gi, ''); // Remove javascript: URLs
    }

    if (!finalConfig.allowImages) {
      content = content.replace(/<img\b[^>]*>/gi, '');
      purifyConfig.ALLOWED_TAGS = purifyConfig.ALLOWED_TAGS?.filter(tag => tag !== 'img');
    }

    if (!finalConfig.allowLinks) {
      content = content.replace(/<a\b[^>]*>([^<]*)<\/a>/gi, '$1');
      purifyConfig.ALLOWED_TAGS = purifyConfig.ALLOWED_TAGS?.filter(tag => tag !== 'a');
    }

    // Sanitize with DOMPurify
    const sanitizedContent = DOMPurify.sanitize(content, purifyConfig);

    // Check for malicious patterns
    const maliciousPatterns = [
      /data:text\/html/gi,
      /vbscript:/gi,
      /onload\s*=/gi,
      /onerror\s*=/gi,
      /eval\s*\(/gi,
      /expression\s*\(/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi,
      /<form/gi,
      /<input/gi,
      /<textarea/gi,
      /<select/gi,
      /<button/gi,
    ];

    maliciousPatterns.forEach(pattern => {
      if (pattern.test(content) && !pattern.test(sanitizedContent)) {
        warnings.push(`Potentially malicious content removed: ${pattern.source}`);
      }
    });

    // Validate links if allowed
    if (finalConfig.allowLinks && finalConfig.enforceHttps) {
      const linkPattern = /href\s*=\s*["']([^"']+)["']/gi;
      let match;
      while ((match = linkPattern.exec(sanitizedContent)) !== null) {
        const url = match[1];
        if (url.startsWith('http:')) {
          warnings.push(`Insecure HTTP link detected: ${url}`);
        }
        if (!this.isValidUrl(url)) {
          errors.push(`Invalid URL detected: ${url}`);
        }
      }
    }

    // Validate images if allowed
    if (finalConfig.allowImages) {
      const imgPattern = /src\s*=\s*["']([^"']+)["']/gi;
      let match;
      while ((match = imgPattern.exec(sanitizedContent)) !== null) {
        const src = match[1];
        if (!this.isValidImageUrl(src)) {
          warnings.push(`Potentially unsafe image source: ${src}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      sanitizedContent,
      errors,
      warnings,
    };
  }

  /**
   * Validate and sanitize plain text content
   */
  static validateText(content: string, config?: Partial<SecurityConfig>): ValidationResult {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check length
    if (content.length > finalConfig.maxLength!) {
      errors.push(`Content exceeds maximum length of ${finalConfig.maxLength} characters`);
      return { isValid: false, errors, warnings };
    }

    // Remove any HTML tags
    let sanitizedContent = content.replace(/<[^>]*>/g, '');

    // Decode HTML entities
    sanitizedContent = this.decodeHTMLEntities(sanitizedContent);

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /javascript:/gi,
      /vbscript:/gi,
      /data:text/gi,
      /\<script/gi,
      /eval\s*\(/gi,
      /expression\s*\(/gi,
    ];

    suspiciousPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        warnings.push(`Potentially malicious content detected: ${pattern.source}`);
        sanitizedContent = sanitizedContent.replace(pattern, '');
      }
    });

    // Normalize whitespace
    sanitizedContent = sanitizedContent.replace(/\s+/g, ' ').trim();

    return {
      isValid: errors.length === 0,
      sanitizedContent,
      errors,
      warnings,
    };
  }

  /**
   * Validate JSON data
   */
  static validateJSON(data: any, schema?: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Convert to string and parse to ensure it's valid JSON
      const jsonString = JSON.stringify(data);
      const parsedData = JSON.parse(jsonString);

      // Check for dangerous properties
      const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
      this.checkForDangerousKeys(parsedData, dangerousKeys, errors);

      // Basic XSS protection for string values
      this.sanitizeJSONStrings(parsedData, warnings);

      return {
        isValid: errors.length === 0,
        sanitizedContent: JSON.stringify(parsedData),
        errors,
        warnings,
      };
    } catch (error) {
      errors.push(`Invalid JSON: ${error.message}`);
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Validate file uploads
   */
  static validateFileUpload(
    file: File | { name: string; type: string; size: number },
    config?: {
      allowedTypes?: string[];
      maxSize?: number;
      allowedExtensions?: string[];
      scanForMalware?: boolean;
    }
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const defaultConfig = {
      allowedTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'application/pdf',
        'text/plain',
        'text/csv',
      ],
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.pdf', '.txt', '.csv'],
      scanForMalware: true,
    };

    const finalConfig = { ...defaultConfig, ...config };

    // Check file size
    if (file.size > finalConfig.maxSize) {
      errors.push(`File size exceeds maximum of ${finalConfig.maxSize} bytes`);
    }

    // Check file type
    if (!finalConfig.allowedTypes.includes(file.type)) {
      errors.push(`File type '${file.type}' is not allowed`);
    }

    // Check file extension
    const extension = this.getFileExtension(file.name).toLowerCase();
    if (!finalConfig.allowedExtensions.includes(extension)) {
      errors.push(`File extension '${extension}' is not allowed`);
    }

    // Check for suspicious file names
    const suspiciousNames = [
      /\.exe$/i,
      /\.bat$/i,
      /\.cmd$/i,
      /\.com$/i,
      /\.pif$/i,
      /\.scr$/i,
      /\.vbs$/i,
      /\.js$/i,
      /\.jar$/i,
      /\.php$/i,
      /\.asp$/i,
      /\.aspx$/i,
      /\.jsp$/i,
    ];

    suspiciousNames.forEach(pattern => {
      if (pattern.test(file.name)) {
        errors.push(`Potentially dangerous file type: ${file.name}`);
      }
    });

    // Check for double extensions
    if (file.name.split('.').length > 2) {
      warnings.push(`File has multiple extensions: ${file.name}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Rate limiting check
   */
  static checkRateLimit(
    identifier: string,
    config: SecurityConfig['rateLimiting'] = this.DEFAULT_CONFIG.rateLimiting!
  ): { allowed: boolean; remainingRequests: number; resetTime: number } {
    // In a real implementation, this would use Redis or another store
    // For now, we'll use a simple in-memory store
    const store = this.getRateLimitStore();
    const now = Date.now();
    const windowStart = now - config.windowMs;

    if (!store[identifier]) {
      store[identifier] = [];
    }

    // Remove old requests outside the window
    store[identifier] = store[identifier].filter(timestamp => timestamp > windowStart);

    // Check if limit exceeded
    const allowed = store[identifier].length < config.maxRequests;
    
    if (allowed) {
      store[identifier].push(now);
    }

    return {
      allowed,
      remainingRequests: Math.max(0, config.maxRequests - store[identifier].length),
      resetTime: windowStart + config.windowMs,
    };
  }

  /**
   * Input sanitization for database queries
   */
  static sanitizeForDatabase(input: string): string {
    // Remove null bytes
    let sanitized = input.replace(/\0/g, '');
    
    // Remove SQL injection patterns
    const sqlPatterns = [
      /(\s|^)(union|select|insert|update|delete|drop|create|alter|exec|execute)(\s|$)/gi,
      /--/g,
      /\/\*/g,
      /\*\//g,
      /;/g,
    ];

    sqlPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Limit length
    if (sanitized.length > 1000) {
      sanitized = sanitized.substring(0, 1000);
    }

    return sanitized.trim();
  }

  // Private helper methods
  private static isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:', 'mailto:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  private static isValidImageUrl(src: string): boolean {
    try {
      const url = new URL(src);
      return ['http:', 'https:', 'data:'].includes(url.protocol);
    } catch {
      // Relative URLs are allowed
      return !src.includes('javascript:') && !src.includes('vbscript:');
    }
  }

  private static decodeHTMLEntities(text: string): string {
    const entities = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#x27;': "'",
      '&#x2F;': '/',
      '&#x60;': '`',
      '&#x3D;': '=',
    };

    return text.replace(/&[#\w]+;/g, (entity) => entities[entity as keyof typeof entities] || entity);
  }

  private static checkForDangerousKeys(obj: any, dangerousKeys: string[], errors: string[]): void {
    if (typeof obj !== 'object' || obj === null) return;

    for (const key in obj) {
      if (dangerousKeys.includes(key)) {
        errors.push(`Dangerous property detected: ${key}`);
      }

      if (typeof obj[key] === 'object') {
        this.checkForDangerousKeys(obj[key], dangerousKeys, errors);
      }
    }
  }

  private static sanitizeJSONStrings(obj: any, warnings: string[]): void {
    if (typeof obj !== 'object' || obj === null) return;

    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        const original = obj[key];
        const sanitized = DOMPurify.sanitize(original, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
        if (original !== sanitized) {
          warnings.push(`String value sanitized for key: ${key}`);
          obj[key] = sanitized;
        }
      } else if (typeof obj[key] === 'object') {
        this.sanitizeJSONStrings(obj[key], warnings);
      }
    }
  }

  private static getFileExtension(filename: string): string {
    return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
  }

  private static getRateLimitStore(): Record<string, number[]> {
    // In a real implementation, this would be stored in Redis or another persistent store
    if (!(globalThis as any).__rateLimitStore) {
      (globalThis as any).__rateLimitStore = {};
    }
    return (globalThis as any).__rateLimitStore;
  }
}

/**
 * Content Security Policy utilities
 */
export class CSPUtils {
  static generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  static generateCSPHeader(config?: {
    allowInlineStyles?: boolean;
    allowInlineScripts?: boolean;
    allowEval?: boolean;
    nonce?: string;
    reportUri?: string;
  }): string {
    const defaultSrc = ["'self'"];
    const scriptSrc = ["'self'"];
    const styleSrc = ["'self'"];
    const imgSrc = ["'self'", 'data:', 'https:'];
    const connectSrc = ["'self'"];
    const fontSrc = ["'self'", 'https://fonts.gstatic.com'];

    if (config?.allowInlineStyles) {
      styleSrc.push("'unsafe-inline'");
    }

    if (config?.allowInlineScripts) {
      scriptSrc.push("'unsafe-inline'");
    }

    if (config?.allowEval) {
      scriptSrc.push("'unsafe-eval'");
    }

    if (config?.nonce) {
      scriptSrc.push(`'nonce-${config.nonce}'`);
      styleSrc.push(`'nonce-${config.nonce}'`);
    }

    let csp = [
      `default-src ${defaultSrc.join(' ')}`,
      `script-src ${scriptSrc.join(' ')}`,
      `style-src ${styleSrc.join(' ')}`,
      `img-src ${imgSrc.join(' ')}`,
      `connect-src ${connectSrc.join(' ')}`,
      `font-src ${fontSrc.join(' ')}`,
      `object-src 'none'`,
      `media-src 'self'`,
      `frame-src 'self'`,
      `worker-src 'self' blob:`,
      `manifest-src 'self'`,
      `base-uri 'self'`,
      `form-action 'self'`,
    ].join('; ');

    if (config?.reportUri) {
      csp += `; report-uri ${config.reportUri}`;
    }

    return csp;
  }
}

/**
 * CSRF protection utilities
 */
export class CSRFUtils {
  static generateToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  static verifyToken(token: string, storedToken: string): boolean {
    if (!token || !storedToken || token.length !== storedToken.length) {
      return false;
    }

    // Constant-time comparison
    let result = 0;
    for (let i = 0; i < token.length; i++) {
      result |= token.charCodeAt(i) ^ storedToken.charCodeAt(i);
    }

    return result === 0;
  }
}

export { SecurityValidator as default };