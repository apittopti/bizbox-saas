import * as React from 'react';
import { ComponentProps, ComponentRenderer, componentLibrary } from '../components/component-library';
import { advancedComponents } from '../components/advanced-components';

export interface PageData {
  id: string;
  tenantId: string;
  slug: string;
  title: string;
  description?: string;
  components: ComponentProps[];
  seoData?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    ogImage?: string;
  };
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    customCSS?: string;
  };
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessData {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  contact: {
    email: string;
    phone: string;
    address: string;
  };
  socialMedia: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
  about?: string;
  gallery?: Array<{
    id: string;
    url: string;
    alt: string;
    caption?: string;
  }>;
  testimonials?: Array<{
    id: string;
    name: string;
    rating: number;
    comment: string;
    avatar?: string;
    service?: string;
  }>;
  faqs?: Array<{
    id: string;
    question: string;
    answer: string;
  }>;
}

export interface RenderContext {
  businessData?: BusinessData;
  services?: any[];
  staff?: any[];
  packages?: any[];
  isPreview?: boolean;
  editMode?: boolean;
}

// Combine all component definitions
const allComponents = {
  ...componentLibrary,
  ...advancedComponents,
};

export class PageRenderer {
  /**
   * Render a complete page with all components
   */
  static renderPage(
    pageData: PageData,
    context: RenderContext = {}
  ): React.ReactElement {
    const { components, theme, seoData } = pageData;
    const { businessData, services, staff, packages, isPreview, editMode } = context;

    // Apply theme styles
    const themeStyles = theme ? PageRenderer.generateThemeStyles(theme) : '';

    return (
      <div className="page-container" data-page-id={pageData.id}>
        {/* SEO Head (would be handled by Next.js Head in real implementation) */}
        {seoData && !isPreview && (
          <div className="seo-meta" style={{ display: 'none' }}>
            <meta name="title" content={seoData.metaTitle || pageData.title} />
            <meta name="description" content={seoData.metaDescription || pageData.description} />
            {seoData.keywords && (
              <meta name="keywords" content={seoData.keywords.join(', ')} />
            )}
            {seoData.ogImage && (
              <meta property="og:image" content={seoData.ogImage} />
            )}
          </div>
        )}

        {/* Theme Styles */}
        {themeStyles && (
          <style dangerouslySetInnerHTML={{ __html: themeStyles }} />
        )}

        {/* Page Components */}
        <div className={`page-content ${editMode ? 'edit-mode' : ''}`}>
          {components.map((component, index) => (
            <div
              key={component.id}
              className={`component-wrapper ${editMode ? 'editable' : ''}`}
              data-component-id={component.id}
              data-component-type={component.type}
              data-component-index={index}
            >
              {PageRenderer.renderComponent(component, {
                businessData,
                services,
                staff,
                packages,
              })}
              {editMode && (
                <div className="component-controls">
                  <button className="edit-btn">Edit</button>
                  <button className="delete-btn">Delete</button>
                  <button className="move-up-btn">↑</button>
                  <button className="move-down-btn">↓</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Edit Mode Overlay */}
        {editMode && (
          <div className="edit-overlay">
            <div className="component-palette">
              <h3>Add Components</h3>
              {Object.entries(allComponents).map(([type, definition]) => (
                <button
                  key={type}
                  className="component-button"
                  data-component-type={type}
                >
                  <span className="icon">{definition.icon}</span>
                  <span className="name">{definition.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  /**
   * Render a single component with data binding
   */
  static renderComponent(
    component: ComponentProps,
    context: {
      businessData?: BusinessData;
      services?: any[];
      staff?: any[];
      packages?: any[];
    }
  ): React.ReactElement {
    const definition = allComponents[component.type];
    if (!definition) {
      return (
        <div className="error-component">
          <p>Unknown component: {component.type}</p>
        </div>
      );
    }

    try {
      const Component = definition.renderComponent;
      const props = {
        ...definition.defaultProps,
        ...component.props,
        ...context,
      };

      return <Component key={component.id} {...props} />;
    } catch (error) {
      console.error(`Error rendering component ${component.type}:`, error);
      return (
        <div className="error-component">
          <p>Error rendering component: {component.type}</p>
        </div>
      );
    }
  }

  /**
   * Generate CSS styles from theme configuration
   */
  static generateThemeStyles(theme: PageData['theme']): string {
    if (!theme) return '';

    const styles: string[] = [];

    // CSS Custom Properties
    styles.push(':root {');
    
    if (theme.primaryColor) {
      styles.push(`  --color-primary: ${theme.primaryColor};`);
    }
    
    if (theme.secondaryColor) {
      styles.push(`  --color-secondary: ${theme.secondaryColor};`);
    }
    
    if (theme.fontFamily) {
      styles.push(`  --font-family: ${theme.fontFamily};`);
    }
    
    styles.push('}');

    // Apply font family
    if (theme.fontFamily) {
      styles.push(`body { font-family: var(--font-family), sans-serif; }`);
    }

    // Primary color applications
    if (theme.primaryColor) {
      styles.push(`
        .bg-primary { background-color: var(--color-primary) !important; }
        .text-primary { color: var(--color-primary) !important; }
        .border-primary { border-color: var(--color-primary) !important; }
        .ring-primary { --tw-ring-color: var(--color-primary) !important; }
      `);
    }

    // Secondary color applications
    if (theme.secondaryColor) {
      styles.push(`
        .bg-secondary { background-color: var(--color-secondary) !important; }
        .text-secondary { color: var(--color-secondary) !important; }
        .border-secondary { border-color: var(--color-secondary) !important; }
      `);
    }

    // Custom CSS
    if (theme.customCSS) {
      styles.push(theme.customCSS);
    }

    return styles.join('\n');
  }

  /**
   * Validate page data and components
   */
  static validatePage(pageData: PageData): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate basic page data
    if (!pageData.title) {
      errors.push('Page title is required');
    }

    if (!pageData.slug) {
      errors.push('Page slug is required');
    }

    // Validate components
    pageData.components.forEach((component, index) => {
      const validation = ComponentRenderer.validate(component);
      if (!validation.valid) {
        errors.push(`Component ${index + 1} (${component.type}): ${validation.errors.join(', ')}`);
      }

      // Check for unknown component types
      if (!allComponents[component.type]) {
        errors.push(`Unknown component type: ${component.type} at position ${index + 1}`);
      }
    });

    // Warnings for SEO
    if (!pageData.description) {
      warnings.push('Page description is recommended for SEO');
    }

    if (!pageData.seoData?.metaTitle) {
      warnings.push('Meta title is recommended for SEO');
    }

    if (!pageData.seoData?.metaDescription) {
      warnings.push('Meta description is recommended for SEO');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Extract data requirements from page components
   */
  static getPageDataRequirements(pageData: PageData): {
    businessData: string[];
    services: boolean;
    staff: boolean;
    packages: boolean;
    gallery: boolean;
    testimonials: boolean;
    faqs: boolean;
  } {
    const requirements = {
      businessData: new Set<string>(),
      services: false,
      staff: false,
      packages: false,
      gallery: false,
      testimonials: false,
      faqs: false,
    };

    pageData.components.forEach(component => {
      const definition = allComponents[component.type];
      if (definition?.dataBindings) {
        definition.dataBindings.forEach(binding => {
          if (binding.startsWith('businessData.')) {
            requirements.businessData.add(binding);
          } else if (binding === 'services') {
            requirements.services = true;
          } else if (binding === 'staff') {
            requirements.staff = true;
          } else if (binding === 'packages') {
            requirements.packages = true;
          } else if (binding === 'gallery') {
            requirements.gallery = true;
          } else if (binding === 'testimonials') {
            requirements.testimonials = true;
          } else if (binding === 'faqs') {
            requirements.faqs = true;
          }
        });
      }
    });

    return {
      ...requirements,
      businessData: Array.from(requirements.businessData),
    };
  }

  /**
   * Generate structured data for SEO
   */
  static generateStructuredData(
    pageData: PageData,
    businessData?: BusinessData
  ): Record<string, any> {
    if (!businessData) return {};

    const structuredData: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: businessData.name,
      description: businessData.description,
      url: `https://example.com/${pageData.slug}`,
    };

    if (businessData.contact) {
      structuredData.address = {
        '@type': 'PostalAddress',
        streetAddress: businessData.contact.address,
      };
      structuredData.telephone = businessData.contact.phone;
      structuredData.email = businessData.contact.email;
    }

    if (businessData.socialMedia) {
      structuredData.sameAs = Object.values(businessData.socialMedia).filter(Boolean);
    }

    return structuredData;
  }

  /**
   * Generate sitemap entry for page
   */
  static generateSitemapEntry(pageData: PageData): {
    url: string;
    lastModified: string;
    changeFrequency: string;
    priority: number;
  } {
    return {
      url: `/${pageData.slug}`,
      lastModified: pageData.updatedAt.toISOString(),
      changeFrequency: 'weekly',
      priority: pageData.slug === 'home' ? 1.0 : 0.8,
    };
  }
}

export default PageRenderer;