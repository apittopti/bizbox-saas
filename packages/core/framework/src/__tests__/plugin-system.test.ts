import { PluginManager, BasePlugin, PluginManifest, PluginContext } from "../index";
import { Tenant, UserRole, SubscriptionPlan } from "@bizbox/shared-types";
descr
ibe('Plugin System', () => {
  let pluginManager: PluginManager;
  let mockTenant: Tenant;
  let mockContext: PluginContext;

  beforeEach(() => {
    pluginManager = new PluginManager();
    
    mockTenant = {
      id: 'tenant-1',
      name: 'Test Tenant',
      domain: 'test.example.com',
      plan: SubscriptionPlan.PROFESSIONAL,
      settings: {
        features: ['booking', 'website-builder'],
        limits: {
          users: 10,
          storage: 1000,
          apiCalls: 5000
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockContext = {
      tenant: mockTenant,
      user: {
        id: 'user-1',
        tenantId: 'tenant-1',
        email: 'admin@test.com',
        role: UserRole.TENANT_ADMIN,
        profile: {
          firstName: 'Test',
          lastName: 'Admin'
        },
        permissions: []
      }
    };
  });

  describe('PluginManager', () => {
    it('should initialize successfully', () => {
      expect(pluginManager).toBeDefined();
      expect(pluginManager.getSystemHealth().totalPlugins).toBe(0);
      expect(pluginManager.getSystemHealth().initialized).toBe(false);
    });

    it('should register a plugin successfully', async () => {
      const testPlugin = new TestPlugin();
      const manifest: PluginManifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin',
        author: 'Test Author',
        dependencies: {}
      };

      await pluginManager.registerPlugin(testPlugin, manifest);

      expect(pluginManager.getPlugin('test-plugin')).toBe(testPlugin);
      expect(pluginManager.getSystemHealth().totalPlugins).toBe(1);
    });

    it('should initialize a plugin successfully', async () => {
      const testPlugin = new TestPlugin();
      const manifest: PluginManifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin',
        author: 'Test Author',
        dependencies: {}
      };

      await pluginManager.registerPlugin(testPlugin, manifest);
      await pluginManager.initializePlugin('test-plugin', mockContext);

      expect(pluginManager.isPluginActive('test-plugin')).toBe(true);
      expect(testPlugin.isInitialized).toBe(true);
    });

    it('should handle plugin dependencies correctly', async () => {
      const basePlugin = new TestPlugin('base-plugin', 'Base Plugin');
      const dependentPlugin = new TestPlugin('dependent-plugin', 'Dependent Plugin');

      const baseManifest: PluginManifest = {
        id: 'base-plugin',
        name: 'Base Plugin',
        version: '1.0.0',
        description: 'Base plugin',
        author: 'Test Author',
        dependencies: {}
      };

      const dependentManifest: PluginManifest = {
        id: 'dependent-plugin',
        name: 'Dependent Plugin',
        version: '1.0.0',
        description: 'Plugin with dependency',
        author: 'Test Author',
        dependencies: {
          'base-plugin': '1.0.0'
        }
      };

      await pluginManager.registerPlugin(basePlugin, baseManifest);
      await pluginManager.registerPlugin(dependentPlugin, dependentManifest);
      
      await pluginManager.initializePlugin('dependent-plugin', mockContext);

      expect(pluginManager.isPluginActive('base-plugin')).toBe(true);
      expect(pluginManager.isPluginActive('dependent-plugin')).toBe(true);
    });

    it('should execute hooks correctly', async () => {
      const testPlugin = new TestHookPlugin();
      const manifest: PluginManifest = {
        id: 'hook-plugin',
        name: 'Hook Plugin',
        version: '1.0.0',
        description: 'Plugin with hooks',
        author: 'Test Author',
        dependencies: {}
      };

      await pluginManager.registerPlugin(testPlugin, manifest);
      await pluginManager.initializePlugin('hook-plugin', mockContext);

      const results = await pluginManager.executeHook('test.hook', 'test-data');
      expect(results).toHaveLength(1);
      expect(results[0]).toBe('processed: test-data');
    });

    it('should handle plugin errors gracefully', async () => {
      const errorPlugin = new ErrorPlugin();
      const manifest: PluginManifest = {
        id: 'error-plugin',
        name: 'Error Plugin',
        version: '1.0.0',
        description: 'Plugin that throws errors',
        author: 'Test Author',
        dependencies: {}
      };

      await pluginManager.registerPlugin(errorPlugin, manifest);

      await expect(
        pluginManager.initializePlugin('error-plugin', mockContext)
      ).rejects.toThrow('Failed to initialize plugin error-plugin');

      const pluginInfo = pluginManager.getPluginInfo('error-plugin');
      expect(pluginInfo?.status).toBe('error');
    });

    it('should disable plugins correctly', async () => {
      const testPlugin = new TestPlugin();
      const manifest: PluginManifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin',
        author: 'Test Author',
        dependencies: {}
      };

      await pluginManager.registerPlugin(testPlugin, manifest);
      await pluginManager.initializePlugin('test-plugin', mockContext);
      
      expect(pluginManager.isPluginActive('test-plugin')).toBe(true);
      
      await pluginManager.disablePlugin('test-plugin');
      
      expect(pluginManager.isPluginActive('test-plugin')).toBe(false);
      expect(testPlugin.isDestroyed).toBe(true);
    });

    it('should handle events correctly', async () => {
      const eventPlugin = new EventPlugin();
      const manifest: PluginManifest = {
        id: 'event-plugin',
        name: 'Event Plugin',
        version: '1.0.0',
        description: 'Plugin with event handling',
        author: 'Test Author',
        dependencies: {}
      };

      await pluginManager.registerPlugin(eventPlugin, manifest);
      await pluginManager.initializePlugin('event-plugin', mockContext);

      await pluginManager.emitEvent('test.event', { message: 'hello' });

      expect(eventPlugin.receivedEvents).toHaveLength(1);
      expect(eventPlugin.receivedEvents[0].message).toBe('hello');
    });
  });

  describe('Plugin Validation', () => {
    it('should reject invalid plugin manifests', async () => {
      const testPlugin = new TestPlugin();
      const invalidManifest = {
        id: 'invalid-id!',
        name: 'Test Plugin',
        version: 'invalid-version',
        description: 'Invalid plugin',
        author: 'Test Author'
      } as PluginManifest;

      await expect(
        pluginManager.registerPlugin(testPlugin, invalidManifest)
      ).rejects.toThrow();
    });

    it('should prevent duplicate plugin registration', async () => {
      const testPlugin1 = new TestPlugin();
      const testPlugin2 = new TestPlugin();
      const manifest: PluginManifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin',
        author: 'Test Author',
        dependencies: {}
      };

      await pluginManager.registerPlugin(testPlugin1, manifest);

      await expect(
        pluginManager.registerPlugin(testPlugin2, manifest)
      ).rejects.toThrow('Plugin test-plugin is already registered');
    });
  });
});

