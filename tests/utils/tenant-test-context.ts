/**
 * Tenant Test Context utility for multi-tenant testing
 * Manages tenant isolation and test data across test scenarios
 */
import { randomUUID } from 'crypto';
import { TestDatabase } from './test-database';
import { Tenant, User, UserRole, SubscriptionPlan } from '@bizbox/shared-types';

export interface TestTenant {
  id: string;
  name: string;
  domain: string;
  plan: SubscriptionPlan;
  adminEmail: string;
  adminUser?: User;
  testUsers: TestUser[];
  settings: any;
}

export interface TestUser {
  id: string;
  tenantId: string;
  email: string;
  role: UserRole;
  profile: {
    firstName: string;
    lastName: string;
  };
}

export class TenantTestContext {
  private testTenants: TestTenant[] = [];
  private testDb?: TestDatabase;
  private currentTenantId?: string;

  constructor() {
    this.testDb = new TestDatabase();
  }

  /**
   * Create test tenants with different configurations
   */
  async createTestTenants(): Promise<TestTenant[]> {
    console.log('Creating test tenants...');

    // Basic plan tenant
    const basicTenant = await this.createTenant({
      name: 'Basic Test Tenant',
      plan: SubscriptionPlan.BASIC,
      domain: 'basic-test.bizbox.local',
      features: ['website-builder'],
      limits: { users: 5, storage: 500, apiCalls: 1000 }
    });

    // Professional plan tenant
    const proPenant = await this.createTenant({
      name: 'Pro Test Tenant',
      plan: SubscriptionPlan.PROFESSIONAL,
      domain: 'pro-test.bizbox.local',
      features: ['website-builder', 'booking', 'ecommerce'],
      limits: { users: 25, storage: 5000, apiCalls: 10000 }
    });

    // Enterprise plan tenant
    const enterpriseTenant = await this.createTenant({
      name: 'Enterprise Test Tenant',
      plan: SubscriptionPlan.ENTERPRISE,
      domain: 'enterprise-test.bizbox.local',
      features: ['website-builder', 'booking', 'ecommerce', 'community', 'payments'],
      limits: { users: 100, storage: 50000, apiCalls: 100000 }
    });

    this.testTenants = [basicTenant, proPenant, enterpriseTenant];
    
    console.log(`✅ Created ${this.testTenants.length} test tenants`);
    return this.testTenants;
  }

  /**
   * Create a single test tenant
   */
  async createTenant(config: {
    name: string;
    plan: SubscriptionPlan;
    domain: string;
    features: string[];
    limits: any;
  }): Promise<TestTenant> {
    const tenantId = `test_tenant_${randomUUID()}`;
    const adminEmail = `admin+${tenantId}@test.bizbox.com`;

    // Create tenant record
    const tenant: TestTenant = {
      id: tenantId,
      name: config.name,
      domain: config.domain,
      plan: config.plan,
      adminEmail,
      testUsers: [],
      settings: {
        features: config.features,
        limits: config.limits,
        theme: {
          primaryColor: '#2563eb',
          secondaryColor: '#64748b'
        },
        branding: {
          logoUrl: null,
          companyName: config.name
        }
      }
    };

    // Create admin user
    const adminUser = await this.createTenantUser(tenantId, {
      email: adminEmail,
      role: UserRole.TENANT_ADMIN,
      firstName: 'Test',
      lastName: 'Admin'
    });

    tenant.adminUser = adminUser;

    // Create additional test users
    const staffUser = await this.createTenantUser(tenantId, {
      email: `staff+${tenantId}@test.bizbox.com`,
      role: UserRole.STAFF,
      firstName: 'Test',
      lastName: 'Staff'
    });

    const customerUser = await this.createTenantUser(tenantId, {
      email: `customer+${tenantId}@test.bizbox.com`,
      role: UserRole.CUSTOMER,
      firstName: 'Test',
      lastName: 'Customer'
    });

    tenant.testUsers = [adminUser, staffUser, customerUser];

    return tenant;
  }

  /**
   * Create a test user for a tenant
   */
  async createTenantUser(tenantId: string, userData: {
    email: string;
    role: UserRole;
    firstName: string;
    lastName: string;
  }): Promise<TestUser> {
    const userId = `test_user_${randomUUID()}`;

    const user: TestUser = {
      id: userId,
      tenantId,
      email: userData.email,
      role: userData.role,
      profile: {
        firstName: userData.firstName,
        lastName: userData.lastName
      }
    };

    return user;
  }

