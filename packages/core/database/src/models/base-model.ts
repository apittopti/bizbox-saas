import { z } from 'zod';
import { getTenantQueryBuilder } from '../tenant-query-builder';
import { auditLogger } from '../audit/audit-logger';
import { DataValidator, ValidationResult } from '../validation/validator';
import { getCurrentTenantId } from '../tenant-context';

export interface ModelOptions {
  skipAudit?: boolean;
  skipValidation?: boolean;
  tenantColumn?: string;
}

export abstract class BaseModel<T, CreateT, UpdateT> {
  protected abstract tableName: string;
  protected abstract table: any;
  protected abstract createSchema: z.ZodSchema<CreateT>;
  protected abstract updateSchema: z.ZodSchema<UpdateT>;
  protected tenantColumn: string = 'tenantId';

  protected queryBuilder = getTenantQueryBuilder();

  /**
   * Find a record by ID with tenant isolation
   */
  async findById(id: string, options: ModelOptions = {}): Promise<T | null> {
    try {
      const results = await this.queryBuilder.select(this.table, {
        where: this.table.id.eq(id),
        tenantColumn: options.tenantColumn || this.tenantColumn,
        limit: 1
      });

      const record = results[0] || null;

      if (record && !options.skipAudit) {
        await auditLogger.logAccess(this.tableName, id);
      }

      return record;
    } catch (error) {
      console.error(`Error finding ${this.tableName} by ID:`, error);
      throw error;
    }
  }

  /**
   * Find all records with optional filtering
   */
  async findAll(options: {
    where?: any;
    limit?: number;
    offset?: number;
    skipAudit?: boolean;
    tenantColumn?: string;
  } = {}): Promise<T[]> {
    try {
      const results = await this.queryBuilder.select(this.table, {
        where: options.where,
        limit: options.limit,
        offset: options.offset,
        tenantColumn: options.tenantColumn || this.tenantColumn
      });

      if (!options.skipAudit) {
        await auditLogger.logAccess(this.tableName);
      }

      return results;
    } catch (error) {
      console.error(`Error finding ${this.tableName} records:`, error);
      throw error;
    }
  }

  /**
   * Create a new record with validation and audit logging
   */
  async create(data: CreateT, options: ModelOptions = {}): Promise<T> {
    try {
      // Validate input data
      if (!options.skipValidation) {
        const validation = DataValidator.validate(this.createSchema, data);
        if (!validation.success) {
          throw new Error(`Validation failed: ${JSON.stringify(validation.errors)}`);
        }
        data = validation.data!;
      }

      // Insert with tenant context
      const result = await this.queryBuilder.insert(
        this.table,
        data,
        options.tenantColumn || this.tenantColumn
      );

      const created = result[0] as T;

      // Log audit trail
      if (!options.skipAudit) {
        await auditLogger.logCreate(
          this.tableName,
          (created as any).id,
          data as Record<string, any>
        );
      }

      return created;
    } catch (error) {
      console.error(`Error creating ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Update a record with validation and audit logging
   */
  async update(id: string, data: UpdateT, options: ModelOptions = {}): Promise<T | null> {
    try {
      // Get existing record for audit trail
      const existing = await this.findById(id, { skipAudit: true });
      if (!existing) {
        return null;
      }

      // Validate input data
      if (!options.skipValidation) {
        const validation = DataValidator.validate(this.updateSchema, data);
        if (!validation.success) {
          throw new Error(`Validation failed: ${JSON.stringify(validation.errors)}`);
        }
        data = validation.data!;
      }

      // Update with tenant context
      await this.queryBuilder.update(
        this.table,
        data,
        {
          where: this.table.id.eq(id),
          tenantColumn: options.tenantColumn || this.tenantColumn
        }
      );

      // Get updated record
      const updated = await this.findById(id, { skipAudit: true });

      // Log audit trail
      if (!options.skipAudit && updated) {
        await auditLogger.logUpdate(
          this.tableName,
          id,
          existing as Record<string, any>,
          updated as Record<string, any>
        );
      }

      return updated;
    } catch (error) {
      console.error(`Error updating ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Delete a record with audit logging
   */
  async delete(id: string, options: ModelOptions = {}): Promise<boolean> {
    try {
      // Get existing record for audit trail
      const existing = await this.findById(id, { skipAudit: true });
      if (!existing) {
        return false;
      }

      // Delete with tenant context
      await this.queryBuilder.delete(this.table, {
        where: this.table.id.eq(id),
        tenantColumn: options.tenantColumn || this.tenantColumn
      });

      // Log audit trail
      if (!options.skipAudit) {
        await auditLogger.logDelete(
          this.tableName,
          id,
          existing as Record<string, any>
        );
      }

      return true;
    } catch (error) {
      console.error(`Error deleting ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Count records with optional filtering
   */
  async count(options: {
    where?: any;
    tenantColumn?: string;
  } = {}): Promise<number> {
    try {
      const tenantId = getCurrentTenantId();
      const results = await this.queryBuilder.executeWithTenantContext(
        `SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${options.tenantColumn || this.tenantColumn} = $1`,
        [tenantId]
      );

      return parseInt(results[0]?.count || '0', 10);
    } catch (error) {
      console.error(`Error counting ${this.tableName} records:`, error);
      throw error;
    }
  }

  /**
   * Check if a record exists
   */
  async exists(id: string, options: ModelOptions = {}): Promise<boolean> {
    try {
      const record = await this.findById(id, { ...options, skipAudit: true });
      return record !== null;
    } catch (error) {
      console.error(`Error checking ${this.tableName} existence:`, error);
      return false;
    }
  }

  /**
   * Validate data against schema
   */
  validateCreate(data: unknown): ValidationResult<CreateT> {
    return DataValidator.validate(this.createSchema, data);
  }

  validateUpdate(data: unknown): ValidationResult<UpdateT> {
    return DataValidator.validate(this.updateSchema, data);
  }
}