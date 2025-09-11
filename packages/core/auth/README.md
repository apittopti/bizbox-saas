# BizBox Authentication System

A comprehensive authentication system built with NextAuth.js, featuring multi-tenant support, role-based permissions, and JWT tokens.

## Features

- **Multi-tenant Authentication**: Tenant-scoped user sessions and data isolation
- **Role-based Access Control**: Hierarchical permission system with predefined roles
- **JWT Token Support**: API authentication with secure token generation
- **Rate Limiting**: Built-in rate limiting for API endpoints
- **Audit Logging**: Comprehensive logging of authentication events
- **Password Security**: Bcrypt hashing with strength validation
- **Session Management**: Secure session handling with integrity validation

## Quick Start

### 1. Configure NextAuth.js

```typescript
// pages/api/auth/[...nextauth].ts
import { authOptions } from '@bizbox/core-auth';

export default NextAuth(authOptions);
```

### 2. Protect API Routes

```typescript
// pages/api/protected-route.ts
import { requireAuth, requirePermission } from '@bizbox/core-auth';

export default requireAuth(async (req, res) => {
  // Your protected route logic
  res.json({ message: 'Hello authenticated user!', user: req.user });
});

// Or with specific permissions
export default requirePermission('users', 'read')(async (req, res) => {
  // Only users with 'read users' permission can access
});
```

### 3. Role-based Protection

```typescript
import { requireRole, requireTenantAdmin } from '@bizbox/core-auth';

// Require specific role
export default requireRole('staff')(handler);

// Require tenant admin or higher
export default requireTenantAdmin(handler);
```

### 4. Rate Limiting

```typescript
import { withRateLimit } from '@bizbox/core-auth';

// Allow 100 requests per hour
export default withRateLimit(60 * 60 * 1000, 100)(handler);
```

## Authentication Configuration

### Environment Variables

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Custom Providers

The system supports both credentials and OAuth providers:

```typescript
// Credentials login with tenant context
const result = await signIn('credentials', {
  email: 'user@example.com',
  password: 'password',
  tenantId: 'tenant-uuid',
});
```

## Permission System

### Predefined Roles

- **Super Admin**: Full platform access across all tenants
- **Tenant Admin**: Full access within their tenant
- **Staff**: Limited access for staff operations
- **Customer**: Customer access for bookings and orders

### Custom Permissions

```typescript
import { PermissionManager } from '@bizbox/core-auth';

// Check permissions programmatically
const hasPermission = PermissionManager.hasPermission(
  userRole,
  userPermissions,
  'bookings',
  'create',
  { userId: 'user-id' }
);
```

### Permission Middleware

```typescript
import { requirePermission } from '@bizbox/core-auth';

// Require specific permission
export default requirePermission('bookings', 'update')(handler);
```

## User Management

### Creating Users

```typescript
import { createUser } from '@bizbox/core-auth';

const { user, temporaryPassword } = await createUser({
  tenantId: 'tenant-uuid',
  email: 'user@example.com',
  role: 'staff',
  profile: {
    firstName: 'John',
    lastName: 'Doe',
  },
  sendWelcomeEmail: true,
});
```

### Password Management

```typescript
import { changePassword, validatePasswordStrength } from '@bizbox/core-auth';

// Change password
await changePassword(userId, tenantId, currentPassword, newPassword);

// Validate password strength
validatePasswordStrength('newPassword123!');
```

## API Token Authentication

### Generate API Tokens

```typescript
import { JWTAuth } from '@bizbox/core-auth';

const token = await JWTAuth.generateApiToken(
  userId,
  tenantId,
  ['read:bookings', 'write:bookings'],
  '30d'
);
```

### Protect API Routes with Tokens

```typescript
import { requireApiToken } from '@bizbox/core-auth';

export default requireApiToken(async (req, res) => {
  // Access API user context
  const { id, tenantId, permissions } = req.apiUser;
});
```

## Session Management

### Client-side Session Access

```typescript
import { useSession } from 'next-auth/react';

function MyComponent() {
  const { data: session, status } = useSession();
  
  if (status === 'loading') return <p>Loading...</p>;
  if (status === 'unauthenticated') return <p>Access Denied</p>;
  
  return (
    <div>
      <h1>Welcome {session.user.name}</h1>
      <p>Tenant: {session.tenant.name}</p>
      <p>Role: {session.user.role}</p>
    </div>
  );
}
```

### Server-side Session Access

```typescript
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@bizbox/core-auth';

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  
  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    };
  }
  
  return {
    props: { session },
  };
}
```

## Security Features

### Rate Limiting

Built-in rate limiting protects against abuse:

```typescript
// Custom rate limits per endpoint
const rateLimitedHandler = withRateLimit(
  15 * 60 * 1000, // 15 minutes
  100 // max requests
)(handler);
```

### Audit Logging

All authentication events are automatically logged:

- Login attempts (success/failure)
- Password changes
- Permission denials
- Token generation/usage

### Session Security

- JWT tokens with configurable expiration
- Session integrity validation
- CSRF protection (when configured)
- Secure cookie handling

## Error Handling

The system provides detailed error responses:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

Common error codes:
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INVALID_CREDENTIALS`: Login failed

## Testing

```typescript
// Mock authentication in tests
jest.mock('@bizbox/core-auth', () => ({
  requireAuth: (handler) => handler,
  PermissionManager: {
    hasPermission: jest.fn(() => true),
  },
}));
```

## Migration from Other Systems

The authentication system is designed to be flexible and can be integrated with existing user databases. Contact the development team for migration assistance.