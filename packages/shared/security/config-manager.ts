import crypto from 'crypto';
import { z } from 'zod';

/**
 * Secure Configuration Manager
 * 
 * This service provides enterprise-grade configuration management with:
 * - Environment variable validation and sanitization
 * - Secret encryption and decryption
 * - Configuration validation with secure defaults
 * - Secret rotation and lifecycle management
 * - Audit logging for configuration access
 */

export interface ConfigurationOptions {
  environment?: 'development' | 'staging' | 'production';
  encryptionKey?: string;
  validateSecrets?: boolean;
  auditAccess?: boolean;
  allowMissingSecrets?: boolean;
  secretRotationInterval?: number; // days
}

export interface SecretConfig {
  value: string;
  encrypted: boolean;
  created: Date;
  lastRotated?: Date;
  rotationInterval?: number;
  metadata?: Record<string, any>;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  connectionTimeout: number;
  maxConnections: number;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiration: string;
  refreshTokenExpiration: string;
  sessionSecret: string;
  bcryptRounds: number;
  rateLimit: {
    windowMs: number;
    maxAttempts: number;
    blockDuration: number;
  };
}

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromAddress: string;
  replyToAddress?: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  database: number;
  keyPrefix: string;
  ttl: number;
}

export interface SecurityConfig {
  corsOrigins: string[];
  enableHsts: boolean;
  hstsMaxAge: number;
  enableCSP: boolean;
  cspReportUri?: string;
  sessionCookieSecure: boolean;
  sessionCookieSameSite: 'strict' | 'lax' | 'none';
  encryptionAlgorithm: string;
  hashingAlgorithm: string;
}

export interface PaymentConfig {
  stripeSecretKey: string;
  stripePublishableKey: string;
  stripeWebhookSecret: string;
  enableLiveMode: boolean;
  currency: string;
  supportedPaymentMethods: string[];
}

export class ConfigManager {
  private static instance: ConfigManager;
  private configs = new Map<string, any>();
  private secrets = new Map<string, SecretConfig>();
  private encryptionKey: string;
  private readonly algorithm = 'aes-256-gcm';
  private auditLog: Array<{ timestamp: Date; action: string; key: string; user?: string }> = [];

  // Configuration validation schemas
  private readonly configSchemas = {
    database: z.object({
      host: z.string().min(1, 'Database host is required'),
      port: z.number().min(1).max(65535),
      database: z.string().min(1, 'Database name is required'),
      username: z.string().min(1, 'Database username is required'),
      password: z.string().min(8, 'Database password must be at least 8 characters'),
      ssl: z.boolean().default(true),
      connectionTimeout: z.number().default(30000),
      maxConnections: z.number().default(20),
    }),

    auth: z.object({
      jwtSecret: z.string().min(32, 'JWT secret must be at least 32 characters'),
      jwtExpiration: z.string().default('15m'),
      refreshTokenExpiration: z.string().default('7d'),
      sessionSecret: z.string().min(32, 'Session secret must be at least 32 characters'),
      bcryptRounds: z.number().min(10).max(15).default(12),
      rateLimit: z.object({
        windowMs: z.number().default(900000), // 15 minutes
        maxAttempts: z.number().default(5),
        blockDuration: z.number().default(3600000), // 1 hour
      }),
    }),

    email: z.object({
      host: z.string().min(1, 'Email host is required'),
      port: z.number().min(1).max(65535),
      secure: z.boolean().default(true),
      username: z.string().min(1, 'Email username is required'),
      password: z.string().min(1, 'Email password is required'),
      fromAddress: z.string().email('Invalid from email address'),
      replyToAddress: z.string().email('Invalid reply-to email address').optional(),
    }),

    redis: z.object({
      host: z.string().min(1, 'Redis host is required'),
      port: z.number().min(1).max(65535).default(6379),
      password: z.string().optional(),
      database: z.number().min(0).max(15).default(0),
      keyPrefix: z.string().default('bizbox:'),
      ttl: z.number().default(3600),
    }),

    security: z.object({
      corsOrigins: z.array(z.string().url()).min(1, 'At least one CORS origin required'),
      enableHsts: z.boolean().default(true),
      hstsMaxAge: z.number().default(31536000), // 1 year
      enableCSP: z.boolean().default(true),
      cspReportUri: z.string().url().optional(),
      sessionCookieSecure: z.boolean().default(true),
      sessionCookieSameSite: z.enum(['strict', 'lax', 'none']).default('strict'),
      encryptionAlgorithm: z.string().default('aes-256-gcm'),
      hashingAlgorithm: z.string().default('sha256'),
    }),

    payment: z.object({
      stripeSecretKey: z.string().regex(/^sk_(test_|live_)/, 'Invalid Stripe secret key format'),
      stripePublishableKey: z.string().regex(/^pk_(test_|live_)/, 'Invalid Stripe publishable key format'),
      stripeWebhookSecret: z.string().regex(/^whsec_/, 'Invalid Stripe webhook secret format'),
      enableLiveMode: z.boolean().default(false),
      currency: z.string().length(3, 'Currency must be a 3-letter code').default('USD'),
      supportedPaymentMethods: z.array(z.string()).default(['card', 'sepa_debit']),
    }),
  };

