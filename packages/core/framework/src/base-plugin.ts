import type { Plugin, PluginContext, PluginManifest, PluginHook } from "./types";
import type { EventBus } from "./event-bus";
import type { HookSystem } from "./hooks";

export abstract class BasePlugin implements Plugin {
  public readonly id: string;
  public readonly name: string;
  public readonly version: string;
  public readonly description: string;
  public readonly dependencies: string[];
  public readonly hooks: PluginHook[] = [];
  public readonly routes?: any[];
  public readonly permissions?: any[];

  protected eventBus?: EventBus;
  protected hookSystem?: HookSystem;
  protected context?: PluginContext;

  constructor(manifest: PluginManifest) {
    this.validateManifest(manifest);
    
    this.id = manifest.id;
    this.name = manifest.name;
    this.version = manifest.version;
    this.description = manifest.description;
    this.dependencies = Object.keys(manifest.dependencies || {});
    this.routes = manifest.routes;
    this.permissions = manifest.permissions;
  }

  /**
   * Initialize the plugin - called by the plugin manager
   */
  abstract initialize(context: PluginContext): Promise<void>;

  /**
   * Destroy the plugin - called when disabling
   */
  abstract destroy(): Promise<void>;

  /**
   * Set system dependencies (called by plugin manager)
   */
  setSystemDependencies(eventBus: EventBus, hookSystem: HookSystem): void {
    this.eventBus = eventBus;
    this.hookSystem = hookSystem;
  }

  /**
   * Register a hook handler
   */
  protected registerHook(name: string, handler: (...args: any[]) => any, priority = 10): void {
    const hook: PluginHook = { name, handler, priority };
    this.hooks.push(hook);
  }

  /**
   * Emit an event through the event bus
   */
  protected async emit(eventType: string, data: any): Promise<void> {
    if (!this.eventBus) {
      console.warn(`Plugin ${this.id} tried to emit event ${eventType} but event bus not available`);
      return;
    }

    await this.eventBus.emit(eventType, data, this.context?.tenant);
  }

  /**
   * Subscribe to an event
   */
  protected subscribeToEvent(eventType: string, handler: (payload: any) => void): string | null {
    if (!this.eventBus) {
      console.warn(`Plugin ${this.id} tried to subscribe to event ${eventType} but event bus not available`);
      return null;
    }

    return this.eventBus.subscribe(eventType, handler, { pluginId: this.id });
  }

  /**
   * Execute a hook
   */
  protected async executeHook(hookName: string, ...args: any[]): Promise<any[]> {
    if (!this.hookSystem) {
      console.warn(`Plugin ${this.id} tried to execute hook ${hookName} but hook system not available`);
      return [];
    }

    return this.hookSystem.executeHook(hookName, ...args);
  }

  /**
   * Execute a filter hook
   */
  protected async executeFilterHook(hookName: string, initialValue: any, ...args: any[]): Promise<any> {
    if (!this.hookSystem) {
      console.warn(`Plugin ${this.id} tried to execute filter hook ${hookName} but hook system not available`);
      return initialValue;
    }

    return this.hookSystem.executeFilterHook(hookName, initialValue, ...args);
  }

  /**
   * Log a message with plugin context
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const logMessage = `[Plugin ${this.id}] ${message}`;
    
    switch (level) {
      case 'info':
        console.log(logMessage, data);
        break;
      case 'warn':
        console.warn(logMessage, data);
        break;
      case 'error':
        console.error(logMessage, data);
        break;
    }
  }

  /**
   * Get plugin metadata
   */
  getMetadata() {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      description: this.description,
      dependencies: this.dependencies,
      hookCount: this.hooks.length,
      routeCount: this.routes?.length || 0,
      permissionCount: this.permissions?.length || 0
    };
  }

  private validateManifest(manifest: PluginManifest): void {
    if (!manifest.id) {
      throw new Error("Plugin manifest must include an id");
    }

    if (!manifest.name) {
      throw new Error("Plugin manifest must include a name");
    }

    if (!manifest.version) {
      throw new Error("Plugin manifest must include a version");
    }

    if (!/^[a-z0-9-]+$/.test(manifest.id)) {
      throw new Error("Plugin ID must contain only lowercase letters, numbers, and hyphens");
    }

    if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) {
      throw new Error("Plugin version must follow semantic versioning (x.y.z)");
    }

    if (manifest.dependencies) {
      for (const [depId, depVersion] of Object.entries(manifest.dependencies)) {
        if (!/^[a-z0-9-]+$/.test(depId)) {
          throw new Error(`Invalid dependency ID: ${depId}`);
        }
        
        if (!/^\d+\.\d+\.\d+$/.test(depVersion)) {
          throw new Error(`Invalid dependency version for ${depId}: ${depVersion}`);
        }
      }
    }
  }
}