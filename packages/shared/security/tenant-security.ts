import crypto from 'crypto';
import { z } from 'zod';

// Tenant security configuration
export const TENANT_SECURITY_CONFIG = {
  // Encryption settings
  TENANT_DATA_ENCRYPTION_ALGORITHM: 'aes-256-gcm',
  TENANT_ID_HASH_ALGORITHM: 'sha256',
  
  // Access control settings
  MAX_TENANT_ISOLATION_FAILURES: 5,
  TENANT_SESSION_TIMEOUT: 8 * 60 * 60 * 1000, // 8 hours
  CROSS_TENANT_ACCESS_MONITORING: true,
  
  // Security boundaries
  TENANT_DATA_FIELDS: [
    'tenant_id', 'tenant_slug', 'tenant_domain', 'tenant_subdomain',
    'organization_id', 'workspace_id', 'account_id'
  ],
  
  SENSITIVE_OPERATIONS: [
    'data_export', 'tenant_migration', 'bulk_operations',
    'admin_access', 'system_configuration', 'cross_tenant_queries'
  ],

  // Compliance requirements
  GDPR_RETENTION_DAYS: 1095, // 3 years
  PCI_ISOLATION_REQUIRED: true,
  SOC2_AUDIT_LOGGING: true,
} as const;

export interface TenantSecurityContext {
  tenantId: string;
  tenantSlug?: string;
  organizationId?: string;
  userId: string;
  userRole: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  permissions: string[];
  isolationLevel: TenantIsolationLevel;
  securityBoundary: TenantSecurityBoundary;
  auditLog: TenantAuditEntry;
}

export interface TenantSecurityBoundary {
  allowedTenants: string[];
  restrictedOperations: string[];
  dataClassification: DataClassification;
  encryptionRequirements: EncryptionRequirements;
  accessControlMatrix: AccessControlMatrix;
}

export interface TenantAuditEntry {
  id: string;
  timestamp: number;
  event: TenantSecurityEvent;
  tenantId: string;
  userId: string;
  userRole: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  operation: string;
  resourceId?: string;
  resourceType?: string;
  success: boolean;
  securityLevel: SecurityLevel;
  isolationViolation: boolean;
  dataAccessed?: string[];
  errorMessage?: string;
  riskScore: number;
  metadata?: Record<string, any>;
}

export type TenantSecurityEvent =
  | 'tenant_access_granted'
  | 'tenant_access_denied'
  | 'cross_tenant_access_attempted'
  | 'isolation_boundary_violated'
  | 'data_export_requested'
  | 'bulk_operation_initiated'
  | 'admin_escalation_detected'
  | 'suspicious_tenant_switching'
  | 'data_classification_violation'
  | 'encryption_failure'
  | 'audit_trail_accessed';

export type TenantIsolationLevel = 
  | 'strict' // Complete isolation, no cross-tenant access
  | 'controlled' // Limited cross-tenant access with approval
  | 'shared' // Shared resources with access control
  | 'public'; // Public data, minimal isolation

export type SecurityLevel = 'low' | 'medium' | 'high' | 'critical';

export type DataClassification = 
  | 'public' 
  | 'internal' 
  | 'confidential' 
  | 'restricted' 
  | 'top_secret';

export interface EncryptionRequirements {
  atRest: boolean;
  inTransit: boolean;
  inMemory: boolean;
  keyRotationDays: number;
  algorithm: string;
}

export interface AccessControlMatrix {
  roles: Record<string, string[]>; // role -> permissions
  resources: Record<string, ResourceAccess>; // resource -> access rules
  operations: Record<string, OperationPolicy>; // operation -> policy
}

export interface ResourceAccess {
  classification: DataClassification;
  requiredPermissions: string[];
  isolationLevel: TenantIsolationLevel;
  encryptionRequired: boolean;
}

export interface OperationPolicy {
  minimumRole: string;
  requiresApproval: boolean;
  auditRequired: boolean;
  riskLevel: SecurityLevel;
  crossTenantAllowed: boolean;
}

