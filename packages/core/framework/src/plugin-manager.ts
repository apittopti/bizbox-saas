import type { BasePlugin } from "./base-plugin";
import type { PluginContext, PluginManifest } from "./types";
import { PluginRegistry } from "./plugin-registry";
import { EventBus, PLATFORM_EVENTS } from "./event-bus";
import { HookSystem } from "./hooks";

export class PluginManager {
  private registry: PluginRegistry;
  private eventBus: EventBus;
  private hookSystem: HookSystem;
  private initialized = false;

  constructor() {
    this.registry = new PluginRegistry();
    this.eventBus = new EventBus();
    this.hookSystem = new HookSystem();
  }

  /**
   * Register a plugin with manifest validation
   */
  async registerPlugin(plugin: BasePlugin, manifest: PluginManifest): Promise<void> {
    // Register with the registry (includes validation)
    await this.registry.register(plugin, manifest);

    // Register plugin hooks with the hook system
    for (const hook of plugin.hooks) {
      this.hookSystem.registerHook(hook.name, hook.handler, plugin.id, hook.priority);
    }

    // Emit plugin registered event
    await this.eventBus.emit(PLATFORM_EVENTS.PLUGIN_REGISTERED, {
      pluginId: plugin.id,
      manifest
    });

    console.log(`Plugin ${plugin.id} registered with PluginManager`);
  }

  /**
   * Initialize a specific plugin
   */
  async initializePlugin(pluginId: string, context: PluginContext): Promise<void> {
    // Execute before initialize hook
    await this.hookSystem.executeHook("plugin.beforeInitialize", pluginId, context);

    // Initialize through registry
    await this.registry.initialize(pluginId, context);

    // Execute after initialize hook
    await this.hookSystem.executeHook("plugin.afterInitialize", pluginId, context);

    // Emit plugin initialized event
    await this.eventBus.emit(PLATFORM_EVENTS.PLUGIN_INITIALIZED, {
      pluginId,
      context
    });
  }

  /**
   * Initialize all registered plugins
   */
  async initializeAllPlugins(context: PluginContext): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.registry.initializeAll(context);
    this.initialized = true;

    console.log("All plugins initialized");
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(pluginId: string): Promise<void> {
    // Execute before destroy hook
    await this.hookSystem.executeHook("plugin.beforeDestroy", pluginId);

    // Disable through registry
    await this.registry.disable(pluginId);

    // Clean up hooks and event subscriptions
    this.hookSystem.unregisterPluginHooks(pluginId);
    this.eventBus.unsubscribePlugin(pluginId);

    // Emit plugin disabled event
    await this.eventBus.emit(PLATFORM_EVENTS.PLUGIN_DISABLED, {
      pluginId
    });
  }

  /**
   * Execute a hook across all plugins
   */
  async executeHook(hookName: string, ...args: any[]): Promise<any[]> {
    return this.hookSystem.executeHook(hookName, ...args);
  }

  /**
   * Execute a filter hook (first non-null result wins)
   */
  async executeFilterHook(hookName: string, initialValue: any, ...args: any[]): Promise<any> {
    return this.hookSystem.executeFilterHook(hookName, initialValue, ...args);
  }

  /**
   * Execute a validation hook (all must pass)
   */
  async executeValidationHook(hookName: string, ...args: any[]): Promise<boolean> {
    return this.hookSystem.executeValidationHook(hookName, ...args);
  }

  /**
   * Subscribe to an event
   */
  subscribeToEvent(eventType: string, handler: (payload: any) => void, pluginId?: string): string {
    return this.eventBus.subscribe(eventType, handler, { pluginId });
  }

  /**
   * Emit an event
   */
  async emitEvent(eventType: string, data: any, tenant?: any): Promise<void> {
    return this.eventBus.emit(eventType, data, tenant);
  }

  /**
   * Get a plugin instance
   */
  getPlugin(pluginId: string): BasePlugin | undefined {
    return this.registry.getPlugin(pluginId);
  }

  /**
   * Get all active plugins
   */
  getActivePlugins(): BasePlugin[] {
    return this.registry.getActivePlugins().map(entry => entry.plugin);
  }

  /**
   * Check if a plugin is active
   */
  isPluginActive(pluginId: string): boolean {
    return this.registry.isActive(pluginId);
  }

  /**
   * Get plugin registry for advanced operations
   */
  getRegistry(): PluginRegistry {
    return this.registry;
  }

  /**
   * Get event bus for advanced operations
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  /**
   * Get hook system for advanced operations
   */
  getHookSystem(): HookSystem {
    return this.hookSystem;
  }

  /**
   * Get plugin status and information
   */
  getPluginInfo(pluginId: string) {
    const entry = this.registry.getPluginEntry(pluginId);
    if (!entry) {
      return null;
    }

    return {
      id: entry.plugin.id,
      name: entry.plugin.name,
      version: entry.plugin.version,
      status: entry.status,
      registeredAt: entry.registeredAt,
      initializedAt: entry.initializedAt,
      error: entry.error?.message,
      hooks: this.hookSystem.getPluginHooks(pluginId).length,
      dependencies: entry.plugin.dependencies
    };
  }

  /**
   * Get system health information
   */
  getSystemHealth() {
    const allPlugins = this.registry.getAllPlugins();
    const activePlugins = this.registry.getActivePlugins();
    
    return {
      totalPlugins: allPlugins.length,
      activePlugins: activePlugins.length,
      errorPlugins: allPlugins.filter(p => p.status === "error").length,
      disabledPlugins: allPlugins.filter(p => p.status === "disabled").length,
      totalHooks: this.hookSystem.getDefinedHooks().length,
      totalEventTypes: this.eventBus.getEventTypes().length,
      initialized: this.initialized
    };
  }
}