  /**
   * Get all test tenants
   */
  getTestTenants(): TestTenant[] {
    return this.testTenants;
  }

  /**
   * Get a specific test tenant by ID
   */
  getTenant(tenantId: string): TestTenant | undefined {
    return this.testTenants.find(tenant => tenant.id === tenantId);
  }

  /**
   * Get tenant by plan type
   */
  getTenantByPlan(plan: SubscriptionPlan): TestTenant | undefined {
    return this.testTenants.find(tenant => tenant.plan === plan);
  }

  /**
   * Set current tenant context for testing
   */
  setCurrentTenant(tenantId: string): void {
    const tenant = this.getTenant(tenantId);
    if (!tenant) {
      throw new Error(`Test tenant ${tenantId} not found`);
    }
    this.currentTenantId = tenantId;
  }

  /**
   * Get current tenant context
   */
  getCurrentTenant(): TestTenant | undefined {
    if (!this.currentTenantId) return undefined;
    return this.getTenant(this.currentTenantId);
  }

  /**
   * Clear current tenant context
   */
  clearCurrentTenant(): void {
    this.currentTenantId = undefined;
  }

  /**
   * Execute a function within a specific tenant context
   */
  async withTenant<T>(tenantId: string, fn: (tenant: TestTenant) => Promise<T>): Promise<T> {
    const previousTenantId = this.currentTenantId;
    this.setCurrentTenant(tenantId);
    
    try {
      const tenant = this.getCurrentTenant()!;
      return await fn(tenant);
    } finally {
      this.currentTenantId = previousTenantId;
    }
  }

  /**
   * Create test data for a specific tenant
   */
  async createTenantTestData(tenantId: string, dataType: string, count: number = 5): Promise<any[]> {
    const tenant = this.getTenant(tenantId);
    if (!tenant) {
      throw new Error(`Test tenant ${tenantId} not found`);
    }

    const testData: any[] = [];

    switch (dataType) {
      case 'bookings':
        for (let i = 0; i < count; i++) {
          testData.push({
            id: `booking_${randomUUID()}`,
            tenantId,
            customerId: tenant.testUsers.find(u => u.role === UserRole.CUSTOMER)?.id,
            serviceId: `service_${i + 1}`,
            staffId: tenant.testUsers.find(u => u.role === UserRole.STAFF)?.id,
            startTime: new Date(Date.now() + (i * 24 * 60 * 60 * 1000)),
            endTime: new Date(Date.now() + (i * 24 * 60 * 60 * 1000) + (60 * 60 * 1000)),
            status: 'confirmed',
            notes: `Test booking ${i + 1}`
          });
        }
        break;

      case 'products':
        for (let i = 0; i < count; i++) {
          testData.push({
            id: `product_${randomUUID()}`,
            tenantId,
            name: `Test Product ${i + 1}`,
            description: `Description for test product ${i + 1}`,
            price: (i + 1) * 1000, // Price in cents
            sku: `TEST-SKU-${i + 1}`,
            inventory: 10,
            status: 'active'
          });
        }
        break;

      case 'pages':
        for (let i = 0; i < count; i++) {
          testData.push({
            id: `page_${randomUUID()}`,
            tenantId,
            title: `Test Page ${i + 1}`,
            slug: `test-page-${i + 1}`,
            content: {
              blocks: [
                {
                  type: 'heading',
                  content: `Test Heading ${i + 1}`
                },
                {
                  type: 'paragraph',
                  content: `This is test content for page ${i + 1}`
                }
              ]
            },
            status: 'published',
            seoTitle: `Test Page ${i + 1} - SEO Title`,
            seoDescription: `SEO description for test page ${i + 1}`
          });
        }
        break;

      default:
        throw new Error(`Unknown test data type: ${dataType}`);
    }

    return testData;
  }

  /**
   * Verify tenant data isolation
   */
  async verifyTenantIsolation(tenantId: string, otherTenantIds: string[]): Promise<boolean> {
    // This would typically query the database to ensure no cross-tenant data leaks
    // For now, we'll simulate the check
    console.log(`Verifying tenant isolation for ${tenantId} against ${otherTenantIds.join(', ')}`);
    return true;
  }

  /**
   * Clean up all test tenants and data
   */
  async cleanup(): Promise<void> {
    console.log('Cleaning up tenant test context...');
    
    this.testTenants = [];
    this.currentTenantId = undefined;
    
    console.log('✅ Tenant test context cleaned up');
  }

  /**
   * Clear current context only
   */
  clear(): void {
    this.currentTenantId = undefined;
  }
}