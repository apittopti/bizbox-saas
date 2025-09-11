import { PoolClient } from 'pg';
import { withClient } from '../connection';
import { getCurrentTenantContext, setTenantContextOnClient } from '../tenant-context';

/**
 * Automatic tenant context injection for database operations
 * This middleware ensures all database queries are automatically scoped to the current tenant
 */
export class AutoTenantInjection {
  private static instance: AutoTenantInjection;

  static getInstance(): AutoTenantInjection {
    if (!AutoTenantInjection.instance) {
      AutoTenantInjection.instance = new AutoTenantInjection();
    }
    return AutoTenantInjection.instance;
  }

  /**
   * Wraps database client to automatically inject tenant context
   */
  async wrapClientWithTenantContext<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const context = getCurrentTenantContext();
    
    if (!context?.tenantId) {
      throw new Error('No tenant context available for database operation');
    }

    return await withClient(async (client) => {
      // Set tenant context in PostgreSQL session
      await setTenantContextOnClient(client, context.tenantId);
      
      try {
        return await callback(client);
      } finally {
        // Clear tenant context after operation
        await client.query('SELECT set_config($1, $2, true)', ['app.current_tenant', '']);
      }
    });
  }

  /**
   * Creates a database transaction with automatic tenant context
   */
  async withTenantTransaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const context = getCurrentTenantContext();
    
    if (!context?.tenantId) {
      throw new Error('No tenant context available for transaction');
    }

    return await withClient(async (client) => {
      await client.query('BEGIN');
      
      try {
        // Set tenant context
        await setTenantContextOnClient(client, context.tenantId);
        
        const result = await callback(client);
        
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        // Clear tenant context
        await client.query('SELECT set_config($1, $2, true)', ['app.current_tenant', '']);
      }
    });
  }

  /**
   * Validates that tenant context is properly set before database operations
   */
  validateTenantContext(): void {
    const context = getCurrentTenantContext();
    
    if (!context?.tenantId) {
      throw new Error(
        'Tenant context is required for this operation. ' +
        'Ensure the request includes tenant identification and middleware is properly configured.'
      );
    }
  }

  /**
   * Creates middleware for Express/Next.js to ensure tenant context is available
   */
  createTenantValidationMiddleware() {
    return (req: any, res: any, next: any) => {
      try {
        this.validateTenantContext();
        next();
      } catch (error) {
        res.status(400).json({
          error: {
            code: 'TENANT_CONTEXT_REQUIRED',
            message: error.message,
            timestamp: new Date().toISOString()
          }
        });
      }
    };
  }

  /**
   * Intercepts database queries to ensure tenant context is set
   */
  async interceptQuery(
    query: string,
    params: any[] = [],
    requiresTenantContext: boolean = true
  ): Promise<any> {
    if (requiresTenantContext) {
      this.validateTenantContext();
    }

    return await this.wrapClientWithTenantContext(async (client) => {
      return await client.query(query, params);
    });
  }

  /**
   * Batch operations with tenant context
   */
  async batchOperations<T>(
    operations: Array<(client: PoolClient) => Promise<T>>
  ): Promise<T[]> {
    this.validateTenantContext();

    return await this.withTenantTransaction(async (client) => {
      const results: T[] = [];
      
      for (const operation of operations) {
        const result = await operation(client);
        results.push(result);
      }
      
      return results;
    });
  }

  /**
   * Creates a tenant-aware query builder function
   */
  createTenantQueryBuilder() {
    return {
      select: async (table: string, conditions: Record<string, any> = {}) => {
        this.validateTenantContext();
        const context = getCurrentTenantContext()!;
        
        return await this.wrapClientWithTenantContext(async (client) => {
          const whereClause = Object.keys(conditions).length > 0
            ? `AND ${Object.keys(conditions).map((key, index) => `${key} = $${index + 2}`).join(' AND ')}`
            : '';
          
          const query = `
            SELECT * FROM ${table} 
            WHERE tenant_id = $1 ${whereClause}
            ORDER BY created_at DESC
          `;
          
          const params = [context.tenantId, ...Object.values(conditions)];
          const result = await client.query(query, params);
          return result.rows;
        });
      },

      insert: async (table: string, data: Record<string, any>) => {
        this.validateTenantContext();
        const context = getCurrentTenantContext()!;
        
        return await this.wrapClientWithTenantContext(async (client) => {
          const dataWithTenant = { ...data, tenant_id: context.tenantId };
          const columns = Object.keys(dataWithTenant);
          const values = Object.values(dataWithTenant);
          const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
          
          const query = `
            INSERT INTO ${table} (${columns.join(', ')})
            VALUES (${placeholders})
            RETURNING *
          `;
          
          const result = await client.query(query, values);
          return result.rows[0];
        });
      },

      update: async (table: string, id: string, data: Record<string, any>) => {
        this.validateTenantContext();
        const context = getCurrentTenantContext()!;
        
        return await this.wrapClientWithTenantContext(async (client) => {
          const columns = Object.keys(data);
          const values = Object.values(data);
          const setClause = columns.map((col, index) => `${col} = $${index + 3}`).join(', ');
          
          const query = `
            UPDATE ${table} 
            SET ${setClause}, updated_at = NOW()
            WHERE id = $1 AND tenant_id = $2
            RETURNING *
          `;
          
          const params = [id, context.tenantId, ...values];
          const result = await client.query(query, params);
          return result.rows[0];
        });
      },

      delete: async (table: string, id: string) => {
        this.validateTenantContext();
        const context = getCurrentTenantContext()!;
        
        return await this.wrapClientWithTenantContext(async (client) => {
          const query = `
            DELETE FROM ${table} 
            WHERE id = $1 AND tenant_id = $2
            RETURNING *
          `;
          
          const result = await client.query(query, [id, context.tenantId]);
          return result.rows[0];
        });
      }
    };
  }
}

// Export singleton instance
export const autoTenantInjection = AutoTenantInjection.getInstance();

// Export convenience functions
export const withTenantContext = autoTenantInjection.wrapClientWithTenantContext.bind(autoTenantInjection);
export const withTenantTransaction = autoTenantInjection.withTenantTransaction.bind(autoTenantInjection);
export const validateTenantContext = autoTenantInjection.validateTenantContext.bind(autoTenantInjection);
export const createTenantQueryBuilder = autoTenantInjection.createTenantQueryBuilder.bind(autoTenantInjection);