import { Metadata } from 'next';
import { TenantInfo } from './tenant-resolver';
import { PageData } from './enhanced-component-renderer';

export interface AdvancedSEOData {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  ogType?: string;
  canonicalUrl?: string;
  structuredData?: any;
  hreflang?: Record<string, string>;
  priority?: number;
  changeFreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  lastModified?: string;
}

export interface BusinessSchema {
  name: string;
  type: string;
  description?: string;
  address?: any;
  phone?: string;
  email?: string;
  website?: string;
  socialMedia?: Record<string, string>;
  openingHours?: any[];
  priceRange?: string;
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
  };
}

export class AdvancedSEOOptimizer {
  private static readonly DEFAULT_OG_IMAGE = '/images/default-og-image.jpg';
  private static readonly SCHEMA_CONTEXT = 'https://schema.org';
  
  /**
   * Generate comprehensive Next.js metadata with advanced SEO features
   */
  static generateAdvancedMetadata(
    tenant: TenantInfo,
    pageData: PageData,
    url: string,
    liveData: Record<string, any> = {}
  ): Metadata {
    const seo = pageData.seo || {};
    const business = liveData.business || {};
    const businessName = business.name || tenant.name;
    
    // Enhanced title generation
    const pageTitle = this.generateOptimizedTitle(seo.title, pageData.title, businessName, pageData.slug);
    const description = this.generateOptimizedDescription(seo.description, pageData.description, businessName, liveData);
    const keywords = this.generateAdvancedKeywords(tenant, liveData, seo.keywords);
    
    // Generate optimized images
    const images = this.generateOptimizedImages(seo.ogImage, business.logo, tenant.domain, pageTitle);
    
    const metadata: Metadata = {
      title: {
        default: pageTitle,
        template: `%s | ${businessName}`,
      },
      description,
      keywords: keywords.join(', '),
      
      // Enhanced Open Graph
      openGraph: {
        title: pageTitle,
        description,
        url,
        siteName: businessName,
        type: this.determineOpenGraphType(pageData, seo.ogType),
        images: images.map(img => ({
          url: img.url,
          width: img.width,
          height: img.height,
          alt: img.alt,
          type: img.type,
        })),
        locale: 'en_GB',
        alternateLocale: tenant.settings?.locales || [],
      },
      
      // Enhanced Twitter Card
      twitter: {
        card: images.length > 0 ? 'summary_large_image' : 'summary',
        title: pageTitle,
        description,
        images: images.map(img => img.url),
        creator: business.twitterHandle,
        site: business.twitterHandle,
      },
      
      // Canonical and alternate URLs
      alternates: {
        canonical: this.generateCanonicalUrl(tenant, pageData.slug, seo.canonicalUrl),
        languages: seo.hreflang || {},
      },
      
      // Enhanced robots configuration
      robots: {
        index: this.shouldIndex(pageData),
        follow: this.shouldFollow(pageData),
        noarchive: false,
        nosnippet: false,
        noimageindex: false,
        googleBot: {
          index: this.shouldIndex(pageData),
          follow: this.shouldFollow(pageData),
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
          noimageindex: false,
        },
      },
      
      // Additional meta tags
      other: {
        'theme-color': tenant.settings?.theme?.colors?.primary || '#2563eb',
        'msapplication-TileColor': tenant.settings?.theme?.colors?.primary || '#2563eb',
        'apple-mobile-web-app-capable': 'yes',
        'apple-mobile-web-app-status-bar-style': 'default',
        'format-detection': 'telephone=yes',
        'mobile-web-app-capable': 'yes',
      },
      
      // Verification tags
      verification: {
        google: process.env.GOOGLE_SITE_VERIFICATION || tenant.settings?.seo?.googleVerification,
        yandex: tenant.settings?.seo?.yandexVerification,
        yahoo: tenant.settings?.seo?.yahooVerification,
        other: {
          'facebook-domain-verification': tenant.settings?.seo?.facebookVerification,
          'p:domain_verify': tenant.settings?.seo?.pinterestVerification,
        },
      },
      
      // App-specific metadata
      ...(tenant.settings?.features?.pwa && {
        manifest: '/manifest.json',
        appleWebApp: {
          capable: true,
          title: businessName,
          statusBarStyle: 'default',
        },
      }),
    };

    return metadata;
  }

