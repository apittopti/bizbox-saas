import type { PluginHook, HookRegistry } from "./types";

export type HookHandler = (...args: any[]) => any;

export interface HookDefinition {
  name: string;
  description: string;
  parameters: string[];
  returnType?: string;
}

export interface RegisteredHook extends PluginHook {
  pluginId: string;
  registeredAt: Date;
}

export class HookSystem {
  private hooks: HookRegistry = {};
  private hookDefinitions: Map<string, HookDefinition> = new Map();

  constructor() {
    this.registerStandardHooks();
  }

  /**
   * Define a new hook point
   */
  defineHook(definition: HookDefinition): void {
    if (this.hookDefinitions.has(definition.name)) {
      throw new Error(`Hook ${definition.name} is already defined`);
    }

    this.hookDefinitions.set(definition.name, definition);
    console.log(`Hook ${definition.name} defined`);
  }

  /**
   * Register a hook handler
   */
  registerHook(
    hookName: string, 
    handler: HookHandler, 
    pluginId: string,
    priority = 10
  ): void {
    if (!this.hookDefinitions.has(hookName)) {
      throw new Error(`Hook ${hookName} is not defined. Define it first using defineHook()`);
    }

    if (!this.hooks[hookName]) {
      this.hooks[hookName] = [];
    }

    const registeredHook: RegisteredHook = {
      name: hookName,
      handler,
      priority,
      pluginId,
      registeredAt: new Date()
    };

    this.hooks[hookName].push(registeredHook);
    
    // Sort by priority (higher priority first)
    this.hooks[hookName].sort((a, b) => (b.priority || 10) - (a.priority || 10));

    console.log(`Hook ${hookName} registered for plugin ${pluginId} with priority ${priority}`);
  }

  /**
   * Execute all handlers for a hook
   */
  async executeHook(hookName: string, ...args: any[]): Promise<any[]> {
    const hooks = this.hooks[hookName] || [];
    
    if (hooks.length === 0) {
      return [];
    }

    console.log(`Executing hook ${hookName} with ${hooks.length} handlers`);

    const results: any[] = [];

    for (const hook of hooks) {
      try {
        const result = await hook.handler(...args);
        results.push(result);
      } catch (error) {
        console.error(`Error executing hook ${hookName} for plugin ${hook.pluginId}:`, error);
        // Continue executing other hooks even if one fails
      }
    }

    return results;
  }

  /**
   * Execute hooks with filtering (first non-null result wins)
   */
  async executeFilterHook(hookName: string, initialValue: any, ...args: any[]): Promise<any> {
    const hooks = this.hooks[hookName] || [];
    
    let value = initialValue;

    for (const hook of hooks) {
      try {
        const result = await hook.handler(value, ...args);
        if (result !== null && result !== undefined) {
          value = result;
        }
      } catch (error) {
        console.error(`Error executing filter hook ${hookName} for plugin ${hook.pluginId}:`, error);
      }
    }

    return value;
  }

  /**
   * Execute hooks until one returns true (validation hooks)
   */
  async executeValidationHook(hookName: string, ...args: any[]): Promise<boolean> {
    const hooks = this.hooks[hookName] || [];
    
    for (const hook of hooks) {
      try {
        const result = await hook.handler(...args);
        if (result === false) {
          return false; // Validation failed
        }
      } catch (error) {
        console.error(`Error executing validation hook ${hookName} for plugin ${hook.pluginId}:`, error);
        return false; // Treat errors as validation failure
      }
    }

    return true; // All validations passed
  }

  /**
   * Remove all hooks for a plugin
   */
  unregisterPluginHooks(pluginId: string): number {
    let removed = 0;

    for (const [hookName, hooks] of Object.entries(this.hooks)) {
      const initialLength = hooks.length;
      this.hooks[hookName] = hooks.filter(hook => hook.pluginId !== pluginId);
      removed += initialLength - this.hooks[hookName].length;

      // Clean up empty hook arrays
      if (this.hooks[hookName].length === 0) {
        delete this.hooks[hookName];
      }
    }

    console.log(`Removed ${removed} hooks for plugin ${pluginId}`);
    return removed;
  }

  /**
   * Get all registered hooks for a hook name
   */
  getHooks(hookName: string): RegisteredHook[] {
    return this.hooks[hookName] || [];
  }

  /**
   * Get all defined hook names
   */
  getDefinedHooks(): string[] {
    return Array.from(this.hookDefinitions.keys());
  }

  /**
   * Get hook definition
   */
  getHookDefinition(hookName: string): HookDefinition | undefined {
    return this.hookDefinitions.get(hookName);
  }

  /**
   * Get all hooks registered by a plugin
   */
  getPluginHooks(pluginId: string): RegisteredHook[] {
    const pluginHooks: RegisteredHook[] = [];

    for (const hooks of Object.values(this.hooks)) {
      pluginHooks.push(...hooks.filter(hook => hook.pluginId === pluginId));
    }

    return pluginHooks;
  }

