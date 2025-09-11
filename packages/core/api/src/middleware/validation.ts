import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

export interface ValidationSchema {
  query?: z.ZodSchema;
  body?: z.ZodSchema;
  params?: z.ZodSchema;
  headers?: z.ZodSchema;
}

export interface ValidationOptions {
  onError?: (error: z.ZodError, req: NextApiRequest, res: NextApiResponse) => void;
  sanitize?: boolean;
  strict?: boolean;
}

export interface ValidationMiddleware {
  (req: NextApiRequest, res: NextApiResponse, next: () => void): Promise<void> | void;
}

/**
 * Creates validation middleware with comprehensive Zod schema validation
 */
export function createValidationMiddleware(
  schema: ValidationSchema,
  options: ValidationOptions = {}
): ValidationMiddleware {
  return async (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    const { onError, sanitize = true, strict = false } = options;
    const errors: Record<string, z.ZodError> = {};

    try {
      // Validate headers
      if (schema.headers) {
        try {
          const headersResult = schema.headers.parse(req.headers);
          if (sanitize) {
            req.headers = headersResult;
          }
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.headers = error;
          }
        }
      }

      // Validate query parameters
      if (schema.query) {
        try {
          const queryResult = schema.query.parse(req.query);
          if (sanitize) {
            req.query = queryResult;
          }
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.query = error;
          }
        }
      }

      // Validate body
      if (schema.body && req.method && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
        try {
          const bodyResult = schema.body.parse(req.body);
          if (sanitize) {
            req.body = bodyResult;
          }
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.body = error;
          }
        }
      }

      // Validate URL parameters
      if (schema.params) {
        try {
          const params = extractParamsFromUrl(req.url || '', getRoutePattern(req));
          const paramsResult = schema.params.parse(params);
          if (sanitize) {
            (req as any).params = paramsResult;
          }
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.params = error;
          }
        }
      }

      // Handle validation errors
      if (Object.keys(errors).length > 0) {
        const validationError = createValidationError(errors);
        
        if (onError) {
          return onError(validationError, req, res);
        }

        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: formatValidationErrors(errors),
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Add validation metadata to request
      (req as any).__validation = {
        validated: true,
        schemas: Object.keys(schema),
        timestamp: new Date().toISOString(),
      };

      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      
      if (strict) {
        return res.status(500).json({
          error: {
            code: 'VALIDATION_MIDDLEWARE_ERROR',
            message: 'Validation middleware failed',
            timestamp: new Date().toISOString(),
          },
        });
      }

      // In non-strict mode, continue without validation
      next();
    }
  };
}

/**
 * Common validation schemas for reuse
 */
export const commonSchemas = {
  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).optional(),
  }),

  // Sorting
  sorting: z.object({
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  }),

  // Multi-tenant headers
  tenantHeaders: z.object({
    'x-tenant-id': z.string().uuid('Invalid tenant ID format'),
    'authorization': z.string().min(1, 'Authorization header required').optional(),
    'content-type': z.string().optional(),
    'user-agent': z.string().optional(),
  }),

  // API versioning
  apiVersion: z.object({
    'x-api-version': z.enum(['v1', 'v2']).default('v1'),
  }),

  // Common ID parameter
  idParam: z.object({
    id: z.string().uuid('Invalid ID format'),
  }),

  // Search query
  search: z.object({
    q: z.string().min(1, 'Search query cannot be empty').optional(),
    fields: z.array(z.string()).optional(),
  }),

  // Date range
  dateRange: z.object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  }).refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.startDate <= data.endDate;
      }
      return true;
    },
    {
      message: 'Start date must be before end date',
      path: ['endDate'],
    }
  ),

  // File upload validation
  fileUpload: z.object({
    filename: z.string().min(1, 'Filename is required'),
    mimetype: z.string().min(1, 'MIME type is required'),
    size: z.number().int().min(1, 'File size must be greater than 0'),
  }),
};

/**
 * Pre-built validation middleware for common use cases
 */
