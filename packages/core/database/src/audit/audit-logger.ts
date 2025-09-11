import { PoolClient } from 'pg';
import { withClient } from '../connection';
import { getCurrentTenantContext } from '../tenant-context';

export interface AuditLogEntry {
  id?: string;
  tenantId: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: Date;
}

export interface AuditLogFilter {
  tenantId?: string;
  userId?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class AuditLogger {
  private static instance: AuditLogger;

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  async initialize(): Promise<void> {
    await withClient(async (client) => {
      // Create audit_logs table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          tenant_id UUID NOT NULL,
          user_id UUID,
          action VARCHAR(100) NOT NULL,
          resource VARCHAR(100) NOT NULL,
          resource_id VARCHAR(255),
          old_values JSONB,
          new_values JSONB,
          metadata JSONB DEFAULT '{}',
          ip_address INET,
          user_agent TEXT,
          timestamp TIMESTAMP DEFAULT NOW()
        );
      `);

      // Create indexes for performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs(resource_id);
      `);

      // Enable RLS on audit_logs
      await client.query(`ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;`);

      // Create RLS policy for audit logs
      await client.query(`
        DROP POLICY IF EXISTS tenant_isolation_audit_logs ON audit_logs;
        CREATE POLICY tenant_isolation_audit_logs ON audit_logs
          USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
      `);

      await client.query(`
        DROP POLICY IF EXISTS tenant_isolation_audit_logs_insert ON audit_logs;
        CREATE POLICY tenant_isolation_audit_logs_insert ON audit_logs
          FOR INSERT
          WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
      `);
    });
  }

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      const context = getCurrentTenantContext();
      const tenantId = entry.tenantId || context?.tenantId;
      const userId = entry.userId || context?.userId;

      if (!tenantId) {
        console.warn('Cannot log audit entry: no tenant context available');
        return;
      }

      await withClient(async (client) => {
        await client.query(`
          INSERT INTO audit_logs (
            tenant_id, user_id, action, resource, resource_id,
            old_values, new_values, metadata, ip_address, user_agent
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          tenantId,
          userId || null,
          entry.action,
          entry.resource,
          entry.resourceId || null,
          entry.oldValues ? JSON.stringify(entry.oldValues) : null,
          entry.newValues ? JSON.stringify(entry.newValues) : null,
          entry.metadata ? JSON.stringify(entry.metadata) : '{}',
          entry.ipAddress || null,
          entry.userAgent || null,
        ]);
      });
    } catch (error) {
      console.error('Failed to log audit entry:', error);
      // Don't throw - audit logging should not break the main operation
    }
  }

  async logCreate(
    resource: string,
    resourceId: string,
    newValues: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      tenantId: '', // Will be filled from context
      action: 'CREATE',
      resource,
      resourceId,
      newValues,
      metadata,
    });
  }

  async logUpdate(
    resource: string,
    resourceId: string,
    oldValues: Record<string, any>,
    newValues: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      tenantId: '', // Will be filled from context
      action: 'UPDATE',
      resource,
      resourceId,
      oldValues,
      newValues,
      metadata,
    });
  }

  async logDelete(
    resource: string,
    resourceId: string,
    oldValues: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      tenantId: '', // Will be filled from context
      action: 'DELETE',
      resource,
      resourceId,
      oldValues,
      metadata,
    });
  }

  async logAccess(
    resource: string,
    resourceId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      tenantId: '', // Will be filled from context
      action: 'ACCESS',
      resource,
      resourceId,
      metadata,
    });
  }

  async getAuditLogs(filter: AuditLogFilter = {}): Promise<AuditLogEntry[]> {
    return await withClient(async (client) => {
      let query = `
        SELECT 
          id, tenant_id, user_id, action, resource, resource_id,
          old_values, new_values, metadata, ip_address, user_agent, timestamp
        FROM audit_logs
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (filter.userId) {
        query += ` AND user_id = $${paramIndex}`;
        params.push(filter.userId);
        paramIndex++;
      }

      if (filter.action) {
        query += ` AND action = $${paramIndex}`;
        params.push(filter.action);
        paramIndex++;
      }

      if (filter.resource) {
        query += ` AND resource = $${paramIndex}`;
        params.push(filter.resource);
        paramIndex++;
      }

      if (filter.resourceId) {
        query += ` AND resource_id = $${paramIndex}`;
        params.push(filter.resourceId);
        paramIndex++;
      }

      if (filter.startDate) {
        query += ` AND timestamp >= $${paramIndex}`;
        params.push(filter.startDate);
        paramIndex++;
      }

      if (filter.endDate) {
        query += ` AND timestamp <= $${paramIndex}`;
        params.push(filter.endDate);
        paramIndex++;
      }

      query += ` ORDER BY timestamp DESC`;

      if (filter.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(filter.limit);
        paramIndex++;
      }

      if (filter.offset) {
        query += ` OFFSET $${paramIndex}`;
        params.push(filter.offset);
        paramIndex++;
      }

      const result = await client.query(query, params);
      return result.rows.map(row => ({
        id: row.id,
        tenantId: row.tenant_id,
        userId: row.user_id,
        action: row.action,
        resource: row.resource,
        resourceId: row.resource_id,
        oldValues: row.old_values,
        newValues: row.new_values,
        metadata: row.metadata,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        timestamp: row.timestamp,
      }));
    });
  }

  createAuditMiddleware() {
    return (req: any, res: any, next: any) => {
      // Store original methods
      const originalSend = res.send;
      const originalJson = res.json;
      const startTime = Date.now();

      // Store request data for audit logging
      req.auditData = {
        startTime,
        method: req.method,
        path: req.path,
        query: req.query,
        body: req.body,
        params: req.params,
        headers: {
          userAgent: req.get('User-Agent'),
          contentType: req.get('Content-Type'),
          authorization: req.get('Authorization') ? '[REDACTED]' : undefined,
        },
        ipAddress: req.ip || req.connection.remoteAddress,
      };

      // Override response methods to capture audit data
      res.send = function(body: any) {
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Log the request if it's a modifying operation or if it failed
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) || res.statusCode >= 400) {
          const action = getActionFromMethod(req.method);
          const resource = getResourceFromPath(req.path);
          
          // Parse response body if it's JSON
          let responseData;
          try {
            responseData = typeof body === 'string' ? JSON.parse(body) : body;
          } catch {
            responseData = body;
          }

          AuditLogger.getInstance().log({
            tenantId: req.tenantId,
            userId: req.userId,
            action,
            resource,
            resourceId: req.params.id || req.params.resourceId,
            oldValues: req.method === 'PUT' || req.method === 'PATCH' ? req.auditData.originalData : undefined,
            newValues: req.body,
            metadata: {
              method: req.method,
              path: req.path,
              query: req.query,
              statusCode: res.statusCode,
              duration,
              success: res.statusCode < 400,
              errorMessage: res.statusCode >= 400 ? responseData?.error?.message : undefined,
              requestSize: JSON.stringify(req.body || {}).length,
              responseSize: JSON.stringify(responseData || {}).length,
            },
            ipAddress: req.auditData.ipAddress,
            userAgent: req.auditData.headers.userAgent,
          });
        }

        return originalSend.call(this, body);
      };

      res.json = function(body: any) {
        return originalJson.call(this, body);
      };

      next();
    };
  }

  /**
   * Enhanced audit logging for database operations
   */
  async logDatabaseOperation(
    operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
    table: string,
    recordId?: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    const action = operation === 'SELECT' ? 'ACCESS' : operation;
    
    await this.log({
      tenantId: '', // Will be filled from context
      action,
      resource: table,
      resourceId: recordId,
      oldValues,
      newValues,
      metadata: {
        ...metadata,
        operationType: 'database',
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Audit logging for authentication events
   */
  async logAuthEvent(
    event: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'PASSWORD_CHANGE' | 'PERMISSION_CHANGE',
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      tenantId: '', // Will be filled from context
      userId,
      action: event,
      resource: 'authentication',
      resourceId: userId,
      metadata: {
        ...metadata,
        eventType: 'authentication',
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Audit logging for system events
   */
  async logSystemEvent(
    event: string,
    resource: string,
    resourceId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      tenantId: '', // Will be filled from context
      action: event,
      resource,
      resourceId,
      metadata: {
        ...metadata,
        eventType: 'system',
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Get audit trail for a specific resource
   */
  async getResourceAuditTrail(
    resource: string,
    resourceId: string,
    options: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<AuditLogEntry[]> {
    return await this.getAuditLogs({
      resource,
      resourceId,
      ...options,
    });
  }

  /**
   * Get security-related audit logs
   */
  async getSecurityAuditLogs(options: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}): Promise<AuditLogEntry[]> {
    return await withClient(async (client) => {
      let query = `
        SELECT * FROM audit_logs
        WHERE action IN ('LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_CHANGE', 'PERMISSION_CHANGE', 'DELETE')
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (options.userId) {
        query += ` AND user_id = $${paramIndex}`;
        params.push(options.userId);
        paramIndex++;
      }

      if (options.startDate) {
        query += ` AND timestamp >= $${paramIndex}`;
        params.push(options.startDate);
        paramIndex++;
      }

      if (options.endDate) {
        query += ` AND timestamp <= $${paramIndex}`;
        params.push(options.endDate);
        paramIndex++;
      }

      query += ` ORDER BY timestamp DESC`;

      if (options.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(options.limit);
        paramIndex++;
      }

      const result = await client.query(query, params);
      return result.rows.map(row => ({
        id: row.id,
        tenantId: row.tenant_id,
        userId: row.user_id,
        action: row.action,
        resource: row.resource,
        resourceId: row.resource_id,
        oldValues: row.old_values,
        newValues: row.new_values,
        metadata: row.metadata,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        timestamp: row.timestamp,
      }));
    });
  }
}

function getActionFromMethod(method: string): string {
  switch (method) {
    case 'POST': return 'CREATE';
    case 'PUT':
    case 'PATCH': return 'UPDATE';
    case 'DELETE': return 'DELETE';
    case 'GET': return 'ACCESS';
    default: return 'UNKNOWN';
  }
}

function getResourceFromPath(path: string): string {
  // Extract resource name from path (e.g., /api/users/123 -> users)
  const segments = path.split('/').filter(Boolean);
  return segments[1] || 'unknown';
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();