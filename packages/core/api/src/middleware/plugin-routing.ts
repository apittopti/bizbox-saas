import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { PluginManager } from '@bizbox/core-framework';
import { ApiRoute, ApiMiddleware } from '../gateway/api-gateway';

export interface PluginRoute extends Omit<ApiRoute, 'path'> {
  path: string;
  pluginId: string;
  namespace?: string;
  version?: string;
  priority?: number;
  conditions?: RouteCondition[];
}

export interface RouteCondition {
  type: 'header' | 'query' | 'body' | 'tenant' | 'user' | 'custom';
  field?: string;
  operator: 'equals' | 'contains' | 'matches' | 'exists' | 'custom';
  value?: any;
  validator?: (req: NextApiRequest) => boolean;
}

export interface PluginRouteRegistry {
  routes: Map<string, PluginRoute[]>;
  pluginRoutes: Map<string, PluginRoute[]>;
  wildcardRoutes: PluginRoute[];
  routeCache: Map<string, PluginRoute | null>;
}

export interface RouteMatch {
  route: PluginRoute;
  params: Record<string, string>;
  score: number;
}

export interface PluginRoutingOptions {
  enableCaching?: boolean;
  cacheTimeout?: number;
  maxCacheSize?: number;
  enableWildcards?: boolean;
  enableVersioning?: boolean;
  defaultVersion?: string;
  enableMetrics?: boolean;
}

/**
 * Plugin routing system for dynamic route registration
 */
export class PluginRoutingSystem {
  private registry: PluginRouteRegistry = {
    routes: new Map(),
    pluginRoutes: new Map(),
    wildcardRoutes: [],
    routeCache: new Map(),
  };

  private pluginManager: PluginManager;
  private options: Required<PluginRoutingOptions>;
  private metrics: {
    routeMatches: number;
    cacheHits: number;
    cacheMisses: number;
    registeredRoutes: number;
  } = {
    routeMatches: 0,
    cacheHits: 0,
    cacheMisses: 0,
    registeredRoutes: 0,
  };

  constructor(options: PluginRoutingOptions = {}) {
    this.pluginManager = PluginManager.getInstance();
    this.options = {
      enableCaching: true,
      cacheTimeout: 5 * 60 * 1000, // 5 minutes
      maxCacheSize: 1000,
      enableWildcards: true,
      enableVersioning: true,
      defaultVersion: 'v1',
      enableMetrics: true,
      ...options,
    };

    this.setupCacheCleanup();
  }