  private constructor(options: ConfigurationOptions = {}) {
    this.encryptionKey = this.deriveEncryptionKey(options.encryptionKey);
    this.loadConfigurations();
  }

  public static getInstance(options?: ConfigurationOptions): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager(options);
    }
    return ConfigManager.instance;
  }

  /**
   * Get database configuration with validation
   */
  public getDatabaseConfig(): DatabaseConfig {
    this.auditAccess('database');
    
    const rawConfig = {
      host: this.getRequiredSecret('DB_HOST'),
      port: parseInt(this.getRequiredSecret('DB_PORT'), 10),
      database: this.getRequiredSecret('DB_NAME'),
      username: this.getRequiredSecret('DB_USERNAME'),
      password: this.getRequiredSecret('DB_PASSWORD'),
      ssl: this.getOptionalSecret('DB_SSL', 'true') === 'true',
      connectionTimeout: parseInt(this.getOptionalSecret('DB_CONNECTION_TIMEOUT', '30000'), 10),
      maxConnections: parseInt(this.getOptionalSecret('DB_MAX_CONNECTIONS', '20'), 10),
    };

    return this.configSchemas.database.parse(rawConfig);
  }

  /**
   * Get authentication configuration with validation
   */
  public getAuthConfig(): AuthConfig {
    this.auditAccess('auth');
    
    const rawConfig = {
      jwtSecret: this.getRequiredSecret('JWT_SECRET'),
      jwtExpiration: this.getOptionalSecret('JWT_EXPIRATION', '15m'),
      refreshTokenExpiration: this.getOptionalSecret('REFRESH_TOKEN_EXPIRATION', '7d'),
      sessionSecret: this.getRequiredSecret('SESSION_SECRET'),
      bcryptRounds: parseInt(this.getOptionalSecret('BCRYPT_ROUNDS', '12'), 10),
      rateLimit: {
        windowMs: parseInt(this.getOptionalSecret('RATE_LIMIT_WINDOW_MS', '900000'), 10),
        maxAttempts: parseInt(this.getOptionalSecret('RATE_LIMIT_MAX_ATTEMPTS', '5'), 10),
        blockDuration: parseInt(this.getOptionalSecret('RATE_LIMIT_BLOCK_DURATION', '3600000'), 10),
      },
    };

    return this.configSchemas.auth.parse(rawConfig);
  }

  /**
   * Get email configuration with validation
   */
  public getEmailConfig(): EmailConfig {
    this.auditAccess('email');
    
    const rawConfig = {
      host: this.getRequiredSecret('SMTP_HOST'),
      port: parseInt(this.getRequiredSecret('SMTP_PORT'), 10),
      secure: this.getOptionalSecret('SMTP_SECURE', 'true') === 'true',
      username: this.getRequiredSecret('SMTP_USERNAME'),
      password: this.getRequiredSecret('SMTP_PASSWORD'),
      fromAddress: this.getRequiredSecret('SMTP_FROM_ADDRESS'),
      replyToAddress: this.getOptionalSecret('SMTP_REPLY_TO_ADDRESS'),
    };

    return this.configSchemas.email.parse(rawConfig);
  }

  /**
   * Get Redis configuration with validation
   */
  public getRedisConfig(): RedisConfig {
    this.auditAccess('redis');
    
    const rawConfig = {
      host: this.getRequiredSecret('REDIS_HOST'),
      port: parseInt(this.getOptionalSecret('REDIS_PORT', '6379'), 10),
      password: this.getOptionalSecret('REDIS_PASSWORD'),
      database: parseInt(this.getOptionalSecret('REDIS_DATABASE', '0'), 10),
      keyPrefix: this.getOptionalSecret('REDIS_KEY_PREFIX', 'bizbox:'),
      ttl: parseInt(this.getOptionalSecret('REDIS_TTL', '3600'), 10),
    };

    return this.configSchemas.redis.parse(rawConfig);
  }

  /**
   * Get security configuration with validation
   */
  public getSecurityConfig(): SecurityConfig {
    this.auditAccess('security');
    
    const corsOrigins = this.getOptionalSecret('CORS_ORIGINS', 'http://localhost:3000')
      .split(',')
      .map(origin => origin.trim())
      .filter(origin => origin.length > 0);
    
    const rawConfig = {
      corsOrigins,
      enableHsts: this.getOptionalSecret('ENABLE_HSTS', 'true') === 'true',
      hstsMaxAge: parseInt(this.getOptionalSecret('HSTS_MAX_AGE', '31536000'), 10),
      enableCSP: this.getOptionalSecret('ENABLE_CSP', 'true') === 'true',
      cspReportUri: this.getOptionalSecret('CSP_REPORT_URI'),
      sessionCookieSecure: this.getOptionalSecret('SESSION_COOKIE_SECURE', 'true') === 'true',
      sessionCookieSameSite: this.getOptionalSecret('SESSION_COOKIE_SAME_SITE', 'strict') as 'strict' | 'lax' | 'none',
      encryptionAlgorithm: this.getOptionalSecret('ENCRYPTION_ALGORITHM', 'aes-256-gcm'),
      hashingAlgorithm: this.getOptionalSecret('HASHING_ALGORITHM', 'sha256'),
    };

    return this.configSchemas.security.parse(rawConfig);
  }

  /**
   * Get payment configuration with validation
   */
  public getPaymentConfig(): PaymentConfig {
    this.auditAccess('payment');
    
    const rawConfig = {
      stripeSecretKey: this.getRequiredSecret('STRIPE_SECRET_KEY'),
      stripePublishableKey: this.getRequiredSecret('STRIPE_PUBLISHABLE_KEY'),
      stripeWebhookSecret: this.getRequiredSecret('STRIPE_WEBHOOK_SECRET'),
      enableLiveMode: this.getOptionalSecret('STRIPE_LIVE_MODE', 'false') === 'true',
      currency: this.getOptionalSecret('STRIPE_CURRENCY', 'USD'),
      supportedPaymentMethods: this.getOptionalSecret('STRIPE_PAYMENT_METHODS', 'card,sepa_debit')
        .split(',')
        .map(method => method.trim()),
    };

    return this.configSchemas.payment.parse(rawConfig);
  }

  /**
   * Encrypt and store a secret
   */
  public setSecret(key: string, value: string, rotationInterval?: number): void {
    const encrypted = this.encrypt(value);
    
    this.secrets.set(key, {
      value: encrypted,
      encrypted: true,
      created: new Date(),
      rotationInterval,
    });

    this.auditAccess('secret_set', key);
  }

  /**
   * Get and decrypt a secret
   */
  public getSecret(key: string): string | undefined {
    const secret = this.secrets.get(key);
    
    if (!secret) {
      return undefined;
    }

    this.auditAccess('secret_get', key);
    
    if (secret.encrypted) {
      return this.decrypt(secret.value);
    }
    
    return secret.value;
  }

  /**
   * Check if secrets need rotation
   */
  public getSecretsNeedingRotation(): string[] {
    const now = new Date();
    const needsRotation: string[] = [];
    
    for (const [key, secret] of this.secrets.entries()) {
      if (secret.rotationInterval && secret.lastRotated) {
        const daysSinceRotation = Math.floor(
          (now.getTime() - secret.lastRotated.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysSinceRotation >= secret.rotationInterval) {
          needsRotation.push(key);
        }
      }
    }
    
    return needsRotation;
  }

  /**
   * Validate all configurations
   */
  public validateConfigurations(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      this.getDatabaseConfig();
    } catch (error) {
      errors.push(`Database config: ${error.message}`);
    }
    
    try {
      this.getAuthConfig();
    } catch (error) {
      errors.push(`Auth config: ${error.message}`);
    }
    
    try {
      this.getSecurityConfig();
    } catch (error) {
      errors.push(`Security config: ${error.message}`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get audit log entries
   */
  public getAuditLog(): Array<{ timestamp: Date; action: string; key: string; user?: string }> {
    return [...this.auditLog];
  }

  /**
   * Clear audit log (for maintenance)
   */
  public clearAuditLog(): void {
    this.auditLog = [];
  }

  // Private helper methods

  private loadConfigurations(): void {
    // Load from environment variables
    for (const [key, value] of Object.entries(process.env)) {
      if (value && this.isSecretKey(key)) {
        this.secrets.set(key, {
          value,
          encrypted: false,
          created: new Date(),
        });
      }
    }
  }

  private isSecretKey(key: string): boolean {
    const secretPatterns = [
      /^.*_SECRET$/,
      /^.*_PASSWORD$/,
      /^.*_KEY$/,
      /^.*_TOKEN$/,
      /^JWT_/,
      /^STRIPE_/,
      /^DB_/,
      /^REDIS_/,
      /^SMTP_/,
    ];
    
    return secretPatterns.some(pattern => pattern.test(key));
  }

  private getRequiredSecret(key: string): string {
    const value = this.getSecret(key) || process.env[key];
    
    if (!value) {
      throw new Error(`Required configuration value '${key}' is not set`);
    }
    
    return value;
  }

  private getOptionalSecret(key: string, defaultValue?: string): string | undefined {
    return this.getSecret(key) || process.env[key] || defaultValue;
  }

  private deriveEncryptionKey(providedKey?: string): string {
    if (providedKey) {
      return crypto.createHash('sha256').update(providedKey).digest();
    }
    
    // Use NODE_ENV and hostname to derive key (not secure for production)
    const keyMaterial = process.env.NODE_ENV + (process.env.HOSTNAME || 'localhost');
    return crypto.createHash('sha256').update(keyMaterial).digest();
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.encryptionKey);
    cipher.setAutoPadding(true);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  private auditAccess(action: string, key?: string): void {
    this.auditLog.push({
      timestamp: new Date(),
      action,
      key: key || 'unknown',
    });
    
    // Keep only last 1000 entries
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }
  }
}

/**
 * Environment-specific configuration presets
 */
export const configPresets = {
  development: (): ConfigurationOptions => ({
    environment: 'development',
    validateSecrets: false,
    allowMissingSecrets: true,
    auditAccess: false,
  }),

  staging: (): ConfigurationOptions => ({
    environment: 'staging',
    validateSecrets: true,
    allowMissingSecrets: false,
    auditAccess: true,
  }),

  production: (): ConfigurationOptions => ({
    environment: 'production',
    validateSecrets: true,
    allowMissingSecrets: false,
    auditAccess: true,
    secretRotationInterval: 90, // 90 days
  }),
};

// Export singleton instance
export const configManager = ConfigManager.getInstance();