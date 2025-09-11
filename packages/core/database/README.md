# @bizbox/core-database

Multi-tenant database utilities and ORM integration for the BizBox platform.

## Features

- **Multi-tenant isolation** with PostgreSQL Row-Level Security (RLS)
- **Automatic tenant context management** with AsyncLocalStorage
- **Tenant-scoped query builder** that automatically filters by tenant
- **Database migration system** with plugin awareness
- **Data validation** with Zod schemas
- **Audit logging** for all data operations
- **Express middleware** for automatic tenant context injection

## Installation

```bash
pnpm install @bizbox/core-database
```

## Quick Start

### 1. Initialize Database

```typescript
import { initializeDatabase } from '@bizbox/core-database';

await initializeDatabase({
  host: 'localhost',
  port: 5432,
  database: 'bizbox',
  username: 'postgres',
  password: 'your-password',
});
```

### 2. Set Up Database Schema

Run the initial migration to create tables with multi-tenant isolation:

```bash
# Using the CLI tool
pnpm bizbox-db migrate -d ./migrations

# Or run the setup script directly with psql
psql -h localhost -U postgres -d bizbox -f setup-database.sql
```

### 3. Use Tenant Context

```typescript
import { withTenantContext, getTenantQueryBuilder } from '@bizbox/core-database';

await withTenantContext({ tenantId: 'tenant-123' }, async () => {
  const queryBuilder = getTenantQueryBuilder();
  
  // All queries are automatically scoped to the current tenant
  const users = await queryBuilder.select(usersTable);
  const business = await queryBuilder.select(businessesTable);
});
```

### 4. Express Middleware

```typescript
import express from 'express';
import { createTenantMiddleware } from '@bizbox/core-database';

const app = express();

// Automatic tenant context injection
app.use(createTenantMiddleware({
  required: true,
  headerName: 'x-tenant-id',
  extractFromDomain: true
}));

app.get('/api/users', async (req, res) => {
  // Tenant context is automatically available
  const queryBuilder = getTenantQueryBuilder();
  const users = await queryBuilder.select(usersTable);
  res.json(users);
});
```

## Core Concepts

### Multi-Tenant Isolation

The database uses PostgreSQL's Row-Level Security (RLS) to ensure complete data isolation between tenants:

- Each tenant-scoped table has RLS policies that filter by `tenant_id`
- Database connections must set `app.current_tenant` before accessing data
- All queries automatically include tenant filtering

### Tenant Context Management

Tenant context is managed using Node.js AsyncLocalStorage:

```typescript
import { withTenantContext, getCurrentTenantId } from '@bizbox/core-database';

// Set tenant context for async operations
await withTenantContext({ tenantId: 'tenant-123' }, async () => {
  // All operations within this scope are tenant-scoped
  const currentTenant = getCurrentTenantId(); // 'tenant-123'
});
```

### Tenant-Scoped Query Builder

The query builder automatically adds tenant filtering to all operations:

```typescript
import { getTenantQueryBuilder } from '@bizbox/core-database';

const queryBuilder = getTenantQueryBuilder();

// Automatically filtered by current tenant
await queryBuilder.select(usersTable);
await queryBuilder.insert(usersTable, userData);
await queryBuilder.update(usersTable, updates, { where: conditions });
await queryBuilder.delete(usersTable, { where: conditions });
```

### Data Validation

Built-in Zod schemas for all core data models:

```typescript
import { DataValidator, createUserSchema } from '@bizbox/core-database';

const userData = {
  tenantId: 'tenant-123',
  email: 'user@example.com',
  role: 'admin'
};

const result = DataValidator.validate(createUserSchema, userData);
if (result.success) {
  console.log('Valid data:', result.data);
} else {
  console.error('Validation errors:', result.errors);
}
```

### Audit Logging

Automatic audit logging for all data operations:

```typescript
import { auditLogger } from '@bizbox/core-database';

// Initialize audit logging
await auditLogger.initialize();

// Log operations
await auditLogger.logCreate('users', 'user-123', userData);
await auditLogger.logUpdate('users', 'user-123', oldData, newData);
await auditLogger.logDelete('users', 'user-123', userData);

// Retrieve audit logs
const logs = await auditLogger.getAuditLogs({
  resource: 'users',
  action: 'CREATE',
  limit: 100
});
```

## Database Schema

### Core Tables

- **tenants**: Root tenant information
- **users**: User accounts with tenant isolation
- **businesses**: Business information per tenant
- **audit_logs**: Audit trail with tenant isolation
- **schema_migrations**: Migration tracking with plugin support

### Row-Level Security

All tenant-scoped tables have RLS policies that:
- Filter SELECT queries by `tenant_id = current_setting('app.current_tenant')`
- Validate INSERT/UPDATE operations include correct `tenant_id`
- Require tenant context to be set before any operations

## Migration System

### Running Migrations

```bash
# Run all pending migrations
pnpm bizbox-db migrate

# Run migrations from specific directory
pnpm bizbox-db migrate -d ./custom-migrations

# Run plugin-specific migrations
pnpm bizbox-db migrate -p my-plugin

# Check migration status
pnpm bizbox-db migrate:status
```

### Creating Migrations

Create SQL files with UP and DOWN sections:

```sql
-- UP
CREATE TABLE my_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL
);

ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_my_table ON my_table
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- DOWN
DROP TABLE my_table;
```

## API Reference

### Connection Management

- `initializeDatabase(config)` - Initialize database connection
- `closeDatabase()` - Close database connection
- `getDatabase()` - Get Drizzle database instance
- `withTransaction(callback)` - Execute within transaction

### Tenant Context

- `withTenantContext(context, callback)` - Execute with tenant context
- `getCurrentTenantContext()` - Get current tenant context
- `getCurrentTenantId()` - Get current tenant ID
- `createTenantMiddleware(options)` - Express middleware factory

### Query Builder

- `getTenantQueryBuilder()` - Get tenant-scoped query builder
- `createTenantQueryBuilder(db)` - Create new query builder instance

### Validation

- `DataValidator.validate(schema, data)` - Validate data against schema
- `DataValidator.validateAsync(schema, data)` - Async validation
- `DataValidator.createValidationMiddleware(schema)` - Express middleware

### Audit Logging

- `auditLogger.initialize()` - Initialize audit system
- `auditLogger.log(entry)` - Log audit entry
- `auditLogger.logCreate/Update/Delete()` - Convenience methods
- `auditLogger.getAuditLogs(filter)` - Retrieve audit logs

## Environment Variables

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bizbox
DB_USER=postgres
DB_PASSWORD=your-password
DB_SSL=false
DB_MAX_CONNECTIONS=20
```

## Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test --coverage

# Run integration tests
pnpm test integration
```

## Examples

See the `examples/` directory for complete usage examples:

- `usage-example.ts` - Basic usage patterns
- Express.js integration examples
- Migration examples
- Testing examples

## Security Considerations

- Always use parameterized queries to prevent SQL injection
- Tenant context is required for all tenant-scoped operations
- RLS policies provide defense-in-depth against data leakage
- Audit logs track all data access and modifications
- Validate all input data using provided schemas

## Performance Tips

- Use appropriate database indexes for your query patterns
- Consider connection pooling for high-traffic applications
- Monitor audit log table size and implement archiving
- Use pagination for large result sets
- Cache tenant validation results when appropriate

## License

MIT