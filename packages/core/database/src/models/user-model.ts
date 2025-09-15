import { z } from 'zod';
import { BaseModel } from './base-model';
import { users } from '../schema/users';
import { 
  userSchema, 
  createUserSchema, 
  updateUserSchema,
  type User,
  type CreateUser,
  type UpdateUser
} from '../validation/schemas';
import { getCurrentTenantId } from '../tenant-context';
import { withClient } from '../connection';
import { eq, and } from 'drizzle-orm';

export class UserModel extends BaseModel<User, CreateUser, UpdateUser> {
  protected tableName = 'users';
  protected table = users;
  protected createSchema = createUserSchema;
  protected updateSchema = updateUserSchema;

  /**
   * Transform database result to typed User
   */
  private transformUser(dbUser: any): User {
    if (!dbUser) return null as any;
    
    return {
      ...dbUser,
      role: dbUser.role as 'super_admin' | 'tenant_admin' | 'staff' | 'customer',
      profile: typeof dbUser.profile === 'object' ? dbUser.profile : {},
      permissions: Array.isArray(dbUser.permissions) ? dbUser.permissions : []
    };
  }

  /**
   * Find user by email within tenant
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const results = await this.queryBuilder.select(this.table, {
        where: eq(this.table.email, email),
        limit: 1
      });

      return this.transformUser(results[0]) || null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Check if email is available within tenant
   */
  async isEmailAvailable(email: string, excludeUserId?: string): Promise<boolean> {
    try {
      const tenantId = getCurrentTenantId();
      return await withClient(async (client) => {
        await client.query('SELECT set_config($1, $2, true)', ['app.current_tenant', tenantId]);

        let query = 'SELECT id FROM users WHERE email = $1 AND tenant_id = $2';
        const params = [email, tenantId];

        if (excludeUserId) {
          query += ' AND id != $3';
          params.push(excludeUserId);
        }

        const result = await client.query(query, params);
        return result.rows.length === 0;
      });
    } catch (error) {
      console.error('Error checking email availability:', error);
      return false;
    }
  }

  /**
   * Find users by role within tenant
   */
  async findByRole(role: 'super_admin' | 'tenant_admin' | 'staff' | 'customer'): Promise<User[]> {
    try {
      const results = await this.queryBuilder.select(this.table, {
        where: eq(this.table.role, role)
      });
      return results.map(user => this.transformUser(user));
    } catch (error) {
      console.error('Error finding users by role:', error);
      throw error;
    }
  }

  /**
   * Update user permissions
   */
  async updatePermissions(userId: string, permissions: { resource: string; action: string; conditions?: Record<string, any> }[]): Promise<User | null> {
    try {
      return await this.update(userId, { permissions } as any);
    } catch (error) {
      console.error('Error updating user permissions:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, profile: Record<string, any>): Promise<User | null> {
    try {
      const existing = await this.findById(userId, { skipAudit: true });
      if (!existing) {
        return null;
      }

      const mergedProfile = {
        ...existing.profile,
        ...profile
      };

      return await this.update(userId, { profile: mergedProfile });
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Change user role
   */
  async changeRole(userId: string, newRole: 'super_admin' | 'tenant_admin' | 'staff' | 'customer'): Promise<User | null> {
    try {
      return await this.update(userId, { role: newRole });
    } catch (error) {
      console.error('Error changing user role:', error);
      throw error;
    }
  }

  /**
   * Get users with their relationships
   */
  async getUsersWithRelations(options: {
    includeProfile?: boolean;
    includePermissions?: boolean;
    role?: 'super_admin' | 'tenant_admin' | 'staff' | 'customer';
    limit?: number;
    offset?: number;
  } = {}): Promise<User[]> {
    try {
      const tenantId = getCurrentTenantId();
      return await withClient(async (client) => {
        await client.query('SELECT set_config($1, $2, true)', ['app.current_tenant', tenantId]);

        let query = `
          SELECT 
            u.*,
            t.name as tenant_name,
            t.domain as tenant_domain
          FROM users u
          JOIN tenants t ON u.tenant_id = t.id
          WHERE u.tenant_id = $1
        `;
        const params = [tenantId];
        let paramIndex = 2;

        if (options.role) {
          query += ` AND u.role = $${paramIndex}`;
          params.push(options.role);
          paramIndex++;
        }

        query += ' ORDER BY u.created_at DESC';

        if (options.limit) {
          query += ` LIMIT $${paramIndex}`;
          params.push(String(options.limit));
          paramIndex++;
        }

        if (options.offset) {
          query += ` OFFSET $${paramIndex}`;
          params.push(String(options.offset));
          paramIndex++;
        }

        const result = await client.query(query, params);
        return result.rows.map(row => ({
          id: row.id,
          tenantId: row.tenant_id,
          email: row.email,
          passwordHash: row.password_hash,
          role: row.role,
          profile: row.profile,
          permissions: row.permissions,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }) as User);
      });
    } catch (error) {
      console.error('Error getting users with relations:', error);
      throw error;
    }
  }

  /**
   * Deactivate user (soft delete)
   */
  async deactivate(userId: string): Promise<boolean> {
    try {
      const updated = await this.updateProfile(userId, { 
        active: false,
        deactivatedAt: new Date().toISOString()
      });
      return updated !== null;
    } catch (error) {
      console.error('Error deactivating user:', error);
      throw error;
    }
  }

  /**
   * Reactivate user
   */
  async reactivate(userId: string): Promise<boolean> {
    try {
      const updated = await this.updateProfile(userId, { 
        active: true,
        reactivatedAt: new Date().toISOString()
      });
      return updated !== null;
    } catch (error) {
      console.error('Error reactivating user:', error);
      throw error;
    }
  }

  /**
   * Override create to validate email uniqueness
   */
  async create(data: CreateUser, options = {}): Promise<User> {
    // Validate email availability
    if (!(await this.isEmailAvailable(data.email))) {
      throw new Error(`Email '${data.email}' is already registered in this tenant`);
    }

    return await super.create(data, options);
  }

  /**
   * Get user statistics for tenant
   */
  async getTenantUserStats(): Promise<{
    total: number;
    byRole: Record<string, number>;
    active: number;
    inactive: number;
  }> {
    try {
      const tenantId = getCurrentTenantId();
      return await withClient(async (client) => {
        await client.query('SELECT set_config($1, $2, true)', ['app.current_tenant', tenantId]);

        const result = await client.query(`
          SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN (profile->>'active')::boolean IS NOT FALSE THEN 1 END) as active,
            COUNT(CASE WHEN (profile->>'active')::boolean = false THEN 1 END) as inactive,
            json_object_agg(role, role_count) as by_role
          FROM (
            SELECT 
              role,
              COUNT(*) as role_count
            FROM users 
            WHERE tenant_id = $1
            GROUP BY role
          ) role_stats,
          (SELECT COUNT(*) as total FROM users WHERE tenant_id = $1) total_stats
          GROUP BY total_stats.total
        `, [tenantId]);

        const stats = result.rows[0];
        return {
          total: parseInt(stats.total, 10),
          byRole: stats.by_role || {},
          active: parseInt(stats.active, 10),
          inactive: parseInt(stats.inactive, 10)
        };
      });
    } catch (error) {
      console.error('Error getting tenant user stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const userModel = new UserModel();