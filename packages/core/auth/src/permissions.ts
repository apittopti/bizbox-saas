export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface Role {
  name: string;
  description: string;
  permissions: Permission[];
  hierarchy: number; // Higher number = more permissions
}

// Define system roles with hierarchical permissions
export const SYSTEM_ROLES: Record<string, Role> = {
  super_admin: {
    name: 'Super Admin',
    description: 'Full platform access across all tenants',
    hierarchy: 100,
    permissions: [
      { resource: '*', action: '*' }, // Full access to everything
    ],
  },

  tenant_admin: {
    name: 'Tenant Admin',
    description: 'Full access within tenant',
    hierarchy: 80,
    permissions: [
      { resource: 'tenant', action: '*' },
      { resource: 'users', action: '*' },
      { resource: 'business', action: '*' },
      { resource: 'services', action: '*' },
      { resource: 'staff', action: '*' },
      { resource: 'bookings', action: '*' },
      { resource: 'products', action: '*' },
      { resource: 'orders', action: '*' },
      { resource: 'website', action: '*' },
      { resource: 'media', action: '*' },
      { resource: 'analytics', action: 'read' },
      { resource: 'settings', action: '*' },
    ],
  },

  staff: {
    name: 'Staff Member',
    description: 'Limited access for staff operations',
    hierarchy: 50,
    permissions: [
      { resource: 'bookings', action: 'read' },
      { resource: 'bookings', action: 'update', conditions: { assignedTo: 'self' } },
      { resource: 'customers', action: 'read' },
      { resource: 'services', action: 'read' },
      { resource: 'staff', action: 'read', conditions: { id: 'self' } },
      { resource: 'staff', action: 'update', conditions: { id: 'self' } },
      { resource: 'products', action: 'read' },
      { resource: 'orders', action: 'read' },
      { resource: 'media', action: 'read' },
    ],
  },

  customer: {
    name: 'Customer',
    description: 'Customer access for bookings and orders',
    hierarchy: 10,
    permissions: [
      { resource: 'bookings', action: 'create' },
      { resource: 'bookings', action: 'read', conditions: { customerId: 'self' } },
      { resource: 'bookings', action: 'update', conditions: { customerId: 'self' } },
      { resource: 'services', action: 'read' },
      { resource: 'staff', action: 'read' },
      { resource: 'products', action: 'read' },
      { resource: 'orders', action: 'create' },
      { resource: 'orders', action: 'read', conditions: { customerId: 'self' } },
      { resource: 'profile', action: 'read', conditions: { id: 'self' } },
      { resource: 'profile', action: 'update', conditions: { id: 'self' } },
    ],
  },
};

export class PermissionManager {
  /**
   * Check if a user has permission to perform an action on a resource
   */
  static hasPermission(
    userRole: string,
    userPermissions: Permission[],
    resource: string,
    action: string,
    context?: Record<string, any>
  ): boolean {
    // Super admin has access to everything
    if (userRole === 'super_admin') {
      return true;
    }

    // Check role-based permissions
    const role = SYSTEM_ROLES[userRole];
    if (role) {
      const hasRolePermission = this.checkPermissions(
        role.permissions,
        resource,
        action,
        context
      );
      if (hasRolePermission) {
        return true;
      }
    }

    // Check user-specific permissions
    return this.checkPermissions(userPermissions, resource, action, context);
  }

  /**
   * Check permissions against a list of permission objects
   */
  private static checkPermissions(
    permissions: Permission[],
    resource: string,
    action: string,
    context?: Record<string, any>
  ): boolean {
    for (const permission of permissions) {
      if (this.matchesPermission(permission, resource, action, context)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a permission matches the requested resource and action
   */
  private static matchesPermission(
    permission: Permission,
    resource: string,
    action: string,
    context?: Record<string, any>
  ): boolean {
    // Check resource match (supports wildcards)
    const resourceMatch = permission.resource === '*' || permission.resource === resource;
    if (!resourceMatch) {
      return false;
    }

    // Check action match (supports wildcards)
    const actionMatch = permission.action === '*' || permission.action === action;
    if (!actionMatch) {
      return false;
    }

    // Check conditions if present
    if (permission.conditions && context) {
      return this.checkConditions(permission.conditions, context);
    }

    return true;
  }

  /**
   * Check if conditions are met
   */
  private static checkConditions(
    conditions: Record<string, any>,
    context: Record<string, any>
  ): boolean {
    for (const [key, value] of Object.entries(conditions)) {
      if (value === 'self') {
        // Special case: check if the user is acting on their own resource
        if (context.userId && (context.id === context.userId || context.customerId === context.userId)) {
          continue;
        }
        return false;
      } else if (context[key] !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get all permissions for a user (role + custom permissions)
   */
  static getUserPermissions(userRole: string, userPermissions: Permission[]): Permission[] {
    const role = SYSTEM_ROLES[userRole];
    const rolePermissions = role ? role.permissions : [];
    
    return [...rolePermissions, ...userPermissions];
  }

  /**
   * Check if a role can perform an action on another role (hierarchy check)
   */
  static canManageRole(managerRole: string, targetRole: string): boolean {
    if (managerRole === 'super_admin') {
      return true;
    }

    const manager = SYSTEM_ROLES[managerRole];
    const target = SYSTEM_ROLES[targetRole];

    if (!manager || !target) {
      return false;
    }

    return manager.hierarchy > target.hierarchy;
  }

  /**
   * Get available roles that a user can assign
   */
  static getAssignableRoles(userRole: string): Role[] {
    const user = SYSTEM_ROLES[userRole];
    if (!user) {
      return [];
    }

    return Object.values(SYSTEM_ROLES).filter(
      role => role.hierarchy < user.hierarchy
    );
  }

  /**
   * Validate permission object
   */
  static validatePermission(permission: Permission): boolean {
    return !!(
      permission.resource &&
      permission.action &&
      typeof permission.resource === 'string' &&
      typeof permission.action === 'string'
    );
  }

  /**
   * Create a permission middleware for API routes
   */
  static createPermissionMiddleware(resource: string, action: string) {
    return (req: any, res: any, next: any) => {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      const context = {
        userId: user.id,
        tenantId: user.tenantId,
        ...req.params,
        ...req.query,
      };

      const hasPermission = this.hasPermission(
        user.role,
        user.permissions || [],
        resource,
        action,
        context
      );

      if (!hasPermission) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: `Insufficient permissions to ${action} ${resource}`,
          },
        });
      }

      next();
    };
  }
}

// Convenience functions for common permission checks
export const requirePermission = (resource: string, action: string) =>
  PermissionManager.createPermissionMiddleware(resource, action);

export const requireRole = (requiredRole: string) => (req: any, res: any, next: any) => {
  const user = req.user;
  
  if (!user) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  }

  if (!PermissionManager.canManageRole(user.role, requiredRole) && user.role !== requiredRole) {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: `Role '${requiredRole}' or higher required`,
      },
    });
  }

  next();
};

export const requireSuperAdmin = requireRole('super_admin');
export const requireTenantAdmin = requireRole('tenant_admin');