  /**
   * Register routes from a plugin
   */
  registerPluginRoutes(pluginId: string, routes: Omit<PluginRoute, 'pluginId'>[]): void {
    const plugin = this.pluginManager.getPlugin(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    const pluginRoutes: PluginRoute[] = routes.map(route => ({
      ...route,
      pluginId,
      namespace: route.namespace || plugin.manifest.namespace || pluginId,
      version: route.version || plugin.manifest.version || this.options.defaultVersion,
      priority: route.priority || 0,
    }));

    // Store plugin routes
    this.registry.pluginRoutes.set(pluginId, pluginRoutes);

    // Register routes in the main registry
    pluginRoutes.forEach(route => this.registerRoute(route));

    // Clear cache when new routes are registered
    this.clearCache();

    this.metrics.registeredRoutes += pluginRoutes.length;
    console.log(`Registered ${pluginRoutes.length} routes for plugin: ${pluginId}`);
  }

  /**
   * Register a single plugin route
   */
  registerRoute(route: PluginRoute): void {
    const key = this.createRouteKey(route.method, route.path);
    
    if (!this.registry.routes.has(key)) {
      this.registry.routes.set(key, []);
    }

    const existingRoutes = this.registry.routes.get(key)!;
    
    // Check for conflicts
    const conflictingRoute = existingRoutes.find(existing => 
      existing.pluginId !== route.pluginId && 
      existing.path === route.path &&
      existing.version === route.version
    );

    if (conflictingRoute) {
      throw new Error(
        `Route conflict: ${route.method} ${route.path} is already registered by plugin ${conflictingRoute.pluginId}`
      );
    }

    // Insert route sorted by priority (higher first)
    const insertIndex = existingRoutes.findIndex(r => r.priority! < route.priority!);
    if (insertIndex === -1) {
      existingRoutes.push(route);
    } else {
      existingRoutes.splice(insertIndex, 0, route);
    }

    // Handle wildcard routes
    if (this.options.enableWildcards && this.isWildcardRoute(route.path)) {
      this.registry.wildcardRoutes.push(route);
      this.registry.wildcardRoutes.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }
  }

  /**
   * Unregister routes for a plugin
   */
  unregisterPluginRoutes(pluginId: string): void {
    const pluginRoutes = this.registry.pluginRoutes.get(pluginId);
    if (!pluginRoutes) return;

    // Remove from main registry
    pluginRoutes.forEach(route => {
      const key = this.createRouteKey(route.method, route.path);
      const routes = this.registry.routes.get(key);
      if (routes) {
        const filteredRoutes = routes.filter(r => r.pluginId !== pluginId);
        if (filteredRoutes.length === 0) {
          this.registry.routes.delete(key);
        } else {
          this.registry.routes.set(key, filteredRoutes);
        }
      }

      // Remove from wildcard routes
      this.registry.wildcardRoutes = this.registry.wildcardRoutes.filter(
        r => r.pluginId !== pluginId
      );
    });

    // Remove from plugin routes
    this.registry.pluginRoutes.delete(pluginId);

    // Clear cache
    this.clearCache();

    console.log(`Unregistered routes for plugin: ${pluginId}`);
  }

  /**
   * Find matching route for a request
   */
  findRoute(method: string, path: string, req: NextApiRequest): RouteMatch | null {
    const cacheKey = `${method}:${path}`;
    
    // Check cache first
    if (this.options.enableCaching && this.registry.routeCache.has(cacheKey)) {
      const cachedRoute = this.registry.routeCache.get(cacheKey);
      if (cachedRoute) {
        this.metrics.cacheHits++;
        const params = this.extractParams(cachedRoute.path, path);
        return {
          route: cachedRoute,
          params,
          score: this.calculateRouteScore(cachedRoute, req),
        };
      }
    }

    this.metrics.cacheMisses++;

    // Direct route lookup
    const directMatch = this.findDirectMatch(method, path, req);
    if (directMatch) {
      this.cacheRoute(cacheKey, directMatch.route);
      return directMatch;
    }

    // Pattern-based lookup
    const patternMatch = this.findPatternMatch(method, path, req);
    if (patternMatch) {
      this.cacheRoute(cacheKey, patternMatch.route);
      return patternMatch;
    }

    // Wildcard lookup
    if (this.options.enableWildcards) {
      const wildcardMatch = this.findWildcardMatch(method, path, req);
      if (wildcardMatch) {
        this.cacheRoute(cacheKey, wildcardMatch.route);
        return wildcardMatch;
      }
    }

    // Cache null result to prevent repeated lookups
    this.cacheRoute(cacheKey, null);
    return null;
  }

  /**
   * Create plugin routing middleware
   */
  createRoutingMiddleware(): ApiMiddleware {
    return async (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
      try {
        const method = req.method as string;
        const path = this.extractPath(req.url || '');
        
        const match = this.findRoute(method, path, req);
        
        if (!match) {
          return next(); // Let default routing handle it
        }

        const { route, params } = match;
        
        // Attach route and params to request
        (req as any).pluginRoute = route;
        (req as any).params = { ...(req as any).params, ...params };
        
        // Set plugin context
        (req as any).pluginContext = {
          pluginId: route.pluginId,
          namespace: route.namespace,
          version: route.version,
        };

        // Validate route conditions
        if (route.conditions && !this.validateConditions(route.conditions, req)) {
          return res.status(412).json({
            error: {
              code: 'PRECONDITION_FAILED',
              message: 'Route conditions not met',
              timestamp: new Date().toISOString(),
            },
          });
        }

        this.metrics.routeMatches++;
        
        // Execute plugin route middleware and handler
        await this.executePluginRoute(route, req, res);
        
      } catch (error) {
        console.error('Plugin routing error:', error);
        next(); // Fall back to default routing
      }
    };
  }

  /**
   * Get routing metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.registry.routeCache.size,
      registeredPlugins: this.registry.pluginRoutes.size,
      totalRoutes: Array.from(this.registry.routes.values()).reduce((sum, routes) => sum + routes.length, 0),
      wildcardRoutes: this.registry.wildcardRoutes.length,
    };
  }

  /**
   * Get all registered routes for debugging
   */
  getAllRoutes(): PluginRoute[] {
    const allRoutes: PluginRoute[] = [];
    this.registry.routes.forEach(routes => {
      allRoutes.push(...routes);
    });
    return allRoutes;
  }

  // Private methods

  private createRouteKey(method: string, path: string): string {
    return `${method.toLowerCase()}:${path}`;
  }

  private isWildcardRoute(path: string): boolean {
    return path.includes('*') || path.includes('**');
  }

  private extractPath(url: string): string {
    try {
      const urlObj = new URL(url, 'http://localhost');
      return urlObj.pathname;
    } catch {
      return url.split('?')[0];
    }
  }

  private findDirectMatch(method: string, path: string, req: NextApiRequest): RouteMatch | null {
    const key = this.createRouteKey(method, path);
    const routes = this.registry.routes.get(key);
    
    if (!routes || routes.length === 0) return null;

    // Find best matching route based on conditions and score
    const validRoutes = routes.filter(route => this.validateConditions(route.conditions || [], req));
    
    if (validRoutes.length === 0) return null;

    const bestRoute = validRoutes[0]; // Already sorted by priority
    const params = this.extractParams(bestRoute.path, path);
    
    return {
      route: bestRoute,
      params,
      score: this.calculateRouteScore(bestRoute, req),
    };
  }

  private findPatternMatch(method: string, path: string, req: NextApiRequest): RouteMatch | null {
    const candidates: RouteMatch[] = [];
    
    for (const [key, routes] of this.registry.routes) {
      if (!key.startsWith(method.toLowerCase())) continue;
      
      for (const route of routes) {
        if (this.matchPath(route.path, path)) {
          const params = this.extractParams(route.path, path);
          const score = this.calculateRouteScore(route, req);
          
          if (this.validateConditions(route.conditions || [], req)) {
            candidates.push({ route, params, score });
          }
        }
      }
    }
    
    if (candidates.length === 0) return null;
    
    // Sort by score (higher is better) and priority
    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.route.priority || 0) - (a.route.priority || 0);
    });
    
    return candidates[0];
  }

  private findWildcardMatch(method: string, path: string, req: NextApiRequest): RouteMatch | null {
    for (const route of this.registry.wildcardRoutes) {
      if (route.method.toLowerCase() !== method.toLowerCase()) continue;
      
      if (this.matchWildcardPath(route.path, path)) {
        if (this.validateConditions(route.conditions || [], req)) {
          const params = this.extractWildcardParams(route.path, path);
          const score = this.calculateRouteScore(route, req);
          
          return { route, params, score };
        }
      }
    }
    
    return null;
  }

  private matchPath(pattern: string, path: string): boolean {
    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts = path.split('/').filter(Boolean);
    
    if (patternParts.length !== pathParts.length) return false;
    
    return patternParts.every((part, index) => {
      if (part.startsWith(':')) return true; // Parameter
      if (part === pathParts[index]) return true; // Exact match
      return false;
    });
  }

  private matchWildcardPath(pattern: string, path: string): boolean {
    // Convert wildcard pattern to regex
    const regexPattern = pattern
      .replace(/\*\*/g, '.*') // ** matches any path
      .replace(/\*/g, '[^/]*') // * matches any segment
      .replace(/:\w+/g, '[^/]+'); // :param matches any segment
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  private extractParams(pattern: string, path: string): Record<string, string> {
    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts = path.split('/').filter(Boolean);
    const params: Record<string, string> = {};
    
    patternParts.forEach((part, index) => {
      if (part.startsWith(':')) {
        const paramName = part.substring(1);
        params[paramName] = pathParts[index] || '';
      }
    });
    
    return params;
  }

  private extractWildcardParams(pattern: string, path: string): Record<string, string> {
    const params: Record<string, string> = {};
    
    // Extract named parameters
    const namedParams = this.extractParams(pattern, path);
    Object.assign(params, namedParams);
    
    // Extract wildcard matches
    if (pattern.includes('**')) {
      const wildcardIndex = pattern.indexOf('**');
      const beforeWildcard = pattern.substring(0, wildcardIndex);
      const afterWildcard = pattern.substring(wildcardIndex + 2);
      
      const beforeLength = beforeWildcard.split('/').filter(Boolean).length;
      const afterLength = afterWildcard.split('/').filter(Boolean).length;
      const pathParts = path.split('/').filter(Boolean);
      
      const wildcardParts = pathParts.slice(beforeLength, pathParts.length - afterLength);
      params['**'] = wildcardParts.join('/');
    }
    
    return params;
  }

  private validateConditions(conditions: RouteCondition[], req: NextApiRequest): boolean {
    return conditions.every(condition => this.validateCondition(condition, req));
  }

  private validateCondition(condition: RouteCondition, req: NextApiRequest): boolean {
    try {
      switch (condition.type) {
        case 'header':
          return this.validateFieldCondition(req.headers[condition.field!], condition);
          
        case 'query':
          return this.validateFieldCondition(req.query[condition.field!], condition);
          
        case 'body':
          return this.validateFieldCondition((req.body as any)?.[condition.field!], condition);
          
        case 'tenant':
          const tenantId = req.headers['x-tenant-id'] || (req as any).user?.tenantId;
          return this.validateFieldCondition(tenantId, condition);
          
        case 'user':
          const userId = (req as any).user?.id;
          return this.validateFieldCondition(userId, condition);
          
        case 'custom':
          return condition.validator ? condition.validator(req) : true;
          
        default:
          return true;
      }
    } catch (error) {
      console.error('Condition validation error:', error);
      return false;
    }
  }

  private validateFieldCondition(fieldValue: any, condition: RouteCondition): boolean {
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
        
      case 'contains':
        return String(fieldValue || '').includes(String(condition.value || ''));
        
      case 'matches':
        const regex = new RegExp(String(condition.value || ''));
        return regex.test(String(fieldValue || ''));
        
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
        
      case 'custom':
        return condition.validator ? condition.validator({ value: fieldValue } as any) : true;
        
      default:
        return true;
    }
  }

  private calculateRouteScore(route: PluginRoute, req: NextApiRequest): number {
    let score = 0;
    
    // Base score from priority
    score += (route.priority || 0) * 100;
    
    // Bonus for exact matches
    if (!route.path.includes(':') && !route.path.includes('*')) {
      score += 50;
    }
    
    // Bonus for specific conditions
    if (route.conditions && route.conditions.length > 0) {
      score += route.conditions.length * 10;
    }
    
    // Version matching bonus
    if (this.options.enableVersioning) {
      const requestedVersion = req.headers['x-api-version'] as string;
      if (requestedVersion === route.version) {
        score += 25;
      }
    }
    
    return score;
  }

  private async executePluginRoute(route: PluginRoute, req: NextApiRequest, res: NextApiResponse): Promise<void> {
    try {
      // Execute route middleware first
      if (route.middleware && route.middleware.length > 0) {
        await this.executeMiddleware(req, res, route.middleware);
      }
      
      // Execute the main handler
      await route.handler(req, res);
      
    } catch (error) {
      console.error(`Plugin route execution error (${route.pluginId}):`, error);
      
      if (!res.headersSent) {
        res.status(500).json({
          error: {
            code: 'PLUGIN_ROUTE_ERROR',
            message: 'Plugin route execution failed',
            plugin: route.pluginId,
            timestamp: new Date().toISOString(),
          },
        });
      }
    }
  }

  private async executeMiddleware(
    req: NextApiRequest,
    res: NextApiResponse,
    middleware: ApiMiddleware[]
  ): Promise<void> {
    let index = 0;

    const next = async (): Promise<void> => {
      if (index >= middleware.length) return;
      
      const currentMiddleware = middleware[index++];
      await currentMiddleware(req, res, next);
    };

    await next();
  }

  private cacheRoute(key: string, route: PluginRoute | null): void {
    if (!this.options.enableCaching) return;
    
    // Implement LRU cache behavior
    if (this.registry.routeCache.size >= this.options.maxCacheSize) {
      const firstKey = this.registry.routeCache.keys().next().value;
      this.registry.routeCache.delete(firstKey);
    }
    
    this.registry.routeCache.set(key, route);
  }

  private clearCache(): void {
    this.registry.routeCache.clear();
  }

  private setupCacheCleanup(): void {
    if (!this.options.enableCaching) return;
    
    setInterval(() => {
      this.clearCache();
    }, this.options.cacheTimeout);
  }
}