// Validation schemas for tenant security
export const tenantSecuritySchemas = {
  tenantContext: z.object({
    tenantId: z.string().uuid('Invalid tenant ID format'),
    tenantSlug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/).optional(),
    organizationId: z.string().uuid().optional(),
    userId: z.string().uuid('Invalid user ID format'),
    userRole: z.string().min(1).max(50),
    sessionId: z.string().min(1),
    ipAddress: z.string().ip().or(z.literal('unknown')),
    userAgent: z.string().max(1000),
    permissions: z.array(z.string()),
  }),
  
  dataAccess: z.object({
    resourceId: z.string(),
    resourceType: z.string().min(1).max(100),
    operation: z.enum(['read', 'write', 'update', 'delete', 'export', 'bulk']),
    dataClassification: z.enum(['public', 'internal', 'confidential', 'restricted', 'top_secret']),
  }),
  
  crossTenantRequest: z.object({
    sourceTenantId: z.string().uuid(),
    targetTenantId: z.string().uuid(),
    operation: z.string(),
    justification: z.string().min(10).max(500),
    approvalRequired: z.boolean(),
  }),
};

export class TenantSecurityService {
  private encryptionKey: Buffer;
  private auditTrail: TenantAuditEntry[] = [];
  private isolationViolations: Map<string, number> = new Map();
  private suspiciousActivities: Map<string, SuspiciousActivity> = new Map();
  private tenantBoundaries: Map<string, TenantSecurityBoundary> = new Map();
  private accessControlCache: Map<string, AccessControlResult> = new Map();

  constructor(encryptionKey?: string) {
    this.encryptionKey = encryptionKey 
      ? Buffer.from(encryptionKey, 'hex')
      : crypto.randomBytes(32);
    
    if (this.encryptionKey.length !== 32) {
      throw new Error('Encryption key must be 32 bytes (256 bits)');
    }

    this.initializeTenantBoundaries();
  }

  /**
   * Enforce tenant boundary security for data access
   */
  async enforceDataAccess(
    request: z.infer<typeof tenantSecuritySchemas.dataAccess>,
    context: Partial<TenantSecurityContext>
  ): Promise<{
    allowed: boolean;
    security: TenantSecurityContext;
    error?: string;
    encryptedData?: any;
  }> {
    const auditEntry = this.initializeAuditEntry('tenant_access_granted', context);
    
    try {
      // 1. Validate context and request
      const validatedRequest = tenantSecuritySchemas.dataAccess.parse(request);
      const validatedContext = this.validateSecurityContext(context);
      
      if (!validatedContext.success) {
        auditEntry.success = false;
        auditEntry.errorMessage = validatedContext.error;
        auditEntry.riskScore = 8;
        this.logAuditEntry(auditEntry);
        
        return {
          allowed: false,
          security: this.createDefaultSecurityContext(context),
          error: validatedContext.error,
        };
      }

      const securityContext = validatedContext.context;
      auditEntry.tenantId = securityContext.tenantId;
      auditEntry.userId = securityContext.userId;
      auditEntry.operation = validatedRequest.operation;
      auditEntry.resourceId = validatedRequest.resourceId;
      auditEntry.resourceType = validatedRequest.resourceType;

      // 2. Check tenant isolation boundaries
      const isolationCheck = await this.checkTenantIsolation(
        validatedRequest,
        securityContext
      );

      if (!isolationCheck.allowed) {
        auditEntry.success = false;
        auditEntry.isolationViolation = true;
        auditEntry.errorMessage = isolationCheck.reason;
        auditEntry.riskScore = 9;
        auditEntry.event = 'isolation_boundary_violated';
        
        this.recordIsolationViolation(securityContext.tenantId, securityContext.userId);
        this.logAuditEntry(auditEntry);
        
        return {
          allowed: false,
          security: securityContext,
          error: 'Access denied: Tenant isolation boundary violation',
        };
      }

      // 3. Check access control permissions
      const accessCheck = await this.checkAccessControl(
        validatedRequest,
        securityContext
      );

      if (!accessCheck.allowed) {
        auditEntry.success = false;
        auditEntry.errorMessage = accessCheck.reason;
        auditEntry.riskScore = 6;
        auditEntry.event = 'tenant_access_denied';
        this.logAuditEntry(auditEntry);
        
        return {
          allowed: false,
          security: securityContext,
          error: accessCheck.reason,
        };
      }

      // 4. Apply data encryption if required
      let encryptedData: any = undefined;
      if (this.requiresEncryption(validatedRequest)) {
        encryptedData = await this.encryptSensitiveData(
          validatedRequest.resourceId,
          securityContext
        );
      }

      // 5. Log successful access
      auditEntry.success = true;
      auditEntry.riskScore = this.calculateRiskScore(validatedRequest, securityContext);
      auditEntry.dataAccessed = [validatedRequest.resourceType];
      this.logAuditEntry(auditEntry);

      return {
        allowed: true,
        security: securityContext,
        encryptedData,
      };

    } catch (error) {
      auditEntry.success = false;
      auditEntry.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      auditEntry.riskScore = 10;
      this.logAuditEntry(auditEntry);

      return {
        allowed: false,
        security: this.createDefaultSecurityContext(context),
        error: 'Security validation failed',
      };
    }
  }