  /**
   * Generate comprehensive structured data (JSON-LD)
   */
  static generateAdvancedStructuredData(
    tenant: TenantInfo,
    pageData: PageData,
    url: string,
    liveData: Record<string, any> = {}
  ): any {
    const business = liveData.business || {};
    const services = liveData.services || [];
    const staff = liveData.staff || [];
    const products = liveData.products || [];
    const reviews = liveData.reviews || [];
    
    const structuredData = {
      '@context': this.SCHEMA_CONTEXT,
      '@graph': [] as any[],
    };

    // Local Business Schema (enhanced)
    const localBusiness = this.generateLocalBusinessSchema(tenant, business, url, services, reviews);
    structuredData['@graph'].push(localBusiness);

    // Website Schema
    const website = this.generateWebsiteSchema(tenant, business, url);
    structuredData['@graph'].push(website);

    // Organization Schema (for branding)
    const organization = this.generateOrganizationSchema(tenant, business, url);
    structuredData['@graph'].push(organization);

    // Services Schemas
    services.forEach((service: any) => {
      const serviceSchema = this.generateServiceSchema(service, url, localBusiness['@id']);
      structuredData['@graph'].push(serviceSchema);
    });

    // Staff/Person Schemas
    staff.forEach((member: any) => {
      const personSchema = this.generatePersonSchema(member, url, localBusiness['@id']);
      structuredData['@graph'].push(personSchema);
    });

    // Product Schemas (if e-commerce enabled)
    if (tenant.settings?.features?.ecommerce && products.length > 0) {
      products.forEach((product: any) => {
        const productSchema = this.generateProductSchema(product, url, organization['@id']);
        structuredData['@graph'].push(productSchema);
      });
    }

    // Review/Rating Schemas
    if (reviews.length > 0) {
      reviews.slice(0, 5).forEach((review: any, index: number) => {
        const reviewSchema = this.generateReviewSchema(review, url, localBusiness['@id'], index);
        structuredData['@graph'].push(reviewSchema);
      });
    }

    // Page-specific schemas
    if (pageData.slug !== '/') {
      const webPage = this.generateWebPageSchema(pageData, url, website['@id']);
      structuredData['@graph'].push(webPage);

      // Breadcrumbs
      const breadcrumbs = this.generateBreadcrumbSchema(pageData, url);
      structuredData['@graph'].push(breadcrumbs);
    }

    // FAQ Schema (if FAQ component exists)
    const faqData = this.extractFAQData(pageData);
    if (faqData.length > 0) {
      const faqSchema = this.generateFAQSchema(faqData);
      structuredData['@graph'].push(faqSchema);
    }

    return structuredData;
  }

  /**
   * Generate sitemap data for the tenant
   */
  static generateSitemapData(
    tenant: TenantInfo,
    pages: PageData[],
    liveData: Record<string, any> = {}
  ): any[] {
    const baseUrl = this.getCanonicalDomain(tenant);
    const services = liveData.services || [];
    const products = liveData.products || [];
    const blogPosts = liveData.blogPosts || [];
    
    const sitemapEntries = [];

    // Static pages
    pages.forEach(page => {
      if (page.isPublished) {
        sitemapEntries.push({
          url: `${baseUrl}${page.slug}`,
          lastModified: page.lastModified || new Date().toISOString(),
          changeFreq: page.seo?.changeFreq || this.determineChangeFrequency(page.slug),
          priority: page.seo?.priority || this.determinePriority(page.slug),
        });
      }
    });

    // Service pages
    services.forEach((service: any) => {
      sitemapEntries.push({
        url: `${baseUrl}/services/${service.slug || service.id}`,
        lastModified: service.updatedAt || new Date().toISOString(),
        changeFreq: 'weekly' as const,
        priority: 0.7,
      });
    });

    // Product pages (if e-commerce enabled)
    if (tenant.settings?.features?.ecommerce) {
      products.forEach((product: any) => {
        sitemapEntries.push({
          url: `${baseUrl}/products/${product.slug || product.id}`,
          lastModified: product.updatedAt || new Date().toISOString(),
          changeFreq: 'daily' as const,
          priority: 0.8,
        });
      });
    }

    // Blog posts (if blog enabled)
    if (tenant.settings?.features?.blog) {
      blogPosts.forEach((post: any) => {
        sitemapEntries.push({
          url: `${baseUrl}/blog/${post.slug}`,
          lastModified: post.updatedAt || post.publishedAt,
          changeFreq: 'monthly' as const,
          priority: 0.6,
        });
      });
    }

    return sitemapEntries;
  }

