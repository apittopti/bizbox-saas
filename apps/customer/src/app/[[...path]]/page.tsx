import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { TenantResolver } from '../../lib/tenant-resolver';
import { SEOOptimizer } from '../../lib/seo-optimizer';
import { CustomerSiteRenderer } from '../../components/customer-site-renderer';

interface PageProps {
  params: {
    path?: string[];
  };
}

/**
 * Generate metadata for the page
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const tenant = await TenantResolver.resolveTenant();
  
  if (!tenant) {
    return {
      title: 'Page Not Found',
      description: 'The requested page could not be found.',
    };
  }

  const path = params.path ? `/${params.path.join('/')}` : '/';
  
  // Fetch page data for SEO
  const pageData = await fetchPageData(tenant.id, path);
  
  if (!pageData) {
    return {
      title: 'Page Not Found',
      description: 'The requested page could not be found.',
    };
  }

  const url = `https://${tenant.domain}${path}`;
  return SEOOptimizer.generateMetadata(tenant, pageData, url);
}

/**
 * Main page component
 */
export default async function CustomerSitePage({ params }: PageProps) {
  // Resolve tenant
  const tenant = await TenantResolver.resolveTenant();
  
  if (!tenant) {
    notFound();
  }

  const path = params.path ? `/${params.path.join('/')}` : '/';
  
  // Fetch page data
  const pageData = await fetchPageData(tenant.id, path);
  
  if (!pageData) {
    notFound();
  }

  // Check if page is published
  if (!pageData.isPublished) {
    notFound();
  }

  // Fetch live data
  const liveData = await fetchLiveData(tenant.id);

  return (
    <CustomerSiteRenderer
      tenant={tenant}
      pageData={pageData}
      liveData={liveData}
      path={path}
    />
  );
}

/**
 * Fetch page data from the website builder
 */
async function fetchPageData(tenantId: string, path: string) {
  try {
    const response = await fetch(`${process.env.INTERNAL_API_URL}/api/tenants/${tenantId}/pages${path}`, {
      headers: {
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
      },
      next: { revalidate: 300 }, // Revalidate every 5 minutes
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch page data:', error);
  }

  // Return default page data for development
  if (tenantId === 'demo-tenant-id') {
    return {
      id: 'home-page',
      slug: path,
      title: path === '/' ? 'Home' : path.substring(1).replace(/-/g, ' '),
      description: 'Welcome to our professional services',
      isPublished: true,
      sections: [
        {
          id: 'hero-section',
          type: 'hero',
          components: [
            {
              id: 'hero-component',
              type: 'hero',
              props: {
                title: 'Welcome to Demo Business',
                subtitle: 'Professional services you can trust',
                ctaText: 'Book Now',
                backgroundImage: '/images/hero-bg.jpg',
              },
              styling: {
                className: 'hero-main',
              },
            },
          ],
          layout: {
            columns: 1,
            gap: '0',
            padding: '0',
          },
          styling: {},
        },
        {
          id: 'services-section',
          type: 'services',
          components: [
            {
              id: 'services-component',
              type: 'services',
              props: {
                title: 'Our Services',
              },
              dataBinding: {
                source: 'services',
                fields: {
                  services: 'services',
                },
              },
              styling: {
                className: 'services-main',
              },
            },
          ],
          layout: {
            columns: 1,
            gap: '2rem',
            padding: '4rem 2rem',
          },
          styling: {
            backgroundColor: '#f8fafc',
          },
        },
      ],
      theme: {
        colors: {
          primary: '#2563eb',
          secondary: '#64748b',
          accent: '#f1f5f9',
          background: '#ffffff',
          foreground: '#0f172a',
          muted: '#64748b',
          border: '#e2e8f0',
        },
      },
      seo: {
        title: 'Demo Business - Professional Services',
        description: 'Professional services from Demo Business. Book online today.',
        keywords: ['demo business', 'professional services', 'book online'],
      },
    };
  }

  return null;
}

/**
 * Fetch live business data
 */
async function fetchLiveData(tenantId: string) {
  try {
    const [businessRes, servicesRes, staffRes, productsRes] = await Promise.all([
      fetch(`${process.env.INTERNAL_API_URL}/api/tenants/${tenantId}/business`, {
        headers: { 'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}` },
        next: { revalidate: 300 },
      }),
      fetch(`${process.env.INTERNAL_API_URL}/api/tenants/${tenantId}/services`, {
        headers: { 'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}` },
        next: { revalidate: 300 },
      }),
      fetch(`${process.env.INTERNAL_API_URL}/api/tenants/${tenantId}/staff`, {
        headers: { 'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}` },
        next: { revalidate: 300 },
      }),
      fetch(`${process.env.INTERNAL_API_URL}/api/tenants/${tenantId}/products`, {
        headers: { 'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}` },
        next: { revalidate: 300 },
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
  }

  // Return mock data for development
  return {
    business: {
      name: 'Demo Business',
      description: 'Professional services you can trust',
      phone: '+44 20 1234 5678',
      email: 'info@demobusiness.com',
      address: {
        street: '123 High Street',
        city: 'London',
        region: 'England',
        postalCode: 'SW1A 1AA',
        country: 'GB',
      },
    },
    services: [
      {
        id: 'service-1',
        name: 'Premium Service',
        description: 'Our premium service offering with comprehensive care',
        duration: 60,
        price: 75,
        category: 'Premium',
      },
      {
        id: 'service-2',
        name: 'Standard Service',
        description: 'Quality service at an affordable price',
        duration: 45,
        price: 50,
        category: 'Standard',
      },
    ],
    staff: [
      {
        id: 'staff-1',
        name: 'John Smith',
        role: 'Senior Professional',
        image: '/images/staff-1.jpg',
        skills: [
          { id: 'skill-1', name: 'Premium Services' },
          { id: 'skill-2', name: 'Consultation' },
        ],
      },
    ],
    products: [
      {
        id: 'product-1',
        name: 'Professional Kit',
        description: 'Complete professional kit for home use',
        price: 29.99,
        images: ['/images/product-1.jpg'],
      },
    ],
  };
}