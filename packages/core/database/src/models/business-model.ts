import { z } from 'zod';
import { BaseModel } from './base-model';
import { businesses } from '../schema/businesses';
import { 
  businessSchema, 
  createBusinessSchema, 
  updateBusinessSchema,
  type Business,
  type CreateBusiness,
  type UpdateBusiness
} from '../validation/schemas';
import { getCurrentTenantId } from '../tenant-context';
import { withClient } from '../connection';
import { auditLogger } from '../audit/audit-logger';

export class BusinessModel extends BaseModel<Business, CreateBusiness, UpdateBusiness> {
  protected tableName = 'businesses';
  protected table = businesses;
  protected createSchema = createBusinessSchema;
  protected updateSchema = updateBusinessSchema;

  /**
   * Get business for current tenant
   */
  async getForCurrentTenant(): Promise<Business | null> {
    try {
      const tenantId = getCurrentTenantId();
      const results = await this.queryBuilder.select(this.table, {
        where: this.table.tenantId.eq(tenantId),
        limit: 1
      });

      return results[0] || null;
    } catch (error) {
      console.error('Error getting business for tenant:', error);
      throw error;
    }
  }

  /**
   * Update business address
   */
  async updateAddress(tenantId: string, address: Record<string, any>): Promise<Business | null> {
    try {
      const existing = await this.findByTenantId(tenantId, { skipAudit: true });
      if (!existing) {
        return null;
      }

      const mergedAddress = {
        ...existing.address,
        ...address
      };

      return await this.update(tenantId, { address: mergedAddress });
    } catch (error) {
      console.error('Error updating business address:', error);
      throw error;
    }
  }

  /**
   * Update business contact information
   */
  async updateContact(tenantId: string, contact: Record<string, any>): Promise<Business | null> {
    try {
      const existing = await this.findByTenantId(tenantId, { skipAudit: true });
      if (!existing) {
        return null;
      }

      const mergedContact = {
        ...existing.contact,
        ...contact
      };

      return await this.update(tenantId, { contact: mergedContact });
    } catch (error) {
      console.error('Error updating business contact:', error);
      throw error;
    }
  }

  /**
   * Update business branding
   */
  async updateBranding(tenantId: string, branding: Record<string, any>): Promise<Business | null> {
    try {
      const existing = await this.findByTenantId(tenantId, { skipAudit: true });
      if (!existing) {
        return null;
      }

      const mergedBranding = {
        ...existing.branding,
        ...branding
      };

      return await this.update(tenantId, { branding: mergedBranding });
    } catch (error) {
      console.error('Error updating business branding:', error);
      throw error;
    }
  }

  /**
   * Update social media links
   */
  async updateSocialMedia(tenantId: string, socialMedia: Record<string, any>): Promise<Business | null> {
    try {
      const existing = await this.findByTenantId(tenantId, { skipAudit: true });
      if (!existing) {
        return null;
      }

      const mergedSocialMedia = {
        ...existing.socialMedia,
        ...socialMedia
      };

      return await this.update(tenantId, { socialMedia: mergedSocialMedia });
    } catch (error) {
      console.error('Error updating business social media:', error);
      throw error;
    }
  }

  /**
   * Update legal documents
   */
  async updateLegalDocuments(tenantId: string, legalDocuments: Record<string, any>): Promise<Business | null> {
    try {
      const existing = await this.findByTenantId(tenantId, { skipAudit: true });
      if (!existing) {
        return null;
      }

      const mergedLegalDocuments = {
        ...existing.legalDocuments,
        ...legalDocuments
      };

      return await this.update(tenantId, { legalDocuments: mergedLegalDocuments });
    } catch (error) {
      console.error('Error updating business legal documents:', error);
      throw error;
    }
  }

  /**
   * Find business by tenant ID (businesses use tenantId as primary key)
   */
  async findByTenantId(tenantId: string, options = {}): Promise<Business | null> {
    try {
      return await withClient(async (client) => {
        await client.query('SELECT set_config($1, $2, true)', ['app.current_tenant', tenantId]);

        const result = await client.query(
          'SELECT * FROM businesses WHERE tenant_id = $1 LIMIT 1',
          [tenantId]
        );

        const business = result.rows[0] || null;

        if (business && !options.skipAudit) {
          await auditLogger.logAccess('businesses', tenantId);
        }

        return business;
      });
    } catch (error) {
      console.error('Error finding business by tenant ID:', error);
      throw error;
    }
  }

