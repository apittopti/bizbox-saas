import type { PluginContext, PluginManifest } from '@bizbox/core-framework';
import type { Tenant, User } from '@bizbox/shared-types';
import type { PluginTestConfig } from './types';

/**
 * Plugin testing framework with tenant isolation
 */
export class PluginTestFramework {
  private testTenants: Map<string, Tenant> = new Map();
  private testUsers: Map<string, User> = new Map();
  private mockServices: Map<string, any> = new Map();

  /**
   * Create a test tenant with isolated data
   */
  async createTestTenant(config: PluginTestConfig['tenant']): Promise<Tenant> {
    const tenant: Tenant = {
      id: config.id,
      name: config.name,
      domain: `${config.id}.test.bizbox.local`,
      plan: 'starter' as any,
      settings: {
        features: ['all'],
        limits: {
          users: 100,
          storage: 1000000,
          apiCalls: 10000
        },
        ...config.settings
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.testTenants.set(tenant.id, tenant);
    return tenant;
  }

  /**
   * Create a test user within a tenant
   */
  async createTestUser(tenantId: string, config: PluginTestConfig['user']): Promise<User> {
    if (!config) {
      throw new Error('User config is required');
    }

    const user: User = {
      id: config.id,
      tenantId,
      email: config.email,
      role: config.role as any,
      profile: {
        firstName: 'Test',
        lastName: 'User'
      },
      permissions: []
    };

    this.testUsers.set(user.id, user);
    return user;
  }

  /**
   * Create a mock plugin context for testing
   */
  createMockContext(tenant: Tenant, user?: User): PluginContext {
    return {
      tenant,
      user,
      request: this.createMockRequest(),
      response: this.createMockResponse(),
      pluginManager: this.createMockPluginManager(),
      database: this.createMockDatabase(tenant.id),
      cache: this.createMockCache(),
      eventBus: this.createMockEventBus(),
      hookSystem: this.createMockHookSystem()
    };
  }

  /**
   * Create a test suite for a plugin
   */
  createTestSuite(pluginClass: any, manifest: PluginManifest) {
    return {
      /**
       * Test plugin initialization
       */
      testInitialization: async (config: PluginTestConfig) => {
        const tenant = await this.createTestTenant(config.tenant);
        const user = config.user ? await this.createTestUser(tenant.id, config.user) : undefined;
        const context = this.createMockContext(tenant, user);

        const plugin = new pluginClass(manifest);
        await plugin.initialize(context);

        return { plugin, context, tenant, user };
      },

      /**
       * Test plugin with tenant isolation
       */
      testTenantIsolation: async (config: PluginTestConfig) => {
        // Create two separate tenants
        const tenant1 = await this.createTestTenant({ ...config.tenant, id: `${config.tenant.id}_1` });
        const tenant2 = await this.createTestTenant({ ...config.tenant, id: `${config.tenant.id}_2` });

        const context1 = this.createMockContext(tenant1);
        const context2 = this.createMockContext(tenant2);

        const plugin1 = new pluginClass(manifest);
        const plugin2 = new pluginClass(manifest);

        await plugin1.initialize(context1);
        await plugin2.initialize(context2);

        return { plugin1, plugin2, context1, context2, tenant1, tenant2 };
      },

      /**
       * Test plugin hooks
       */
      testHooks: async (config: PluginTestConfig, hookName: string, ...args: any[]) => {
        const { plugin, context } = await this.testInitialization(config);
        
        if (context.hookSystem) {
          return await context.hookSystem.executeHook(hookName, ...args);
        }
        
        return [];
      },

      /**
       * Test plugin events
       */
      testEvents: async (config: PluginTestConfig, eventType: string, data: any) => {
        const { plugin, context } = await this.testInitialization(config);
        
        const eventPromise = new Promise((resolve) => {
          if (context.eventBus) {
            context.eventBus.once(eventType, resolve);
          }
        });

        if (context.eventBus) {
          await context.eventBus.emit(eventType, data, context.tenant);
        }

        return eventPromise;
      },

      /**
       * Test plugin API routes
       */
      testRoutes: async (config: PluginTestConfig, method: string, path: string, body?: any) => {
        const { plugin, context } = await this.testInitialization(config);
        
        const mockRequest = {
          ...this.createMockRequest(),
          method: method.toUpperCase(),
          url: path,
          body
        };

        const mockResponse = this.createMockResponse();

        // In a real implementation, this would route through the plugin's route handlers
        return { request: mockRequest, response: mockResponse };
      }
    };
  }

  /**
   * Clean up test data
   */
  async cleanup(): Promise<void> {
    this.testTenants.clear();
    this.testUsers.clear();
    this.mockServices.clear();
  }

  /**
   * Assert tenant isolation
   */
  assertTenantIsolation(tenant1Data: any, tenant2Data: any): void {
    if (JSON.stringify(tenant1Data) === JSON.stringify(tenant2Data)) {
      throw new Error('Tenant isolation failed: data is identical between tenants');
    }
  }

  /**
   * Mock database with tenant isolation
   */
  private createMockDatabase(tenantId: string) {
    const data = new Map<string, any>();

    return {
      setTenantContext: (id: string) => {
        // Mock tenant context setting
      },
      
      query: async (sql: string, params?: any[]) => {
        // Mock query execution with tenant filtering
        return { rows: [], rowCount: 0 };
      },

      create: async (table: string, data: any) => {
        const key = `${tenantId}:${table}:${Date.now()}`;
        data.tenant_id = tenantId;
        data.id = key;
        return data;
      },

      findMany: async (table: string, where?: any) => {
        // Mock find with tenant filtering
        return [];
      },

      findOne: async (table: string, id: string) => {
        const key = `${tenantId}:${table}:${id}`;
        return data.get(key) || null;
      },

      update: async (table: string, id: string, updates: any) => {
        const key = `${tenantId}:${table}:${id}`;
        const existing = data.get(key);
        if (existing) {
          const updated = { ...existing, ...updates };
          data.set(key, updated);
          return updated;
        }
        return null;
      },

      delete: async (table: string, id: string) => {
        const key = `${tenantId}:${table}:${id}`;
        return data.delete(key);
      }
    };
  }

  /**
   * Mock cache service
   */
  private createMockCache() {
    const cache = new Map<string, { value: any; expires: number }>();

    return {
      get: async (key: string) => {
        const item = cache.get(key);
        if (item && item.expires > Date.now()) {
          return item.value;
        }
        cache.delete(key);
        return null;
      },

      set: async (key: string, value: any, ttl = 300) => {
        cache.set(key, {
          value,
          expires: Date.now() + (ttl * 1000)
        });
      },

      delete: async (key: string) => {
        return cache.delete(key);
      },

      clear: async () => {
        cache.clear();
      }
    };
  }

  /**
   * Mock event bus
   */
  private createMockEventBus() {
    const subscribers = new Map<string, Array<(payload: any) => void>>();

    return {
      subscribe: (eventType: string, handler: (payload: any) => void, options?: any) => {
        if (!subscribers.has(eventType)) {
          subscribers.set(eventType, []);
        }
        subscribers.get(eventType)!.push(handler);
        return `sub_${Date.now()}`;
      },

      once: (eventType: string, handler: (payload: any) => void) => {
        const wrappedHandler = (payload: any) => {
          handler(payload);
          this.unsubscribe(eventType, wrappedHandler);
        };
        return this.subscribe(eventType, wrappedHandler);
      },

      unsubscribe: (eventType: string, handler: (payload: any) => void) => {
        const handlers = subscribers.get(eventType);
        if (handlers) {
          const index = handlers.indexOf(handler);
          if (index > -1) {
            handlers.splice(index, 1);
          }
        }
      },

      emit: async (eventType: string, data: any, tenant?: Tenant) => {
        const handlers = subscribers.get(eventType) || [];
        const payload = {
          type: eventType,
          data,
          tenant,
          timestamp: new Date()
        };

        await Promise.all(handlers.map(handler => handler(payload)));
      }
    };
  }

  /**
   * Mock hook system
   */
  private createMockHookSystem() {
    const hooks = new Map<string, Array<(...args: any[]) => any>>();

    return {
      registerHook: (hookName: string, handler: (...args: any[]) => any, pluginId: string, priority = 10) => {
        if (!hooks.has(hookName)) {
          hooks.set(hookName, []);
        }
        hooks.get(hookName)!.push(handler);
      },

      executeHook: async (hookName: string, ...args: any[]) => {
        const handlers = hooks.get(hookName) || [];
        const results = [];
        
        for (const handler of handlers) {
          try {
            const result = await handler(...args);
            results.push(result);
          } catch (error) {
            console.error(`Hook execution error:`, error);
          }
        }
        
        return results;
      }
    };
  }

  /**
   * Mock HTTP request
   */
  private createMockRequest() {
    return {
      method: 'GET',
      url: '/',
      headers: {},
      query: {},
      params: {},
      body: {},
      user: null,
      tenant: null
    };
  }

  /**
   * Mock HTTP response
   */
  private createMockResponse() {
    const response = {
      statusCode: 200,
      headers: {},
      body: null,
      
      status: (code: number) => {
        response.statusCode = code;
        return response;
      },
      
      json: (data: any) => {
        response.body = data;
        response.headers['content-type'] = 'application/json';
        return response;
      },
      
      send: (data: any) => {
        response.body = data;
        return response;
      }
    };

    return response;
  }

  /**
   * Mock plugin manager
   */
  private createMockPluginManager() {
    return {
      getPlugin: (id: string) => null,
      getAllPlugins: () => [],
      isActive: (id: string) => false
    };
  }
}

/**
 * Test utilities for plugin development
 */
export class PluginTestUtils {
  /**
   * Create a minimal test manifest
   */
  static createTestManifest(overrides: Partial<PluginManifest> = {}): PluginManifest {
    return {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      description: 'A test plugin',
      author: 'Test Author',
      dependencies: {},
      ...overrides
    };
  }

  /**
   * Create test tenant configuration
   */
  static createTestTenantConfig(overrides: Partial<PluginTestConfig['tenant']> = {}): PluginTestConfig['tenant'] {
    return {
      id: 'test-tenant',
      name: 'Test Tenant',
      ...overrides
    };
  }

  /**
   * Create test user configuration
   */
  static createTestUserConfig(overrides: Partial<PluginTestConfig['user']> = {}): PluginTestConfig['user'] {
    return {
      id: 'test-user',
      email: 'test@example.com',
      role: 'tenant_admin',
      ...overrides
    };
  }

  /**
   * Wait for a specific amount of time (useful for async tests)
   */
  static wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate random test data
   */
  static generateTestData(type: 'tenant' | 'user' | 'business'): any {
    const timestamp = Date.now();
    
    switch (type) {
      case 'tenant':
        return {
          id: `tenant_${timestamp}`,
          name: `Test Tenant ${timestamp}`,
          domain: `tenant${timestamp}.test.local`
        };
      
      case 'user':
        return {
          id: `user_${timestamp}`,
          email: `user${timestamp}@test.com`,
          role: 'tenant_admin'
        };
      
      case 'business':
        return {
          name: `Test Business ${timestamp}`,
          description: 'A test business',
          address: {
            line1: '123 Test Street',
            city: 'Test City',
            county: 'Test County',
            postcode: 'TE5T 1NG',
            country: 'UK'
          }
        };
      
      default:
        return {};
    }
  }
}