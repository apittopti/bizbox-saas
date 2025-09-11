import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions, AuthSession } from '@bizbox/core-auth';
import { withTenantContext } from '@bizbox/core-database';
import { auditLogger } from '@bizbox/core-database';
import { PermissionManager } from '@bizbox/core-auth';
import jwt from 'jsonwebtoken';

export interface AuthOptions {
  required?: boolean;
  roles?: string[];
  permissions?: Array<{ resource: string; action: string }>;
  allowApiKey?: boolean;
  allowServiceAccount?: boolean;
}

export interface AuthMiddleware {
  (req: NextApiRequest, res: NextApiResponse, next: () => void): Promise<void> | void;
}

export interface AuthenticatedRequest extends NextApiRequest {
  user?: AuthSession['user'];
  tenant?: AuthSession['tenant'];
  session?: AuthSession;
  auth?: {
    type: 'session' | 'api_key' | 'service_account';
    verified: boolean;
    permissions: string[];
    metadata?: Record<string, any>;
  };
}

/**
 * Enhanced authentication middleware with NextAuth.js integration
 */
export function createAuthMiddleware(options: AuthOptions = {}): AuthMiddleware {
  return async (req: AuthenticatedRequest, res: NextApiResponse, next: () => void) => {
    const {
      required = true,
      roles = [],
      permissions = [],
      allowApiKey = true,
      allowServiceAccount = false,
    } = options;

    try {
      let authResult: {
        user?: AuthSession['user'];
        tenant?: AuthSession['tenant'];
        session?: AuthSession;
        type: 'session' | 'api_key' | 'service_account';
        permissions: string[];
        metadata?: Record<string, any>;
      } | null = null;

      // Try NextAuth session first
      authResult = await authenticateWithSession(req, res);

      // Fall back to API key authentication if enabled
      if (!authResult && allowApiKey) {
        authResult = await authenticateWithApiKey(req);
      }

      // Fall back to service account authentication if enabled
      if (!authResult && allowServiceAccount) {
        authResult = await authenticateWithServiceAccount(req);
      }

      // Handle unauthenticated requests
      if (!authResult) {
        if (!required) {
          return next();
        }

        await logAuthEvent('UNAUTHORIZED_ACCESS', undefined, {
          url: req.url,
          method: req.method,
          userAgent: req.headers['user-agent'],
          ip: getClientIP(req),
        });

        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Attach auth data to request
      req.user = authResult.user;
      req.tenant = authResult.tenant;
      req.session = authResult.session;
      req.auth = {
        type: authResult.type,
        verified: true,
        permissions: authResult.permissions,
        metadata: authResult.metadata,
      };

      // Validate within tenant context
      const tenantId = authResult.user?.tenantId || authResult.tenant?.id;
      if (!tenantId) {
        return res.status(400).json({
          error: {
            code: 'INVALID_TENANT',
            message: 'Tenant context required',
            timestamp: new Date().toISOString(),
          },
        });
      }

      await withTenantContext(
        { tenantId, userId: authResult.user?.id },
        async () => {
          try {
            // Role-based access control
            if (roles.length > 0) {
              const userRole = authResult.user?.role;
              if (!userRole || !roles.includes(userRole)) {
                await logAuthEvent('ACCESS_DENIED', authResult.user?.id, {
                  reason: 'insufficient_role',
                  requiredRoles: roles,
                  userRole,
                  url: req.url,
                  method: req.method,
                });

                return res.status(403).json({
                  error: {
                    code: 'FORBIDDEN',
                    message: `Role '${roles.join(' or ')}' required`,
                    timestamp: new Date().toISOString(),
                  },
                });
              }
            }

            // Permission-based access control
            if (permissions.length > 0) {
              for (const permission of permissions) {
                const hasPermission = await checkUserPermission(
                  authResult,
                  permission.resource,
                  permission.action,
                  {
                    ...req.params,
                    ...req.query,
                    tenantId,
                    userId: authResult.user?.id,
                  }
                );

                if (!hasPermission) {
                  await logAuthEvent('ACCESS_DENIED', authResult.user?.id, {
                    reason: 'insufficient_permission',
                    requiredPermission: permission,
                    userRole: authResult.user?.role,
                    url: req.url,
                    method: req.method,
                  });

                  return res.status(403).json({
                    error: {
                      code: 'FORBIDDEN',
                      message: `Permission to ${permission.action} ${permission.resource} required`,
                      timestamp: new Date().toISOString(),
                    },
                  });
                }
              }
            }

            // Log successful authentication
            await logAuthEvent('AUTHENTICATED', authResult.user?.id, {
              authType: authResult.type,
              userRole: authResult.user?.role,
              url: req.url,
              method: req.method,
            });

            next();
          } catch (error) {
            console.error('Auth middleware error:', error);
            
            await logAuthEvent('AUTH_ERROR', authResult?.user?.id, {
              error: error instanceof Error ? error.message : 'Unknown error',
              url: req.url,
              method: req.method,
            });

            return res.status(500).json({
              error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Authentication middleware error',
                timestamp: new Date().toISOString(),
              },
            });
          }
        }
      );
    } catch (error) {
      console.error('Auth middleware critical error:', error);
      
      return res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Critical authentication error',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };
}

/**
 * Authenticate using NextAuth session
 */
async function authenticateWithSession(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<{
  user: AuthSession['user'];
  tenant: AuthSession['tenant'];
  session: AuthSession;
  type: 'session';
  permissions: string[];
} | null> {
  try {
    const session = await getServerSession(req, res, authOptions) as AuthSession | null;
    
    if (!session?.user) {
      return null;
    }

    // Validate session freshness
    const sessionAge = Date.now() - new Date(session.expires).getTime();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    
    if (sessionAge > maxAge) {
      return null;
    }

    return {
      user: session.user,
      tenant: session.tenant,
      session,
      type: 'session',
      permissions: session.user.permissions || [],
    };
  } catch (error) {
    console.error('Session authentication error:', error);
    return null;
  }
}

/**
 * Authenticate using API key
 */
async function authenticateWithApiKey(req: NextApiRequest): Promise<{
  user: AuthSession['user'];
  tenant?: AuthSession['tenant'];
  type: 'api_key';
  permissions: string[];
  metadata: Record<string, any>;
} | null> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    
    // Verify API key token
    const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT secret not configured');
    }

    const payload = jwt.verify(token, secret) as any;
    
    if (payload.type !== 'api_key') {
      return null;
    }

    // Validate token structure
    if (!payload.sub || !payload.tenantId) {
      return null;
    }

    // Mock user object for API key authentication
    const apiUser: AuthSession['user'] = {
      id: payload.sub,
      email: payload.email || 'api-key@system',
      name: payload.name || 'API Key User',
      role: payload.role || 'api_user',
      tenantId: payload.tenantId,
      permissions: payload.permissions || [],
    };

    return {
      user: apiUser,
      type: 'api_key',
      permissions: payload.permissions || [],
      metadata: {
        keyId: payload.keyId,
        scope: payload.scope,
        issuedAt: payload.iat,
        expiresAt: payload.exp,
      },
    };
  } catch (error) {
    console.error('API key authentication error:', error);
    return null;
  }
}