  /**
   * Validate cross-tenant access requests
   */
  async validateCrossTenantAccess(
    request: z.infer<typeof tenantSecuritySchemas.crossTenantRequest>,
    context: Partial<TenantSecurityContext>
  ): Promise<{
    allowed: boolean;
    requiresApproval: boolean;
    security: TenantSecurityContext;
    error?: string;
  }> {
    const auditEntry = this.initializeAuditEntry('cross_tenant_access_attempted', context);
    
    try {
      const validatedRequest = tenantSecuritySchemas.crossTenantRequest.parse(request);
      const validatedContext = this.validateSecurityContext(context);
      
      if (!validatedContext.success) {
        auditEntry.success = false;
        auditEntry.errorMessage = validatedContext.error;
        auditEntry.riskScore = 9;
        this.logAuditEntry(auditEntry);
        
        return {
          allowed: false,
          requiresApproval: false,
          security: this.createDefaultSecurityContext(context),
          error: validatedContext.error,
        };
      }

      const securityContext = validatedContext.context;
      auditEntry.tenantId = securityContext.tenantId;
      auditEntry.userId = securityContext.userId;
      auditEntry.operation = validatedRequest.operation;
      auditEntry.metadata = {
        source_tenant: validatedRequest.sourceTenantId,
        target_tenant: validatedRequest.targetTenantId,
        justification: validatedRequest.justification,
      };

      // 1. Verify user has permission to access source tenant
      if (securityContext.tenantId !== validatedRequest.sourceTenantId) {
        auditEntry.success = false;
        auditEntry.errorMessage = 'User not authorized for source tenant';
        auditEntry.riskScore = 8;
        this.logAuditEntry(auditEntry);
        
        return {
          allowed: false,
          requiresApproval: false,
          security: securityContext,
          error: 'Access denied: Invalid source tenant',
        };
      }

      // 2. Check if cross-tenant access is allowed for this operation
      const operationPolicy = this.getOperationPolicy(validatedRequest.operation);
      if (!operationPolicy.crossTenantAllowed) {
        auditEntry.success = false;
        auditEntry.errorMessage = 'Cross-tenant access not allowed for this operation';
        auditEntry.riskScore = 7;
        this.logAuditEntry(auditEntry);
        
        return {
          allowed: false,
          requiresApproval: false,
          security: securityContext,
          error: 'Access denied: Cross-tenant access not permitted',
        };
      }

      // 3. Check user role permissions
      if (!this.hasRequiredRole(securityContext.userRole, operationPolicy.minimumRole)) {
        auditEntry.success = false;
        auditEntry.errorMessage = 'Insufficient role for cross-tenant access';
        auditEntry.riskScore = 6;
        this.logAuditEntry(auditEntry);
        
        return {
          allowed: false,
          requiresApproval: false,
          security: securityContext,
          error: 'Access denied: Insufficient permissions',
        };
      }

      // 4. Detect suspicious cross-tenant patterns
      const suspiciousCheck = this.checkSuspiciousCrossTenantActivity(
        validatedRequest,
        securityContext
      );

      if (suspiciousCheck.suspicious) {
        auditEntry.success = false;
        auditEntry.errorMessage = 'Suspicious cross-tenant activity detected';
        auditEntry.riskScore = 9;
        auditEntry.event = 'suspicious_tenant_switching';
        this.logAuditEntry(auditEntry);
        
        return {
          allowed: false,
          requiresApproval: false,
          security: securityContext,
          error: 'Access denied: Suspicious activity detected',
        };
      }

      // 5. Determine if approval is required
      const requiresApproval = validatedRequest.approvalRequired || 
        operationPolicy.requiresApproval ||
        operationPolicy.riskLevel === 'high' ||
        operationPolicy.riskLevel === 'critical';

      auditEntry.success = true;
      auditEntry.riskScore = this.calculateCrossTenantRisk(validatedRequest, securityContext);
      auditEntry.metadata!.requires_approval = requiresApproval;
      this.logAuditEntry(auditEntry);

      return {
        allowed: true,
        requiresApproval,
        security: securityContext,
      };

    } catch (error) {
      auditEntry.success = false;
      auditEntry.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      auditEntry.riskScore = 10;
      this.logAuditEntry(auditEntry);

      return {
        allowed: false,
        requiresApproval: false,
        security: this.createDefaultSecurityContext(context),
        error: 'Cross-tenant validation failed',
      };
    }
  }