  /**
   * Check if a hook is defined
   */
  isHookDefined(hookName: string): boolean {
    return this.hookDefinitions.has(hookName);
  }

  /**
   * Clear all hooks (useful for testing)
   */
  clear(): void {
    this.hooks = {};
    console.log("Hook system cleared");
  }

  private registerStandardHooks(): void {
    // Plugin lifecycle hooks
    this.defineHook({
      name: "plugin.beforeInitialize",
      description: "Called before a plugin is initialized",
      parameters: ["pluginId", "context"]
    });

    this.defineHook({
      name: "plugin.afterInitialize", 
      description: "Called after a plugin is initialized",
      parameters: ["pluginId", "context"]
    });

    this.defineHook({
      name: "plugin.beforeDestroy",
      description: "Called before a plugin is destroyed", 
      parameters: ["pluginId"]
    });

    // Request lifecycle hooks
    this.defineHook({
      name: "request.beforeProcess",
      description: "Called before processing a request",
      parameters: ["request", "context"]
    });

    this.defineHook({
      name: "request.afterProcess",
      description: "Called after processing a request",
      parameters: ["request", "response", "context"]
    });

    // Data lifecycle hooks
    this.defineHook({
      name: "data.beforeCreate",
      description: "Called before creating data",
      parameters: ["entityType", "data", "context"]
    });

    this.defineHook({
      name: "data.afterCreate",
      description: "Called after creating data", 
      parameters: ["entityType", "data", "result", "context"]
    });

    this.defineHook({
      name: "data.beforeUpdate",
      description: "Called before updating data",
      parameters: ["entityType", "id", "data", "context"]
    });

    this.defineHook({
      name: "data.afterUpdate",
      description: "Called after updating data",
      parameters: ["entityType", "id", "data", "result", "context"]
    });

    this.defineHook({
      name: "data.beforeDelete",
      description: "Called before deleting data",
      parameters: ["entityType", "id", "context"]
    });

    this.defineHook({
      name: "data.afterDelete", 
      description: "Called after deleting data",
      parameters: ["entityType", "id", "context"]
    });

    // Validation hooks
    this.defineHook({
      name: "validate.user",
      description: "Validate user data",
      parameters: ["userData", "context"],
      returnType: "boolean"
    });

    this.defineHook({
      name: "validate.business",
      description: "Validate business data", 
      parameters: ["businessData", "context"],
      returnType: "boolean"
    });

    // UI extension hooks
    this.defineHook({
      name: "ui.adminMenu",
      description: "Add items to admin menu",
      parameters: ["menuItems", "context"],
      returnType: "menuItems"
    });

    this.defineHook({
      name: "ui.dashboard",
      description: "Add widgets to dashboard",
      parameters: ["widgets", "context"], 
      returnType: "widgets"
    });

    // Website builder hooks
    this.defineHook({
      name: "website.components",
      description: "Register website components",
      parameters: ["components", "context"],
      returnType: "components"
    });

    this.defineHook({
      name: "website.beforeRender",
      description: "Called before rendering a website page",
      parameters: ["page", "context"]
    });

    this.defineHook({
      name: "website.afterRender",
      description: "Called after rendering a website page", 
      parameters: ["page", "html", "context"]
    });
  }
}

// Standard hook names for easy reference
export const STANDARD_HOOKS = {
  // Plugin lifecycle
  PLUGIN_BEFORE_INITIALIZE: "plugin.beforeInitialize",
  PLUGIN_AFTER_INITIALIZE: "plugin.afterInitialize", 
  PLUGIN_BEFORE_DESTROY: "plugin.beforeDestroy",

  // Request lifecycle
  REQUEST_BEFORE_PROCESS: "request.beforeProcess",
  REQUEST_AFTER_PROCESS: "request.afterProcess",

  // Data lifecycle
  DATA_BEFORE_CREATE: "data.beforeCreate",
  DATA_AFTER_CREATE: "data.afterCreate",
  DATA_BEFORE_UPDATE: "data.beforeUpdate", 
  DATA_AFTER_UPDATE: "data.afterUpdate",
  DATA_BEFORE_DELETE: "data.beforeDelete",
  DATA_AFTER_DELETE: "data.afterDelete",

  // Validation
  VALIDATE_USER: "validate.user",
  VALIDATE_BUSINESS: "validate.business",

  // UI extension
  UI_ADMIN_MENU: "ui.adminMenu",
  UI_DASHBOARD: "ui.dashboard",

  // Website builder
  WEBSITE_COMPONENTS: "website.components",
  WEBSITE_BEFORE_RENDER: "website.beforeRender",
  WEBSITE_AFTER_RENDER: "website.afterRender"
} as const;