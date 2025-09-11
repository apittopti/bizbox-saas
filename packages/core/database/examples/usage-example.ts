/**
 * Example usage of the BizBox multi-tenant database system
 * This file demonstrates how to use the core database functionality
 */

import {
  initializeDatabase,
  closeDatabase,
  getTenantQueryBuilder,
  withTenantContext,
  createTenantMiddleware,
  DataValidator,
  createTenantSchema,
  createUserSchema,
  createBusinessSchema,
  auditLogger
} from '../src';

async function exampleUsage() {
  try {
    // 1. Initialize the database connection
    console.log('Initializing database...');
    await initializeDatabase({
      host: 'localhost',
      port: 5432,
      database: 'bizbox',
      username: 'postgres',
      password: 'ClipperTippy1!',
    });

    // 2. Initialize audit logging
    await auditLogger.initialize();

    // 3. Example: Create a new tenant
    const newTenantData = {
      name: 'Example Business',
      domain: 'example.bizbox.com',
      plan: 'pro' as const,
      settings: {
        theme: 'dark',
        notifications: true
      }
    };

    // Validate tenant data
    const tenantValidation = DataValidator.validate(createTenantSchema, newTenantData);
    if (!tenantValidation.success) {
      console.error('Tenant validation failed:', tenantValidation.errors);
      return;
    }

    console.log('Tenant data is valid:', tenantValidation.data);

    // 4. Example: Work within a tenant context
    const tenantId = '550e8400-e29b-41d4-a716-446655440000';
    
    await withTenantContext({ tenantId }, async () => {
      console.log('Working within tenant context:', tenantId);

      // 5. Example: Create a user with validation
      const newUserData = {
        tenantId,
        email: 'admin@example.com',
        password: 'SecurePassword123!',
        role: 'admin' as const,
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          timezone: 'America/New_York'
        },
        permissions: ['read', 'write', 'admin']
      };

      const userValidation = DataValidator.validate(createUserSchema, newUserData);
      if (!userValidation.success) {
        console.error('User validation failed:', userValidation.errors);
        return;
      }

      console.log('User data is valid:', userValidation.data);

      // 6. Example: Create business information
      const businessData = {
        tenantId,
        name: 'Example Corp',
        description: 'A sample business for demonstration',
        address: {
          street: '123 Business Ave',
          city: 'Business City',
          state: 'BC',
          postalCode: '12345',
          country: 'USA'
        },
        contact: {
          email: 'contact@example.com',
          phone: '+1-555-123-4567',
          website: 'https://example.com'
        },
        branding: {
          primaryColor: '#007bff',
          secondaryColor: '#6c757d',
          theme: 'light' as const
        },
        socialMedia: {
          twitter: 'https://twitter.com/example',
          linkedin: 'https://linkedin.com/company/example'
        }
      };

      const businessValidation = DataValidator.validate(createBusinessSchema, businessData);
      if (!businessValidation.success) {
        console.error('Business validation failed:', businessValidation.errors);
        return;
      }

      console.log('Business data is valid:', businessValidation.data);

      // 7. Example: Use tenant-scoped query builder
      const queryBuilder = getTenantQueryBuilder();
      
      // These queries would automatically include tenant isolation
      // const users = await queryBuilder.select(usersTable);
      // const business = await queryBuilder.select(businessesTable);
      
      console.log('Query builder ready for tenant-scoped operations');

      // 8. Example: Audit logging
      await auditLogger.logCreate(
        'users',
        'user-123',
        userValidation.data,
        { source: 'admin_panel', ip: '192.168.1.1' }
      );

      await auditLogger.logUpdate(
        'business',
        tenantId,
        { name: 'Old Name' },
        { name: businessValidation.data.name },
        { reason: 'rebranding' }
      );

      console.log('Audit logs created successfully');

      // 9. Example: Retrieve audit logs
      const auditLogs = await auditLogger.getAuditLogs({
        action: 'CREATE',
        resource: 'users',
        limit: 10
      });

      console.log(`Retrieved ${auditLogs.length} audit log entries`);
    });

    console.log('Example completed successfully!');

  } catch (error) {
    console.error('Example failed:', error);
  } finally {
    // Always close the database connection
    await closeDatabase();
  }
}

// Express middleware example
function expressMiddlewareExample() {
  // Example of how to use tenant middleware in Express
  const tenantMiddleware = createTenantMiddleware({
    required: true,
    headerName: 'x-tenant-id',
    extractFromDomain: true,
    onTenantNotFound: (req, res) => {
      res.status(404).json({
        error: 'Tenant not found or inactive'
      });
    }
  });

  // Example route handler
  const exampleRouteHandler = async (req: any, res: any) => {
    try {
      // At this point, tenant context is automatically set
      console.log('Current tenant:', req.tenantId);
      console.log('Current user:', req.userId);

      // Use tenant-scoped operations
      const queryBuilder = getTenantQueryBuilder();
      // const data = await queryBuilder.select(someTable);

      res.json({ success: true, tenantId: req.tenantId });
    } catch (error) {
      console.error('Route handler error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  return { tenantMiddleware, exampleRouteHandler };
}

// Run the example if this file is executed directly
if (require.main === module) {
  exampleUsage().catch(console.error);
}

export { exampleUsage, expressMiddlewareExample };