  /**
   * Encrypt sensitive tenant data
   */
  async encryptTenantData(data: any, tenantId: string): Promise<{
    encryptedData: string;
    iv: string;
    authTag: string;
  }> {
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipher(
      TENANT_SECURITY_CONFIG.TENANT_DATA_ENCRYPTION_ALGORITHM,
      this.encryptionKey
    );
    
    // Add tenant ID as additional authenticated data
    cipher.setAAD(Buffer.from(tenantId, 'utf8'));
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encryptedData: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  /**
   * Decrypt tenant data
   */
  async decryptTenantData(
    encryptedData: string,
    iv: string,
    authTag: string,
    tenantId: string
  ): Promise<any> {
    try {
      const decipher = crypto.createDecipher(
        TENANT_SECURITY_CONFIG.TENANT_DATA_ENCRYPTION_ALGORITHM,
        this.encryptionKey
      );
      
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      decipher.setAAD(Buffer.from(tenantId, 'utf8'));
      
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error('Failed to decrypt tenant data');
    }
  }

  /**
   * Generate tenant-specific security token
   */
  generateTenantSecurityToken(
    tenantId: string,
    userId: string,
    permissions: string[],
    expiresIn: number = 8 * 60 * 60 * 1000 // 8 hours
  ): string {
    const payload = {
      tenantId,
      userId,
      permissions,
      iat: Date.now(),
      exp: Date.now() + expiresIn,
    };
    
    const token = crypto
      .createHmac(TENANT_SECURITY_CONFIG.TENANT_ID_HASH_ALGORITHM, this.encryptionKey)
      .update(JSON.stringify(payload))
      .digest('base64url');
    
    return `${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${token}`;
  }

  /**
   * Verify tenant security token
   */
  verifyTenantSecurityToken(token: string): {
    valid: boolean;
    payload?: any;
    error?: string;
  } {
    try {
      const [payloadBase64, signature] = token.split('.');
      if (!payloadBase64 || !signature) {
        return { valid: false, error: 'Invalid token format' };
      }
      
      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString());
      
      // Check expiration
      if (Date.now() > payload.exp) {
        return { valid: false, error: 'Token expired' };
      }
      
      // Verify signature
      const expectedSignature = crypto
        .createHmac(TENANT_SECURITY_CONFIG.TENANT_ID_HASH_ALGORITHM, this.encryptionKey)
        .update(JSON.stringify(payload))
        .digest('base64url');
      
      if (!crypto.timingSafeEqual(
        Buffer.from(signature, 'base64url'),
        Buffer.from(expectedSignature, 'base64url')
      )) {
        return { valid: false, error: 'Invalid token signature' };
      }
      
      return { valid: true, payload };
    } catch (error) {
      return { valid: false, error: 'Token verification failed' };
    }
  }

