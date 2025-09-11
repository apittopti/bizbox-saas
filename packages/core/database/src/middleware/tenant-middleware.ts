import { withTenantContext, TenantContext } from '../tenant-context';
import { setTenantContextOnClient } from '../tenant-context';
import { withClient } from '../connection';

export interface TenantRequest {
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, any>;
  body?: any;
  user?: { id: string; tenantId?: string };
  tenantId?: string;
  userId?: string;
  tenant?: {
    id: string;
    name: string;
    domain?: string;
    plan: string;
  };
  get(name: string): string | undefined;
}

export interface TenantResponse {
  status(code: number): TenantResponse;
  json(body: any): TenantResponse;
}

export type NextFunction = () => void;

export interface TenantMiddlewareOptions {
  required?: boolean;
  headerName?: string;
  queryParam?: string;
  extractFromDomain?: boolean;
  onTenantNotFound?: (req: TenantRequest, res: TenantResponse) => void;
}

export function createTenantMiddleware(options: TenantMiddlewareOptions = {}) {
  const {
    required = true,
    headerName = 'x-tenant-id',
    queryParam = 'tenantId',
    extractFromDomain = false,
    onTenantNotFound
  } = options;

  return async (req: TenantRequest, res: TenantResponse, next: NextFunction) => {
    try {
      let tenantId: string | undefined;

      // Try to extract tenant ID from various sources
      tenantId = req.headers[headerName] as string ||
                 req.query[queryParam] as string ||
                 req.body?.tenantId;

      // Extract from subdomain if enabled
      if (!tenantId && extractFromDomain) {
        const host = req.get('host');
        if (host) {
          const subdomain = host.split('.')[0];
          if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
            tenantId = subdomain;
          }
        }
      }

      // Extract from JWT token if available
      if (!tenantId && req.user && (req.user as any).tenantId) {
        tenantId = (req.user as any).tenantId;
      }

      if (!tenantId && required) {
        if (onTenantNotFound) {
          return onTenantNotFound(req, res);
        }
        
        return res.status(400).json({
          error: {
            code: 'MISSING_TENANT_ID',
            message: 'Tenant ID is required. Provide it via header, query parameter, or JWT token.',
            details: {
              headerName,
              queryParam,
              extractFromDomain
            }
          }
        });
      }

      if (tenantId) {
        // Validate tenant exists and is active
        const tenant = await validateTenant(tenantId);
        if (!tenant) {
          return res.status(404).json({
            error: {
              code: 'TENANT_NOT_FOUND',
              message: `Tenant '${tenantId}' not found or inactive`
            }
          });
        }

        // Set tenant context for the request
        req.tenantId = tenantId;
        req.tenant = tenant;
        req.userId = req.user?.id;

        const context: TenantContext = {
          tenantId,
          userId: req.userId
        };

        // Set database tenant context
        await withClient(async (client) => {
          await setTenantContextOnClient(client, tenantId);
        });

        // Continue with tenant context
        await withTenantContext(context, async () => {
          next();
        });
      } else {
        next();
      }
    } catch (error) {
      console.error('Tenant middleware error:', error);
      res.status(500).json({
        error: {
          code: 'TENANT_MIDDLEWARE_ERROR',
          message: 'Internal server error in tenant middleware'
        }
      });
    }
  };
}

async function validateTenant(tenantId: string): Promise<any | null> {
  try {
    return await withClient(async (client) => {
      const result = await client.query(
        'SELECT id, name, domain, plan FROM tenants WHERE id = $1',
        [tenantId]
      );
      return result.rows[0] || null;
    });
  } catch (error) {
    console.error('Error validating tenant:', error);
    return null;
  }
}

export function requireTenant() {
  return createTenantMiddleware({ required: true });
}

export function optionalTenant() {
  return createTenantMiddleware({ required: false });
}

export function domainBasedTenant() {
  return createTenantMiddleware({ 
    required: true, 
    extractFromDomain: true 
  });
}