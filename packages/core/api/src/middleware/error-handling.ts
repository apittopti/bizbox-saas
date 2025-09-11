import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

export interface ErrorDetails {
  code: string;
  message: string;
  statusCode?: number;
  details?: any;
  stack?: string;
  timestamp?: string;
  requestId?: string;
  userId?: string;
  tenantId?: string;
  path?: string;
  method?: string;
}

export interface ErrorHandlerOptions {
  enableStackTrace?: boolean;
  enableRequestLogging?: boolean;
  customErrorCodes?: Record<string, number>;
  logger?: (error: ErrorDetails) => void | Promise<void>;
  onError?: (error: Error, req: NextApiRequest, res: NextApiResponse) => void | Promise<void>;
  enableMetrics?: boolean;
  enableAlerts?: boolean;
  alertThreshold?: number;
}

export interface ErrorMiddleware {
  (req: NextApiRequest, res: NextApiResponse, next: () => void): Promise<void> | void;
}

export class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode: number = 500, code?: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || this.getDefaultErrorCode(statusCode);
    this.details = details;
    this.name = 'ApiError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  private getDefaultErrorCode(statusCode: number): string {
    const codeMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      405: 'METHOD_NOT_ALLOWED',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT',
    };
    
    return codeMap[statusCode] || 'UNKNOWN_ERROR';
  }

  toJSON(): ErrorDetails {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Centralized error handling middleware
 */
export function createErrorHandlingMiddleware(options: ErrorHandlerOptions = {}): ErrorMiddleware {
  const {
    enableStackTrace = process.env.NODE_ENV === 'development',
    enableRequestLogging = true,
    customErrorCodes = {},
    logger = defaultErrorLogger,
    onError,
    enableMetrics = true,
    enableAlerts = true,
    alertThreshold = 10,
  } = options;

  const errorMetrics = {
    totalErrors: 0,
    errorsByCode: new Map<string, number>(),
    errorsByStatus: new Map<number, number>(),
    recentErrors: [] as Array<{ timestamp: number; error: ErrorDetails }>,
  };

  return async (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    const originalSend = res.send;
    const originalJson = res.json;
    
    // Wrap response methods to catch errors
    res.send = function(body: any) {
      if (res.statusCode >= 400) {
        handleResponseError(body, res.statusCode);
      }
      return originalSend.call(this, body);
    };

    res.json = function(obj: any) {
      if (res.statusCode >= 400) {
        handleResponseError(obj, res.statusCode);
      }
      return originalJson.call(this, obj);
    };

    // Error handler function
    const handleError = async (error: Error) => {
      try {
        const errorDetails = await processError(error, req, res);
        
        // Log error
        if (logger && enableRequestLogging) {
          await logger(errorDetails);
        }

        // Update metrics
        if (enableMetrics) {
          updateErrorMetrics(errorDetails);
        }

        // Check for alert threshold
        if (enableAlerts && shouldTriggerAlert()) {
          await triggerErrorAlert(errorDetails, errorMetrics);
        }

        // Call custom error handler
        if (onError) {
          await onError(error, req, res);
        }

        // Send error response if not already sent
        if (!res.headersSent) {
          sendErrorResponse(res, errorDetails, enableStackTrace);
        }
      } catch (handlingError) {
        console.error('Error in error handling middleware:', handlingError);
        
        // Fallback error response
        if (!res.headersSent) {
          res.status(500).json({
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              message: 'An unexpected error occurred',
              timestamp: new Date().toISOString(),
            },
          });
        }
      }
    };

    const handleResponseError = (body: any, statusCode: number) => {
      if (body && typeof body === 'object' && body.error) {
        const errorDetails: ErrorDetails = {
          ...body.error,
          statusCode,
          timestamp: body.error.timestamp || new Date().toISOString(),
          requestId: generateRequestId(),
          userId: (req as any).user?.id,
          tenantId: (req as any).user?.tenantId || req.headers['x-tenant-id'] as string,
          path: req.url,
          method: req.method,
        };

        if (enableMetrics) {
          updateErrorMetrics(errorDetails);
        }

        if (logger && enableRequestLogging) {
          logger(errorDetails);
        }
      }
    };

    const updateErrorMetrics = (errorDetails: ErrorDetails) => {
      errorMetrics.totalErrors++;
      
      if (errorDetails.code) {
        const count = errorMetrics.errorsByCode.get(errorDetails.code) || 0;
        errorMetrics.errorsByCode.set(errorDetails.code, count + 1);
      }
      
      if (errorDetails.statusCode) {
        const count = errorMetrics.errorsByStatus.get(errorDetails.statusCode) || 0;
        errorMetrics.errorsByStatus.set(errorDetails.statusCode, count + 1);
      }

      // Keep only recent errors (last 100)
      errorMetrics.recentErrors.push({
        timestamp: Date.now(),
        error: errorDetails,
      });

      if (errorMetrics.recentErrors.length > 100) {
        errorMetrics.recentErrors.shift();
      }
    };

    const shouldTriggerAlert = (): boolean => {
      const recentErrorCount = errorMetrics.recentErrors.filter(
        e => Date.now() - e.timestamp < 5 * 60 * 1000 // Last 5 minutes
      ).length;
      
      return recentErrorCount >= alertThreshold;
    };

    const processError = async (error: Error, req: NextApiRequest, res: NextApiResponse): Promise<ErrorDetails> => {
      let errorDetails: ErrorDetails;

      if (error instanceof ApiError) {
        errorDetails = {
          ...error.toJSON(),
          requestId: generateRequestId(),
          userId: (req as any).user?.id,
          tenantId: (req as any).user?.tenantId || req.headers['x-tenant-id'] as string,
          path: req.url,
          method: req.method,
        };
      } else if (error instanceof z.ZodError) {
        errorDetails = {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          statusCode: 400,
          details: {
            errors: error.errors.map(err => ({
              path: err.path.join('.'),
              message: err.message,
              code: err.code,
            })),
          },
          timestamp: new Date().toISOString(),
          requestId: generateRequestId(),
          userId: (req as any).user?.id,
          tenantId: (req as any).user?.tenantId || req.headers['x-tenant-id'] as string,
          path: req.url,
          method: req.method,
        };
      } else {
        // Generic error handling
        const statusCode = getErrorStatusCode(error);
        const code = getErrorCode(error, statusCode, customErrorCodes);
        
        errorDetails = {
          code,
          message: error.message || 'An unexpected error occurred',
          statusCode,
          timestamp: new Date().toISOString(),
          requestId: generateRequestId(),
          userId: (req as any).user?.id,
          tenantId: (req as any).user?.tenantId || req.headers['x-tenant-id'] as string,
          path: req.url,
          method: req.method,
        };
      }

      // Add stack trace in development
      if (enableStackTrace) {
        errorDetails.stack = error.stack;
      }

      return errorDetails;
    };

    // Setup error handling for the request
    try {
      // Wrap next() to catch sync errors
      const wrappedNext = () => {
        try {
          next();
        } catch (error) {
          handleError(error as Error);
        }
      };

      // Handle async errors
      process.on('unhandledRejection', (reason: any) => {
        if (reason instanceof Error) {
          handleError(reason);
        } else {
          handleError(new Error(String(reason)));
        }
      });

      wrappedNext();
    } catch (error) {
      await handleError(error as Error);
    }
  };
}