  /**
   * Validate security context
   */
  private validateSecurityContext(
    context: Partial<TenantSecurityContext>
  ): { success: boolean; context?: TenantSecurityContext; error?: string } {
    try {
      if (!context.tenantId || !context.userId) {
        return { success: false, error: 'Missing required security context' };
      }

      const securityBoundary = this.tenantBoundaries.get(context.tenantId) || 
        this.createDefaultSecurityBoundary(context.tenantId);

      const fullContext: TenantSecurityContext = {
        tenantId: context.tenantId,
        tenantSlug: context.tenantSlug,
        organizationId: context.organizationId,
        userId: context.userId,
        userRole: context.userRole || 'user',
        sessionId: context.sessionId || this.generateSecureId(),
        ipAddress: context.ipAddress || 'unknown',
        userAgent: context.userAgent || 'unknown',
        permissions: context.permissions || [],
        isolationLevel: context.isolationLevel || 'strict',
        securityBoundary,
        auditLog: {} as TenantAuditEntry,
      };

      return { success: true, context: fullContext };
    } catch (error) {
      return { success: false, error: 'Context validation failed' };
    }
  }

  /**
   * Check tenant isolation boundaries
   */
  private async checkTenantIsolation(
    request: z.infer<typeof tenantSecuritySchemas.dataAccess>,
    context: TenantSecurityContext
  ): Promise<{ allowed: boolean; reason?: string }> {
    
    // Check if resource belongs to the tenant
    if (!this.resourceBelongsToTenant(request.resourceId, context.tenantId)) {
      return { allowed: false, reason: 'Resource does not belong to tenant' };
    }

    // Check isolation level requirements
    const resourceAccess = context.securityBoundary.accessControlMatrix.resources[request.resourceType];
    if (resourceAccess && resourceAccess.isolationLevel === 'strict') {
      if (context.isolationLevel !== 'strict') {
        return { allowed: false, reason: 'Strict isolation required for this resource' };
      }
    }

    // Check for cross-tenant data contamination
    if (await this.detectCrossTenantContamination(request.resourceId, context.tenantId)) {
      return { allowed: false, reason: 'Cross-tenant data contamination detected' };
    }

    return { allowed: true };
  }

  /**
   * Check access control permissions
   */
  private async checkAccessControl(
    request: z.infer<typeof tenantSecuritySchemas.dataAccess>,
    context: TenantSecurityContext
  ): Promise<{ allowed: boolean; reason?: string }> {
    
    const cacheKey = `${context.userId}-${request.resourceType}-${request.operation}`;
    const cached = this.accessControlCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minute cache
      return cached.result;
    }

    // Check role-based permissions
    const requiredPermission = `${request.resourceType}:${request.operation}`;
    if (!context.permissions.includes(requiredPermission) && 
        !context.permissions.includes(`${request.resourceType}:*`) &&
        !context.permissions.includes('*:*')) {
      
      const result = { allowed: false, reason: 'Insufficient permissions for operation' };
      this.accessControlCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    }

    // Check data classification requirements
    const resourceAccess = context.securityBoundary.accessControlMatrix.resources[request.resourceType];
    if (resourceAccess) {
      const hasRequiredPermissions = resourceAccess.requiredPermissions.every(
        perm => context.permissions.includes(perm)
      );
      
      if (!hasRequiredPermissions) {
        const result = { allowed: false, reason: 'Missing required permissions for data classification' };
        this.accessControlCache.set(cacheKey, { result, timestamp: Date.now() });
        return result;
      }
    }

