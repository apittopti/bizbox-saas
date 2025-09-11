import { NextRequest, NextResponse } from 'next/server';
import { TenantResolver } from '../../../../lib/tenant-resolver';
import { ComponentRenderer, PageData } from '../../../../lib/component-renderer';
import { ThemeInjector } from '../../../../lib/theme-injector';
import { SEOOptimizer } from '../../../../lib/seo-optimizer';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Resolve tenant from request
    const tenant = await TenantResolver.resolveTenant();
    
    if (!tenant) {
      return new NextResponse('Tenant not found', { status: 404 });
    }

    // Get the requested path
    const path = params.path ? `/${params.path.join('/')}` : '/';
    
    // Fetch page data for the tenant and path
    const pageData = await fetchPageData(tenant.id, path);
    
    if (!pageData) {
      return new NextResponse('Page not found', { status: 404 });
    }

    // Fetch live data for components
    const liveData = await fetchLiveData(tenant.id);

    // Create component renderer
    const renderer = new ComponentRenderer(tenant, liveData);

    // Render the page
    const pageElement = await renderer.renderPage(pageData);

    // Generate CSS
    const css = ThemeInjector.injectCSS(tenant);

    // Generate SEO data
    const url = `${request.nextUrl.protocol}//${request.nextUrl.host}${path}`;
    const structuredData = SEOOptimizer.generateStructuredData(tenant, pageData, url, liveData);
    const metaTags = SEOOptimizer.generateMetaTags(tenant, pageData, url);

    // Generate complete HTML
    const html = generateHTML({
      tenant,
      pageData,
      pageElement,
      css,
      structuredData,
      metaTags,
      liveData,
    });

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=300, s-maxage=3600', // 5min browser, 1hr CDN
      },
    });

  } catch (error) {
    console.error('Error rendering page:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * Fetch page data from the website builder
 */
async function fetchPageData(tenantId: string, path: string): Promise<PageData | null> {
  try {
    const response = await fetch(`${process.env.INTERNAL_API_URL}/api/tenants/${tenantId}/pages${path}`, {
      headers: {
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
      },
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch page data:', error);
  }

  return null;
}

/**
 * Fetch live business data for components
 */
async function fetchLiveData(tenantId: string): Promise<Record<string, any>> {
  try {
    const [businessRes, servicesRes, staffRes, productsRes] = await Promise.all([
      fetch(`${process.env.INTERNAL_API_URL}/api/tenants/${tenantId}/business`, {
        headers: { 'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}` },
      }),
      fetch(`${process.env.INTERNAL_API_URL}/api/tenants/${tenantId}/services`, {
        headers: { 'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}` },
      }),
      fetch(`${process.env.INTERNAL_API_URL}/api/tenants/${tenantId}/staff`, {
        headers: { 'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}` },
      }),
      fetch(`${process.env.INTERNAL_API_URL}/api/tenants/${tenantId}/products`, {
        headers: { 'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}` },
      }),
    ]);

    const liveData: Record<string, any> = {};

    if (businessRes.ok) {
      liveData.business = await businessRes.json();
    }

    if (servicesRes.ok) {
      liveData.services = await servicesRes.json();
    }

    if (staffRes.ok) {
      liveData.staff = await staffRes.json();
    }

    if (productsRes.ok) {
      liveData.products = await productsRes.json();
    }

    return liveData;
  } catch (error) {
    console.error('Failed to fetch live data:', error);
    return {};
  }
}

/**
 * Generate complete HTML document
 */
function generateHTML({
  tenant,
  pageData,
  pageElement,
  css,
  structuredData,
  metaTags,
  liveData,
}: {
  tenant: any;
  pageData: PageData;
  pageElement: React.ReactElement;
  css: string;
  structuredData: any;
  metaTags: string;
  liveData: Record<string, any>;
}): string {
  // Convert React element to HTML string (simplified for this implementation)
  const pageHTML = renderToString(pageElement);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  ${metaTags}
  
  <!-- Structured Data -->
  <script type="application/ld+json">
    ${JSON.stringify(structuredData, null, 2)}
  </script>
  
  <!-- Theme and Component Styles -->
  <style>
    ${css}
  </style>
  
  <!-- Favicon -->
  <link rel="icon" href="/favicon.ico" />
  
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
  <!-- Page Content -->
  ${pageHTML}
  
  <!-- Client-side Data -->
  <script>
    window.__BIZBOX_DATA__ = {
      tenant: ${JSON.stringify(tenant)},
      liveData: ${JSON.stringify(liveData)},
      pageData: ${JSON.stringify(pageData)}
    };
  </script>
  
  <!-- Client-side Scripts -->
  <script src="/js/booking-integration.js"></script>
  <script src="/js/ecommerce-integration.js"></script>
  <script src="/js/analytics.js"></script>
</body>
</html>`;
}

/**
 * Simple React element to HTML string converter
 * In a real implementation, you'd use ReactDOMServer.renderToString
 */
function renderToString(element: React.ReactElement): string {
  // This is a simplified implementation
  // In production, you'd use ReactDOMServer.renderToString or similar
  return '<div id="page-content"><!-- Server-rendered content would go here --></div>';
}