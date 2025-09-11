import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { PluginManager } from '@bizbox/core-framework';
import {
  createValidationMiddleware,
  createAuthMiddleware,
  createRateLimitMiddleware,
  createErrorHandlingMiddleware,
  createPluginRoutingMiddleware,
  createCorsMiddleware,
  createLoggingMiddleware,
  createSecurityMiddleware,
  createRequestContextMiddleware,
  createRedisStore,
  getPluginRoutingSystem,
  ApiError,
  ValidationSchema,
  AuthOptions,
  RateLimitOptions,
} from '../middleware';
import { 
  securityHeaders, 
  inputValidator, 
  contentSanitizer,
  securityAuditLogger 
} from '@bizbox/shared-security';

export interface ApiRoute {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  handler: ApiHandler;
  middleware?: ApiMiddleware[];
  validation?: ValidationSchema;
  rateLimit?: RateLimitOptions;
  auth?: AuthOptions;
  documentation?: {
    summary: string;
    description?: string;
    tags?: string[];
    responses?: Record<string, { description: string; schema?: z.ZodSchema }>;
  };
}

export type ApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void;
export type ApiMiddleware = (req: NextApiRequest, res: NextApiResponse, next: () => void) => Promise<void> | void;

export interface ApiGatewayOptions {
  basePath?: string;
  enableCors?: boolean;
  corsOptions?: {
    origin?: string | string[] | ((origin: string | undefined, req: NextApiRequest) => boolean);
    methods?: string[];
    allowedHeaders?: string[];
    credentials?: boolean;
    maxAge?: number;
  };
  enableRateLimit?: boolean;
  defaultRateLimit?: RateLimitOptions;
  enableDocumentation?: boolean;
  documentationPath?: string;
  enableAuth?: boolean;
  defaultAuth?: AuthOptions;
  enablePluginRouting?: boolean;
  enableSecurity?: boolean;
  enableMetrics?: boolean;
  enableCompression?: boolean;
  redisConfig?: {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
  };
}

export class ApiGateway {
  private routes: Map<string, ApiRoute> = new Map();
  private middleware: ApiMiddleware[] = [];
  private options: Required<ApiGatewayOptions>;
  private pluginManager: PluginManager;