    const result = { allowed: true };
    this.accessControlCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  }

  /**
   * Check for suspicious cross-tenant activity
   */
  private checkSuspiciousCrossTenantActivity(
    request: z.infer<typeof tenantSecuritySchemas.crossTenantRequest>,
    context: TenantSecurityContext
  ): { suspicious: boolean; reasons?: string[] } {
    const userId = context.userId;
    const now = Date.now();
    const hourWindow = 60 * 60 * 1000; // 1 hour

    // Get or create suspicious activity tracking
    let activity = this.suspiciousActivities.get(userId) || {
      crossTenantRequests: [],
      lastTenantSwitch: 0,
      tenantSwitchCount: 0,
    };

    // Filter recent requests
    activity.crossTenantRequests = activity.crossTenantRequests.filter(
      req => now - req.timestamp < hourWindow
    );

    const reasons: string[] = [];
    let suspicious = false;

    // Check rapid tenant switching
    if (now - activity.lastTenantSwitch < 5 * 60 * 1000) { // 5 minutes
      activity.tenantSwitchCount++;
      if (activity.tenantSwitchCount > 3) {
        reasons.push('Rapid tenant switching detected');
        suspicious = true;
      }
    } else {
      activity.tenantSwitchCount = 0;
    }

    // Check excessive cross-tenant requests
    if (activity.crossTenantRequests.length >= 10) {
      reasons.push('Excessive cross-tenant requests');
      suspicious = true;
    }

    // Check for unusual patterns
    const uniqueTargetTenants = new Set(
      activity.crossTenantRequests.map(req => req.targetTenant)
    ).size;
    
    if (uniqueTargetTenants > 5) {
      reasons.push('Access to unusual number of tenants');
      suspicious = true;
    }

    // Update activity tracking
    activity.crossTenantRequests.push({
      timestamp: now,
      sourceTenant: request.sourceTenantId,
      targetTenant: request.targetTenantId,
      operation: request.operation,
    });
    activity.lastTenantSwitch = now;

    this.suspiciousActivities.set(userId, activity);

    return { suspicious, reasons: suspicious ? reasons : undefined };
  }

  /**
   * Initialize tenant security boundaries
   */
  private initializeTenantBoundaries(): void {
    // This would typically be loaded from configuration or database
    // For now, we'll set up default boundaries
    
    const defaultAccessControl: AccessControlMatrix = {
      roles: {
        'user': ['read'],
        'admin': ['read', 'write', 'update'],
        'super_admin': ['read', 'write', 'update', 'delete', 'export'],
      },
      resources: {
        'cart': {
          classification: 'internal',
          requiredPermissions: ['cart:read'],
          isolationLevel: 'strict',
          encryptionRequired: true,
        },
        'payment': {
          classification: 'restricted',
          requiredPermissions: ['payment:read', 'pci:access'],
          isolationLevel: 'strict',
          encryptionRequired: true,
        },
        'customer': {
          classification: 'confidential',
          requiredPermissions: ['customer:read'],
          isolationLevel: 'controlled',
          encryptionRequired: true,
        },
      },
      operations: {
        'data_export': {
          minimumRole: 'admin',
          requiresApproval: true,
          auditRequired: true,
          riskLevel: 'high',
          crossTenantAllowed: false,
        },
        'bulk_operation': {
          minimumRole: 'admin',
          requiresApproval: true,
          auditRequired: true,
          riskLevel: 'medium',
          crossTenantAllowed: false,
        },
      },
    };

    // Set up default boundaries for common scenarios
    const defaultBoundary: TenantSecurityBoundary = {
      allowedTenants: [],
      restrictedOperations: TENANT_SECURITY_CONFIG.SENSITIVE_OPERATIONS,
      dataClassification: 'internal',
      encryptionRequirements: {
        atRest: true,
        inTransit: true,
        inMemory: false,
        keyRotationDays: 90,
        algorithm: TENANT_SECURITY_CONFIG.TENANT_DATA_ENCRYPTION_ALGORITHM,
      },
      accessControlMatrix: defaultAccessControl,
    };

    // This would be loaded dynamically per tenant
    // For now, we use a default boundary
  }

  /**
   * Utility methods
   */
  private createDefaultSecurityBoundary(tenantId: string): TenantSecurityBoundary {
    return {
      allowedTenants: [tenantId],
      restrictedOperations: [],
      dataClassification: 'internal',
      encryptionRequirements: {
        atRest: true,
        inTransit: true,
        inMemory: false,
        keyRotationDays: 90,
        algorithm: 'aes-256-gcm',
      },
      accessControlMatrix: {
        roles: {},
        resources: {},
        operations: {},
      },
    };
  }

  private createDefaultSecurityContext(context: Partial<TenantSecurityContext>): TenantSecurityContext {
    return {
      tenantId: context.tenantId || '',
      userId: context.userId || '',
      userRole: context.userRole || 'user',
      sessionId: context.sessionId || '',
      ipAddress: context.ipAddress || 'unknown',
      userAgent: context.userAgent || 'unknown',
      permissions: [],
      isolationLevel: 'strict',
      securityBoundary: this.createDefaultSecurityBoundary(context.tenantId || ''),
      auditLog: {} as TenantAuditEntry,
    };
  }

  private resourceBelongsToTenant(resourceId: string, tenantId: string): boolean {
    // This would typically query the database to verify tenant ownership
    // For now, we'll use a simple heuristic
    return resourceId.includes(tenantId) || resourceId.startsWith(`${tenantId}_`);
  }

  private async detectCrossTenantContamination(resourceId: string, tenantId: string): Promise<boolean> {
    // This would check for cross-tenant data contamination
    // Implementation would depend on specific data architecture
    return false;
  }

  private requiresEncryption(request: z.infer<typeof tenantSecuritySchemas.dataAccess>): boolean {
    return ['payment', 'customer', 'sensitive'].includes(request.resourceType) ||
           request.dataClassification === 'restricted' ||
           request.dataClassification === 'top_secret';
  }

  private async encryptSensitiveData(resourceId: string, context: TenantSecurityContext): Promise<any> {
    // This would encrypt the actual sensitive data
    // For now, we'll return a placeholder
    return { encrypted: true, resourceId, tenantId: context.tenantId };
  }

  private calculateRiskScore(
    request: z.infer<typeof tenantSecuritySchemas.dataAccess>,
    context: TenantSecurityContext
  ): number {
    let score = 0;
    
    // Data classification risk
    const classificationScores = {
      'public': 0,
      'internal': 2,
      'confidential': 5,
      'restricted': 8,
      'top_secret': 10,
    };
    score += classificationScores[request.dataClassification] || 0;
    
    // Operation risk
    const operationScores = {
      'read': 1,
      'write': 3,
      'update': 3,
      'delete': 5,
      'export': 8,
      'bulk': 6,
    };
    score += operationScores[request.operation] || 0;
    
    return Math.min(score, 10);
  }

  private calculateCrossTenantRisk(
    request: z.infer<typeof tenantSecuritySchemas.crossTenantRequest>,
    context: TenantSecurityContext
  ): number {
    // Base risk for cross-tenant access
    let score = 5;
    
    // Operation-specific risk
    if (['data_export', 'bulk_operation'].includes(request.operation)) {
      score += 3;
    }
    
    // Recent suspicious activity
    const activity = this.suspiciousActivities.get(context.userId);
    if (activity && activity.tenantSwitchCount > 2) {
      score += 2;
    }
    
    return Math.min(score, 10);
  }

  private getOperationPolicy(operation: string): OperationPolicy {
    // Default policy for unknown operations
    return {
      minimumRole: 'admin',
      requiresApproval: true,
      auditRequired: true,
      riskLevel: 'medium',
      crossTenantAllowed: false,
    };
  }

  private hasRequiredRole(userRole: string, minimumRole: string): boolean {
    const roleHierarchy = ['user', 'admin', 'super_admin'];
    const userRoleIndex = roleHierarchy.indexOf(userRole);
    const minimumRoleIndex = roleHierarchy.indexOf(minimumRole);
    
    return userRoleIndex >= minimumRoleIndex;
  }

  private recordIsolationViolation(tenantId: string, userId: string): void {
    const key = `${tenantId}:${userId}`;
    const violations = this.isolationViolations.get(key) || 0;
    this.isolationViolations.set(key, violations + 1);
    
    // Alert if too many violations
    if (violations >= TENANT_SECURITY_CONFIG.MAX_TENANT_ISOLATION_FAILURES) {
      this.logAuditEntry({
        id: this.generateSecureId('alert'),
        timestamp: Date.now(),
        event: 'isolation_boundary_violated',
        tenantId,
        userId,
        userRole: 'unknown',
        sessionId: 'system',
        ipAddress: 'system',
        userAgent: 'system',
        operation: 'alert',
        success: true,
        securityLevel: 'critical',
        isolationViolation: true,
        riskScore: 10,
        metadata: { violation_count: violations + 1 },
      });
    }
  }

  private initializeAuditEntry(
    event: TenantSecurityEvent,
    context: Partial<TenantSecurityContext>
  ): TenantAuditEntry {
    return {
      id: this.generateSecureId('audit'),
      timestamp: Date.now(),
      event,
      tenantId: context.tenantId || '',
      userId: context.userId || '',
      userRole: context.userRole || '',
      sessionId: context.sessionId || '',
      ipAddress: context.ipAddress || 'unknown',
      userAgent: context.userAgent || 'unknown',
      operation: '',
      success: false,
      securityLevel: 'medium',
      isolationViolation: false,
      riskScore: 0,
    };
  }

  private logAuditEntry(entry: TenantAuditEntry): void {
    this.auditTrail.push(entry);
    
    // Keep only last 100000 entries in memory
    if (this.auditTrail.length > 100000) {
      this.auditTrail = this.auditTrail.slice(-100000);
    }

    // In production, send to secure logging service
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify({
        ...entry,
        type: 'tenant_security_audit',
      }));
    }
  }

  private generateSecureId(prefix: string = 'tenant'): string {
    const timestamp = Date.now().toString(36);
    const randomBytes = crypto.randomBytes(8).toString('hex');
    return `${prefix}_${timestamp}_${randomBytes}`;
  }

  /**
   * Public methods for accessing audit data and metrics
   */
  getAuditTrail(filters?: {
    tenantId?: string;
    userId?: string;
    event?: TenantSecurityEvent;
    startTime?: number;
    endTime?: number;
    isolationViolationsOnly?: boolean;
  }): TenantAuditEntry[] {
    return this.auditTrail.filter(entry => {
      if (filters?.tenantId && entry.tenantId !== filters.tenantId) return false;
      if (filters?.userId && entry.userId !== filters.userId) return false;
      if (filters?.event && entry.event !== filters.event) return false;
      if (filters?.startTime && entry.timestamp < filters.startTime) return false;
      if (filters?.endTime && entry.timestamp > filters.endTime) return false;
      if (filters?.isolationViolationsOnly && !entry.isolationViolation) return false;
      return true;
    });
  }

  getSecurityMetrics(tenantId?: string): TenantSecurityMetrics {
    const now = Date.now();
    const dayWindow = 24 * 60 * 60 * 1000;
    const recentEntries = this.auditTrail.filter(entry => {
      const isRecent = now - entry.timestamp < dayWindow;
      const matchesTenant = !tenantId || entry.tenantId === tenantId;
      return isRecent && matchesTenant;
    });

    return {
      totalRequests: recentEntries.length,
      successfulRequests: recentEntries.filter(e => e.success).length,
      failedRequests: recentEntries.filter(e => !e.success).length,
      isolationViolations: recentEntries.filter(e => e.isolationViolation).length,
      crossTenantRequests: recentEntries.filter(e => e.event === 'cross_tenant_access_attempted').length,
      highRiskOperations: recentEntries.filter(e => e.riskScore >= 8).length,
      averageRiskScore: recentEntries.length > 0 
        ? recentEntries.reduce((sum, e) => sum + e.riskScore, 0) / recentEntries.length 
        : 0,
      uniqueUsers: new Set(recentEntries.map(e => e.userId)).size,
      suspiciousActivities: Array.from(this.suspiciousActivities.keys()).length,
    };
  }
}

interface AccessControlResult {
  result: { allowed: boolean; reason?: string };
  timestamp: number;
}

interface SuspiciousActivity {
  crossTenantRequests: Array<{
    timestamp: number;
    sourceTenant: string;
    targetTenant: string;
    operation: string;
  }>;
  lastTenantSwitch: number;
  tenantSwitchCount: number;
}

interface TenantSecurityMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  isolationViolations: number;
  crossTenantRequests: number;
  highRiskOperations: number;
  averageRiskScore: number;
  uniqueUsers: number;
  suspiciousActivities: number;
}

export const createTenantSecurityService = (encryptionKey?: string) => {
  return new TenantSecurityService(encryptionKey);
};