export const validationMiddleware = {
  // Validate pagination query parameters
  pagination: createValidationMiddleware({
    query: commonSchemas.pagination,
  }),

  // Validate tenant headers
  tenantHeaders: createValidationMiddleware({
    headers: commonSchemas.tenantHeaders,
  }),

  // Validate ID parameter
  idParam: createValidationMiddleware({
    params: commonSchemas.idParam,
  }),

  // Validate API version
  apiVersion: createValidationMiddleware({
    headers: commonSchemas.apiVersion,
  }),

  // Combined pagination with sorting
  paginationWithSort: createValidationMiddleware({
    query: commonSchemas.pagination.merge(commonSchemas.sorting),
  }),

  // Search with pagination
  searchWithPagination: createValidationMiddleware({
    query: commonSchemas.search.merge(commonSchemas.pagination),
  }),
};

/**
 * Middleware composition utilities
 */
export function composeValidation(...middlewares: ValidationMiddleware[]): ValidationMiddleware {
  return async (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    let index = 0;

    const runNext = async (): Promise<void> => {
      if (index >= middlewares.length) {
        return next();
      }

      const currentMiddleware = middlewares[index++];
      await currentMiddleware(req, res, runNext);
    };

    await runNext();
  };
}

/**
 * Create a validation schema builder for complex validations
 */
export class ValidationSchemaBuilder {
  private schema: ValidationSchema = {};

  query(querySchema: z.ZodSchema): this {
    this.schema.query = querySchema;
    return this;
  }

  body(bodySchema: z.ZodSchema): this {
    this.schema.body = bodySchema;
    return this;
  }

  params(paramsSchema: z.ZodSchema): this {
    this.schema.params = paramsSchema;
    return this;
  }

  headers(headersSchema: z.ZodSchema): this {
    this.schema.headers = headersSchema;
    return this;
  }

  build(options?: ValidationOptions): ValidationMiddleware {
    return createValidationMiddleware(this.schema, options);
  }
}

/**
 * Utility function to create validation schema builder
 */
export function createValidationBuilder(): ValidationSchemaBuilder {
  return new ValidationSchemaBuilder();
}

/**
 * Advanced validation decorators for route handlers
 */
export function validateRequest(schema: ValidationSchema, options?: ValidationOptions) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (req: NextApiRequest, res: NextApiResponse) {
      const middleware = createValidationMiddleware(schema, options);
      
      return new Promise<void>((resolve, reject) => {
        middleware(req, res, () => {
          try {
            const result = method.call(this, req, res);
            if (result instanceof Promise) {
              result.then(resolve).catch(reject);
            } else {
              resolve(result);
            }
          } catch (error) {
            reject(error);
          }
        });
      });
    };
    
    return descriptor;
  };
}

// Helper functions
function extractParamsFromUrl(url: string, pattern: string): Record<string, string> {
  const urlSegments = url.split('/').filter(Boolean);
  const patternSegments = pattern.split('/').filter(Boolean);
  const params: Record<string, string> = {};

  patternSegments.forEach((segment, index) => {
    if (segment.startsWith(':')) {
      const paramName = segment.slice(1);
      params[paramName] = urlSegments[index] || '';
    }
  });

  return params;
}

function getRoutePattern(req: NextApiRequest): string {
  // This would need to be implemented based on how routes are registered
  // For now, return empty string as fallback
  return (req as any).__routePattern || '';
}

function createValidationError(errors: Record<string, z.ZodError>): z.ZodError {
  const allIssues: z.ZodIssue[] = [];
  
  Object.entries(errors).forEach(([field, error]) => {
    error.issues.forEach(issue => {
      allIssues.push({
        ...issue,
        path: [field, ...issue.path],
      });
    });
  });

  return new z.ZodError(allIssues);
}

function formatValidationErrors(errors: Record<string, z.ZodError>) {
  const formatted: Record<string, any[]> = {};
  
  Object.entries(errors).forEach(([field, error]) => {
    formatted[field] = error.issues.map(issue => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
      received: (issue as any).received,
      expected: (issue as any).expected,
    }));
  });

  return formatted;
}

/**
 * Type-safe request interface with validation metadata
 */
export interface ValidatedRequest extends NextApiRequest {
  __validation?: {
    validated: boolean;
    schemas: string[];
    timestamp: string;
  };
  params?: Record<string, string>;
}

/**
 * Utility to check if request has been validated
 */
export function isRequestValidated(req: NextApiRequest): req is ValidatedRequest {
  return !!(req as any).__validation?.validated;
}

/**
 * Get validation metadata from request
 */
export function getValidationMetadata(req: NextApiRequest) {
  return (req as any).__validation;
}