/**
 * Pre-built error handling middleware
 */
export const errorMiddleware = {
  // Development error handler with stack traces
  development: createErrorHandlingMiddleware({
    enableStackTrace: true,
    enableRequestLogging: true,
    enableMetrics: true,
  }),

  // Production error handler without stack traces
  production: createErrorHandlingMiddleware({
    enableStackTrace: false,
    enableRequestLogging: true,
    enableMetrics: true,
    enableAlerts: true,
  }),

  // Silent error handler for testing
  silent: createErrorHandlingMiddleware({
    enableStackTrace: false,
    enableRequestLogging: false,
    enableMetrics: false,
    logger: () => {}, // No-op logger
  }),

  // Custom error handler
  custom: (options: ErrorHandlerOptions) => createErrorHandlingMiddleware(options),
};

/**
 * Pre-defined API error classes
 */
export class BadRequestError extends ApiError {
  constructor(message: string = 'Bad Request', details?: any) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized', details?: any) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden', details?: any) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Not Found', details?: any) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = 'Conflict', details?: any) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class ValidationError extends ApiError {
  constructor(message: string = 'Validation Failed', details?: any) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

export class TooManyRequestsError extends ApiError {
  constructor(message: string = 'Too Many Requests', retryAfter?: number) {
    super(message, 429, 'TOO_MANY_REQUESTS', { retryAfter });
  }
}

