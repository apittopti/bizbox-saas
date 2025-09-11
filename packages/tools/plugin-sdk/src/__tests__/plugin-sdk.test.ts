// Jest globals are available without import in standard Jest setup
import { PluginTestFramework, PluginTestUtils, BizBoxPlugin, PluginUtils } from '../index';
import type { PluginManifest, PluginContext } from '@bizbox/core-framework';

// Test plugin implementation
class TestPlugin extends BizBoxPlugin {
    async initialize(context: PluginContext): Promise<void> {
        this.context = context;
    }

    async destroy(): Promise<void> {
        // Cleanup
    }

    getManifest(): PluginManifest {
        return {
            id: 'test-plugin',
            name: 'Test Plugin',
            version: '1.0.0',
            description: 'A test plugin',
            author: 'Test Author',
            dependencies: {}
        };
    }
}

describe('Plugin SDK', () => {
    let testFramework: PluginTestFramework;

    beforeEach(() => {
        testFramework = new PluginTestFramework();
    });

    afterEach(async () => {
        await testFramework.cleanup();
    });

    describe('PluginTestFramework', () => {
        it('should create test tenant', async () => {
            const tenant = await testFramework.createTestTenant({
                id: 'test-tenant',
                name: 'Test Tenant'
            });

            expect(tenant.id).toBe('test-tenant');
            expect(tenant.name).toBe('Test Tenant');
            expect(tenant.domain).toBe('test-tenant.test.bizbox.local');
        });

        it('should create test user', async () => {
            const tenant = await testFramework.createTestTenant({
                id: 'test-tenant',
                name: 'Test Tenant'
            });

            const user = await testFramework.createTestUser(tenant.id, {
                id: 'test-user',
                email: 'test@example.com',
                role: 'tenant_admin'
            });

            expect(user.id).toBe('test-user');
            expect(user.tenantId).toBe(tenant.id);
            expect(user.email).toBe('test@example.com');
        });

        it('should create mock context', async () => {
            const tenant = await testFramework.createTestTenant({
                id: 'test-tenant',
                name: 'Test Tenant'
            });

            const context = testFramework.createMockContext(tenant);

            expect(context.tenant).toBe(tenant);
            expect(context.database).toBeDefined();
            expect(context.cache).toBeDefined();
            expect(context.eventBus).toBeDefined();
            expect(context.hookSystem).toBeDefined();
        });

        it('should create test suite', () => {
            const manifest = PluginTestUtils.createTestManifest();
            const testSuite = testFramework.createTestSuite(TestPlugin, manifest);

            expect(testSuite.testInitialization).toBeDefined();
            expect(testSuite.testTenantIsolation).toBeDefined();
            expect(testSuite.testHooks).toBeDefined();
            expect(testSuite.testEvents).toBeDefined();
        });

        it('should test plugin initialization', async () => {
            const manifest = PluginTestUtils.createTestManifest();
            const testSuite = testFramework.createTestSuite(TestPlugin, manifest);

            const { plugin, context, tenant } = await testSuite.testInitialization({
                tenant: PluginTestUtils.createTestTenantConfig()
            });

            expect(plugin).toBeInstanceOf(TestPlugin);
            expect(context.tenant).toBe(tenant);
        });

        it('should test tenant isolation', async () => {
            const manifest = PluginTestUtils.createTestManifest();
            const testSuite = testFramework.createTestSuite(TestPlugin, manifest);

            const result = await testSuite.testTenantIsolation({
                tenant: PluginTestUtils.createTestTenantConfig()
            });

            expect(result.plugin1).toBeInstanceOf(TestPlugin);
            expect(result.plugin2).toBeInstanceOf(TestPlugin);
            expect(result.tenant1.id).not.toBe(result.tenant2.id);
            expect(result.context1.tenant).toBe(result.tenant1);
            expect(result.context2.tenant).toBe(result.tenant2);
        });
    });

    describe('PluginTestUtils', () => {
        it('should create test manifest', () => {
            const manifest = PluginTestUtils.createTestManifest({
                id: 'custom-plugin',
                name: 'Custom Plugin'
            });

            expect(manifest.id).toBe('custom-plugin');
            expect(manifest.name).toBe('Custom Plugin');
            expect(manifest.version).toBe('1.0.0');
        });

        it('should create test tenant config', () => {
            const config = PluginTestUtils.createTestTenantConfig({
                id: 'custom-tenant'
            });

            expect(config.id).toBe('custom-tenant');
            expect(config.name).toBe('Test Tenant');
        });

        it('should create test user config', () => {
            const config = PluginTestUtils.createTestUserConfig({
                email: 'custom@example.com'
            });

            expect(config.email).toBe('custom@example.com');
            expect(config.role).toBe('tenant_admin');
        });

        it('should generate test data', () => {
            const tenantData = PluginTestUtils.generateTestData('tenant');
            const userData = PluginTestUtils.generateTestData('user');
            const businessData = PluginTestUtils.generateTestData('business');

            expect(tenantData.id).toMatch(/^tenant_\d+$/);
            expect(userData.id).toMatch(/^user_\d+$/);
            expect(businessData.name).toMatch(/^Test Business \d+$/);
        });

        it('should wait for specified time', async () => {
            const start = Date.now();
            await PluginTestUtils.wait(100);
            const end = Date.now();

            expect(end - start).toBeGreaterThanOrEqual(100);
        });
    });

    describe('PluginUtils', () => {
        it('should validate plugin manifest', () => {
            const validManifest = {
                id: 'test-plugin',
                name: 'Test Plugin',
                version: '1.0.0',
                description: 'A test plugin',
                author: 'Test Author',
                dependencies: {}
            };

            const result = PluginUtils.validateManifest(validManifest);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should detect invalid plugin manifest', () => {
            const invalidManifest = {
                id: 'Invalid ID!',
                name: '',
                version: 'invalid-version'
            } as any;

            const result = PluginUtils.validateManifest(invalidManifest);

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('should generate plugin ID from name', () => {
            const id = PluginUtils.generatePluginId('My Awesome Plugin!');
            expect(id).toBe('my-awesome-plugin');
        });

        it('should validate plugin ID', () => {
            expect(PluginUtils.isValidPluginId('valid-plugin-id')).toBe(true);
            expect(PluginUtils.isValidPluginId('Invalid ID!')).toBe(false);
            expect(PluginUtils.isValidPluginId('ab')).toBe(false); // too short
        });

        it('should validate version string', () => {
            expect(PluginUtils.isValidVersion('1.0.0')).toBe(true);
            expect(PluginUtils.isValidVersion('1.0')).toBe(false);
            expect(PluginUtils.isValidVersion('invalid')).toBe(false);
        });

        it('should compare versions', () => {
            expect(PluginUtils.compareVersions('1.0.0', '1.0.0')).toBe(0);
            expect(PluginUtils.compareVersions('1.1.0', '1.0.0')).toBe(1);
            expect(PluginUtils.compareVersions('1.0.0', '1.1.0')).toBe(-1);
        });

        it('should generate manifest', () => {
            const manifest = PluginUtils.generateManifest({
                id: 'test-plugin',
                name: 'Test Plugin',
                description: 'A test plugin',
                author: 'Test Author'
            });

            expect(manifest.id).toBe('test-plugin');
            expect(manifest.name).toBe('Test Plugin');
            expect(manifest.version).toBe('1.0.0');
        });

        it('should sanitize config', () => {
            const config = {
                valid: 'value',
                func: () => { },
                undef: undefined,
                nested: {
                    valid: 'nested-value',
                    func: () => { }
                }
            };

            const sanitized = PluginUtils.sanitizeConfig(config);

            expect(sanitized.valid).toBe('value');
            expect(sanitized.func).toBeUndefined();
            expect(sanitized.undef).toBeUndefined();
            expect(sanitized.nested.valid).toBe('nested-value');
            expect(sanitized.nested.func).toBeUndefined();
        });

        it('should merge configs', () => {
            const base = {
                a: 1,
                b: { x: 1, y: 2 },
                c: 'base'
            };

            const override = {
                b: { y: 3, z: 4 },
                c: 'override',
                d: 'new'
            };

            const merged = PluginUtils.mergeConfigs(base, override);

            expect(merged.a).toBe(1);
            expect(merged.b.x).toBe(1);
            expect(merged.b.y).toBe(3);
            expect(merged.b.z).toBe(4);
            expect(merged.c).toBe('override');
            expect(merged.d).toBe('new');
        });
    });

    describe('Mock Services', () => {
        it('should mock database with tenant isolation', async () => {
            const tenant = await testFramework.createTestTenant({
                id: 'test-tenant',
                name: 'Test Tenant'
            });

            const context = testFramework.createMockContext(tenant);
            const db = context.database;

            // Test create
            const created = await db.create('users', { name: 'Test User' });
            expect(created.tenant_id).toBe(tenant.id);

            // Test find
            const found = await db.findOne('users', created.id);
            expect(found).toBeNull(); // Mock implementation returns null
        });

        it('should mock cache service', async () => {
            const tenant = await testFramework.createTestTenant({
                id: 'test-tenant',
                name: 'Test Tenant'
            });

            const context = testFramework.createMockContext(tenant);
            const cache = context.cache;

            // Test set and get
            await cache.set('test-key', 'test-value', 300);
            const value = await cache.get('test-key');
            expect(value).toBe('test-value');

            // Test delete
            await cache.delete('test-key');
            const deletedValue = await cache.get('test-key');
            expect(deletedValue).toBeNull();
        });

        it('should mock event bus', async () => {
            const tenant = await testFramework.createTestTenant({
                id: 'test-tenant',
                name: 'Test Tenant'
            });

            const context = testFramework.createMockContext(tenant);
            const eventBus = context.eventBus;

            let receivedPayload: any = null;

            // Subscribe to event
            eventBus.subscribe('test.event', (payload) => {
                receivedPayload = payload;
            });

            // Emit event
            await eventBus.emit('test.event', { message: 'test' }, tenant);

            expect(receivedPayload).toBeDefined();
            expect(receivedPayload.data.message).toBe('test');
            expect(receivedPayload.tenant).toBe(tenant);
        });

        it('should mock hook system', async () => {
            const tenant = await testFramework.createTestTenant({
                id: 'test-tenant',
                name: 'Test Tenant'
            });

            const context = testFramework.createMockContext(tenant);
            const hookSystem = context.hookSystem;

            let hookCalled = false;

            // Register hook
            hookSystem.registerHook('test.hook', () => {
                hookCalled = true;
                return 'hook-result';
            }, 'test-plugin');

            // Execute hook
            const results = await hookSystem.executeHook('test.hook');

            expect(hookCalled).toBe(true);
            expect(results).toContain('hook-result');
        });
    });
});