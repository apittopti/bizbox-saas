import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';

/**
 * Comprehensive Content Sanitization Service
 * 
 * This service provides enterprise-grade content sanitization to prevent:
 * - XSS attacks through malicious HTML/JavaScript injection
 * - SQL injection through unsafe content
 * - File upload vulnerabilities
 * - URL/Link-based attacks
 */

export interface SanitizationOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  allowedSchemes?: string[];
  stripHtmlTags?: boolean;
  maxLength?: number;
  allowDataAttributes?: boolean;
  allowCustomElements?: boolean;
  returnCleanHTML?: boolean;
}

export interface FileSanitizationOptions {
  allowedTypes?: string[];
  maxSize?: number;
  scanForMalware?: boolean;
  stripMetadata?: boolean;
}

export interface UrlSanitizationOptions {
  allowedProtocols?: string[];
  allowedDomains?: string[];
  blockSuspiciousPatterns?: boolean;
  validateTLD?: boolean;
}

export class ContentSanitizer {
  private static instance: ContentSanitizer;
  
  // Secure default configuration
  private readonly defaultHtmlConfig = {
    ALLOWED_TAGS: [
      // Text formatting
      'p', 'br', 'strong', 'em', 'u', 'sub', 'sup',
      // Lists
      'ul', 'ol', 'li',
      // Headers (limited)
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      // Basic structure
      'div', 'span', 'blockquote', 'pre', 'code',
      // Links (with restrictions)
      'a',
      // Images (with restrictions)
      'img',
      // Tables
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      // Basic media (with restrictions)
      'video', 'audio', 'source',
    ],
    ALLOWED_ATTR: [
      'href', 'title', 'alt', 'src', 'width', 'height', 
      'class', 'id', 'role', 'aria-*', 'data-*',
      'target', 'rel', 'type', 'controls', 'autoplay', 'muted'
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
    FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'frame', 'frameset', 'form', 'input', 'button', 'textarea', 'select'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit'],
    KEEP_CONTENT: false,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM_IMPORT: false,
    SANITIZE_DOM: true,
    WHOLE_DOCUMENT: false,
    IN_PLACE: false,
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SAFE_FOR_TEMPLATES: true,
  };

  // Restrictive configuration for user-generated content
  private readonly restrictiveHtmlConfig = {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'blockquote'],
    ALLOWED_ATTR: ['class'],
    FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'frame', 'a', 'img', 'video', 'audio'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'href', 'src'],
    KEEP_CONTENT: true,
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SAFE_FOR_TEMPLATES: true,
  };

  // Text-only configuration
  private readonly textOnlyConfig = {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
  };

  public static getInstance(): ContentSanitizer {
    if (!ContentSanitizer.instance) {
      ContentSanitizer.instance = new ContentSanitizer();
    }
    return ContentSanitizer.instance;
  }

  /**
   * Sanitize HTML content with comprehensive XSS protection
   */
  public sanitizeHtml(
    content: string, 
    options: SanitizationOptions = {}
  ): string {
    if (typeof content !== 'string') {
      throw new Error('Content must be a string');
    }

    if (!content.trim()) {
      return '';
    }

    // Length validation
    if (options.maxLength && content.length > options.maxLength) {
      throw new Error(`Content exceeds maximum length of ${options.maxLength} characters`);
    }

    // Choose configuration based on options
    let config = { ...this.defaultHtmlConfig };
    
    if (options.stripHtmlTags) {
      config = { ...this.textOnlyConfig };
    } else if (options.allowedTags) {
      config.ALLOWED_TAGS = options.allowedTags;
    }

    // Custom attributes configuration
    if (options.allowedAttributes) {
      config.ALLOWED_ATTR = Object.keys(options.allowedAttributes).reduce((acc, tag) => {
        return acc.concat(options.allowedAttributes![tag]);
      }, [] as string[]);
    }

    if (!options.allowDataAttributes) {
      config.ALLOW_DATA_ATTR = false;
    }

    try {
      // Primary sanitization with DOMPurify
      const sanitized = DOMPurify.sanitize(content, config);
      
      // Additional security layer - pattern-based filtering
      const doubleSanitized = this.applySecurityPatterns(sanitized);
      
      // Final validation
      if (this.containsSuspiciousPatterns(doubleSanitized)) {
        throw new Error('Content contains potentially malicious patterns');
      }

      return doubleSanitized;
    } catch (error) {
      console.error('HTML Sanitization Error:', error);
      // Return empty string for safety in case of sanitization failure
      return '';
    }
  }

  /**
   * Sanitize user text input with comprehensive protection
   */
  public sanitizeText(text: string, options: SanitizationOptions = {}): string {
    if (typeof text !== 'string') {
      throw new Error('Text must be a string');
    }

    // Length validation
    if (options.maxLength && text.length > options.maxLength) {
      throw new Error(`Text exceeds maximum length of ${options.maxLength} characters`);
    }

    // Remove all HTML tags
    let sanitized = DOMPurify.sanitize(text, this.textOnlyConfig);
    
    // Additional text sanitization
    sanitized = this.sanitizeSpecialCharacters(sanitized);
    sanitized = this.removeControlCharacters(sanitized);
    sanitized = this.normalizeWhitespace(sanitized);
    
    return sanitized.trim();
  }

  /**
   * Sanitize and validate URLs
   */
  public sanitizeUrl(url: string, options: UrlSanitizationOptions = {}): string {
    if (typeof url !== 'string') {
      throw new Error('URL must be a string');
    }

    if (!url.trim()) {
      return '';
    }

    const {
      allowedProtocols = ['https:', 'http:', 'mailto:', 'tel:'],
      allowedDomains = [],
      blockSuspiciousPatterns = true,
      validateTLD = true,
    } = options;

    try {
      // Parse URL
      const parsedUrl = new URL(url);
      
      // Protocol validation
      if (!allowedProtocols.includes(parsedUrl.protocol)) {
        throw new Error(`Protocol ${parsedUrl.protocol} not allowed`);
      }

      // Domain validation
      if (allowedDomains.length > 0) {
        const hostname = parsedUrl.hostname.toLowerCase();
        const isAllowed = allowedDomains.some(domain => 
          hostname === domain || hostname.endsWith(`.${domain}`)
        );
        
        if (!isAllowed) {
          throw new Error(`Domain ${hostname} not in allowed domains`);
        }
      }

      // Block suspicious patterns
      if (blockSuspiciousPatterns && this.containsSuspiciousUrlPatterns(url)) {
        throw new Error('URL contains suspicious patterns');
      }

      // TLD validation (basic)
      if (validateTLD && parsedUrl.protocol.startsWith('http')) {
        const tldPattern = /\.[a-z]{2,}$/i;
        if (!tldPattern.test(parsedUrl.hostname)) {
          throw new Error('Invalid top-level domain');
        }
      }

      return parsedUrl.toString();
    } catch (error) {
      console.error('URL Sanitization Error:', error);
      throw new Error(`Invalid URL: ${error.message}`);
    }
  }

  /**
   * Validate and sanitize file uploads
   */
  public validateFileUpload(
    file: { name: string; type: string; size: number; buffer?: Buffer },
    options: FileSanitizationOptions = {}
  ): { isValid: boolean; errors: string[]; sanitizedName: string } {
    const {
      allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'text/plain', 'application/json',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ],
      maxSize = 10 * 1024 * 1024, // 10MB default
      scanForMalware = true,
      stripMetadata = true,
    } = options;

    const errors: string[] = [];

    // File type validation
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} not allowed`);
    }

    // File size validation
    if (file.size > maxSize) {
      errors.push(`File size ${file.size} exceeds maximum of ${maxSize} bytes`);
    }

    // Sanitize filename
    const sanitizedName = this.sanitizeFilename(file.name);
    if (!sanitizedName) {
      errors.push('Invalid filename');
    }

    // Basic malware pattern detection
    if (scanForMalware && file.buffer) {
      if (this.containsMalwarePatterns(file.buffer)) {
        errors.push('File contains suspicious patterns');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedName: sanitizedName || 'unknown_file',
    };
  }

  /**
   * Sanitize JSON data recursively
   */
  public sanitizeJson(data: any, maxDepth: number = 10, currentDepth: number = 0): any {
    if (currentDepth > maxDepth) {
      throw new Error('JSON depth limit exceeded');
    }

    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      return this.sanitizeText(data, { maxLength: 10000 });
    }

    if (typeof data === 'number' || typeof data === 'boolean') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeJson(item, maxDepth, currentDepth + 1));
    }

    if (typeof data === 'object') {
      const sanitized: Record<string, any> = {};
      
      for (const [key, value] of Object.entries(data)) {
        // Sanitize keys
        const sanitizedKey = this.sanitizeText(key, { maxLength: 100 });
        if (sanitizedKey) {
          sanitized[sanitizedKey] = this.sanitizeJson(value, maxDepth, currentDepth + 1);
        }
      }
      
      return sanitized;
    }

    // Unknown type - remove for safety
    return null;
  }

  // Private helper methods

  private applySecurityPatterns(content: string): string {
    // Remove common XSS patterns that might bypass DOMPurify
    const dangerousPatterns = [
      // JavaScript protocols
      /javascript:/gi,
      /vbscript:/gi,
      /data:text\/html/gi,
      
      // Event handlers
      /on\w+\s*=/gi,
      
      // Expression evaluation
      /expression\s*\(/gi,
      /eval\s*\(/gi,
      /setTimeout\s*\(/gi,
      /setInterval\s*\(/gi,
      
      // Import/require patterns
      /import\s*\(/gi,
      /require\s*\(/gi,
      
      // Script tags (double check)
      /<script[^>]*>[\s\S]*?<\/script>/gi,
      
      // Meta refresh
      /<meta[^>]*http-equiv[^>]*refresh/gi,
    ];

    let sanitized = content;
    
    dangerousPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    return sanitized;
  }

  private containsSuspiciousPatterns(content: string): boolean {
    const suspiciousPatterns = [
      // Base64 encoded scripts
      /data:[\w\/]+;base64,[\w+\/=]+/gi,
      
      // Unicode bypass attempts
      /&#x[0-9a-f]+;/gi,
      /\\\u[0-9a-f]{4}/gi,
      
      // SQL injection patterns
      /(\bunion\b|\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b).*(\bfrom\b|\binto\b|\bwhere\b)/gi,
      
      // Comment-based attacks
      /\/\*[\s\S]*?\*\//gi,
      /--[\s\S]*$/gm,
      
      // LDAP injection
      /[()&|!]/g,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(content));
  }

  private containsSuspiciousUrlPatterns(url: string): boolean {
    const suspiciousPatterns = [
      // IP addresses instead of domains (potential bypass)
      /^https?:\/\/(?:\d{1,3}\.){3}\d{1,3}/,
      
      // Suspicious ports
      /:[0-9]{1,5}\/(.*(?:admin|config|test|debug|dev|staging))/i,
      
      // Double encoding
      /%[0-9a-f]{2}%[0-9a-f]{2}/i,
      
      // Path traversal
      /\.\.[\/\\]/,
      
      // Suspicious parameters
      /[?&](cmd|exec|system|shell|bash|powershell|eval)/i,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(url));
  }

  private sanitizeFilename(filename: string): string {
    // Remove path traversal attempts
    let sanitized = filename.replace(/[\/\\]/g, '');
    
    // Remove control characters and dangerous characters
    sanitized = sanitized.replace(/[<>:"|?*\x00-\x1f\x7f]/g, '');
    
    // Remove leading/trailing dots and spaces
    sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '');
    
    // Limit length
    if (sanitized.length > 255) {
      const extension = sanitized.substring(sanitized.lastIndexOf('.'));
      const name = sanitized.substring(0, sanitized.lastIndexOf('.'));
      sanitized = name.substring(0, 255 - extension.length) + extension;
    }
    
    // Ensure it's not a reserved name
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
    const nameWithoutExtension = sanitized.replace(/\.[^.]*$/, '');
    
    if (reservedNames.includes(nameWithoutExtension.toUpperCase())) {
      sanitized = `file_${sanitized}`;
    }
    
    return sanitized || 'unknown_file';
  }

  private containsMalwarePatterns(buffer: Buffer): boolean {
    // Convert buffer to string for pattern matching
    const content = buffer.toString('binary');
    
    // Basic malware signatures (this is simplified - real implementation would use proper antivirus)
    const malwarePatterns = [
      // PE executable headers
      /^MZ[\s\S]{58}PE\0\0/,
      
      // Script patterns
      /<script/gi,
      /eval\s*\(/gi,
      /system\s*\(/gi,
      /exec\s*\(/gi,
      
      // Suspicious file extensions embedded
      /\.exe[\s\0]/gi,
      /\.scr[\s\0]/gi,
      /\.bat[\s\0]/gi,
      /\.cmd[\s\0]/gi,
      /\.pif[\s\0]/gi,
    ];

    return malwarePatterns.some(pattern => pattern.test(content));
  }

  private sanitizeSpecialCharacters(text: string): string {
    // Replace or remove special characters that could be used for attacks
    return text
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/['"]/g, match => match === '"' ? '&quot;' : '&#x27;') // Encode quotes
      .replace(/&(?!#?[a-zA-Z0-9]+;)/g, '&amp;') // Encode unencoded ampersands
      .replace(/\\/g, '&#x5C;'); // Encode backslashes
  }

  private removeControlCharacters(text: string): string {
    // Remove control characters except newline, tab, and carriage return
    return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  private normalizeWhitespace(text: string): string {
    // Normalize multiple whitespace characters
    return text.replace(/\s+/g, ' ');
  }
}

// Validation schemas for common use cases
export const sanitizationSchemas = {
  userMessage: z.string()
    .max(5000, 'Message too long')
    .transform(val => ContentSanitizer.getInstance().sanitizeText(val, { maxLength: 5000 })),
  
  htmlContent: z.string()
    .max(50000, 'Content too long')
    .transform(val => ContentSanitizer.getInstance().sanitizeHtml(val, { maxLength: 50000 })),
  
  restrictedHtml: z.string()
    .max(10000, 'Content too long')
    .transform(val => ContentSanitizer.getInstance().sanitizeHtml(val, {
      maxLength: 10000,
      allowedTags: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li'],
    })),
  
  filename: z.string()
    .max(255, 'Filename too long')
    .transform(val => {
      const sanitizer = ContentSanitizer.getInstance();
      return sanitizer.sanitizeFilename ? sanitizer['sanitizeFilename'](val) : val;
    }),
  
  url: z.string()
    .url('Invalid URL')
    .transform(val => ContentSanitizer.getInstance().sanitizeUrl(val)),
  
  jsonData: z.any()
    .transform(val => ContentSanitizer.getInstance().sanitizeJson(val)),
};

// Export singleton instance
export const contentSanitizer = ContentSanitizer.getInstance();