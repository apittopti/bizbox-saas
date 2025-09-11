import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { SQL, and, eq } from 'drizzle-orm';
import { PgTable, PgColumn } from 'drizzle-orm/pg-core';
import { getCurrentTenantId, withTenantContext, TenantContext } from './tenant-context';
import { getDatabase, withClient } from './connection';

export class TenantQueryBuilder {
  private db: NodePgDatabase;

  constructor(database?: NodePgDatabase) {
    this.db = database || getDatabase();
  }

  /**
   * Automatically adds tenant filter to queries
   */
  private addTenantFilter<T extends PgTable>(
    table: T,
    where?: SQL,
    tenantColumn: string = 'tenantId'
  ): SQL {
    const tenantId = getCurrentTenantId();
    const tenantFilter = eq(table[tenantColumn as keyof T] as PgColumn, tenantId);
    
    return where ? and(tenantFilter, where) : tenantFilter;
  }

  /**
   * Tenant-scoped select query
   */
  async select<T extends PgTable>(
    table: T,
    options?: {
      where?: SQL;
      tenantColumn?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    const where = this.addTenantFilter(table, options?.where, options?.tenantColumn);
    
    let query = this.db.select().from(table).where(where);
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    if (options?.offset) {
      query = query.offset(options.offset);
    }
    
    return await query;
  }

  /**
   * Tenant-scoped insert with automatic tenant ID injection
   */
  async insert<T extends PgTable>(
    table: T,
    values: any | any[],
    tenantColumn: string = 'tenantId'
  ) {
    const tenantId = getCurrentTenantId();
    
    // Inject tenant ID into values
    const valuesWithTenant = Array.isArray(values)
      ? values.map(v => ({ ...v, [tenantColumn]: tenantId }))
      : { ...values, [tenantColumn]: tenantId };
    
    return await this.db.insert(table).values(valuesWithTenant);
  }

  /**
   * Tenant-scoped update query
   */
  async update<T extends PgTable>(
    table: T,
    values: any,
    options?: {
      where?: SQL;
      tenantColumn?: string;
    }
  ) {
    const where = this.addTenantFilter(table, options?.where, options?.tenantColumn);
    return await this.db.update(table).set(values).where(where);
  }

  /**
   * Tenant-scoped delete query
   */
  async delete<T extends PgTable>(
    table: T,
    options?: {
      where?: SQL;
      tenantColumn?: string;
    }
  ) {
    const where = this.addTenantFilter(table, options?.where, options?.tenantColumn);
    return await this.db.delete(table).where(where);
  }

  /**
   * Execute raw SQL with tenant context
   */
  async executeWithTenantContext<T>(
    sql: string,
    params?: any[]
  ): Promise<T[]> {
    return await withClient(async (client) => {
      const tenantId = getCurrentTenantId();
      await client.query('SELECT set_config($1, $2, true)', [
        'app.current_tenant',
        tenantId
      ]);
      
      const result = await client.query(sql, params);
      return result.rows;
    });
  }

  /**
   * Execute query with specific tenant context
   */
  async executeWithTenant<T>(
    tenantId: string,
    callback: (builder: TenantQueryBuilder) => Promise<T>
  ): Promise<T> {
    const context: TenantContext = { tenantId };
    return await withTenantContext(context, () => callback(this));
  }
}

// Singleton instance
let queryBuilder: TenantQueryBuilder | null = null;

export function getTenantQueryBuilder(): TenantQueryBuilder {
  if (!queryBuilder) {
    queryBuilder = new TenantQueryBuilder();
  }
  return queryBuilder;
}

export function createTenantQueryBuilder(database?: NodePgDatabase): TenantQueryBuilder {
  return new TenantQueryBuilder(database);
}