/**
 * Create plugin routing middleware
 */
export function createPluginRoutingMiddleware(options?: PluginRoutingOptions): ApiMiddleware {
  const routingSystem = new PluginRoutingSystem(options);
  return routingSystem.createRoutingMiddleware();
}

/**
 * Route builder for plugins
 */
export class PluginRouteBuilder {
  private route: Partial<PluginRoute> = {
    priority: 0,
    conditions: [],
  };

  constructor(private pluginId: string) {
    this.route.pluginId = pluginId;
  }

  method(method: PluginRoute['method']): this {
    this.route.method = method;
    return this;
  }

  path(path: string): this {
    this.route.path = path;
    return this;
  }

  handler(handler: PluginRoute['handler']): this {
    this.route.handler = handler;
    return this;
  }

  middleware(...middleware: ApiMiddleware[]): this {
    this.route.middleware = [...(this.route.middleware || []), ...middleware];
    return this;
  }

  priority(priority: number): this {
    this.route.priority = priority;
    return this;
  }

  namespace(namespace: string): this {
    this.route.namespace = namespace;
    return this;
  }

  version(version: string): this {
    this.route.version = version;
    return this;
  }

  condition(condition: RouteCondition): this {
    this.route.conditions = [...(this.route.conditions || []), condition];
    return this;
  }