// Test plugin implementations
class TestPlugin extends BasePlugin {
  public isInitialized = false;
  public isDestroyed = false;

  constructor(id = 'test-plugin', name = 'Test Plugin') {
    super({
      id,
      name,
      version: '1.0.0',
      description: 'A test plugin',
      author: 'Test Author',
      dependencies: {}
    });
  }

  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    this.isInitialized = true;
    this.log('info', 'Test plugin initialized');
  }

  async destroy(): Promise<void> {
    this.isDestroyed = true;
    this.log('info', 'Test plugin destroyed');
  }
}

class TestHookPlugin extends BasePlugin {
  constructor() {
    super({
      id: 'hook-plugin',
      name: 'Hook Plugin',
      version: '1.0.0',
      description: 'Plugin with hooks',
      author: 'Test Author',
      dependencies: {}
    });
  }

  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    this.registerHook('test.hook', this.handleTestHook.bind(this));
  }

  async destroy(): Promise<void> {
    // Cleanup
  }

  private handleTestHook(data: string): string {
    return `processed: ${data}`;
  }
}

class ErrorPlugin extends BasePlugin {
  constructor() {
    super({
      id: 'error-plugin',
      name: 'Error Plugin',
      version: '1.0.0',
      description: 'Plugin that throws errors',
      author: 'Test Author',
      dependencies: {}
    });
  }

  async initialize(context: PluginContext): Promise<void> {
    throw new Error('Initialization failed');
  }

  async destroy(): Promise<void> {
    // Cleanup
  }
}

class EventPlugin extends BasePlugin {
  public receivedEvents: any[] = [];

  constructor() {
    super({
      id: 'event-plugin',
      name: 'Event Plugin',
      version: '1.0.0',
      description: 'Plugin with event handling',
      author: 'Test Author',
      dependencies: {}
    });
  }

  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    this.subscribeToEvent('test.event', this.handleTestEvent.bind(this));
  }

  async destroy(): Promise<void> {
    this.receivedEvents = [];
  }

  private handleTestEvent(payload: any): void {
    this.receivedEvents.push(payload);
  }
}