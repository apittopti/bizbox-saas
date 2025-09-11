// Example: User management operations
import { 
  createUser, 
  changePassword, 
  AuthUtils,
  PermissionManager 
} from '@bizbox/core-auth';

// Create a new staff member
export async function createStaffMember(tenantId: string, userData: {
  email: string;
  firstName: string;
  lastName: string;
  permissions?: string[];
}) {
  try {
    const { user, temporaryPassword } = await createUser({
      tenantId,
      email: userData.email,
      role: 'staff',
      profile: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        active: true,
      },
      permissions: userData.permissions || [],
      sendWelcomeEmail: true,
    });

    console.log(`Staff member created with temporary password: ${temporaryPassword}`);
    return user;
  } catch (error) {
    console.error('Failed to create staff member:', error);
    throw error;
  }
}

// Change user password with validation
export async function updateUserPassword(
  userId: string,
  tenantId: string,
  currentPassword: string,
  newPassword: string
) {
  try {
    await changePassword(userId, tenantId, currentPassword, newPassword);
    console.log('Password changed successfully');
    return true;
  } catch (error) {
    console.error('Password change failed:', error);
    throw error;
  }
}

// Reset password (admin function)
export async function adminResetPassword(
  email: string,
  tenantId: string
) {
  try {
    const newPassword = AuthUtils.generatePassword(12);
    const userId = await AuthUtils.resetPassword({
      email,
      tenantId,
      newPassword,
    });

    console.log(`Password reset for user ${userId}. New password: ${newPassword}`);
    return { userId, newPassword };
  } catch (error) {
    console.error('Password reset failed:', error);
    throw error;
  }
}

// Check user permissions
export function checkUserAccess(
  userRole: string,
  userPermissions: any[],
  resource: string,
  action: string,
  context?: Record<string, any>
) {
  const hasPermission = PermissionManager.hasPermission(
    userRole,
    userPermissions,
    resource,
    action,
    context
  );

  console.log(`User ${userRole} ${hasPermission ? 'can' : 'cannot'} ${action} ${resource}`);
  return hasPermission;
}

// Get assignable roles for a user
export function getAvailableRoles(currentUserRole: string) {
  const assignableRoles = PermissionManager.getAssignableRoles(currentUserRole);
  
  console.log(`User with role ${currentUserRole} can assign roles:`, 
    assignableRoles.map(role => role.name)
  );
  
  return assignableRoles;
}

// Email verification workflow
export async function verifyUserEmail(userId: string, tenantId: string) {
  try {
    // Generate verification token
    const token = await AuthUtils.generateEmailVerificationToken(userId, tenantId);
    
    // In a real application, send this token via email
    console.log(`Email verification token: ${token}`);
    
    // Simulate user clicking verification link
    const verified = await AuthUtils.verifyEmail(userId, tenantId, token);
    
    if (verified) {
      console.log('Email verified successfully');
    } else {
      console.log('Email verification failed');
    }
    
    return verified;
  } catch (error) {
    console.error('Email verification error:', error);
    throw error;
  }
}