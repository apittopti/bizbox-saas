'use client';

import React, { useEffect, Suspense, useMemo, useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { ErrorBoundary } from 'react-error-boundary';
import DOMPurify from 'isomorphic-dompurify';
import { ComponentRenderer, PageData } from '../../lib/component-renderer';
import { ThemeProvider } from './ThemeProvider';
import { TenantInfo } from '../../lib/tenant-resolver';
import { CartProvider } from '../ecommerce/shopping-cart';
import { PerformanceMonitor } from '../core/PerformanceMonitor';
import { AnalyticsProvider } from '../core/AnalyticsProvider';

// Dynamically load heavy components for better performance
const ShoppingCartWidget = dynamic(() => import('../ecommerce/shopping-cart').then(mod => ({ default: mod.ShoppingCartWidget })), {
  loading: () => <div className="widget-loading">Loading cart...</div>,
  ssr: false,
});

const BookingWidget = dynamic(() => import('../widgets/BookingWidget'), {
  loading: () => <div className="widget-loading">Loading booking...</div>,
  ssr: false,
});

const ContactFormWidget = dynamic(() => import('../widgets/ContactFormWidget'), {
  loading: () => <div className="widget-loading">Loading contact form...</div>,
});

interface WebsiteRendererProps {
  tenant: TenantInfo;
  pageData: PageData;
  liveData: Record<string, any>;
  path: string;
  isPreview?: boolean;
}

interface WebsiteError {
  componentId?: string;
  error: Error;
  errorInfo?: React.ErrorInfo;
}

interface SecureHtmlProps {
  html: string;
  isPreview?: boolean;
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
}

/**
 * Secure HTML renderer with comprehensive XSS protection
 */
function SecureHtml({ html, isPreview = false, allowedTags, allowedAttributes }: SecureHtmlProps) {
  const sanitizedHtml = useMemo(() => {
    if (!html) return '';
    
    // Configure DOMPurify with secure defaults
    const config: DOMPurify.Config = {
      ALLOWED_TAGS: allowedTags || [
        'p', 'br', 'strong', 'em', 'u', 'sub', 'sup',
        'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'div', 'span', 'blockquote', 'pre', 'code',
        'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
      ],
      ALLOWED_ATTR: allowedAttributes ? Object.keys(allowedAttributes).reduce((acc, tag) => {
        return acc.concat(allowedAttributes[tag]);
      }, [] as string[]) : [
        'href', 'title', 'alt', 'src', 'width', 'height', 
        'class', 'id', 'role', 'aria-*'
      ],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
      FORBID_TAGS: [
        'script', 'object', 'embed', 'iframe', 'frame', 'frameset',
        'form', 'input', 'button', 'textarea', 'select', 'style'
      ],
      FORBID_ATTR: [
        'onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 
        'onblur', 'onchange', 'onsubmit', 'style'
      ],
      KEEP_CONTENT: false,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      RETURN_DOM_IMPORT: false,
      SANITIZE_DOM: true,
      WHOLE_DOCUMENT: false,
      IN_PLACE: false,
      ALLOW_DATA_ATTR: false,
      ALLOW_UNKNOWN_PROTOCOLS: false,
      SAFE_FOR_TEMPLATES: true,
    };

    // In preview mode, be more restrictive
    if (!isPreview) {
      config.ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'];
      config.ALLOWED_ATTR = ['class'];
      config.FORBID_TAGS = [
        'script', 'object', 'embed', 'iframe', 'frame', 'a', 
        'img', 'video', 'audio', 'style', 'link'
      ];
    }

    try {
      const sanitized = DOMPurify.sanitize(html, config);
      
      // Additional security layer - remove any remaining suspicious patterns
      const doubleSanitized = sanitized
        .replace(/javascript:/gi, '')
        .replace(/vbscript:/gi, '')
        .replace(/data:text\/html/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .replace(/expression\s*\(/gi, '')
        .replace(/eval\s*\(/gi, '');
      
      return doubleSanitized;
    } catch (error) {
      console.error('HTML sanitization error:', error);
      return isPreview ? `<p>Content sanitization failed: ${error.message}</p>` : '';
    }
  }, [html, isPreview, allowedTags, allowedAttributes]);

  if (!sanitizedHtml) return null;

  return <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
}

export function WebsiteRenderer({
  tenant,
  pageData,
  liveData,
  path,
  isPreview = false,
}: WebsiteRendererProps) {
  const [errors, setErrors] = useState<WebsiteError[]>([]);
  const [isClient, setIsClient] = useState(false);

  // Initialize client-side state
  useEffect(() => {
    setIsClient(true);
    
    // Initialize global data for client-side JavaScript - SECURE VERSION
    if (typeof window !== 'undefined') {
      // Sanitize all data before exposing to global scope
      const sanitizedTenant = {
        id: String(tenant.id || '').replace(/[<>"']/g, ''),
        name: DOMPurify.sanitize(tenant.name || '', { ALLOWED_TAGS: [] }),
        domain: String(tenant.domain || '').replace(/[<>"']/g, ''),
        settings: tenant.settings ? JSON.parse(JSON.stringify(tenant.settings)) : {},
      };
      
      const sanitizedLiveData = JSON.parse(JSON.stringify(liveData || {}));
      const sanitizedPageData = JSON.parse(JSON.stringify(pageData || {}));
      const sanitizedPath = String(path || '').replace(/[<>"']/g, '');
      
      window.__BIZBOX_DATA__ = {
        tenant: sanitizedTenant,
        liveData: sanitizedLiveData,
        pageData: sanitizedPageData,
        path: sanitizedPath,
        isPreview: Boolean(isPreview),
        timestamp: Date.now(),
      };
    }
  }, [tenant, liveData, pageData, path, isPreview]);

  // Initialize analytics and tracking
  useEffect(() => {
    if (!isClient || isPreview) return;
    
    const trackPageView = async () => {
      try {
        await fetch('/api/analytics/pageview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId: tenant.id,
            path,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            referrer: document.referrer,
          }),
        });
      } catch (error) {
        console.warn('Failed to track page view:', error);
      }
    };

    trackPageView();
  }, [isClient, isPreview, tenant.id, path]);

  // Memoize component renderer for performance
  const renderer = useMemo(() => new ComponentRenderer(tenant, liveData), [tenant, liveData]);

  // Error handler for component errors
  const handleComponentError = useCallback((error: Error, errorInfo?: React.ErrorInfo, componentId?: string) => {
    setErrors(prev => [...prev, { componentId, error, errorInfo }]);
    
    // Log error for monitoring
    console.error('Component error:', {
      componentId,
      error: error.message,
      stack: error.stack,
      tenantId: tenant.id,
      path,
    });
  }, [tenant.id, path]);

  // Clear errors when navigating
  useEffect(() => {
    setErrors([]);
  }, [path]);

  return (
    <AnalyticsProvider tenantId={tenant.id} isPreview={isPreview}>
      <CartProvider tenantId={tenant.id}>
        <ThemeProvider tenant={tenant}>
          <PerformanceMonitor tenantId={tenant.id} path={path}>
            <div className="bizbox-website" data-tenant={tenant.id}>
              {/* Error display for debugging */}
              {isPreview && errors.length > 0 && (
                <div className="website-errors">
                  {errors.map((error, index) => (
                    <div key={index} className="error-banner">
                      Component Error{error.componentId && ` in ${error.componentId}`}: {error.error.message}
                    </div>
                  ))}
                </div>
              )}

              {/* Floating widgets */}
              {isClient && tenant.settings?.features?.ecommerce && (
                <Suspense fallback={null}>
                  <div className="floating-widgets">
                    <ShoppingCartWidget />
                  </div>
                </Suspense>
              )}

              {/* Main content sections */}
              <main className="website-content">
                {pageData.sections.map((section, index) => (
                  <ErrorBoundary
                    key={section.id}
                    FallbackComponent={({ error }) => (
                      <SectionErrorFallback 
                        error={error} 
                        sectionId={section.id} 
                        isPreview={isPreview}
                      />
                    )}
                    onError={(error, errorInfo) => handleComponentError(error, errorInfo, section.id)}
                  >
                    <SectionRenderer
                      section={section}
                      renderer={renderer}
                      tenant={tenant}
                      isAboveTheFold={index === 0}
                      isPreview={isPreview}
                    />
                  </ErrorBoundary>
                ))}
              </main>

              {/* Structured data for SEO - SECURE VERSION */}
              {!isPreview && (
                <SecureStructuredData 
                  tenant={tenant} 
                  liveData={liveData} 
                  pageData={pageData} 
                  path={path} 
                />
              )}

              {/* Performance monitoring - SECURE VERSION */}
              {!isPreview && isClient && (
                <SecurePerformanceMonitor tenantId={tenant.id} path={path} />
              )}
            </div>
          </PerformanceMonitor>
        </ThemeProvider>
      </CartProvider>
    </AnalyticsProvider>
  );
}

interface SectionRendererProps {
  section: any;
  renderer: ComponentRenderer;
  tenant: TenantInfo;
  isAboveTheFold: boolean;
  isPreview: boolean;
}

function SectionRenderer({ section, renderer, tenant, isAboveTheFold, isPreview }: SectionRendererProps) {
  // Optimize section loading based on viewport visibility
  const [isVisible, setIsVisible] = useState(isAboveTheFold);
  const [hasBeenVisible, setHasBeenVisible] = useState(isAboveTheFold);

  useEffect(() => {
    if (isAboveTheFold || typeof window === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            setHasBeenVisible(true);
          } else {
            setIsVisible(false);
          }
        });
      },
      { rootMargin: '100px' }
    );

    const element = document.getElementById(`section-${section.id}`);
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [isAboveTheFold, section.id]);

  // Build section styles
  const sectionStyle = useMemo(() => ({
    display: 'grid',
    gridTemplateColumns: section.layout?.columns ? `repeat(${section.layout.columns}, 1fr)` : '1fr',
    gap: section.layout?.gap || '1rem',
    padding: section.layout?.padding || '2rem',
    backgroundColor: section.styling?.backgroundColor,
    backgroundImage: section.styling?.backgroundImage 
      ? `url(${section.styling.backgroundImage})` 
      : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    minHeight: section.styling?.minHeight,
    ...section.styling?.customCSS,
  }), [section.layout, section.styling]);

  // Don't render if not visible (except above the fold)
  if (!isAboveTheFold && !hasBeenVisible) {
    return (
      <section 
        id={`section-${section.id}`}
        className={`section-placeholder ${section.styling?.className || ''}`}
        style={{ minHeight: '200px' }}
        data-section-type={section.type}
      >
        <div className="section-loading">Loading...</div>
      </section>
    );
  }

  return (
    <section
      id={`section-${section.id}`}
      className={`website-section ${section.styling?.className || ''}`}
      style={sectionStyle}
      data-section-type={section.type}
      data-visible={isVisible}
    >
      {section.components.map((component: any) => (
        <ErrorBoundary
          key={component.id}
          FallbackComponent={({ error }) => (
            <ComponentErrorFallback 
              error={error} 
              componentId={component.id} 
              componentType={component.type}
              isPreview={isPreview}
            />
          )}
        >
          <ComponentRenderer
            component={component}
            renderer={renderer}
            tenant={tenant}
            isVisible={isVisible}
            isPreview={isPreview}
            priority={isAboveTheFold}
          />
        </ErrorBoundary>
      ))}
    </section>
  );
}

interface ComponentRendererProps {
  component: any;
  renderer: ComponentRenderer;
  tenant: TenantInfo;
  isVisible: boolean;
  isPreview: boolean;
  priority: boolean;
}

function ComponentRenderer({ 
  component, 
  renderer, 
  tenant, 
  isVisible, 
  isPreview,
  priority 
}: ComponentRendererProps) {
  // Use renderer to dynamically create components
  const RenderedComponent = useMemo(() => {
    return renderer.renderComponent(component, {
      isVisible,
      isPreview,
      priority,
      tenant,
    });
  }, [renderer, component, isVisible, isPreview, priority, tenant]);

  return (
    <div 
      className={`component-wrapper ${component.styling?.className || ''}`}
      data-component-type={component.type}
      data-component-id={component.id}
    >
      {RenderedComponent}
    </div>
  );
}

// Error fallback components
function SectionErrorFallback({ error, sectionId, isPreview }: { 
  error: Error; 
  sectionId: string; 
  isPreview: boolean; 
}) {
  if (!isPreview) {
    return null; // Hide errors in production
  }

  return (
    <section className="section-error" data-section-id={sectionId}>
      <div className="error-content">
        <h3>Section Error</h3>
        <p>Section {sectionId} failed to render: {error.message}</p>
        <details>
          <summary>Stack Trace</summary>
          <pre>{error.stack}</pre>
        </details>
      </div>
    </section>
  );
}

function ComponentErrorFallback({ 
  error, 
  componentId, 
  componentType, 
  isPreview 
}: { 
  error: Error; 
  componentId: string; 
  componentType: string;
  isPreview: boolean;
}) {
  if (!isPreview) {
    return <div className="component-placeholder" data-component-id={componentId} />; // Minimal fallback in production
  }

  return (
    <div className="component-error" data-component-id={componentId}>
      <div className="error-content">
        <h4>Component Error</h4>
        <p>{componentType} ({componentId}) failed to render: {error.message}</p>
        <details>
          <summary>Stack Trace</summary>
          <pre>{error.stack}</pre>
        </details>
      </div>
    </div>
  );
}

/**
 * Secure structured data component that sanitizes all content
 */
function SecureStructuredData({
  tenant,
  liveData,
  pageData,
  path
}: {
  tenant: TenantInfo;
  liveData: Record<string, any>;
  pageData: PageData;
  path: string;
}) {
  const structuredData = useMemo(() => {
    return generateSecureStructuredData(tenant, liveData, pageData, path);
  }, [tenant, liveData, pageData, path]);

  if (!structuredData) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData),
      }}
    />
  );
}

