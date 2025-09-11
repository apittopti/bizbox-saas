/**
 * Tenant Factory for generating test tenant data
 * Provides consistent, realistic test data for multi-tenant scenarios
 */
import { randomUUID } from 'crypto';
import { faker } from '@faker-js/faker';
import { Tenant, User, UserRole, SubscriptionPlan } from '@bizbox/shared-types';

export interface TenantFactoryOptions {
  id?: string;
  name?: string;
  domain?: string;
  plan?: SubscriptionPlan;
  features?: string[];
  limits?: any;
  customSettings?: any;
}

export interface UserFactoryOptions {
  id?: string;
  tenantId?: string;
  email?: string;
  role?: UserRole;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

export class TenantFactory {
  /**
   * Create a test tenant with realistic data
   */
  static createTenant(options: TenantFactoryOptions = {}): Tenant {
    const id = options.id || `tenant_${randomUUID()}`;
    const name = options.name || faker.company.name();
    const domain = options.domain || `${faker.internet.domainWord()}.bizbox.local`;
    const plan = options.plan || faker.helpers.arrayElement(Object.values(SubscriptionPlan));

    // Define plan-based features and limits
    const planConfig = this.getPlanConfiguration(plan);
    const features = options.features || planConfig.features;
    const limits = options.limits || planConfig.limits;

    return {
      id,
      name,
      domain,
      plan,
      settings: {
        features,
        limits,
        theme: {
          primaryColor: faker.internet.color(),
          secondaryColor: faker.internet.color(),
          fontFamily: faker.helpers.arrayElement(['Inter', 'Roboto', 'Open Sans', 'Lato']),
          borderRadius: faker.number.int({ min: 0, max: 16 })
        },
        branding: {
          logoUrl: faker.image.url({ width: 200, height: 60 }),
          faviconUrl: faker.image.url({ width: 32, height: 32 }),
          companyName: name,
          tagline: faker.company.catchPhrase()
        },
        contact: {
          email: faker.internet.email(),
          phone: faker.phone.number(),
          address: {
            street: faker.location.streetAddress(),
            city: faker.location.city(),
            state: faker.location.state(),
            zipCode: faker.location.zipCode(),
            country: 'US'
          }
        },
        notifications: {
          email: true,
          sms: faker.datatype.boolean(),
          push: faker.datatype.boolean()
        },
        ...options.customSettings
      },
      status: 'active',
      createdAt: faker.date.past({ years: 2 }),
      updatedAt: faker.date.recent({ days: 30 })
    };
  }

  /**
   * Create a test user for a tenant
   */
  static createUser(options: UserFactoryOptions = {}): User {
    const id = options.id || `user_${randomUUID()}`;
    const tenantId = options.tenantId || `tenant_${randomUUID()}`;
    const firstName = options.firstName || faker.person.firstName();
    const lastName = options.lastName || faker.person.lastName();
    const email = options.email || faker.internet.email({ firstName, lastName });
    const role = options.role || faker.helpers.arrayElement(Object.values(UserRole));

    return {
      id,
      tenantId,
      email: email.toLowerCase(),
      role,
      profile: {
        firstName,
        lastName,
        avatar: faker.image.avatar(),
        bio: faker.person.bio(),
        phone: faker.phone.number(),
        timezone: faker.location.timeZone(),
        language: 'en',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h'
      },
      preferences: {
        emailNotifications: faker.datatype.boolean(),
        smsNotifications: faker.datatype.boolean(),
        pushNotifications: faker.datatype.boolean(),
        marketingEmails: faker.datatype.boolean()
      },
      permissions: this.getRolePermissions(role),
      lastLoginAt: faker.date.recent({ days: 7 }),
      isActive: options.isActive !== undefined ? options.isActive : true,
      emailVerified: true,
      phoneVerified: faker.datatype.boolean(),
      createdAt: faker.date.past({ years: 1 }),
      updatedAt: faker.date.recent({ days: 7 })
    };
  }

  /**
   * Create multiple test tenants
   */
  static createTenants(count: number, options: TenantFactoryOptions = {}): Tenant[] {
    return Array.from({ length: count }, () => this.createTenant(options));
  }

  /**
   * Create multiple test users
   */
  static createUsers(count: number, options: UserFactoryOptions = {}): User[] {
    return Array.from({ length: count }, () => this.createUser(options));
  }

