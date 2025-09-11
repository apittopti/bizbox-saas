import { headers } from 'next/headers';
import { cache } from 'react';

export interface TenantInfo {
  id: string;
  domain: string;
  subdomain?: string;
  customDomain?: string;
  name: string;
  plan: string;
  status: 'active' | 'suspended' | 'trial';
  settings: {
    theme: any;
    seo: {
      title?: string;
      description?: string;
      keywords?: string[];
    };
    routing: {
      customRoutes?: Record<string, string>;
      redirects?: Array<{ from: string; to: string; permanent: boolean }>;
    };
    features: {
      booking: boolean;
      ecommerce: boolean;
      blog: boolean;
      analytics: boolean;
    };
  };
}

export interface DomainInfo {
  type: 'subdomain' | 'custom' | 'development';
  identifier: string;
  host: string;
  isSecure: boolean;
}

export class TenantResolver {
  /**
   * Cached tenant resolution to avoid multiple API calls per request
   */
  static resolveTenant = cache(async (): Promise<TenantInfo | null> => {
    const domainInfo = this.parseDomainInfo();
    
    if (!domainInfo) {
      return null;
    }

    try {
      // Fetch tenant information from API with caching
      const response = await fetch(`${process.env.INTERNAL_API_URL}/api/tenants/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
        },
        body: JSON.stringify({ 
          identifier: domainInfo.identifier,
          type: domainInfo.type,
          host: domainInfo.host 
        }),
        next: { revalidate: 300 }, // Cache for 5 minutes
      });

      if (!response.ok) {
        return null;
      }

      const tenant = await response.json();
      
      // Validate tenant status
      if (tenant.status !== 'active' && tenant.status !== 'trial') {
        return null;
      }

      return tenant;
    } catch (error) {
      console.error('Failed to resolve tenant:', error);
      return null;
    }
  });

  /**
   * Parse domain information from request headers
   */
  private static parseDomainInfo(): DomainInfo | null {
    const headersList = headers();
    const host = headersList.get('host') || '';
    const protocol = headersList.get('x-forwarded-proto') || 'http';
    
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
   * Get tenant-specific URL routing with custom routes support
   */
  static getTenantRoutes(tenant: TenantInfo) {
    const defaultRoutes = {
      home: '/',
      services: '/services',
      booking: '/booking',
      products: '/products',
      cart: '/cart',
      checkout: '/checkout',
      about: '/about',
      contact: '/contact',
      blog: '/blog',
      gallery: '/gallery',
    };

    // Apply custom routes if configured
    if (tenant.settings?.routing?.customRoutes) {
      return { ...defaultRoutes, ...tenant.settings.routing.customRoutes };
    }

    return defaultRoutes;
  }

  /**
   * Check if a feature is enabled for the tenant
   */
  static isFeatureEnabled(tenant: TenantInfo, feature: keyof TenantInfo['settings']['features']): boolean {
    return tenant.settings?.features?.[feature] ?? false;
  }

  /**
   * Get redirects for the tenant
   */
  static getRedirects(tenant: TenantInfo): Array<{ from: string; to: string; permanent: boolean }> {
    return tenant.settings?.routing?.redirects || [];
  }

  /**
   * Resolve canonical URL for a path
   */
  static getCanonicalUrl(tenant: TenantInfo, path: string): string {
    const domainInfo = this.parseDomainInfo();
    if (!domainInfo) {
      return `https://${tenant.domain}${path}`;
    }

    const protocol = domainInfo.isSecure ? 'https' : 'http';
    
    // Prefer custom domain over subdomain
    if (tenant.customDomain) {
      return `${protocol}://${tenant.customDomain}${path}`;
    }
    
    return `${protocol}://${tenant.domain}${path}`;
  }

  /**
   * Check if current request is from the canonical domain
   */
  static isCanonicalDomain(tenant: TenantInfo): boolean {
    const domainInfo = this.parseDomainInfo();
    if (!domainInfo) {
      return false;
    }

    // If tenant has custom domain, that should be canonical
    if (tenant.customDomain) {
      return domainInfo.host === tenant.customDomain;
    }

    // Otherwise, the main domain is canonical
    return domainInfo.host === tenant.domain;
  }
}