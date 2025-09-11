import { z } from 'zod';
import { ApiRoute } from '../gateway/api-gateway';

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
    contact?: {
      name?: string;
      email?: string;
      url?: string;
    };
    license?: {
      name: string;
      url?: string;
    };
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, any>;
  components?: {
    schemas?: Record<string, any>;
    securitySchemes?: Record<string, any>;
    parameters?: Record<string, any>;
    responses?: Record<string, any>;
  };
  security?: Array<Record<string, any>>;
  tags?: Array<{
    name: string;
    description?: string;
  }>;
}

export class OpenAPIGenerator {
  private spec: OpenAPISpec;
  private schemas: Map<string, any> = new Map();

  constructor(info: OpenAPISpec['info'], options: {
    servers?: OpenAPISpec['servers'];
    security?: OpenAPISpec['security'];
    tags?: OpenAPISpec['tags'];
  } = {}) {
    this.spec = {
      openapi: '3.0.0',
      info,
      servers: options.servers || [
        { url: 'http://localhost:3000/api', description: 'Development server' },
        { url: 'https://api.bizbox.com', description: 'Production server' },
      ],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          apiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
          },
          tenantId: {
            type: 'apiKey',
            in: 'header',
            name: 'X-Tenant-ID',
          },
        },
        parameters: {
          tenantId: {
            name: 'X-Tenant-ID',
            in: 'header',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Tenant identifier',
          },
          page: {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Page number for pagination',
          },
          limit: {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
            description: 'Number of items per page',
          },
        },
        responses: {
          Error: {
            description: 'Error response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: {
                      type: 'object',
                      properties: {
                        code: { type: 'string' },
                        message: { type: 'string' },
                        details: { type: 'object' },
                        timestamp: { type: 'string', format: 'date-time' },
                      },
                      required: ['code', 'message', 'timestamp'],
                    },
                  },
                  required: ['error'],
                },
              },
            },
          },
          Success: {
            description: 'Success response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'object' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                  required: ['success', 'data', 'timestamp'],
                },
              },
            },
          },
          PaginatedResponse: {
            description: 'Paginated response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { type: 'object' } },
                    pagination: {
                      type: 'object',
                      properties: {
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        total: { type: 'integer' },
                        totalPages: { type: 'integer' },
                      },
                      required: ['page', 'limit', 'total', 'totalPages'],
                    },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                  required: ['success', 'data', 'pagination', 'timestamp'],
                },
              },
            },
          },
        },
      },
      security: options.security,
      tags: options.tags || [
        { name: 'Authentication', description: 'Authentication endpoints' },
        { name: 'Users', description: 'User management' },
        { name: 'Tenants', description: 'Tenant management' },
        { name: 'Plugins', description: 'Plugin endpoints' },
      ],
    };
  }

  /**
   * Add routes to the OpenAPI specification
   */
  addRoutes(routes: ApiRoute[]): void {
    routes.forEach(route => this.addRoute(route));
  }

  /**
   * Add a single route to the OpenAPI specification
   */
  addRoute(route: ApiRoute): void {
    const path = this.normalizePath(route.path);
    const method = route.method.toLowerCase();

    if (!this.spec.paths[path]) {
      this.spec.paths[path] = {};
    }

    this.spec.paths[path][method] = {
      summary: route.documentation?.summary || `${route.method} ${route.path}`,
      description: route.documentation?.description,
      tags: route.documentation?.tags || ['API'],
      operationId: this.generateOperationId(route.method, route.path),
      parameters: this.generateParameters(route),
      requestBody: this.generateRequestBody(route),
      responses: this.generateResponses(route),
      security: this.generateSecurity(route),
    };

    // Add schemas from validation
    this.extractSchemas(route);
  }

  /**
   * Generate the complete OpenAPI specification
   */
  generate(): OpenAPISpec {
    // Add collected schemas to components
    this.spec.components!.schemas = {
      ...this.spec.components!.schemas,
      ...Object.fromEntries(this.schemas),
    };

    return this.spec;
  }

  /**
   * Generate OpenAPI specification as JSON string
   */
  generateJSON(): string {
    return JSON.stringify(this.generate(), null, 2);
  }

  /**
   * Generate OpenAPI specification as YAML string
   */
  generateYAML(): string {
    // Simple YAML generation - in production, use a proper YAML library
    const spec = this.generate();
    return this.objectToYAML(spec);
  }

  private normalizePath(path: string): string {
    // Convert Express-style params to OpenAPI format
    return path.replace(/:([^/]+)/g, '{$1}');
  }

  private generateOperationId(method: string, path: string): string {
    const pathParts = path.split('/').filter(Boolean);
    const resource = pathParts[pathParts.length - 1] || 'root';
    return `${method.toLowerCase()}${this.capitalize(resource)}`;
  }

  private generateParameters(route: ApiRoute): any[] {
    const parameters: any[] = [];

    // Add path parameters
    const pathParams = route.path.match(/:([^/]+)/g);
    if (pathParams) {
      pathParams.forEach(param => {
        const paramName = param.substring(1);
        parameters.push({
          name: paramName,
          in: 'path',
          required: true,
          schema: { type: 'string' },
        });
      });
    }

    // Add query parameters from validation schema
    if (route.validation?.query) {
      const querySchema = this.zodToOpenAPI(route.validation.query);
      if (querySchema.type === 'object' && querySchema.properties) {
        Object.entries(querySchema.properties).forEach(([name, schema]) => {
          parameters.push({
            name,
            in: 'query',
            required: querySchema.required?.includes(name) || false,
            schema,
          });
        });
      }
    }

    // Add tenant ID parameter if auth is required
    if (route.auth?.required) {
      parameters.push({ $ref: '#/components/parameters/tenantId' });
    }

    return parameters;
  }

  private generateRequestBody(route: ApiRoute): any {
    if (!route.validation?.body || route.method === 'GET') {
      return undefined;
    }

    const schema = this.zodToOpenAPI(route.validation.body);
    const schemaName = this.addSchema(`${this.generateOperationId(route.method, route.path)}Request`, schema);

    return {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: `#/components/schemas/${schemaName}` },
        },
      },
    };
  }

  private generateResponses(route: ApiRoute): any {
    const responses: any = {};

    // Add documented responses
    if (route.documentation?.responses) {
      Object.entries(route.documentation.responses).forEach(([status, response]) => {
        responses[status] = {
          description: response.description,
          content: response.schema ? {
            'application/json': {
              schema: this.zodToOpenAPI(response.schema),
            },
          } : undefined,
        };
      });
    }

    // Add default responses
    if (!responses['200']) {
      responses['200'] = { $ref: '#/components/responses/Success' };
    }

    responses['400'] = { $ref: '#/components/responses/Error' };
    responses['401'] = { $ref: '#/components/responses/Error' };
    responses['403'] = { $ref: '#/components/responses/Error' };
    responses['404'] = { $ref: '#/components/responses/Error' };
    responses['500'] = { $ref: '#/components/responses/Error' };

    return responses;
  }

  private generateSecurity(route: ApiRoute): any[] {
    if (!route.auth?.required) {
      return [];
    }

    return [
      { bearerAuth: [] },
      { tenantId: [] },
    ];
  }

  private extractSchemas(route: ApiRoute): void {
    if (route.validation?.body) {
      const schema = this.zodToOpenAPI(route.validation.body);
      const schemaName = `${this.generateOperationId(route.method, route.path)}Request`;
      this.addSchema(schemaName, schema);
    }

    if (route.documentation?.responses) {
      Object.entries(route.documentation.responses).forEach(([status, response]) => {
        if (response.schema) {
          const schema = this.zodToOpenAPI(response.schema);
          const schemaName = `${this.generateOperationId(route.method, route.path)}Response${status}`;
          this.addSchema(schemaName, schema);
        }
      });
    }
  }

  private addSchema(name: string, schema: any): string {
    this.schemas.set(name, schema);
    return name;
  }

  private zodToOpenAPI(zodSchema: z.ZodSchema): any {
    // Simplified Zod to OpenAPI conversion
    // In production, use a proper library like zod-to-openapi
    
    if (zodSchema instanceof z.ZodString) {
      return { type: 'string' };
    }
    
    if (zodSchema instanceof z.ZodNumber) {
      return { type: 'number' };
    }
    
    if (zodSchema instanceof z.ZodBoolean) {
      return { type: 'boolean' };
    }
    
    if (zodSchema instanceof z.ZodArray) {
      return {
        type: 'array',
        items: this.zodToOpenAPI(zodSchema.element),
      };
    }
    
    if (zodSchema instanceof z.ZodObject) {
      const properties: any = {};
      const required: string[] = [];
      
      Object.entries(zodSchema.shape).forEach(([key, value]) => {
        properties[key] = this.zodToOpenAPI(value as z.ZodSchema);
        if (!(value as any).isOptional()) {
          required.push(key);
        }
      });
      
      return {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined,
      };
    }
    
    return { type: 'object' };
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private objectToYAML(obj: any, indent = 0): string {
    const spaces = '  '.repeat(indent);
    let yaml = '';

    if (Array.isArray(obj)) {
      obj.forEach(item => {
        yaml += `${spaces}- ${this.objectToYAML(item, indent + 1)}\n`;
      });
    } else if (typeof obj === 'object' && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          yaml += `${spaces}${key}:\n${this.objectToYAML(value, indent + 1)}`;
        } else {
          yaml += `${spaces}${key}: ${value}\n`;
        }
      });
    } else {
      return String(obj);
    }

    return yaml;
  }
}

export function generateOpenAPISpec(
  routes: ApiRoute[],
  info: OpenAPISpec['info'],
  options?: {
    servers?: OpenAPISpec['servers'];
    security?: OpenAPISpec['security'];
    tags?: OpenAPISpec['tags'];
  }
): OpenAPISpec {
  const generator = new OpenAPIGenerator(info, options);
  generator.addRoutes(routes);
  return generator.generate();
}