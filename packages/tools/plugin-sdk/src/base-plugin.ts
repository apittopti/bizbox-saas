import type { PluginContext, PluginManifest } from '@bizbox/core-framework';

/**
 * Abstract base class for BizBox plugins
 * Provides common functionality and enforces plugin structure
 */
export abstract class BizBoxPlugin {
  public readonly id: string;
  public readonly name: string;
  public readonly version: string;
  protected context?: PluginContext;

  constructor(manifest: PluginManifest) {
    this.id = manifest.id;
    this.name = manifest.name;
    this.version = manifest.version;
  }

  /**
   * Initialize the plugin
   * Called when the plugin is loaded and activated
   */
  abstract initialize(context: PluginContext): Promise<void>;

  /**
   * Destroy the plugin
   * Called when the plugin is deactivated or unloaded
   */
  abstract destroy(): Promise<void>;

  /**
   * Get plugin manifest
   */
  abstract getManifest(): PluginManifest;

  /**
   * Get plugin health status
   */
  getHealth(): PluginHealthStatus {
    return {
      status: 'healthy',
      timestamp: new Date(),
      metrics: this.getMetrics()
    };
  }

  /**
   * Get plugin metrics
   */
  protected getMetrics(): PluginMetrics {
    return {
      memoryUsage: process.memoryUsage().heapUsed,
      uptime: process.uptime(),
      requestCount: 0,
      errorCount: 0
    };
  }

  /**
   * Log plugin message
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      plugin: this.id,
      level,
      message,
      data
    };

    // In a real implementation, this would use a proper logging system
    console.log(JSON.stringify(logEntry));
  }

  /**
   * Emit plugin event
   */
  protected async emit(eventType: string, data: any): Promise<void> {
    if (this.context?.eventBus) {
      await this.context.eventBus.emit(`plugin.${this.id}.${eventType}`, data, this.context.tenant);
    }
  }

  /**
   * Subscribe to events
   */
  protected subscribe(eventType: string, handler: (payload: any) => void): string | undefined {
    if (this.context?.eventBus) {
      return this.context.eventBus.subscribe(eventType, handler, { pluginId: this.id });
    }
    return undefined;
  }

  /**
   * Register a hook
   */
  protected registerHook(hookName: string, handler: (...args: any[]) => any, priority = 10): void {
    if (this.context?.hookSystem) {
      this.context.hookSystem.registerHook(hookName, handler, this.id, priority);
    }
  }

  /**
   * Execute a hook
   */
  protected async executeHook(hookName: string, ...args: any[]): Promise<any[]> {
    if (this.context?.hookSystem) {
      return await this.context.hookSystem.executeHook(hookName, ...args);
    }
    return [];
  }

  /**
   * Get tenant-scoped database connection
   */
  protected getDatabase(): any {
    return this.context?.database;
  }

  /**
   * Get cache instance
   */
  protected getCache(): any {
    return this.context?.cache;
  }

  /**
   * Get current tenant
   */
  protected getTenant(): any {
    return this.context?.tenant;
  }

  /**
   * Get current user
   */
  protected getUser(): any {
    return this.context?.user;
  }

  /**
   * Validate plugin configuration
   */
  protected validateConfig(config: any, schema: any): boolean {
    // In a real implementation, this would use a validation library like Zod
    return true;
  }

  /**
   * Handle plugin errors
   */
  protected handleError(error: Error, context?: string): void {
    this.log('error', `Plugin error${context ? ` in ${context}` : ''}`, {
      error: error.message,
      stack: error.stack
    });

    // Emit error event for monitoring
    this.emit('error', {
      error: error.message,
      context,
      timestamp: new Date()
    });
  }
}

/**
 * Plugin health status
 */
export interface PluginHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  message?: string;
  metrics?: PluginMetrics;
}

/**
 * Plugin metrics
 */
export interface PluginMetrics {
  memoryUsage: number;
  uptime: number;
  requestCount: number;
  errorCount: number;
  customMetrics?: Record<string, number>;
}

/**
 * Plugin decorator for automatic registration
 */
export function Plugin(manifest: PluginManifest) {
  return function <T extends new (...args: any[]) => BizBoxPlugin>(constructor: T) {
    return class extends constructor {
      constructor(...args: any[]) {
        super(manifest);
      }

      getManifest(): PluginManifest {
        return manifest;
      }
    };
  };
}

/**
 * Hook decorator for automatic hook registration
 */
export function Hook(hookName: string, priority = 10) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      // Register the hook when the plugin is initialized
      if (this.context?.hookSystem) {
        this.context.hookSystem.registerHook(hookName, originalMethod.bind(this), this.id, priority);
      }
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Route decorator for automatic route registration
 */
export function Route(method: string, path: string, permissions?: string[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    // Store route metadata
    if (!target.constructor._routes) {
      target.constructor._routes = [];
    }

    target.constructor._routes.push({
      method: method.toUpperCase(),
      path,
      handler: propertyKey,
      permissions
    });

    return descriptor;
  };
}

/**
 * Event handler decorator
 */
export function EventHandler(eventType: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      // Register event handler when plugin is initialized
      if (this.context?.eventBus) {
        this.context.eventBus.subscribe(eventType, originalMethod.bind(this), { pluginId: this.id });
      }
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}