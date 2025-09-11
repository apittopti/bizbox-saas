import { BizBoxPlugin, PluginManifest, PluginContext } from '@bizbox/plugin-sdk';

/**
 * {{pluginName}} Plugin
 * {{pluginDescription}}
 */
export class {{pluginClassName}}Plugin extends BizBoxPlugin {
  /**
   * Initialize the plugin
   */
  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    
    // Plugin initialization logic here
    this.log('info', 'Plugin initialized successfully');
    
    // Register any hooks or event handlers
    this.registerHooks();
    this.subscribeToEvents();
  }

  /**
   * Destroy the plugin
   */
  async destroy(): Promise<void> {
    this.log('info', 'Plugin destroyed');
  }

  /**
   * Get plugin manifest
   */
  getManifest(): PluginManifest {
    return {
      id: '{{pluginId}}',
      name: '{{pluginName}}',
      version: '1.0.0',
      description: '{{pluginDescription}}',
      author: '{{pluginAuthor}}',
      dependencies: {}
    };
  }

  /**
   * Register plugin hooks
   */
  private registerHooks(): void {
    // Example hook registration
    this.registerHook('data.beforeCreate', this.handleBeforeCreate.bind(this), 10);
  }

  /**
   * Subscribe to events
   */
  private subscribeToEvents(): void {
    // Example event subscription
    this.subscribe('tenant.created', this.handleTenantCreated.bind(this));
  }

  /**
   * Handle before create hook
   */
  private async handleBeforeCreate(entityType: string, data: any, context: any): Promise<void> {
    this.log('info', `Before creating ${entityType}`, { data });
  }

  /**
   * Handle tenant created event
   */
  private async handleTenantCreated(payload: any): Promise<void> {
    this.log('info', 'Tenant created', { tenantId: payload.data.id });
  }
}

export default {{pluginClassName}}Plugin;