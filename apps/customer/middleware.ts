import { NextRequest, NextResponse } from 'next/server';

interface DomainInfo {
  type: 'subdomain' | 'custom' | 'development';
  identifier: string;
  host: string;
  isSecure: boolean;
}

interface TenantInfo {
  id: string;
  domain: string;
  subdomain?: string;
  customDomain?: string;
  name: string;
  status: 'active' | 'suspended' | 'trial';
  settings: {
    routing?: {
      customRoutes?: Record<string, string>;
      redirects?: Array<{ from: string; to: string; permanent: boolean }>;
    };
    features?: {
      booking: boolean;
      ecommerce: boolean;
      blog: boolean;
      analytics: boolean;
    };
  };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for API routes (except tenant resolution), static files, and Next.js internals
  if (
    pathname.startsWith('/api/') && !pathname.startsWith('/api/tenant/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  try {
    // Parse domain information
    const domainInfo = parseDomainInfo(request);
    
    if (!domainInfo) {
      return createErrorResponse('Invalid domain', 400);
    }

    // Resolve tenant
    const tenant = await resolveTenantWithCache(domainInfo, request);
    
    if (!tenant) {
      return createNotFoundResponse();
    }

    // Check tenant status
    if (tenant.status === 'suspended') {
      return createSuspendedResponse(tenant);
    }

    // Handle redirects
    const redirectResponse = handleRedirects(tenant, pathname, request);
    if (redirectResponse) {
      return redirectResponse;
    }

    // Add tenant context to headers for downstream processing
    const response = NextResponse.next();
    response.headers.set('x-tenant-id', tenant.id);
    response.headers.set('x-tenant-domain', tenant.domain);
    response.headers.set('x-domain-type', domainInfo.type);
    
    // Add security headers
    addSecurityHeaders(response);
    
    // Add caching headers based on content type
    addCachingHeaders(response, pathname);

    return response;

  } catch (error) {
    console.error('Middleware error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

/**
 * Parse domain information from the request
 */
function parseDomainInfo(request: NextRequest): DomainInfo | null {
  const host = request.headers.get('host') || '';
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  
  if (!host) {
    return null;
  }

  // Remove port from host for parsing
  const cleanHost = host.split(':')[0];
  const parts = cleanHost.split('.');
  
  // Development mode
  if (cleanHost.includes('localhost') || cleanHost.includes('127.0.0.1') || cleanHost.includes('0.0.0.0')) {
    return {
      type: 'development',
      identifier: 'demo-tenant',
      host: cleanHost,
      isSecure: protocol === 'https',
    };
  }
  
  // Subdomain pattern: tenant.bizbox.com or tenant.bizbox.co.uk
  if (parts.length >= 3 && (parts.includes('bizbox') || parts.includes('bizboxapp'))) {
    const subdomainIndex = parts.findIndex(part => part === 'bizbox' || part === 'bizboxapp');
    if (subdomainIndex > 0) {
      return {
        type: 'subdomain',
        identifier: parts[subdomainIndex - 1],
        host: cleanHost,
        isSecure: protocol === 'https',
      };
    }
  }
  
  // Custom domain pattern
  return {
    type: 'custom',
    identifier: cleanHost,
    host: cleanHost,
    isSecure: protocol === 'https',
  };
}

/**
 * Resolve tenant with caching
 */
async function resolveTenantWithCache(
  domainInfo: DomainInfo, 
  request: NextRequest
): Promise<TenantInfo | null> {
  try {
    const response = await fetch(`${getInternalApiUrl()}/api/tenants/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
        'User-Agent': 'BizBox-Customer-Middleware',
      },
      body: JSON.stringify({ 
        identifier: domainInfo.identifier,
        type: domainInfo.type,
        host: domainInfo.host,
        userAgent: request.headers.get('user-agent'),
        ip: request.ip || request.headers.get('x-forwarded-for'),
      }),
      // Cache for 5 minutes in edge functions
      cache: 'default',
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Tenant not found
      }
      throw new Error(`API error: ${response.status}`);
    }

    const tenant = await response.json();
    
    // Validate tenant structure
    if (!tenant.id || !tenant.domain) {
      console.error('Invalid tenant data received:', tenant);
      return null;
    }

    return tenant;
  } catch (error) {
    console.error('Failed to resolve tenant:', error);
    
    // Fallback for development
    if (domainInfo.type === 'development') {
      return {
        id: 'demo-tenant-id',
        domain: 'demo.bizbox.com',
        subdomain: 'demo',
        name: 'Demo Business',
        status: 'active',
        settings: {
          features: {
            booking: true,
            ecommerce: true,
            blog: true,
            analytics: true,
          },
        },
      };
    }
    
    return null;
  }
}

/**
 * Handle tenant-specific redirects
 */
function handleRedirects(
  tenant: TenantInfo, 
  pathname: string, 
  request: NextRequest
): NextResponse | null {
  if (!tenant.settings?.routing?.redirects) {
    return null;
  }

  for (const redirect of tenant.settings.routing.redirects) {
    if (pathname === redirect.from || pathname.startsWith(redirect.from + '/')) {
      const redirectUrl = new URL(redirect.to, request.url);
      return NextResponse.redirect(redirectUrl, {
        status: redirect.permanent ? 301 : 302,
      });
    }
  }

  return null;
}

/**
 * Add security headers
 */
function addSecurityHeaders(response: NextResponse) {
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: http:",
      "media-src 'self' https: http:",
      "connect-src 'self' https:",
      "frame-src 'self' https:",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
    ].join('; ')
  );

  // Other security headers
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(self), payment=(self)'
  );

  // HSTS for production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
}

/**
 * Add caching headers based on content
 */
function addCachingHeaders(response: NextResponse, pathname: string) {
  if (pathname.startsWith('/api/')) {
    // API routes: no cache for dynamic data, short cache for static data
    response.headers.set('Cache-Control', 'no-cache, must-revalidate');
  } else if (pathname.match(/\.(jpg|jpeg|png|gif|svg|webp|ico)$/)) {
    // Images: long cache
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (pathname.match(/\.(css|js)$/)) {
    // Assets: long cache with revalidation
    response.headers.set('Cache-Control', 'public, max-age=31536000, must-revalidate');
  } else {
    // Pages: short cache with stale-while-revalidate
    response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  }
}

/**
 * Create error response
 */
function createErrorResponse(message: string, status: number): NextResponse {
  return new NextResponse(
    `<!DOCTYPE html>
    <html>
      <head>
        <title>Error ${status}</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: system-ui; text-align: center; padding: 50px; }
          h1 { color: #e53e3e; }
        </style>
      </head>
      <body>
        <h1>Error ${status}</h1>
        <p>${message}</p>
      </body>
    </html>`,
    { 
      status,
      headers: { 'Content-Type': 'text/html' }
    }
  );
}

/**
 * Create not found response
 */
function createNotFoundResponse(): NextResponse {
  return new NextResponse(
    `<!DOCTYPE html>
    <html>
      <head>
        <title>Business Not Found</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: system-ui; 
            text-align: center; 
            padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
          }
          h1 { font-size: 2.5rem; margin-bottom: 1rem; }
          p { font-size: 1.1rem; opacity: 0.9; max-width: 600px; line-height: 1.6; }
          a { color: #90cdf4; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <h1>Business Not Found</h1>
        <p>
          The business you're looking for doesn't exist or may have been moved. 
          Please check the URL or contact the business directly.
        </p>
        <p>
          <a href="https://bizbox.com">Learn more about BizBox</a>
        </p>
      </body>
    </html>`,
    { 
      status: 404,
      headers: { 'Content-Type': 'text/html' }
    }
  );
}

/**
 * Create suspended account response
 */
function createSuspendedResponse(tenant: TenantInfo): NextResponse {
  return new NextResponse(
    `<!DOCTYPE html>
    <html>
      <head>
        <title>${tenant.name} - Account Suspended</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: system-ui; 
            text-align: center; 
            padding: 50px;
            background: #f7fafc;
            color: #2d3748;
          }
          .container { max-width: 500px; margin: 0 auto; }
          h1 { color: #e53e3e; margin-bottom: 1rem; }
          p { color: #718096; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Account Suspended</h1>
          <p>
            This business account has been temporarily suspended. 
            Please contact support for assistance.
          </p>
        </div>
      </body>
    </html>`,
    { 
      status: 503,
      headers: { 'Content-Type': 'text/html' }
    }
  );
}

/**
 * Get internal API URL
 */
function getInternalApiUrl(): string {
  return process.env.INTERNAL_API_URL || 'http://localhost:3000';
}

// Configure middleware to run on all paths except static assets
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (except /api/tenant/)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};