  /**
   * Get business with tenant information
   */
  async getBusinessWithTenant(tenantId: string): Promise<Business & { tenant: any } | null> {
    try {
      return await withClient(async (client) => {
        await client.query('SELECT set_config($1, $2, true)', ['app.current_tenant', tenantId]);

        const result = await client.query(`
          SELECT 
            b.*,
            t.name as tenant_name,
            t.domain as tenant_domain,
            t.plan as tenant_plan
          FROM businesses b
          JOIN tenants t ON b.tenant_id = t.id
          WHERE b.tenant_id = $1
        `, [tenantId]);

        if (result.rows.length === 0) {
          return null;
        }

        const row = result.rows[0];
        return {
          tenantId: row.tenant_id,
          name: row.name,
          description: row.description,
          address: row.address,
          contact: row.contact,
          branding: row.branding,
          socialMedia: row.social_media,
          legalDocuments: row.legal_documents,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          tenant: {
            name: row.tenant_name,
            domain: row.tenant_domain,
            plan: row.tenant_plan
          }
        };
      });
    } catch (error) {
      console.error('Error getting business with tenant:', error);
      throw error;
    }
  }

  /**
   * Check if business profile is complete
   */
  async isProfileComplete(tenantId: string): Promise<{
    isComplete: boolean;
    missingFields: string[];
    completionPercentage: number;
  }> {
    try {
      const business = await this.findByTenantId(tenantId, { skipAudit: true });
      if (!business) {
        return {
          isComplete: false,
          missingFields: ['business_not_found'],
          completionPercentage: 0
        };
      }

      const requiredFields = [
        'name',
        'description',
        'address.street',
        'address.city',
        'address.postalCode',
        'contact.email',
        'contact.phone'
      ];

      const missingFields: string[] = [];

      requiredFields.forEach(field => {
        const fieldParts = field.split('.');
        let value = business;
        
        for (const part of fieldParts) {
          value = value?.[part];
        }

        if (!value || (typeof value === 'string' && value.trim() === '')) {
          missingFields.push(field);
        }
      });

      const completionPercentage = Math.round(
        ((requiredFields.length - missingFields.length) / requiredFields.length) * 100
      );

      return {
        isComplete: missingFields.length === 0,
        missingFields,
        completionPercentage
      };
    } catch (error) {
      console.error('Error checking business profile completion:', error);
      throw error;
    }
  }

  /**
   * Override base methods to handle tenant ID as primary key
   */
  async findById(tenantId: string, options = {}): Promise<Business | null> {
    return await this.findByTenantId(tenantId, options);
  }

  async update(tenantId: string, data: UpdateBusiness, options = {}): Promise<Business | null> {
    try {
      // Get existing record for audit trail
      const existing = await this.findByTenantId(tenantId, { skipAudit: true });
      if (!existing) {
        return null;
      }

      // Validate input data
      if (!options.skipValidation) {
        const validation = this.validateUpdate(data);
        if (!validation.success) {
          throw new Error(`Validation failed: ${JSON.stringify(validation.errors)}`);
        }
        data = validation.data!;
      }

      // Update with tenant context
      return await withClient(async (client) => {
        await client.query('SELECT set_config($1, $2, true)', ['app.current_tenant', tenantId]);

        const updateFields = Object.keys(data);
        const updateValues = Object.values(data);
        const setClause = updateFields.map((field, index) => `${field} = $${index + 2}`).join(', ');

        const result = await client.query(`
          UPDATE businesses 
          SET ${setClause}, updated_at = NOW()
          WHERE tenant_id = $1
          RETURNING *
        `, [tenantId, ...updateValues]);

        const updated = result.rows[0];

        // Log audit trail
        if (!options.skipAudit && updated) {
          await auditLogger.logUpdate(
            'businesses',
            tenantId,
            existing as Record<string, any>,
            updated as Record<string, any>
          );
        }

        return updated;
      });
    } catch (error) {
      console.error('Error updating business:', error);
      throw error;
    }
  }

  async delete(tenantId: string, options = {}): Promise<boolean> {
    try {
      // Get existing record for audit trail
      const existing = await this.findByTenantId(tenantId, { skipAudit: true });
      if (!existing) {
        return false;
      }

      return await withClient(async (client) => {
        await client.query('SELECT set_config($1, $2, true)', ['app.current_tenant', tenantId]);

        await client.query('DELETE FROM businesses WHERE tenant_id = $1', [tenantId]);

        // Log audit trail
        if (!options.skipAudit) {
          await auditLogger.logDelete(
            'businesses',
            tenantId,
            existing as Record<string, any>
          );
        }

        return true;
      });
    } catch (error) {
      console.error('Error deleting business:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const businessModel = new BusinessModel();