  /**
   * Create a complete tenant with users
   */
  static createTenantWithUsers(tenantOptions: TenantFactoryOptions = {}, userCounts: {
    admins?: number;
    staff?: number;
    customers?: number;
  } = {}): { tenant: Tenant; users: User[] } {
    const tenant = this.createTenant(tenantOptions);
    const users: User[] = [];

    // Create admin users
    const adminCount = userCounts.admins || 1;
    for (let i = 0; i < adminCount; i++) {
      users.push(this.createUser({
        tenantId: tenant.id,
        role: UserRole.TENANT_ADMIN,
        email: i === 0 ? `admin@${tenant.domain}` : undefined
      }));
    }

    // Create staff users
    const staffCount = userCounts.staff || 2;
    for (let i = 0; i < staffCount; i++) {
      users.push(this.createUser({
        tenantId: tenant.id,
        role: UserRole.STAFF
      }));
    }

    // Create customer users
    const customerCount = userCounts.customers || 5;
    for (let i = 0; i < customerCount; i++) {
      users.push(this.createUser({
        tenantId: tenant.id,
        role: UserRole.CUSTOMER
      }));
    }

    return { tenant, users };
  }

  /**
   * Create tenant for specific plan with realistic configuration
   */
  static createTenantForPlan(plan: SubscriptionPlan, options: TenantFactoryOptions = {}): Tenant {
    const planConfig = this.getPlanConfiguration(plan);
    
    return this.createTenant({
      ...options,
      plan,
      features: options.features || planConfig.features,
      limits: options.limits || planConfig.limits
    });
  }

  /**
   * Get plan-based configuration
   */
  private static getPlanConfiguration(plan: SubscriptionPlan) {
    const configs = {
      [SubscriptionPlan.BASIC]: {
        features: ['website-builder'],
        limits: {
          users: 5,
          storage: 1000, // MB
          apiCalls: 1000,
          pages: 10,
          products: 0,
          bookings: 0,
          emailsPerMonth: 100
        }
      },
      [SubscriptionPlan.PROFESSIONAL]: {
        features: ['website-builder', 'booking', 'ecommerce'],
        limits: {
          users: 25,
          storage: 10000, // MB
          apiCalls: 10000,
          pages: 100,
          products: 500,
          bookings: 1000,
          emailsPerMonth: 2500
        }
      },
      [SubscriptionPlan.ENTERPRISE]: {
        features: ['website-builder', 'booking', 'ecommerce', 'community', 'payments', 'analytics'],
        limits: {
          users: 1000,
          storage: 100000, // MB
          apiCalls: 100000,
          pages: 1000,
          products: 10000,
          bookings: 10000,
          emailsPerMonth: 50000
        }
      }
    };

    return configs[plan] || configs[SubscriptionPlan.BASIC];
  }

  /**
   * Get role-based permissions
   */
  private static getRolePermissions(role: UserRole): string[] {
    const permissions = {
      [UserRole.SUPER_ADMIN]: [
        'system.manage',
        'tenants.manage',
        'plugins.manage',
        'users.manage'
      ],
      [UserRole.TENANT_ADMIN]: [
        'tenant.manage',
        'users.manage',
        'plugins.configure',
        'settings.manage',
        'billing.manage',
        'content.manage',
        'analytics.view'
      ],
      [UserRole.STAFF]: [
        'content.manage',
        'bookings.manage',
        'products.manage',
        'customers.view',
        'analytics.view'
      ],
      [UserRole.CUSTOMER]: [
        'profile.manage',
        'bookings.create',
        'orders.view',
        'support.create'
      ]
    };

    return permissions[role] || [];
  }

  /**
   * Create test data for specific scenarios
   */
  static createScenarioData(scenario: 'multi-tenant-isolation' | 'plugin-permissions' | 'plan-limits') {
    switch (scenario) {
      case 'multi-tenant-isolation':
        return {
          tenantA: this.createTenantForPlan(SubscriptionPlan.BASIC, { name: 'Tenant A' }),
          tenantB: this.createTenantForPlan(SubscriptionPlan.PROFESSIONAL, { name: 'Tenant B' }),
          tenantC: this.createTenantForPlan(SubscriptionPlan.ENTERPRISE, { name: 'Tenant C' })
        };

      case 'plugin-permissions':
        return {
          basicTenant: this.createTenantForPlan(SubscriptionPlan.BASIC),
          proTenant: this.createTenantForPlan(SubscriptionPlan.PROFESSIONAL),
          enterpriseTenant: this.createTenantForPlan(SubscriptionPlan.ENTERPRISE)
        };

      case 'plan-limits':
        return {
          nearLimitBasic: this.createTenantForPlan(SubscriptionPlan.BASIC, {
            customSettings: {
              usage: {
                users: 4, // Near 5 user limit
                storage: 900, // Near 1000 MB limit
                apiCalls: 950 // Near 1000 call limit
              }
            }
          }),
          overLimitPro: this.createTenantForPlan(SubscriptionPlan.PROFESSIONAL, {
            customSettings: {
              usage: {
                users: 30, // Over 25 user limit
                storage: 12000, // Over 10000 MB limit
                apiCalls: 15000 // Over 10000 call limit
              }
            }
          })
        };

      default:
        throw new Error(`Unknown scenario: ${scenario}`);
    }
  }
}