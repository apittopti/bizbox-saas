import type { PluginManifest } from '@bizbox/core-framework';

/**
 * Metadata storage for decorators
 */
const METADATA_KEY = Symbol('bizbox:plugin:metadata');

/**
 * Get metadata from a class
 */
function getMetadata(target: any, key: string): any {
  if (!target[METADATA_KEY]) {
    target[METADATA_KEY] = {};
  }
  return target[METADATA_KEY][key];
}

/**
 * Set metadata on a class
 */
function setMetadata(target: any, key: string, value: any): void {
  if (!target[METADATA_KEY]) {
    target[METADATA_KEY] = {};
  }
  target[METADATA_KEY][key] = value;
}

/**
 * Plugin class decorator
 * Automatically registers plugin metadata
 */
export function BizBoxPlugin(manifest: PluginManifest) {
  return function <T extends new (...args: any[]) => any>(constructor: T) {
    setMetadata(constructor.prototype, 'manifest', manifest);
    setMetadata(constructor.prototype, 'pluginId', manifest.id);
    
    return class extends constructor {
      public readonly pluginId = manifest.id;
      public readonly pluginName = manifest.name;
      public readonly pluginVersion = manifest.version;

      getManifest(): PluginManifest {
        return manifest;
      }
    };
  };
}

/**
 * Hook method decorator
 * Automatically registers hooks when plugin initializes
 */
export function Hook(hookName: string, priority = 10) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const hooks = getMetadata(target, 'hooks') || [];
    hooks.push({
      name: hookName,
      method: propertyKey,
      priority
    });
    setMetadata(target, 'hooks', hooks);

    return descriptor;
  };
}

/**
 * API route decorator
 * Automatically registers API routes
 */
export function Route(method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', path: string, options: {
  permissions?: string[];
  middleware?: string[];
  description?: string;
} = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const routes = getMetadata(target, 'routes') || [];
    routes.push({
      method,
      path,
      handler: propertyKey,
      permissions: options.permissions,
      middleware: options.middleware,
      description: options.description
    });
    setMetadata(target, 'routes', routes);

    return descriptor;
  };
}

/**
 * Event handler decorator
 * Automatically subscribes to events
 */
export function EventHandler(eventType: string, options: {
  once?: boolean;
  priority?: number;
} = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const eventHandlers = getMetadata(target, 'eventHandlers') || [];
    eventHandlers.push({
      eventType,
      method: propertyKey,
      once: options.once,
      priority: options.priority
    });
    setMetadata(target, 'eventHandlers', eventHandlers);

    return descriptor;
  };
}

/**
 * Permission decorator
 * Defines required permissions for methods
 */
export function RequirePermission(resource: string, action: string, conditions?: Record<string, any>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const permissions = getMetadata(target, 'permissions') || [];
    permissions.push({
      method: propertyKey,
      resource,
      action,
      conditions
    });
    setMetadata(target, 'permissions', permissions);

    return descriptor;
  };
}

/**
 * Validation decorator
 * Automatically validates method parameters
 */
export function Validate(schema: any) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      // In a real implementation, this would use a validation library like Zod
      // For now, just log the validation attempt
      console.log(`Validating parameters for ${propertyKey}`, { schema, args });
      
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Cache decorator
 * Automatically caches method results
 */
export function Cache(options: {
  ttl?: number;
  key?: string;
  tenant?: boolean;
} = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = options.key || `${this.pluginId}:${propertyKey}:${JSON.stringify(args)}`;
      const tenantKey = options.tenant && this.context?.tenant ? `${this.context.tenant.id}:${cacheKey}` : cacheKey;

      // Check cache first
      if (this.context?.cache) {
        const cached = await this.context.cache.get(tenantKey);
        if (cached) {
          return cached;
        }
      }

      // Execute method and cache result
      const result = await originalMethod.apply(this, args);
      
      if (this.context?.cache && result !== undefined) {
        await this.context.cache.set(tenantKey, result, options.ttl || 300);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Rate limit decorator
 * Applies rate limiting to methods
 */
export function RateLimit(options: {
  requests: number;
  window: number; // in seconds
  tenant?: boolean;
}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const key = options.tenant && this.context?.tenant 
        ? `${this.context.tenant.id}:${this.pluginId}:${propertyKey}`
        : `${this.pluginId}:${propertyKey}`;

      // In a real implementation, this would use Redis or similar for rate limiting
      console.log(`Rate limiting check for ${key}`, options);

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Async decorator
 * Ensures method is properly handled as async
 */
export function Async(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    try {
      const result = await originalMethod.apply(this, args);
      return result;
    } catch (error) {
      if (this.handleError) {
        this.handleError(error as Error, propertyKey);
      }
      throw error;
    }
  };

  return descriptor;
}

/**
 * Tenant isolation decorator
 * Ensures method operates within tenant context
 */
export function TenantIsolated(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: any[]) {
    if (!this.context?.tenant) {
      throw new Error(`Method ${propertyKey} requires tenant context`);
    }

    // Set tenant context for database operations
    if (this.context.database?.setTenantContext) {
      this.context.database.setTenantContext(this.context.tenant.id);
    }

    return originalMethod.apply(this, args);
  };

  return descriptor;
}

/**
 * Get all metadata for a plugin class
 */
export function getPluginMetadata(target: any): {
  manifest?: PluginManifest;
  hooks?: any[];
  routes?: any[];
  eventHandlers?: any[];
  permissions?: any[];
} {
  return {
    manifest: getMetadata(target, 'manifest'),
    hooks: getMetadata(target, 'hooks') || [],
    routes: getMetadata(target, 'routes') || [],
    eventHandlers: getMetadata(target, 'eventHandlers') || [],
    permissions: getMetadata(target, 'permissions') || []
  };
}