  // Private helper methods

  private static generateOptimizedTitle(
    seoTitle?: string, 
    pageTitle?: string, 
    businessName?: string, 
    slug?: string
  ): string {
    if (seoTitle) return seoTitle;
    
    if (slug === '/') {
      return `${businessName} - Professional Services & Online Booking`;
    }
    
    const title = pageTitle || this.slugToTitle(slug || '');
    return `${title} | ${businessName}`;
  }

  private static generateOptimizedDescription(
    seoDescription?: string,
    pageDescription?: string,
    businessName?: string,
    liveData: Record<string, any> = {}
  ): string {
    if (seoDescription) return seoDescription;
    if (pageDescription) return pageDescription;
    
    const business = liveData.business || {};
    const services = liveData.services || [];
    
    let description = `Professional services from ${businessName}. `;
    
    if (services.length > 0) {
      const serviceNames = services.slice(0, 3).map((s: any) => s.name).join(', ');
      description += `We offer ${serviceNames} and more. `;
    }
    
    description += 'Book online today for convenient scheduling.';
    
    if (business.address?.city) {
      description += ` Located in ${business.address.city}.`;
    }
    
    return description;
  }

  private static generateAdvancedKeywords(
    tenant: TenantInfo,
    liveData: Record<string, any> = {},
    customKeywords?: string[]
  ): string[] {
    const keywords = new Set<string>();
    
    // Custom keywords first
    customKeywords?.forEach(keyword => keywords.add(keyword.toLowerCase()));
    
    // Business name variations
    keywords.add(tenant.name.toLowerCase());
    const nameWords = tenant.name.toLowerCase().split(' ');
    nameWords.forEach(word => keywords.add(word));
    
    // Service-based keywords
    const services = liveData.services || [];
    services.forEach((service: any) => {
      keywords.add(service.name.toLowerCase());
      if (service.category) keywords.add(service.category.toLowerCase());
    });
    
    // Location-based keywords
    const business = liveData.business || {};
    if (business.address) {
      keywords.add(`${business.address.city} services`.toLowerCase());
      keywords.add(`near ${business.address.city}`.toLowerCase());
      keywords.add(`${business.address.region}`.toLowerCase());
    }
    
    // Industry keywords
    keywords.add('professional services');
    keywords.add('book online');
    keywords.add('appointment booking');
    keywords.add('online scheduling');
    
    // Feature-based keywords
    if (tenant.settings?.features?.ecommerce) {
      keywords.add('buy online');
      keywords.add('online store');
    }
    
    return Array.from(keywords);
  }

