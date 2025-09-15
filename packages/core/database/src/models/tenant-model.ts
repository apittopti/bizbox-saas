import { z } from 'zod';
import { BaseModel } from './base-model';
import { tenants } from '../schema/tenants';
import { 
  tenantSchema, 
  createTenantSchema, 
  updateTenantSchema,
  type Tenant,
  type CreateTenant,
  type UpdateTenant
} from '../validation/schemas';
import { withClient } from '../connection';

export class TenantModel extends BaseModel<Tenant, CreateTenant, UpdateTenant> {
  protected tableName = 'tenants';
  protected table = tenants;
  protected createSchema = createTenantSchema;
  protected updateSchema = updateTenantSchema;
  protected tenantColumn = 'id'; // Tenants table doesn't have tenant isolation

  /**
   * Find tenant by domain
   */
  async findByDomain(domain: string): Promise<Tenant | null> {
    try {
      return await withClient(async (client) => {
        const result = await client.query(
          'SELECT * FROM tenants WHERE domain = $1 LIMIT 1',
          [domain]
        );
        return result.rows[0] || null;
      });
    } catch (error) {
      console.error('Error finding tenant by domain:', error);
      throw error;
    }
  }

  /**
   * Check if domain is available
   */
  async isDomainAvailable(domain: string, excludeTenantId?: string): Promise<boolean> {
    try {
      return await withClient(async (client) => {
        let query = 'SELECT id FROM tenants WHERE domain = $1';
        const params = [domain];

        if (excludeTenantId) {
          query += ' AND id != $2';
          params.push(excludeTenantId);
        }

        const result = await client.query(query, params);
        return result.rows.length === 0;
      });
    } catch (error) {
      console.error('Error checking domain availability:', error);
      return false;
    }
  }

  /**
   * Get tenant with usage statistics
   */
  async getTenantWithStats(tenantId: string): Promise<Tenant & { stats: any } | null> {
    try {
      return await withClient(async (client) => {
        // Get tenant info
        const tenantResult = await client.query(
          'SELECT * FROM tenants WHERE id = $1',
          [tenantId]
        );

        if (tenantResult.rows.length === 0) {
          return null;
        }

        const tenant = tenantResult.rows[0];

        // Get usage statistics
        const statsResult = await client.query(`
          SELECT 
            (SELECT COUNT(*) FROM users WHERE tenant_id = $1) as user_count,
            (SELECT COUNT(*) FROM businesses WHERE tenant_id = $1) as business_count
        `, [tenantId]);

        const stats = statsResult.rows[0];

        return {
          ...tenant,
          stats: {
            userCount: parseInt(stats.user_count, 10),
            businessCount: parseInt(stats.business_count, 10)
          }
        };
      });
    } catch (error) {
      console.error('Error getting tenant with stats:', error);
      throw error;
    }
  }

  /**
   * Update tenant settings
   */
  async updateSettings(tenantId: string, settings: Record<string, any>): Promise<Tenant | null> {
    try {
      const existing = await this.findById(tenantId, { skipAudit: true });
      if (!existing) {
        return null;
      }

      const mergedSettings = {
        ...existing.settings,
        ...settings
      };

      return await this.update(tenantId, { settings: mergedSettings } as UpdateTenant);
    } catch (error) {
      console.error('Error updating tenant settings:', error);
      throw error;
    }
  }

  /**
   * Deactivate tenant (soft delete)
   */
  async deactivate(tenantId: string): Promise<boolean> {
    try {
      const updated = await this.updateSettings(tenantId, { 
        active: false,
        deactivatedAt: new Date().toISOString()
      });
      return updated !== null;
    } catch (error) {
      console.error('Error deactivating tenant:', error);
      throw error;
    }
  }

  /**
   * Reactivate tenant
   */
  async reactivate(tenantId: string): Promise<boolean> {
    try {
      const updated = await this.updateSettings(tenantId, { 
        active: true,
        reactivatedAt: new Date().toISOString()
      });
      return updated !== null;
    } catch (error) {
      console.error('Error reactivating tenant:', error);
      throw error;
    }
  }

  /**
   * Override base methods to handle tenant-specific logic
   */
  async findById(id: string, options: { skipAudit?: boolean } = {}): Promise<Tenant | null> {
    return await withClient(async (client) => {
      const result = await client.query(
        'SELECT * FROM tenants WHERE id = $1 LIMIT 1',
        [id]
      );
      return result.rows[0] || null;
    });
  }

  async findAll(options: {
    where?: any;
    limit?: number;
    offset?: number;
    skipAudit?: boolean;
  } = {}): Promise<Tenant[]> {
    return await withClient(async (client) => {
      let query = 'SELECT * FROM tenants WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (options.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(options.limit);
        paramIndex++;
      }

      if (options.offset) {
        query += ` OFFSET $${paramIndex}`;
        params.push(options.offset);
        paramIndex++;
      }

      query += ' ORDER BY created_at DESC';

      const result = await client.query(query, params);
      return result.rows;
    });
  }

  async create(data: CreateTenant, options: { skipAudit?: boolean } = {}): Promise<Tenant> {
    // Validate domain availability
    if (data.domain && !(await this.isDomainAvailable(data.domain))) {
      throw new Error(`Domain '${data.domain}' is already taken`);
    }

    return await withClient(async (client) => {
      const result = await client.query(`
        INSERT INTO tenants (name, domain, plan, settings)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [
        data.name,
        data.domain || null,
        data.plan || 'basic',
        JSON.stringify(data.settings || {})
      ]);

      const created = result.rows[0];

      // Log audit trail (no tenant context for tenant creation)
      if (!options.skipAudit) {
        await withClient(async (auditClient) => {
          await auditClient.query(`
            INSERT INTO audit_logs (tenant_id, action, resource, resource_id, new_values)
            VALUES ($1, $2, $3, $4, $5)
          `, [
            created.id,
            'CREATE',
            'tenants',
            created.id,
            JSON.stringify(created)
          ]);
        });
      }

      return created;
    });
  }
}

// Export singleton instance
export const tenantModel = new TenantModel();