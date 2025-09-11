import { Metadata } from 'next';
import { TenantInfo } from './tenant-resolver';
import { PageData } from './component-renderer';

export interface SEOData {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  ogType?: string;
  canonicalUrl?: string;
  structuredData?: any;
}

export class SEOOptimizer {
  /**
   * Generate Next.js metadata for a page
   */
  static generateMetadata(
    tenant: TenantInfo,
    pageData: PageData,
    url: string
  ): Metadata {
    const seo = pageData.seo || {};
    const businessName = tenant.name;
    
    const title = seo.title || pageData.title || businessName;
    const description = seo.description || pageData.description || 
      `Professional services from ${businessName}. Book online today.`;
    
    const metadata: Metadata = {
      title: {
        default: title,
        template: `%s | ${businessName}`,
      },
      description,
      keywords: seo.keywords || this.generateDefaultKeywords(tenant),
      
      // Open Graph
      openGraph: {
        title,
        description,
        url,
        siteName: businessName,
        type: seo.ogType || 'website',
        images: seo.ogImage ? [
          {
            url: seo.ogImage,
            width: 1200,
            height: 630,
            alt: title,
          }
        ] : undefined,
      },
      
      // Twitter Card
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: seo.ogImage ? [seo.ogImage] : undefined,
      },
      
      // Canonical URL
      alternates: {
        canonical: seo.canonicalUrl || url,
      },
      
      // Robots
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
      
      // Verification
      verification: {
        google: process.env.GOOGLE_SITE_VERIFICATION,
      },
    };