/**
 * Authenticate using service account
 */
async function authenticateWithServiceAccount(req: NextApiRequest): Promise<{
  user: AuthSession['user'];
  tenant?: AuthSession['tenant'];
  type: 'service_account';
  permissions: string[];
  metadata: Record<string, any>;
} | null> {
  try {
    const serviceHeader = req.headers['x-service-account'];
    const serviceSecret = req.headers['x-service-secret'];
    
    if (!serviceHeader || !serviceSecret) {
      return null;
    }

    // Validate service account credentials
    const validServiceAccounts = (process.env.SERVICE_ACCOUNTS || '').split(',');
    const expectedSecret = process.env[`SERVICE_SECRET_${String(serviceHeader).toUpperCase()}`];
    
    if (!validServiceAccounts.includes(String(serviceHeader)) || serviceSecret !== expectedSecret) {
      return null;
    }

    // Extract tenant from header
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return null;
    }

    // Mock user object for service account
    const serviceUser: AuthSession['user'] = {
      id: `service_${serviceHeader}`,
      email: `${serviceHeader}@system.service`,
      name: `Service Account: ${serviceHeader}`,
      role: 'service_account',
      tenantId: tenantId,
      permissions: ['*'], // Service accounts have all permissions by default
    };

    return {
      user: serviceUser,
      type: 'service_account',
      permissions: ['*'],
      metadata: {
        serviceAccount: serviceHeader,
        tenantId,
      },
    };
  } catch (error) {
    console.error('Service account authentication error:', error);
    return null;
  }
}

/**
 * Check user permission with context
 */