export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal Server Error', details?: any) {
    super(message, 500, 'INTERNAL_SERVER_ERROR', details);
  }
}

/**
 * Error utility functions
 */
export function createErrorResponse(error: ErrorDetails): Record<string, any> {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(error.details && { details: error.details }),
      timestamp: error.timestamp,
      requestId: error.requestId,
    },
  };
}

export function isApiError(error: any): error is ApiError {
  return error instanceof ApiError;
}

export function wrapAsyncHandler<T extends any[], R>(
  handler: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new InternalServerError('Async handler error', { originalError: error });
    }
  };
}

export function createErrorHandler(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error('Route handler error:', error);
      
      if (error instanceof ApiError) {
        res.status(error.statusCode).json(createErrorResponse(error.toJSON()));
      } else if (error instanceof z.ZodError) {
        res.status(400).json(createErrorResponse({
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: { errors: error.errors },
          timestamp: new Date().toISOString(),
        }));
      } else {
        res.status(500).json(createErrorResponse({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
        }));
      }
    }
  };
}

// Helper functions
function getErrorStatusCode(error: any): number {
  if (error.statusCode) return error.statusCode;
  if (error.status) return error.status;
  if (error.code === 'ENOTFOUND') return 404;
  if (error.code === 'ECONNREFUSED') return 503;
  if (error.code === 'ETIMEDOUT') return 504;
  return 500;
}

function getErrorCode(error: any, statusCode: number, customCodes: Record<string, number>): string {
  if (error.code && typeof error.code === 'string') return error.code;
  
  // Check custom error codes
  for (const [code, status] of Object.entries(customCodes)) {
    if (status === statusCode) return code;
  }
  
  const defaultCodes: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    405: 'METHOD_NOT_ALLOWED',
    409: 'CONFLICT',
    422: 'UNPROCESSABLE_ENTITY',
    429: 'TOO_MANY_REQUESTS',
    500: 'INTERNAL_SERVER_ERROR',
    502: 'BAD_GATEWAY',
    503: 'SERVICE_UNAVAILABLE',
    504: 'GATEWAY_TIMEOUT',
  };
  
  return defaultCodes[statusCode] || 'UNKNOWN_ERROR';
}

function generateRequestId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function sendErrorResponse(res: NextApiResponse, error: ErrorDetails, includeStack: boolean): void {
  const response = createErrorResponse(error);
  
  if (includeStack && error.stack) {
    response.error.stack = error.stack;
  }
  
  res.status(error.statusCode || 500).json(response);
}

async function defaultErrorLogger(error: ErrorDetails): Promise<void> {
  console.error('API Error:', {
    code: error.code,
    message: error.message,
    statusCode: error.statusCode,
    requestId: error.requestId,
    userId: error.userId,
    tenantId: error.tenantId,
    path: error.path,
    method: error.method,
    timestamp: error.timestamp,
    details: error.details,
  });
}

async function triggerErrorAlert(error: ErrorDetails, metrics: any): Promise<void> {
  console.warn('Error alert triggered:', {
    recentErrorCount: metrics.recentErrors.length,
    totalErrors: metrics.totalErrors,
    latestError: error,
  });
  
  // In a real implementation, this would send alerts via:
  // - Email
  // - Slack
  // - PagerDuty
  // - Custom webhook
}

/**
 * Error boundary for React-like error catching in API routes
 */
export function withErrorBoundary<T extends any[]>(
  handler: (...args: T) => Promise<void> | void,
  fallback?: (...args: T) => Promise<void> | void
) {
  return async (...args: T) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (fallback) {
        return await fallback(...args);
      }
      throw error;
    }
  };
}

/**
 * Middleware to add request context for better error reporting
 */
export function createRequestContextMiddleware(): ErrorMiddleware {
  return (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    // Add request ID
    const requestId = generateRequestId();
    (req as any).requestId = requestId;
    res.setHeader('X-Request-ID', requestId);

    // Add request start time for performance monitoring
    (req as any).startTime = Date.now();

    // Add user context if available
    const user = (req as any).user;
    if (user) {
      (req as any).userContext = {
        id: user.id,
        tenantId: user.tenantId,
        role: user.role,
      };
    }

    next();
  };
}

export const requestContextMiddleware = createRequestContextMiddleware();

export default createErrorHandlingMiddleware;