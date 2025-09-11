import { z } from 'zod';
import { ApiRoute } from '../gateway/api-gateway';

export interface OpenAPIInfo {
  title: string;
  version: string;
  description?: string;
  termsOfService?: string;
  contact?: {
    name?: string;
    url?: string;
    email?: string;
  };
  license?: {
    name: string;
    url?: string;
  };
}

export interface OpenAPIServer {
  url: string;
  description?: string;
  variables?: Record<string, {
    enum?: string[];
    default: string;
    description?: string;
  }>;
}

export interface OpenAPITag {
  name: string;
  description?: string;
  externalDocs?: {
    description?: string;
    url: string;
  };
}

export interface OpenAPISpec {
  openapi: string;
  info: OpenAPIInfo;
  servers?: OpenAPIServer[];
  tags?: OpenAPITag[];
  paths: Record<string, any>;
  components?: {
    schemas?: Record<string, any>;
    responses?: Record<string, any>;
    parameters?: Record<string, any>;
    examples?: Record<string, any>;
    requestBodies?: Record<string, any>;
    headers?: Record<string, any>;
    securitySchemes?: Record<string, any>;
    links?: Record<string, any>;
    callbacks?: Record<string, any>;
  };
  security?: Record<string, any>[];
  externalDocs?: {
    description?: string;
    url: string;
  };
}

export class OpenAPIGenerator {
  private spec: OpenAPISpec;