  private static generateLocalBusinessSchema(
    tenant: TenantInfo,
    business: any,
    url: string,
    services: any[],
    reviews: any[]
  ): any {
    const schema = {
      '@type': this.determineBusinessType(business.type || services),
      '@id': `${url}#business`,
      name: business.name || tenant.name,
      description: business.description || `Professional services from ${tenant.name}`,
      url,
      telephone: business.phone,
      email: business.email,
      image: business.logo || business.photos?.[0] || `${url}/images/logo.png`,
      logo: business.logo || `${url}/images/logo.png`,
      priceRange: this.generatePriceRange(services),
      currenciesAccepted: 'GBP',
      paymentAccepted: 'Cash, Credit Card, Bank Transfer',
      openingHours: this.formatOpeningHours(business.openingHours || []),
      sameAs: this.generateSameAsLinks(business.socialMedia || {}),
    } as any;

    // Address
    if (business.address) {
      schema.address = {
        '@type': 'PostalAddress',
        streetAddress: business.address.street,
        addressLocality: business.address.city,
        addressRegion: business.address.region,
        postalCode: business.address.postalCode,
        addressCountry: business.address.country || 'GB',
      };
      
      // Geo coordinates if available
      if (business.address.latitude && business.address.longitude) {
        schema.geo = {
          '@type': 'GeoCoordinates',
          latitude: business.address.latitude,
          longitude: business.address.longitude,
        };
      }
    }

    // Service area
    if (business.serviceArea) {
      schema.areaServed = business.serviceArea.map((area: string) => ({
        '@type': 'City',
        name: area,
      }));
    }

    // Aggregate rating from reviews
    if (reviews.length > 0) {
      const ratings = reviews.map((r: any) => r.rating).filter((r: number) => r > 0);
      if (ratings.length > 0) {
        schema.aggregateRating = {
          '@type': 'AggregateRating',
          ratingValue: (ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length).toFixed(1),
          reviewCount: ratings.length,
          bestRating: 5,
          worstRating: 1,
        };
      }
    }

    return schema;
  }

  private static generateWebsiteSchema(tenant: TenantInfo, business: any, url: string): any {
    return {
      '@type': 'WebSite',
      '@id': `${url}#website`,
      url,
      name: business.name || tenant.name,
      description: business.description || `Professional services website for ${tenant.name}`,
      publisher: { '@id': `${url}#business` },
      potentialAction: {
        '@type': 'SearchAction',
        target: `${url}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    };
  }

  private static generateOrganizationSchema(tenant: TenantInfo, business: any, url: string): any {
    return {
      '@type': 'Organization',
      '@id': `${url}#organization`,
      name: business.name || tenant.name,
      url,
      logo: business.logo || `${url}/images/logo.png`,
      sameAs: this.generateSameAsLinks(business.socialMedia || {}),
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: business.phone,
        contactType: 'customer service',
        email: business.email,
        availableLanguage: ['English'],
      },
    };
  }

  private static generateServiceSchema(service: any, baseUrl: string, providerId: string): any {
    return {
      '@type': 'Service',
      '@id': `${baseUrl}#service-${service.id}`,
      name: service.name,
      description: service.description,
      provider: { '@id': providerId },
      serviceType: service.category || 'Professional Service',
      offers: {
        '@type': 'Offer',
        price: service.price,
        priceCurrency: 'GBP',
        availability: 'https://schema.org/InStock',
        validFrom: new Date().toISOString(),
      },
      areaServed: service.serviceArea,
      hoursAvailable: service.availability,
    };
  }

  private static generateProductSchema(product: any, baseUrl: string, brandId: string): any {
    return {
      '@type': 'Product',
      '@id': `${baseUrl}#product-${product.id}`,
      name: product.name,
      description: product.description,
      image: product.images || [],
      brand: { '@id': brandId },
      sku: product.sku || product.id,
      offers: {
        '@type': 'Offer',
        price: product.price,
        priceCurrency: 'GBP',
        availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        priceValidUntil: product.priceValidUntil,
      },
      aggregateRating: product.rating ? {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: product.reviewCount || 1,
      } : undefined,
    };
  }

  // Additional helper methods...
  
  private static determineBusinessType(businessType?: string): string {
    const typeMap: Record<string, string> = {
      'beauty': 'BeautySalon',
      'health': 'MedicalClinic',
      'fitness': 'ExerciseGym',
      'automotive': 'AutoRepair',
      'professional': 'ProfessionalService',
      'restaurant': 'Restaurant',
      'retail': 'Store',
    };
    
    return typeMap[businessType?.toLowerCase() || 'professional'] || 'LocalBusiness';
  }

  private static determineOpenGraphType(pageData: PageData, customType?: string): string {
    if (customType) return customType;
    if (pageData.slug === '/') return 'website';
    if (pageData.slug.includes('product')) return 'product';
    if (pageData.slug.includes('blog')) return 'article';
    return 'website';
  }

  private static getCanonicalDomain(tenant: TenantInfo): string {
    return tenant.customDomain || tenant.domain;
  }

  private static slugToTitle(slug: string): string {
    return slug.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '';
  }

  // ... additional helper methods for completeness
}