  constructor(options: ApiGatewayOptions = {}) {
    // Get allowed origins from environment - NEVER use wildcard in production
    const getAllowedOrigins = (): string[] => {
      const env = process.env.NODE_ENV || 'development';
      const allowedOrigins = process.env.ALLOWED_ORIGINS;
      
      if (env === 'development') {
        return ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'];
      }
      
      if (allowedOrigins) {
        return allowedOrigins.split(',').map(origin => origin.trim());
      }
      
      throw new Error('ALLOWED_ORIGINS environment variable must be set in production');
    };

    this.options = {
      basePath: '/api',
      enableCors: true,
      corsOptions: {
        origin: (origin, req) => {
          const allowedOrigins = getAllowedOrigins();
          
          // Allow same-origin requests (no origin header)
          if (!origin) return true;
          
          // Check against whitelist
          return allowedOrigins.includes(origin);
        },
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
          'Content-Type', 
          'Authorization', 
          'X-Tenant-ID',
          'X-CSRF-Token',
          'X-Requested-With'
        ],
        credentials: true,
        maxAge: 300, // 5 minutes cache for preflight
        optionsSuccessStatus: 200,
      },
      enableRateLimit: true,
      defaultRateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: process.env.NODE_ENV === 'production' ? 100 : 1000,
      },
      enableDocumentation: process.env.NODE_ENV !== 'production',
      documentationPath: '/api/docs',
      enableSecurity: true,
      ...options,
    };

    this.pluginManager = PluginManager.getInstance();
    this.setupDefaultMiddleware();
  }

  private setupDefaultMiddleware() {
    // Security headers middleware (FIRST - before any other processing)
    if (this.options.enableSecurity) {
      this.use(this.createSecurityHeadersMiddleware());
    }

    // CORS middleware (SECOND - after security headers)
    if (this.options.enableCors) {
      this.use(this.createCorsMiddleware());
    }

    // Rate limiting middleware (THIRD - before expensive operations)
    if (this.options.enableRateLimit) {
      this.use(this.createRateLimitMiddleware());
    }

    // Input validation and sanitization middleware
    this.use(this.createInputValidationMiddleware());

    // Request logging middleware
    this.use(this.createLoggingMiddleware());

    // Error handling middleware (LAST)
    this.use(this.createErrorHandlingMiddleware());
  }

  /**
   * Register a global middleware
   */
  use(middleware: ApiMiddleware): void {
    this.middleware.push(middleware);
  }

  /**
   * Register an API route
   */
  register(route: ApiRoute): void {
    const routeKey = `${route.method}:${route.path}`;
    
    if (this.routes.has(routeKey)) {
      throw new Error(`Route ${routeKey} is already registered`);
    }

    this.routes.set(routeKey, route);
    console.log(`Registered API route: ${routeKey}`);
  }

  /**
   * Register multiple routes
   */
  registerRoutes(routes: ApiRoute[]): void {
    routes.forEach(route => this.register(route));
  }

  /**
   * Register routes from a plugin
   */
  registerPluginRoutes(pluginId: string, routes: ApiRoute[]): void {
    const plugin = this.pluginManager.getPlugin(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    // Prefix routes with plugin namespace
    const namespacedRoutes = routes.map(route => ({
      ...route,
      path: `/plugins/${pluginId}${route.path}`,
    }));

    this.registerRoutes(namespacedRoutes);
    console.log(`Registered ${routes.length} routes for plugin: ${pluginId}`);
  }

  /**
   * Handle incoming API requests
   */
  async handle(req: NextApiRequest, res: NextApiResponse): Promise<void> {
    try {
      const method = req.method as ApiRoute['method'];
      const path = this.extractPath(req.url || '');
      const routeKey = `${method}:${path}`;

      // Find matching route
      const route = this.findRoute(routeKey, path);
      
      if (!route) {
        return this.sendError(res, 404, 'NOT_FOUND', 'Route not found');
      }

      // Execute middleware chain
      await this.executeMiddleware(req, res, [
        ...this.middleware,
        ...(route.middleware || []),
        this.createValidationMiddleware(route.validation),
        this.createAuthMiddleware(route.auth),
        this.createRouteHandler(route.handler),
      ]);

    } catch (error) {
      console.error('API Gateway error:', error);
      this.sendError(res, 500, 'INTERNAL_ERROR', 'Internal server error');
    }
  }

  /**
   * Generate OpenAPI documentation
   */
  generateDocumentation(): any {
    if (!this.options.enableDocumentation) {
      return null;
    }

    const paths: any = {};
    
    this.routes.forEach((route, routeKey) => {
      const [method, path] = routeKey.split(':');
      
      if (!paths[path]) {
        paths[path] = {};
      }

      paths[path][method.toLowerCase()] = {
        summary: route.documentation?.summary || `${method} ${path}`,
        description: route.documentation?.description,
        tags: route.documentation?.tags || ['API'],
        parameters: this.generateParameters(route),
        requestBody: this.generateRequestBody(route),
        responses: this.generateResponses(route),
      };
    });

    return {
      openapi: '3.0.0',
      info: {
        title: 'BizBox API',
        version: '1.0.0',
        description: 'BizBox Multi-Tenant Platform API',
      },
      paths,
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    };
  }

  private extractPath(url: string): string {
    const urlObj = new URL(url, 'http://localhost');
    return urlObj.pathname.replace(this.options.basePath, '') || '/';
  }

  private findRoute(routeKey: string, path: string): ApiRoute | undefined {
    // First try exact match
    const exactMatch = this.routes.get(routeKey);
    if (exactMatch) {
      return exactMatch;
    }

    // Try pattern matching for dynamic routes
    const method = routeKey.split(':')[0];
    for (const [key, route] of this.routes.entries()) {
      if (key.startsWith(`${method}:`)) {
        const routePath = key.split(':')[1];
        if (this.matchPath(routePath, path)) {
          return route;
        }
      }
    }

    return undefined;
  }

  private matchPath(pattern: string, path: string): boolean {
    // Simple pattern matching for dynamic routes like /users/:id
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');

    if (patternParts.length !== pathParts.length) {
      return false;
    }

    return patternParts.every((part, index) => {
      return part.startsWith(':') || part === pathParts[index];
    });
  }

  private async executeMiddleware(
    req: NextApiRequest,
    res: NextApiResponse,
    middleware: ApiMiddleware[]
  ): Promise<void> {
    let index = 0;

    const next = async (): Promise<void> => {
      if (index >= middleware.length) {
        return;
      }

      const currentMiddleware = middleware[index++];
      await currentMiddleware(req, res, next);
    };

    await next();
  }

  private createCorsMiddleware(): ApiMiddleware {
    return (req, res, next) => {
      const { origin, methods, allowedHeaders, credentials, maxAge } = this.options.corsOptions;
      
      // Handle origin validation
      if (typeof origin === 'function') {
        const requestOrigin = req.headers.origin;
        const isAllowed = origin(requestOrigin, req);
        
        if (isAllowed && requestOrigin) {
          res.setHeader('Access-Control-Allow-Origin', requestOrigin);
        } else if (isAllowed && !requestOrigin) {
          // Same-origin request
          res.setHeader('Access-Control-Allow-Origin', '*');
        } else {
          // Origin not allowed - block the request
          return res.status(403).json({
            error: {
              code: 'CORS_ORIGIN_BLOCKED',
              message: 'Origin not allowed by CORS policy',
              timestamp: new Date().toISOString(),
            },
          });
        }
      } else if (origin) {
        res.setHeader('Access-Control-Allow-Origin', Array.isArray(origin) ? origin.join(',') : origin);
      }
      
      if (methods) {
        res.setHeader('Access-Control-Allow-Methods', methods.join(','));
      }
      
      if (allowedHeaders) {
        res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(','));
      }
      
      if (credentials) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }

      if (maxAge) {
        res.setHeader('Access-Control-Max-Age', maxAge.toString());
      }

      // Security headers for CORS
      res.setHeader('Vary', 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers');

      if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
      }

      next();
    };
  }

  private createRateLimitMiddleware(): ApiMiddleware {
    const requests = new Map<string, { count: number; resetTime: number }>();

    return (req, res, next) => {
      const clientId = req.ip || 'unknown';
      const now = Date.now();
      const { windowMs, maxRequests } = this.options.defaultRateLimit;

      const record = requests.get(clientId);
      
      if (!record || now > record.resetTime) {
        requests.set(clientId, { count: 1, resetTime: now + windowMs });
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
        res.setHeader('X-RateLimit-Reset', now + windowMs);
        return next();
      }

      if (record.count >= maxRequests) {
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', record.resetTime);
        return this.sendError(res, 429, 'RATE_LIMIT_EXCEEDED', 'Too many requests');
      }

      record.count++;
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - record.count);
      res.setHeader('X-RateLimit-Reset', record.resetTime);
      
      next();
    };
  }

  private createLoggingMiddleware(): ApiMiddleware {
    return (req, res, next) => {
      const start = Date.now();
      const originalSend = res.send;

      res.send = function(body: any) {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
        return originalSend.call(this, body);
      };

      next();
    };
  }

  private createErrorHandlingMiddleware(): ApiMiddleware {
    return (req, res, next) => {
      try {
        next();
      } catch (error) {
        console.error('Middleware error:', error);
        this.sendError(res, 500, 'MIDDLEWARE_ERROR', 'Middleware execution failed');
      }
    };
  }

  private createValidationMiddleware(validation?: ApiRoute['validation']): ApiMiddleware {
    return async (req, res, next) => {
      if (!validation) {
        return next();
      }

      try {
        if (validation.query) {
          req.query = validation.query.parse(req.query);
        }

        if (validation.body) {
          req.body = validation.body.parse(req.body);
        }

        if (validation.params) {
          // Extract params from URL
          const params = this.extractParams(req.url || '');
          req.params = validation.params.parse(params);
        }

        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          return this.sendError(res, 400, 'VALIDATION_ERROR', 'Request validation failed', {
            errors: error.errors,
          });
        }
        throw error;
      }
    };
  }

  private createSecurityHeadersMiddleware(): ApiMiddleware {
    const middleware = securityHeaders.createMiddleware({
      csp: {
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'", "'nonce-{nonce}'"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:', 'https:'],
          'font-src': ["'self'", 'https://fonts.gstatic.com'],
          'connect-src': ["'self'"],
          'media-src': ["'self'", 'data:', 'blob:'],
          'object-src': ["'none'"],
          'base-uri': ["'self'"],
          'form-action': ["'self'"],
          'frame-ancestors': ["'self'"],
          'upgrade-insecure-requests': [],
        },
        useNonces: true,
      },
      frameOptions: 'SAMEORIGIN',
      referrerPolicy: 'strict-origin-when-cross-origin',
      enableHsts: process.env.NODE_ENV === 'production',
    });
    
    return (req, res, next) => {
      try {
        middleware(req, res, next);
      } catch (error) {
        console.error('Security headers middleware error:', error);
        securityAuditLogger.logSecurityEvent(
          'security_headers_error',
          'medium',
          { error: error.message },
          undefined,
          req.headers['x-tenant-id'] as string,
          req.headers['x-forwarded-for'] as string || req.connection?.remoteAddress,
          req.headers['user-agent'] as string
        );
        next();
      }
    };
  }

  private createInputValidationMiddleware(): ApiMiddleware {
    return async (req, res, next) => {
      try {
        // Skip validation for OPTIONS requests
        if (req.method === 'OPTIONS') {
          return next();
        }

        // Validate query parameters
        if (req.query && Object.keys(req.query).length > 0) {
          const queryResult = inputValidator.validateApiParams(req.query, {
            userId: (req as any).user?.id,
            tenantId: req.headers['x-tenant-id'] as string,
            userRole: (req as any).user?.role,
            ipAddress: req.headers['x-forwarded-for'] as string || req.connection?.remoteAddress,
          });

          if (!queryResult.success) {
            securityAuditLogger.logSecurityEvent(
              'invalid_query_parameters',
              'medium',
              { errors: queryResult.errors, query: req.query },
              (req as any).user?.id,
              req.headers['x-tenant-id'] as string,
              req.headers['x-forwarded-for'] as string || req.connection?.remoteAddress,
              req.headers['user-agent'] as string
            );

            return this.sendError(res, 400, 'INVALID_QUERY_PARAMETERS', 'Invalid query parameters', {
              errors: queryResult.errors,
            });
          }
        }

        // Sanitize request body for POST/PUT/PATCH requests
        if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method || '')) {
          try {
            // Deep sanitize the request body
            req.body = contentSanitizer.sanitizeJson(req.body);
          } catch (error) {
            securityAuditLogger.logSecurityEvent(
              'request_body_sanitization_failed',
              'high',
              { error: error.message, originalBody: JSON.stringify(req.body).substring(0, 500) },
              (req as any).user?.id,
              req.headers['x-tenant-id'] as string,
              req.headers['x-forwarded-for'] as string || req.connection?.remoteAddress,
              req.headers['user-agent'] as string
            );

            return this.sendError(res, 400, 'MALICIOUS_CONTENT_DETECTED', 'Request contains potentially malicious content');
          }
        }

        next();
      } catch (error) {
        console.error('Input validation middleware error:', error);
        securityAuditLogger.logSecurityEvent(
          'input_validation_middleware_error',
          'high',
          { error: error.message },
          (req as any).user?.id,
          req.headers['x-tenant-id'] as string,
          req.headers['x-forwarded-for'] as string || req.connection?.remoteAddress,
          req.headers['user-agent'] as string
        );
        
        return this.sendError(res, 500, 'VALIDATION_ERROR', 'Request validation failed');
      }
    };
  }

  private createAuthMiddleware(auth?: ApiRoute['auth']): ApiMiddleware {
    return (req, res, next) => {
      if (!auth?.required) {
        return next();
      }

      // This would integrate with the auth system
      // For now, just check for authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        securityAuditLogger.logSecurityEvent(
          'unauthorized_access_attempt',
          'medium',
          { path: req.url, method: req.method },
          undefined,
          req.headers['x-tenant-id'] as string,
          req.headers['x-forwarded-for'] as string || req.connection?.remoteAddress,
          req.headers['user-agent'] as string
        );
        
        return this.sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      }

      // TODO: Implement actual auth validation using the auth middleware from core-auth
      next();
    };
  }

  private createRouteHandler(handler: ApiHandler): ApiMiddleware {
    return async (req, res, next) => {
      try {
        await handler(req, res);
      } catch (error) {
        console.error('Route handler error:', error);
        this.sendError(res, 500, 'HANDLER_ERROR', 'Route handler failed');
      }
    };
  }

  private extractParams(url: string): Record<string, string> {
    // Simple param extraction - would need more sophisticated implementation
    return {};
  }

  private generateParameters(route: ApiRoute): any[] {
    const parameters: any[] = [];

    if (route.validation?.query) {
      // Generate query parameters from Zod schema
      // This is a simplified implementation
      parameters.push({
        name: 'query',
        in: 'query',
        schema: { type: 'object' },
      });
    }

    return parameters;
  }

  private generateRequestBody(route: ApiRoute): any {
    if (!route.validation?.body) {
      return undefined;
    }

    return {
      required: true,
      content: {
        'application/json': {
          schema: { type: 'object' },
        },
      },
    };
  }

  private generateResponses(route: ApiRoute): any {
    const responses = route.documentation?.responses || {};
    
    if (Object.keys(responses).length === 0) {
      responses['200'] = { description: 'Success' };
    }

    return responses;
  }

  private sendError(
    res: NextApiResponse,
    status: number,
    code: string,
    message: string,
    details?: any
  ): void {
    res.status(status).json({
      error: {
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

// Singleton instance
let apiGateway: ApiGateway | null = null;

export function getApiGateway(options?: ApiGatewayOptions): ApiGateway {
  if (!apiGateway) {
    apiGateway = new ApiGateway(options);
  }
  return apiGateway;
}

export function createApiGateway(options?: ApiGatewayOptions): ApiGateway {
  return new ApiGateway(options);
}