async function checkUserPermission(
  authResult: any,
  resource: string,
  action: string,
  context: Record<string, any>
): Promise<boolean> {
  try {
    // Service accounts have all permissions
    if (authResult.type === 'service_account') {
      return true;
    }

    return PermissionManager.hasPermission(
      authResult.user?.role,
      authResult.user?.permissions || [],
      resource,
      action,
      context
    );
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
}

/**
 * Log authentication events
 */
async function logAuthEvent(event: string, userId?: string, metadata?: any): Promise<void> {
  try {
    await auditLogger.logAuthEvent(event, userId, metadata);
  } catch (error) {
    console.error('Failed to log auth event:', error);
  }
}

/**
 * Get client IP address
 */
function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? String(forwarded).split(',')[0] : req.connection?.remoteAddress;
  return ip || 'unknown';
}

/**
 * Pre-built authentication middleware
 */
export const authMiddleware = {
  // Require any authenticated user
  requireAuth: createAuthMiddleware({ required: true }),
  
  // Optional authentication
  optionalAuth: createAuthMiddleware({ required: false }),
  
  // Require specific roles
  requireSuperAdmin: createAuthMiddleware({
    required: true,
    roles: ['super_admin'],
  }),
  
  requireTenantAdmin: createAuthMiddleware({
    required: true,
    roles: ['super_admin', 'tenant_admin'],
  }),
  
  requireStaff: createAuthMiddleware({
    required: true,
    roles: ['super_admin', 'tenant_admin', 'staff'],
  }),
  
  // API-only authentication (no web sessions)
  requireApiAuth: createAuthMiddleware({
    required: true,
    allowApiKey: true,
    allowServiceAccount: true,
  }),
  
  // Service account only
  requireServiceAccount: createAuthMiddleware({
    required: true,
    allowApiKey: false,
    allowServiceAccount: true,
  }),
};

/**
 * Permission-based middleware factories
 */
export const permissionMiddleware = {
  read: (resource: string) => createAuthMiddleware({
    required: true,
    permissions: [{ resource, action: 'read' }],
  }),
  
  write: (resource: string) => createAuthMiddleware({
    required: true,
    permissions: [{ resource, action: 'write' }],
  }),
  
  delete: (resource: string) => createAuthMiddleware({
    required: true,
    permissions: [{ resource, action: 'delete' }],
  }),
  
  manage: (resource: string) => createAuthMiddleware({
    required: true,
    permissions: [{ resource, action: 'manage' }],
  }),
};

/**
 * Multi-tenant context middleware
 */
export function createTenantMiddleware(): AuthMiddleware {
  return async (req: AuthenticatedRequest, res: NextApiResponse, next: () => void) => {
    try {
      // Extract tenant ID from various sources
      const tenantId = 
        req.headers['x-tenant-id'] as string ||
        req.query.tenantId as string ||
        req.user?.tenantId;

      if (!tenantId) {
        return res.status(400).json({
          error: {
            code: 'MISSING_TENANT_ID',
            message: 'Tenant ID is required',
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Validate tenant access
      if (req.user && req.user.tenantId !== tenantId) {
        return res.status(403).json({
          error: {
            code: 'TENANT_ACCESS_DENIED',
            message: 'Access to tenant denied',
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Set tenant context
      await withTenantContext(
        { tenantId, userId: req.user?.id },
        async () => {
          next();
        }
      );
    } catch (error) {
      console.error('Tenant middleware error:', error);
      
      return res.status(500).json({
        error: {
          code: 'TENANT_MIDDLEWARE_ERROR',
          message: 'Tenant context error',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };
}

export const tenantMiddleware = createTenantMiddleware();

/**
 * Utility functions
 */
export function isAuthenticated(req: NextApiRequest): req is AuthenticatedRequest {
  return !!(req as AuthenticatedRequest).auth?.verified;
}

export function getAuthUser(req: NextApiRequest): AuthSession['user'] | undefined {
  return (req as AuthenticatedRequest).user;
}

export function getAuthTenant(req: NextApiRequest): AuthSession['tenant'] | undefined {
  return (req as AuthenticatedRequest).tenant;
}

export function hasRole(req: NextApiRequest, role: string): boolean {
  const user = getAuthUser(req);
  return user?.role === role;
}

export function hasAnyRole(req: NextApiRequest, roles: string[]): boolean {
  const user = getAuthUser(req);
  return user?.role ? roles.includes(user.role) : false;
}

export function hasPermission(req: NextApiRequest, resource: string, action: string): boolean {
  const user = getAuthUser(req);
  const permissions = user?.permissions || [];
  return permissions.includes('*') || permissions.includes(`${resource}:${action}`);
}