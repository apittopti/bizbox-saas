// Validation middleware exports
export {
  createValidationMiddleware,
  commonSchemas,
  validationMiddleware,
  composeValidation,
  ValidationSchemaBuilder,
  createValidationBuilder,
  validateRequest,
  isRequestValidated,
  getValidationMetadata,
} from './validation';

export type {
  ValidationSchema,
  ValidationOptions,
  ValidationMiddleware,
  ValidatedRequest,
} from './validation';

// Authentication middleware exports
export {
  createAuthMiddleware,
  authMiddleware,
  permissionMiddleware,
  createTenantMiddleware,
  tenantMiddleware,
  isAuthenticated,
  getAuthUser,
  getAuthTenant,
  hasRole,
  hasAnyRole,
  hasPermission,
} from './auth';

export type {
  AuthOptions,
  AuthMiddleware,
  AuthenticatedRequest,
} from './auth';

// Rate limiting middleware exports
export {
  createRateLimitMiddleware,
  rateLimitMiddleware,
  RedisRateLimitStore,
  MemoryRateLimitStore,
  AdaptiveRateLimiter,
  createAdaptiveRateLimiter,
  RateLimitCircuitBreaker,
  DistributedRateLimiter,
  createRedisStore,
} from './rate-limiting';

export type {
  RateLimitOptions,
  RateLimitStore,
  RateLimitInfo,
  RateLimitMiddleware,
} from './rate-limiting';

// Plugin routing middleware exports
export {
  PluginRoutingSystem,
  createPluginRoutingMiddleware,
  PluginRouteBuilder,
  createRouteBuilder,
  getPluginRoutingSystem,
  createPluginRoutingSystem,
} from './plugin-routing';

export type {
  PluginRoute,
  RouteCondition,
  PluginRouteRegistry,
  RouteMatch,
  PluginRoutingOptions,
} from './plugin-routing';

// Error handling middleware exports
export {
  createErrorHandlingMiddleware,
  errorMiddleware,
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  TooManyRequestsError,
  InternalServerError,
  createErrorResponse,
  isApiError,
  wrapAsyncHandler,
  createErrorHandler,
  withErrorBoundary,
  createRequestContextMiddleware,
  requestContextMiddleware,
} from './error-handling';

export type {
  ErrorDetails,
  ErrorHandlerOptions,
  ErrorMiddleware,
} from './error-handling';

// Additional utility exports
export {
  createCorsMiddleware,
  createLoggingMiddleware,
  createCompressionMiddleware,
  createSecurityMiddleware,
} from './utilities';

export type {
  CorsOptions,
  LoggingOptions,
  CompressionOptions,
  SecurityOptions,
} from './utilities';