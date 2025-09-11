import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Super Admin middleware for authentication and authorization
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public paths
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  try {
    // Get the JWT token
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    // Check if user is authenticated
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check if user has super admin role
    if (!token.isSuperAdmin && token.role !== 'super_admin') {
      return new NextResponse(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { 
          status: 403,
          headers: { 'content-type': 'application/json' }
        }
      );
    }

    // Log admin access for audit trail
    if (pathname.startsWith('/api/')) {
      // For API routes, add headers for logging
      const response = NextResponse.next();
      response.headers.set('x-admin-user-id', token.sub || '');
      response.headers.set('x-admin-email', token.email || '');
      response.headers.set('x-client-ip', request.ip || '');
      response.headers.set('x-user-agent', request.headers.get('user-agent') || '');
      return response;
    }

    // Log page access
    try {
      await logAdminAccess({
        userId: token.sub || '',
        userEmail: token.email || '',
        action: 'page_access',
        resource: pathname,
        ip: request.ip || '',
        userAgent: request.headers.get('user-agent') || '',
      });
    } catch (error) {
      console.error('Failed to log admin access:', error);
      // Don't block the request if logging fails
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    
    // Redirect to login on token verification failure
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
}

// Helper function to log admin access
async function logAdminAccess(data: {
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  ip: string;
  userAgent: string;
}) {
  // In production, this would call your audit logging service
  // For now, we'll just console.log
  console.log('[ADMIN_AUDIT]', {
    timestamp: new Date().toISOString(),
    ...data,
  });
  
  // TODO: Implement actual audit logging to database
  // Example:
  // await fetch('/api/super-admin/audit-log', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     ...data,
  //     timestamp: new Date(),
  //   }),
  // });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js authentication routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};