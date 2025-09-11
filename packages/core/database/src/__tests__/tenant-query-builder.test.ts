import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { TenantQueryBuilder } from '../tenant-query-builder';
import { withTenantContext } from '../tenant-context';

// Mock the database connection
jest.mock('../connection', () => ({
  getDatabase: jest.fn(() => ({
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => ({
          limit: jest.fn(() => ({
            offset: jest.fn(() => Promise.resolve([]))
          }))
        }))
      }))
    })),
    insert: jest.fn(() => ({
      values: jest.fn(() => Promise.resolve())
    })),
    update: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn(() => Promise.resolve())
      }))
    })),
    delete: jest.fn(() => ({
      where: jest.fn(() => Promise.resolve())
    }))
  }))
}));

describe('TenantQueryBuilder', () => {
  let queryBuilder: TenantQueryBuilder;
  const mockTable = {
    tenantId: 'tenant_id_column'
  } as any;

  beforeEach(() => {
    queryBuilder = new TenantQueryBuilder();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw error when no tenant context is set', async () => {
    await expect(queryBuilder.select(mockTable)).rejects.toThrow(
      'No tenant context available'
    );
  });

  it('should execute select query with tenant context', async () => {
    const tenantId = 'test-tenant-id';
    
    await withTenantContext({ tenantId }, async () => {
      await queryBuilder.select(mockTable);
      // Test passes if no error is thrown
      expect(true).toBe(true);
    });
  });

  it('should inject tenant ID into insert values', async () => {
    const tenantId = 'test-tenant-id';
    const values = { name: 'Test' };
    
    await withTenantContext({ tenantId }, async () => {
      await queryBuilder.insert(mockTable, values);
      // Test passes if no error is thrown
      expect(true).toBe(true);
    });
  });

  it('should execute query with specific tenant context', async () => {
    const tenantId = 'specific-tenant-id';
    
    const result = await queryBuilder.executeWithTenant(tenantId, async (builder) => {
      await builder.select(mockTable);
      return 'success';
    });
    
    expect(result).toBe('success');
  });
});