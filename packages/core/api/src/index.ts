// Core API exports
export * from './gateway/api-gateway'
export * from './routes/route-builder'
export * from './webhooks/webhook-system'
export * from './webhooks/webhook-delivery'
export * from './webhooks/webhook-routes'
export * from './documentation/openapi-generator'

// Middleware exports
export * from './middleware/validation'
export * from './middleware/auth'
export * from './middleware/rate-limiting'

// Types
export interface ApiConfig {
  port: number
  host: string
  basePath: string
  enableCors: boolean
  enableRateLimit: boolean
  enableDocumentation: boolean
}

export const defaultApiConfig: ApiConfig = {
  port: 3001,
  host: '0.0.0.0',
  basePath: '/api',
  enableCors: true,
  enableRateLimit: true,
  enableDocumentation: true,
}