    return metadata;
  }

  /**
   * Generate structured data (JSON-LD) for the page
   */
  static generateStructuredData(
    tenant: TenantInfo,
    pageData: PageData,
    url: string,
    liveData: Record<string, any> = {}
  ): any {
    const business = liveData.business || {};
    const services = liveData.services || [];
    const staff = liveData.staff || [];
    
    const structuredData: any = {
      '@context': 'https://schema.org',
      '@graph': [],
    };

    // Local Business
    const localBusiness = {
      '@type': 'LocalBusiness',
      '@id': `${url}#business`,
      name: tenant.name,
      description: business.description || `Professional services from ${tenant.name}`,
      url,
      telephone: business.phone,
      email: business.email,
      address: business.address ? {
        '@type': 'PostalAddress',
        streetAddress: business.address.street,
        addressLocality: business.address.city,
        addressRegion: business.address.region,
        postalCode: business.address.postalCode,
        addressCountry: business.address.country || 'GB',
      } : undefined,
      openingHours: business.openingHours || [],
      priceRange: this.generatePriceRange(services),
      image: business.logo || tenant.settings?.branding?.logo,
      sameAs: this.generateSameAsLinks(business.socialMedia || {}),
    };

    structuredData['@graph'].push(localBusiness);

    // Website
    const website = {
      '@type': 'WebSite',
      '@id': `${url}#website`,
      url,
      name: tenant.name,
      description: business.description || `Professional services from ${tenant.name}`,
      publisher: {
        '@id': `${url}#business`,
      },
    };

    structuredData['@graph'].push(website);

    // Services
    if (services.length > 0) {
      services.forEach((service: any) => {
        const serviceSchema = {
          '@type': 'Service',
          '@id': `${url}#service-${service.id}`,
          name: service.name,
          description: service.description,
          provider: {
            '@id': `${url}#business`,
          },
          offers: {
            '@type': 'Offer',
            price: service.price,
            priceCurrency: 'GBP',
            availability: 'https://schema.org/InStock',
          },
          serviceType: service.category || 'Professional Service',
          areaServed: business.serviceArea || business.address?.city,
        };

        structuredData['@graph'].push(serviceSchema);
      });
    }

    // Staff/People
    if (staff.length > 0) {
      staff.forEach((member: any) => {
        const personSchema = {
          '@type': 'Person',
          '@id': `${url}#person-${member.id}`,
          name: member.name,
          jobTitle: member.role || 'Service Professional',
          worksFor: {
            '@id': `${url}#business`,
          },
          image: member.image,
          knowsAbout: member.skills?.map((skill: any) => skill.name) || [],
        };

        structuredData['@graph'].push(personSchema);
      });
    }

    // Breadcrumbs (if applicable)
    if (pageData.slug !== '/') {
      const breadcrumbs = {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumbs`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: url.replace(pageData.slug, ''),
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: pageData.title,
            item: url,
          },
        ],
      };

      structuredData['@graph'].push(breadcrumbs);
    }

    return structuredData;
  }

  /**
   * Generate default keywords based on tenant information
   */
  private static generateDefaultKeywords(tenant: TenantInfo): string[] {
    const baseKeywords = [
      tenant.name,
      'professional services',
      'book online',
      'appointment booking',
    ];

    // Add location-based keywords if available
    if (tenant.settings?.business?.address?.city) {
      baseKeywords.push(
        `${tenant.settings.business.address.city} services`,
        `near ${tenant.settings.business.address.city}`
      );
    }

    return baseKeywords;
  }

  /**
   * Generate price range from services
   */
  private static generatePriceRange(services: any[]): string {
    if (!services.length) return '$$';

    const prices = services.map(s => s.price).filter(p => p > 0);
    if (!prices.length) return '$$';

    const min = Math.min(...prices);
    const max = Math.max(...prices);

    if (min < 25) return '$';
    if (min < 50) return '$$';
    if (min < 100) return '$$$';
    return '$$$$';
  }

  /**
   * Generate sameAs links from social media
   */
  private static generateSameAsLinks(socialMedia: Record<string, string>): string[] {
    const links: string[] = [];

    Object.entries(socialMedia).forEach(([platform, url]) => {
      if (url && url.startsWith('http')) {
        links.push(url);
      }
    });

    return links;
  }

  /**
   * Generate meta tags for head injection
   */
  static generateMetaTags(
    tenant: TenantInfo,
    pageData: PageData,
    url: string
  ): string {
    const seo = pageData.seo || {};
    const title = seo.title || pageData.title || tenant.name;
    const description = seo.description || pageData.description || 
      `Professional services from ${tenant.name}. Book online today.`;

    const tags = [
      `<title>${title}</title>`,
      `<meta name="description" content="${description}" />`,
      `<meta name="viewport" content="width=device-width, initial-scale=1" />`,
      `<link rel="canonical" href="${seo.canonicalUrl || url}" />`,
    ];

    // Keywords
    if (seo.keywords?.length) {
      tags.push(`<meta name="keywords" content="${seo.keywords.join(', ')}" />`);
    }

    // Open Graph
    tags.push(`<meta property="og:title" content="${title}" />`);
    tags.push(`<meta property="og:description" content="${description}" />`);
    tags.push(`<meta property="og:url" content="${url}" />`);
    tags.push(`<meta property="og:type" content="${seo.ogType || 'website'}" />`);
    tags.push(`<meta property="og:site_name" content="${tenant.name}" />`);

    if (seo.ogImage) {
      tags.push(`<meta property="og:image" content="${seo.ogImage}" />`);
      tags.push(`<meta property="og:image:width" content="1200" />`);
      tags.push(`<meta property="og:image:height" content="630" />`);
      tags.push(`<meta property="og:image:alt" content="${title}" />`);
    }

    // Twitter Card
    tags.push(`<meta name="twitter:card" content="summary_large_image" />`);
    tags.push(`<meta name="twitter:title" content="${title}" />`);
    tags.push(`<meta name="twitter:description" content="${description}" />`);

    if (seo.ogImage) {
      tags.push(`<meta name="twitter:image" content="${seo.ogImage}" />`);
    }

    // Robots
    tags.push(`<meta name="robots" content="index, follow" />`);

    return tags.join('\n');
  }
}