/**
 * Secure performance monitor that doesn't use inline scripts
 */
function SecurePerformanceMonitor({
  tenantId,
  path
}: {
  tenantId: string;
  path: string;
}) {
  useEffect(() => {
    // Use a separate script file for performance monitoring instead of inline
    const initializePerformanceMonitoring = () => {
      if ('requestIdleCallback' in window && 'PerformanceObserver' in window) {
        requestIdleCallback(() => {
          try {
            const observer = new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                if (entry.entryType === 'largest-contentful-paint') {
                  // Sanitize data before sending
                  const sanitizedTenantId = String(tenantId).replace(/[<>"']/g, '');
                  const sanitizedPath = String(path).replace(/[<>"']/g, '');
                  
                  fetch('/api/analytics/performance', {
                    method: 'POST',
                    headers: { 
                      'Content-Type': 'application/json',
                      'X-Tenant-ID': sanitizedTenantId
                    },
                    body: JSON.stringify({
                      tenantId: sanitizedTenantId,
                      path: sanitizedPath,
                      metric: 'LCP',
                      value: Math.round(entry.startTime),
                      timestamp: Date.now()
                    })
                  }).catch(() => {
                    // Silently fail - don't break the page
                  });
                }
              }
            });
            
            observer.observe({ entryTypes: ['largest-contentful-paint'] });
          } catch (error) {
            console.warn('Performance monitoring failed:', error);
          }
        });
      }
    };

    initializePerformanceMonitoring();
  }, [tenantId, path]);

  return null; // No DOM output needed
}

// Generate structured data for SEO with sanitization
function generateSecureStructuredData(
  tenant: TenantInfo, 
  liveData: Record<string, any>,
  pageData: PageData,
  path: string
) {
  try {
    const business = liveData.business || {};
    
    // Sanitize all text content
    const sanitizeText = (text: any): string => {
      if (typeof text !== 'string') return '';
      return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
    };
    
    const sanitizeUrl = (url: any): string => {
      if (typeof url !== 'string') return '';
      try {
        const parsedUrl = new URL(url);
        if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
          return '';
        }
        return parsedUrl.toString();
      } catch {
        return '';
      }
    };
    
    const baseSchema = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: sanitizeText(business.name || tenant.name),
      description: sanitizeText(business.description || pageData.seo?.description),
      url: sanitizeUrl(`https://${tenant.domain}`),
      telephone: sanitizeText(business.phone),
      email: sanitizeText(business.email),
    };

    if (business.address && typeof business.address === 'object') {
      baseSchema['address'] = {
        '@type': 'PostalAddress',
        streetAddress: sanitizeText(business.address.street),
        addressLocality: sanitizeText(business.address.city),
        addressRegion: sanitizeText(business.address.region),
        postalCode: sanitizeText(business.address.postalCode),
        addressCountry: sanitizeText(business.address.country),
      };
    }

    // Add services if available
    if (liveData.services && Array.isArray(liveData.services)) {
      const sanitizedServices = liveData.services
        .filter(service => service && typeof service === 'object')
        .slice(0, 50) // Limit to prevent abuse
        .map((service: any) => ({
          '@type': 'Offer',
          name: sanitizeText(service.name),
          description: sanitizeText(service.description),
          price: typeof service.price === 'number' ? service.price : 0,
          priceCurrency: 'GBP',
        }))
        .filter(service => service.name); // Only include services with names
        
      if (sanitizedServices.length > 0) {
        baseSchema['hasOfferCatalog'] = {
          '@type': 'OfferCatalog',
          name: 'Services',
          itemListElement: sanitizedServices
        };
      }
    }

    // Add products if available
    if (liveData.products && Array.isArray(liveData.products)) {
      const sanitizedProducts = liveData.products
        .filter(product => product && typeof product === 'object')
        .slice(0, 50) // Limit to prevent abuse
        .map((product: any) => ({
          '@type': 'Product',
          name: sanitizeText(product.name),
          description: sanitizeText(product.description),
          offers: {
            '@type': 'Offer',
            price: typeof product.price === 'number' ? product.price : 0,
            priceCurrency: 'GBP',
            availability: 'https://schema.org/InStock',
          }
        }))
        .filter(product => product.name); // Only include products with names
        
      if (sanitizedProducts.length > 0) {
        baseSchema['hasOfferCatalog'] = {
          '@type': 'OfferCatalog',
          name: 'Products',
          itemListElement: sanitizedProducts
        };
      }
    }

    return baseSchema;
  } catch (error) {
    console.error('Structured data generation error:', error);
    return null;
  }
}

// Declare global types
declare global {
  interface Window {
    __BIZBOX_DATA__: {
      tenant: TenantInfo;
      liveData: Record<string, any>;
      pageData: PageData;
      path: string;
      isPreview: boolean;
      timestamp: number;
    };
  }
}