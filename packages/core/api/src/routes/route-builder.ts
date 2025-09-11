import { z } from 'zod';
import { NextApiRequest, NextApiResponse } from 'next';
import { ApiRoute, ApiHandler, ApiMiddleware } from '../gateway/api-gateway';

export class RouteBuilder {
  private route: Partial<ApiRoute> = {};

  constructor(method: ApiRoute['method'], path: string) {
    this.route.method = method;
    this.route.path = path;
  }

  /**
   * Set the route handler
   */
  handler(handler: ApiHandler): RouteBuilder {
    this.route.handler = handler;
    return this;
  }

  /**
   * Add middleware to the route
   */
  middleware(...middleware: ApiMiddleware[]): RouteBuilder {
    this.route.middleware = [...(this.route.middleware || []), ...middleware];
    return this;
  }

  /**
   * Add validation schemas
   */
  validate(validation: {
    query?: z.ZodSchema;
    body?: z.ZodSchema;
    params?: z.ZodSchema;
  }): RouteBuilder {
    this.route.validation = validation;
    return this;
  }

  /**
   * Set authentication requirements
   */
  auth(options: {
    required?: boolean;
    roles?: string[];
    permissions?: Array<{ resource: string; action: string }>;
  }): RouteBuilder {
    this.route.auth = {
      required: true,
      ...options,
    };
    return this;
  }

  /**
   * Set rate limiting
   */
  rateLimit(windowMs: number, maxRequests: number): RouteBuilder {
    this.route.rateLimit = { windowMs, maxRequests };
    return this;
  }

  /**
   * Add documentation
   */
  docs(documentation: {
    summary: string;
    description?: string;
    tags?: string[];
    responses?: Record<string, { description: string; schema?: z.ZodSchema }>;
  }): RouteBuilder {
    this.route.documentation = documentation;
    return this;
  }

  /**
   * Build the route
   */
  build(): ApiRoute {
    if (!this.route.handler) {
      throw new Error('Route handler is required');
    }

    return this.route as ApiRoute;
  }
}

/**
 * Convenience functions for creating routes
 */
export function GET(path: string): RouteBuilder {
  return new RouteBuilder('GET', path);
}

export function POST(path: string): RouteBuilder {
  return new RouteBuilder('POST', path);
}

export function PUT(path: string): RouteBuilder {
  return new RouteBuilder('PUT', path);
}

export function PATCH(path: string): RouteBuilder {
  return new RouteBuilder('PATCH', path);
}

export function DELETE(path: string): RouteBuilder {
  return new RouteBuilder('DELETE', path);
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  uuid: z.string().uuid(),
  email: z.string().email(),
  pagination: z.object({
    page: z.string().transform(Number).optional().default(1),
    limit: z.string().transform(Number).optional().default(10),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).optional().default('asc'),
  }),
  tenantId: z.string().uuid(),
};

/**
 * Common middleware
 */
export const commonMiddleware = {
  /**
   * JSON body parser middleware
   */
  json(): ApiMiddleware {
    return (req, res, next) => {
      if (req.headers['content-type']?.includes('application/json')) {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            req.body = JSON.parse(body);
            next();
          } catch (error) {
            res.status(400).json({
              error: {
                code: 'INVALID_JSON',
                message: 'Invalid JSON in request body',
              },
            });
          }
        });
      } else {
        next();
      }
    };
  },

  /**
   * Request ID middleware
   */
  requestId(): ApiMiddleware {
    return (req, res, next) => {
      const requestId = req.headers['x-request-id'] || 
                       `req_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      
      req.headers['x-request-id'] = requestId;
      res.setHeader('X-Request-ID', requestId);
      next();
    };
  },

  /**
   * Response time middleware
   */
  responseTime(): ApiMiddleware {
    return (req, res, next) => {
      const start = Date.now();
      const originalSend = res.send;

      res.send = function(body: any) {
        const duration = Date.now() - start;
        res.setHeader('X-Response-Time', `${duration}ms`);
        return originalSend.call(this, body);
      };

      next();
    };
  },

  /**
   * Security headers middleware
   */
  security(): ApiMiddleware {
    return (req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      next();
    };
  },

  /**
   * Tenant validation middleware
   */
  validateTenant(): ApiMiddleware {
    return (req, res, next) => {
      const tenantId = req.headers['x-tenant-id'] || req.query.tenantId;
      
      if (!tenantId) {
        return res.status(400).json({
          error: {
            code: 'MISSING_TENANT_ID',
            message: 'Tenant ID is required',
          },
        });
      }

      // Validate tenant ID format
      if (!z.string().uuid().safeParse(tenantId).success) {
        return res.status(400).json({
          error: {
            code: 'INVALID_TENANT_ID',
            message: 'Invalid tenant ID format',
          },
        });
      }

      req.tenantId = tenantId as string;
      next();
    };
  },
};

/**
 * Response helpers
 */
export const responses = {
  success<T>(res: NextApiResponse, data: T, status = 200): void {
    res.status(status).json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  },

  error(
    res: NextApiResponse,
    code: string,
    message: string,
    status = 400,
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
  },

  paginated<T>(
    res: NextApiResponse,
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }
  ): void {
    res.status(200).json({
      success: true,
      data,
      pagination,
      timestamp: new Date().toISOString(),
    });
  },

  created<T>(res: NextApiResponse, data: T): void {
    responses.success(res, data, 201);
  },

  noContent(res: NextApiResponse): void {
    res.status(204).end();
  },

  notFound(res: NextApiResponse, message = 'Resource not found'): void {
    responses.error(res, 'NOT_FOUND', message, 404);
  },

  unauthorized(res: NextApiResponse, message = 'Unauthorized'): void {
    responses.error(res, 'UNAUTHORIZED', message, 401);
  },

  forbidden(res: NextApiResponse, message = 'Forbidden'): void {
    responses.error(res, 'FORBIDDEN', message, 403);
  },

  conflict(res: NextApiResponse, message = 'Conflict'): void {
    responses.error(res, 'CONFLICT', message, 409);
  },

  validationError(res: NextApiResponse, errors: any[]): void {
    responses.error(res, 'VALIDATION_ERROR', 'Validation failed', 400, { errors });
  },

  internalError(res: NextApiResponse, message = 'Internal server error'): void {
    responses.error(res, 'INTERNAL_ERROR', message, 500);
  },
};

/**
 * Route group builder for organizing related routes
 */
export class RouteGroup {
  private routes: ApiRoute[] = [];
  private groupMiddleware: ApiMiddleware[] = [];
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  /**
   * Add middleware to all routes in the group
   */
  middleware(...middleware: ApiMiddleware[]): RouteGroup {
    this.groupMiddleware.push(...middleware);
    return this;
  }

  /**
   * Add a route to the group
   */
  route(builder: RouteBuilder): RouteGroup {
    const route = builder.build();
    
    // Prefix the path with the group base path
    route.path = this.basePath + route.path;
    
    // Add group middleware
    route.middleware = [...this.groupMiddleware, ...(route.middleware || [])];
    
    this.routes.push(route);
    return this;
  }

  /**
   * Get all routes in the group
   */
  getRoutes(): ApiRoute[] {
    return this.routes;
  }
}

/**
 * Create a route group
 */
export function group(basePath: string): RouteGroup {
  return new RouteGroup(basePath);
}