  constructor(info: OpenAPIInfo) {
    this.spec = {
      openapi: '3.0.3',
      info,
      paths: {},
      components: {
        schemas: {},
        responses: {},
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          tenantHeader: {
            type: 'apiKey',
            in: 'header',
            name: 'X-Tenant-ID',
          },
        },
      },
      security: [
        { bearerAuth: [] },
        { tenantHeader: [] },
      ],
    };
  }

  addServer(server: OpenAPIServer): this {
    if (!this.spec.servers) {
      this.spec.servers = [];
    }
    this.spec.servers.push(server);
    return this;
  }

  addTag(tag: OpenAPITag): this {
    if (!this.spec.tags) {
      this.spec.tags = [];
    }
    this.spec.tags.push(tag);
    return this;
  }

  addRoute(route: ApiRoute): this {
    const path = this.normalizePath(route.path);
    const method = route.method.toLowerCase();

    if (!this.spec.paths[path]) {
      this.spec.paths[path] = {};
    }

    this.spec.paths[path][method] = this.generatePathItem(route);
    
    // Add schemas from validation
    if (route.validation) {
      this.addSchemasFromValidation(route.validation);
    }

    return this;
  }

  addRoutes(routes: ApiRoute[]): this {
    routes.forEach(route => this.addRoute(route));
    return this;
  }

  addSchema(name: string, schema: any): this {
    if (!this.spec.components) {
      this.spec.components = {};
    }
    if (!this.spec.components.schemas) {
      this.spec.components.schemas = {};
    }
    this.spec.components.schemas[name] = schema;
    return this;
  }

  addResponse(name: string, response: any): this {
    if (!this.spec.components) {
      this.spec.components = {};
    }
    if (!this.spec.components.responses) {
      this.spec.components.responses = {};
    }
    this.spec.components.responses[name] = response;
    return this;
  }

  generate(): OpenAPISpec {
    return JSON.parse(JSON.stringify(this.spec));
  }

  generateYaml(): string {
    // Simple YAML generation - in production, use a proper YAML library
    return this.objectToYaml(this.spec);
  }

  private generatePathItem(route: ApiRoute): any {
    const pathItem: any = {
      summary: route.documentation?.summary || `${route.method} ${route.path}`,
      description: route.documentation?.description,
      tags: route.documentation?.tags || ['API'],
      operationId: this.generateOperationId(route),
    };

    // Add security requirements
    if (route.auth?.required) {
      pathItem.security = [{ bearerAuth: [] }, { tenantHeader: [] }];
    } else {
      pathItem.security = [];
    }

    // Add parameters
    const parameters = this.generateParameters(route);
    if (parameters.length > 0) {
      pathItem.parameters = parameters;
    }

    // Add request body
    const requestBody = this.generateRequestBody(route);
    if (requestBody) {
      pathItem.requestBody = requestBody;
    }

    // Add responses
    pathItem.responses = this.generateResponses(route);

    return pathItem;
  }

  private generateParameters(route: ApiRoute): any[] {
    const parameters: any[] = [];

    // Path parameters
    const pathParams = this.extractPathParameters(route.path);
    pathParams.forEach(param => {
      parameters.push({
        name: param,
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: `${param} parameter`,
      });
    });

    // Query parameters from validation
    if (route.validation?.query) {
      const querySchema = this.zodToOpenAPI(route.validation.query);
      if (querySchema.type === 'object' && querySchema.properties) {
        Object.entries(querySchema.properties).forEach(([name, schema]: [string, any]) => {
          parameters.push({
            name,
            in: 'query',
            required: querySchema.required?.includes(name) || false,
            schema,
            description: schema.description || `${name} query parameter`,
          });
        });
      }
    }

    return parameters;
  }

  private generateRequestBody(route: ApiRoute): any | null {
    if (!route.validation?.body || !['POST', 'PUT', 'PATCH'].includes(route.method)) {
      return null;
    }

    const schema = this.zodToOpenAPI(route.validation.body);
    
    return {
      required: true,
      content: {
        'application/json': {
          schema,
        },
      },
    };
  }

  private generateResponses(route: ApiRoute): any {
    const responses: any = {};

    // Default success response
    responses['200'] = {
      description: 'Success',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
        },
      },
    };

    // Error responses
    responses['400'] = {
      description: 'Bad Request',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
        },
      },
    };

    responses['401'] = {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
        },
      },
    };

    responses['403'] = {
      description: 'Forbidden',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
        },
      },
    };

    responses['429'] = {
      description: 'Too Many Requests',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
        },
      },
    };

    responses['500'] = {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
        },
      },
    };

    // Add custom responses from route documentation
    if (route.documentation?.responses) {
      Object.entries(route.documentation.responses).forEach(([code, response]) => {
        responses[code] = {
          description: response.description,
          content: {
            'application/json': {
              schema: response.schema ? this.zodToOpenAPI(response.schema) : { type: 'object' },
            },
          },
        };
      });
    }

    return responses;
  }

  private addSchemasFromValidation(validation: ApiRoute['validation']): void {
    // Add common error response schema
    this.addSchema('ErrorResponse', {
      type: 'object',
      required: ['error'],
      properties: {
        error: {
          type: 'object',
          required: ['code', 'message'],
          properties: {
            code: { type: 'string' },
            message: { type: 'string' },
            details: { type: 'object' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    });
  }

  private zodToOpenAPI(zodSchema: z.ZodSchema): any {
    // This is a simplified Zod to OpenAPI converter
    // In production, use a library like zod-to-openapi
    
    if (zodSchema instanceof z.ZodObject) {
      const shape = zodSchema.shape;
      const properties: any = {};
      const required: string[] = [];

      Object.entries(shape).forEach(([key, value]: [string, any]) => {
        properties[key] = this.zodToOpenAPI(value);
        if (!(value instanceof z.ZodOptional)) {
          required.push(key);
        }
      });

      return {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined,
      };
    }

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

    if (zodSchema instanceof z.ZodOptional) {
      return this.zodToOpenAPI(zodSchema.unwrap());
    }

    if (zodSchema instanceof z.ZodEnum) {
      return {
        type: 'string',
        enum: zodSchema.options,
      };
    }

    // Default fallback
    return { type: 'object' };
  }

  private normalizePath(path: string): string {
    // Convert Express-style params to OpenAPI format
    return path.replace(/:([^/]+)/g, '{$1}');
  }

  private extractPathParameters(path: string): string[] {
    const matches = path.match(/:([^/]+)/g);
    return matches ? matches.map(match => match.substring(1)) : [];
  }

  private generateOperationId(route: ApiRoute): string {
    const pathParts = route.path.split('/').filter(Boolean);
    const pathString = pathParts
      .map(part => part.startsWith(':') ? part.substring(1) : part)
      .join('_');
    return `${route.method.toLowerCase()}_${pathString}`.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  private objectToYaml(obj: any, indent = 0): string {
    const spaces = '  '.repeat(indent);
    let yaml = '';

    if (Array.isArray(obj)) {
      obj.forEach(item => {
        yaml += `${spaces}- ${this.valueToYaml(item, indent + 1)}\n`;
      });
    } else if (typeof obj === 'object' && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        yaml += `${spaces}${key}: ${this.valueToYaml(value, indent + 1)}\n`;
      });
    } else {
      yaml = this.valueToYaml(obj, indent);
    }

    return yaml;
  }

  private valueToYaml(value: any, indent: number): string {
    if (typeof value === 'string') {
      return `"${value}"`;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    } else if (value === null) {
      return 'null';
    } else if (Array.isArray(value) || typeof value === 'object') {
      return '\n' + this.objectToYaml(value, indent);
    }
    return String(value);
  }
}

// Predefined OpenAPI configurations
export const bizboxAPIInfo: OpenAPIInfo = {
  title: 'BizBox Multi-Tenant Platform API',
  version: '1.0.0',
  description: 'Comprehensive SaaS platform API for UK service-based businesses',
  contact: {
    name: 'BizBox Support',
    email: 'support@bizbox.co.uk',
  },
  license: {
    name: 'Private License',
  },
};

export const commonTags: OpenAPITag[] = [
  {
    name: 'Authentication',
    description: 'User authentication and authorization endpoints',
  },
  {
    name: 'Tenants',
    description: 'Tenant management operations',
  },
  {
    name: 'Users',
    description: 'User management operations',
  },
  {
    name: 'Bookings',
    description: 'Booking management and scheduling',
  },
  {
    name: 'Services',
    description: 'Service catalog management',
  },
  {
    name: 'Staff',
    description: 'Staff and resource management',
  },
  {
    name: 'Payments',
    description: 'Payment processing and management',
  },
  {
    name: 'E-commerce',
    description: 'Product catalog and shopping cart',
  },
  {
    name: 'Website Builder',
    description: 'Website building and publishing',
  },
  {
    name: 'Media',
    description: 'Media file management',
  },
  {
    name: 'Analytics',
    description: 'Business analytics and reporting',
  },
];

export function createBizBoxAPISpec(): OpenAPIGenerator {
  return new OpenAPIGenerator(bizboxAPIInfo)
    .addServer({
      url: 'https://api.bizbox.co.uk/v1',
      description: 'Production server',
    })
    .addServer({
      url: 'https://staging-api.bizbox.co.uk/v1',
      description: 'Staging server',
    })
    .addServer({
      url: 'http://localhost:3000/api',
      description: 'Development server',
    });
}