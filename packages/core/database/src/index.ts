// Core database functionality
export * from './connection';
export * from './config';
export {
  getCurrentTenantId,
  setCurrentTenantId,
  withTenantContext
} from './tenant-context';
export {
  TenantQueryBuilder,
  createTenantQueryBuilder
} from './tenant-query-builder';

// Models
export * from './models/base-model';
export * from './models/tenant-model';
export * from './models/user-model';
export * from './models/business-model';

// Validation
export type { User, Tenant, Business, CreateUser, UpdateUser, CreateTenant, UpdateTenant, CreateBusiness, UpdateBusiness } from './validation/schemas';
export * from './validation/validator';

// Middleware
export * from './middleware/auto-tenant-injection';
export {
  createTenantMiddleware
} from './middleware/tenant-middleware';

// Audit logging
export * from './audit/audit-logger';

// Schema definitions
export * from './schema';

// Migration system
export * from './migrations/migration-runner';