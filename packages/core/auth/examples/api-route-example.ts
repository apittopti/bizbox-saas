// Example: Protected API route with authentication and permissions
import { NextApiRequest, NextApiResponse } from 'next';
import { 
  requireAuth, 
  requirePermission, 
  requireRole,
  withRateLimit,
  AuthenticatedRequest 
} from '@bizbox/core-auth';

// Basic authentication
export default requireAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  res.json({
    message: 'Hello authenticated user!',
    user: req.user,
    tenant: req.tenant,
  });
});

// Permission-based protection
export const protectedWithPermission = requirePermission('bookings', 'read')(
  async (req: AuthenticatedRequest, res: NextApiResponse) => {
    // Only users with 'read bookings' permission can access
    res.json({ bookings: [] });
  }
);

// Role-based protection
export const adminOnly = requireRole('tenant_admin')(
  async (req: AuthenticatedRequest, res: NextApiResponse) => {
    // Only tenant admins can access
    res.json({ adminData: 'sensitive information' });
  }
);

// Rate limited endpoint
export const rateLimited = withRateLimit(60 * 1000, 10)( // 10 requests per minute
  async (req: NextApiRequest, res: NextApiResponse) => {
    res.json({ message: 'Rate limited endpoint' });
  }
);

// Combined protections
export const fullyProtected = requireAuth(
  withRateLimit(60 * 1000, 100)(
    requirePermission('users', 'create')(
      async (req: AuthenticatedRequest, res: NextApiResponse) => {
        // Authenticated + rate limited + permission checked
        res.json({ message: 'Fully protected endpoint' });
      }
    )
  )
);