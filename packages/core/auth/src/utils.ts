import bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';
import { userModel } from '@bizbox/core-database';
import { withTenantContext } from '@bizbox/core-database';
import { auditLogger } from '@bizbox/core-database';

export interface CreateUserOptions {
  tenantId: string;
  email: string;
  password?: string;
  role?: string;
  profile?: Record<string, any>;
  permissions?: string[];
  sendWelcomeEmail?: boolean;
}

export interface PasswordResetOptions {
  email: string;
  tenantId: string;
  newPassword: string;
  resetToken?: string;
}

export class AuthUtils {
  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify a password against a hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate a secure random password
   */
  static generatePassword(length: number = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    
    return password;
  }

  /**
   * Generate a secure token for password reset, email verification, etc.
   */
  static generateSecureToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Create a new user with proper password hashing and validation
   */
  static async createUser(options: CreateUserOptions): Promise<{
    user: any;
    temporaryPassword?: string;
  }> {
    const {
      tenantId,
      email,
      password,
      role = 'customer',
      profile = {},
      permissions = [],
      sendWelcomeEmail = false,
    } = options;

    return await withTenantContext({ tenantId }, async () => {
      // Check if email is already taken
      const existingUser = await userModel.findByEmail(email);
      if (existingUser) {
        throw new Error(`Email '${email}' is already registered`);
      }

      // Generate password if not provided
      let userPassword = password;
      let temporaryPassword: string | undefined;
      
      if (!userPassword) {
        temporaryPassword = this.generatePassword();
        userPassword = temporaryPassword;
      }

      // Hash the password
      const passwordHash = await this.hashPassword(userPassword);

      // Create user
      const user = await userModel.create({
        tenantId,
        email,
        password: userPassword, // This will be hashed by the model
        role,
        profile: {
          ...profile,
          active: true,
          emailVerified: false,
          createdAt: new Date().toISOString(),
        },
        permissions,
      });

      // Log user creation
      await auditLogger.logCreate('users', user.id, {
        email,
        role,
        createdBy: 'system',
      });

      // TODO: Send welcome email if requested
      if (sendWelcomeEmail) {
        // Implement email sending logic
        console.log(`Welcome email should be sent to ${email}`);
      }

      return {
        user,
        temporaryPassword,
      };
    });
  }

  /**
   * Change user password with proper validation
   */
  static async changePassword(
    userId: string,
    tenantId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
    return await withTenantContext({ tenantId, userId }, async () => {
      // Get user
      const user = await userModel.findById(userId);
      if (!user || !user.passwordHash) {
        throw new Error('User not found or no password set');
      }

      // Verify current password
      const isCurrentPasswordValid = await this.verifyPassword(
        currentPassword,
        user.passwordHash
      );

      if (!isCurrentPasswordValid) {
        await auditLogger.logAuthEvent('PASSWORD_CHANGE_FAILED', userId, {
          reason: 'invalid_current_password',
        });
        throw new Error('Current password is incorrect');
      }

      // Validate new password strength
      this.validatePasswordStrength(newPassword);

      // Hash new password
      const newPasswordHash = await this.hashPassword(newPassword);

      // Update user password
      await userModel.update(userId, {
        passwordHash: newPasswordHash,
        profile: {
          ...user.profile,
          passwordChangedAt: new Date().toISOString(),
        },
      });

      // Log password change
      await auditLogger.logAuthEvent('PASSWORD_CHANGE', userId, {
        success: true,
      });

      return true;
    });
  }

  /**
   * Reset user password (admin function)
   */
  static async resetPassword(options: PasswordResetOptions): Promise<string> {
    const { email, tenantId, newPassword, resetToken } = options;

    return await withTenantContext({ tenantId }, async () => {
      // Find user by email
      const user = await userModel.findByEmail(email);
      if (!user) {
        throw new Error('User not found');
      }

      // TODO: Validate reset token if provided
      if (resetToken) {
        // Implement token validation logic
        console.log(`Reset token validation: ${resetToken}`);
      }

      // Validate new password strength
      this.validatePasswordStrength(newPassword);

      // Hash new password
      const passwordHash = await this.hashPassword(newPassword);

      // Update user password
      await userModel.update(user.id, {
        passwordHash,
        profile: {
          ...user.profile,
          passwordResetAt: new Date().toISOString(),
          passwordResetBy: 'admin',
        },
      });

      // Log password reset
      await auditLogger.logAuthEvent('PASSWORD_RESET', user.id, {
        resetBy: 'admin',
        email,
      });

      return user.id;
    });
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password: string): void {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const errors: string[] = [];

    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }

    if (!hasUpperCase) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!hasLowerCase) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!hasNumbers) {
      errors.push('Password must contain at least one number');
    }

    if (!hasSpecialChar) {
      errors.push('Password must contain at least one special character');
    }

    if (errors.length > 0) {
      throw new Error(`Password validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Generate email verification token
   */
  static async generateEmailVerificationToken(userId: string, tenantId: string): Promise<string> {
    const token = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    return await withTenantContext({ tenantId, userId }, async () => {
      // Store token in user profile
      const user = await userModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      await userModel.update(userId, {
        profile: {
          ...user.profile,
          emailVerificationToken: token,
          emailVerificationExpires: expiresAt.toISOString(),
        },
      });

      return token;
    });
  }

  /**
   * Verify email with token
   */
  static async verifyEmail(userId: string, tenantId: string, token: string): Promise<boolean> {
    return await withTenantContext({ tenantId, userId }, async () => {
      const user = await userModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const storedToken = user.profile?.emailVerificationToken;
      const expiresAt = user.profile?.emailVerificationExpires;

      if (!storedToken || storedToken !== token) {
        await auditLogger.logAuthEvent('EMAIL_VERIFICATION_FAILED', userId, {
          reason: 'invalid_token',
        });
        return false;
      }

      if (expiresAt && new Date(expiresAt) < new Date()) {
        await auditLogger.logAuthEvent('EMAIL_VERIFICATION_FAILED', userId, {
          reason: 'token_expired',
        });
        return false;
      }

      // Mark email as verified
      await userModel.update(userId, {
        profile: {
          ...user.profile,
          emailVerified: true,
          emailVerifiedAt: new Date().toISOString(),
          emailVerificationToken: null,
          emailVerificationExpires: null,
        },
      });

      await auditLogger.logAuthEvent('EMAIL_VERIFIED', userId);
      return true;
    });
  }

  /**
   * Generate session token hash for additional security
   */
  static generateSessionHash(sessionToken: string, userAgent: string, ip: string): string {
    const data = `${sessionToken}:${userAgent}:${ip}`;
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Validate session integrity
   */
  static validateSessionIntegrity(
    sessionToken: string,
    userAgent: string,
    ip: string,
    storedHash: string
  ): boolean {
    const expectedHash = this.generateSessionHash(sessionToken, userAgent, ip);
    return expectedHash === storedHash;
  }
}

// Export convenience functions
export const hashPassword = AuthUtils.hashPassword;
export const verifyPassword = AuthUtils.verifyPassword;
export const generatePassword = AuthUtils.generatePassword;
export const createUser = AuthUtils.createUser;
export const changePassword = AuthUtils.changePassword;
export const validatePasswordStrength = AuthUtils.validatePasswordStrength;