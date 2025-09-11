import { PoolClient } from 'pg';
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  tenantId: string;
  userId?: string;
}

// AsyncLocalStorage for tenant context
const tenantStorage = new AsyncLocalStorage<TenantContext>();

export function getCurrentTenantContext(): TenantContext | undefined {
  return tenantStorage.getStore();
}

export function getCurrentTenantId(): string {
  const context = getCurrentTenantContext();
  if (!context) {
    throw new Error('No tenant context available. Ensure tenant context is set.');
  }
  return context.tenantId;
}

export async function withTenantContext<T>(
  context: TenantContext,
  callback: () => Promise<T>
): Promise<T> {
  return tenantStorage.run(context, callback);
}

export async function setTenantContextOnClient(
  client: PoolClient,
  tenantId: string
): Promise<void> {
  await client.query('SELECT set_config($1, $2, true)', [
    'app.current_tenant',
    tenantId
  ]);
}

export async function clearTenantContextOnClient(client: PoolClient): Promise<void> {
  await client.query('SELECT set_config($1, $2, true)', [
    'app.current_tenant',
    ''
  ]);
}

export function createTenantMiddleware() {
  return async (req: any, res: any, next: any) => {
    const tenantId = req.headers['x-tenant-id'] || req.query.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_TENANT_ID',
          message: 'Tenant ID is required'
        }
      });
    }

    const context: TenantContext = {
      tenantId: tenantId as string,
      userId: req.user?.id
    };

    await withTenantContext(context, async () => {
      next();
    });
  };
}