  requireHeader(name: string, value?: string): this {
    return this.condition({
      type: 'header',
      field: name,
      operator: value ? 'equals' : 'exists',
      value,
    });
  }

  requireTenant(tenantId?: string): this {
    return this.condition({
      type: 'tenant',
      operator: tenantId ? 'equals' : 'exists',
      value: tenantId,
    });
  }

  validation(validation: PluginRoute['validation']): this {
    this.route.validation = validation;
    return this;
  }

  auth(auth: PluginRoute['auth']): this {
    this.route.auth = auth;
    return this;
  }

  rateLimit(rateLimit: PluginRoute['rateLimit']): this {
    this.route.rateLimit = rateLimit;
    return this;
  }

  documentation(documentation: PluginRoute['documentation']): this {
    this.route.documentation = documentation;
    return this;
  }

  build(): PluginRoute {
    if (!this.route.method || !this.route.path || !this.route.handler) {
      throw new Error('Route must have method, path, and handler');
    }
    
    return this.route as PluginRoute;
  }
}

/**
 * Create plugin route builder
 */
export function createRouteBuilder(pluginId: string): PluginRouteBuilder {
  return new PluginRouteBuilder(pluginId);
}

// Export singleton instance
let pluginRoutingSystem: PluginRoutingSystem | null = null;

export function getPluginRoutingSystem(options?: PluginRoutingOptions): PluginRoutingSystem {
  if (!pluginRoutingSystem) {
    pluginRoutingSystem = new PluginRoutingSystem(options);
  }
  return pluginRoutingSystem;
}

export function createPluginRoutingSystem(options?: PluginRoutingOptions): PluginRoutingSystem {
  return new PluginRoutingSystem(options);
}