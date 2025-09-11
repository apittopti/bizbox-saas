import React from 'react';
import { TenantInfo } from './tenant-resolver';

export interface ComponentData {
  id: string;
  type: string;
  props: Record<string, any>;
  dataBinding?: {
    source: string;
    fields: Record<string, string>;
  };
  styling: {
    className?: string;
    customCSS?: string;
  };
}

export interface SectionData {
  id: string;
  type: string;
  components: ComponentData[];
  layout: {
    columns: number;
    gap: string;
    padding: string;
  };
  styling: {
    backgroundColor?: string;
    backgroundImage?: string;
    className?: string;
  };
}

export interface PageData {
  id: string;
  slug: string;
  title: string;
  description?: string;
  sections: SectionData[];
  theme: any;
  seo: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
  };
}

export class ComponentRenderer {
  private tenant: TenantInfo;
  private liveData: Record<string, any>;

  constructor(tenant: TenantInfo, liveData: Record<string, any> = {}) {
    this.tenant = tenant;
    this.liveData = liveData;
  }

  /**
   * Render a complete page with all sections and components
   */
  async renderPage(pageData: PageData): Promise<React.ReactElement> {
    const sections = await Promise.all(
      pageData.sections.map((section) => this.renderSection(section))
    );

    return (
      <div className="page-container">
        <style jsx>{`
          .page-container {
            ${this.generateThemeCSS(pageData.theme)}
          }
        `}</style>
        {sections}
      </div>
    );
  }

  /**
   * Render a section with its components
   */
  async renderSection(sectionData: SectionData): Promise<React.ReactElement> {
    const components = await Promise.all(
      sectionData.components.map((component) => this.renderComponent(component))
    );

    const sectionStyle = {
      display: 'grid',
      gridTemplateColumns: `repeat(${sectionData.layout.columns}, 1fr)`,
      gap: sectionData.layout.gap,
      padding: sectionData.layout.padding,
      backgroundColor: sectionData.styling.backgroundColor,
      backgroundImage: sectionData.styling.backgroundImage,
    };

    return (
      <section
        key={sectionData.id}
        className={sectionData.styling.className}
        style={sectionStyle}
      >
        {components}
      </section>
    );
  }

  /**
   * Render individual components with live data binding and performance optimization
   */
  renderComponent(componentData: ComponentData, options: {
    isVisible?: boolean;
    isPreview?: boolean;
    priority?: boolean;
    tenant?: TenantInfo;
  } = {}): React.ReactElement {
    // Resolve live data if data binding is configured
    const resolvedProps = this.resolveDataBinding(componentData);
    const { isVisible = true, isPreview = false, priority = false } = options;

    // Component registry for extensibility
    const componentRegistry = {
      hero: () => this.renderHeroComponent(resolvedProps, componentData.styling, { priority }),
      services: () => this.renderServicesComponent(resolvedProps, componentData.styling, { isVisible }),
      staff: () => this.renderStaffComponent(resolvedProps, componentData.styling, { isVisible }),
      products: () => this.renderProductsComponent(resolvedProps, componentData.styling, { isVisible }),
      'product-browser': () => this.renderProductBrowserComponent(resolvedProps, componentData.styling),
      'booking-form': () => this.renderBookingFormComponent(resolvedProps, componentData.styling),
      'contact-form': () => this.renderContactFormComponent(resolvedProps, componentData.styling),
      contact: () => this.renderContactComponent(resolvedProps, componentData.styling),
      footer: () => this.renderFooterComponent(resolvedProps, componentData.styling),
      gallery: () => this.renderGalleryComponent(resolvedProps, componentData.styling, { isVisible }),
      testimonials: () => this.renderTestimonialsComponent(resolvedProps, componentData.styling, { isVisible }),
      'call-to-action': () => this.renderCallToActionComponent(resolvedProps, componentData.styling),
      'social-feed': () => this.renderSocialFeedComponent(resolvedProps, componentData.styling, { isVisible }),
      map: () => this.renderMapComponent(resolvedProps, componentData.styling, { isVisible }),
      blog: () => this.renderBlogComponent(resolvedProps, componentData.styling, { isVisible }),
      'faq': () => this.renderFAQComponent(resolvedProps, componentData.styling, { isVisible }),
      'newsletter': () => this.renderNewsletterComponent(resolvedProps, componentData.styling),
    };

    const renderer = componentRegistry[componentData.type as keyof typeof componentRegistry];
    
    if (renderer) {
      return renderer();
    }

    // Fallback for custom or unknown components
    return this.renderCustomComponent(componentData.type, resolvedProps, componentData.styling, { isPreview });
  }

  /**
   * Resolve data binding for components (synchronous for SSR compatibility)
   */
  private resolveDataBinding(componentData: ComponentData): Record<string, any> {
    let props = { ...componentData.props };

    if (componentData.dataBinding) {
      const { source, fields } = componentData.dataBinding;
      
      // Get live data from the specified source
      const sourceData = this.liveData[source];
      
      if (sourceData) {
        // Map fields from live data to component props
        Object.entries(fields).forEach(([propKey, dataKey]) => {
          if (sourceData[dataKey] !== undefined) {
            props[propKey] = sourceData[dataKey];
          }
        });
      }
    }

    return props;
  }

  /**
   * Fetch live data from various sources
   */
  private async fetchLiveData(source: string): Promise<any> {
    try {
      const response = await fetch(`${process.env.INTERNAL_API_URL}/api/tenants/${this.tenant.id}/data/${source}`, {
        headers: {
          'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
        },
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error(`Failed to fetch live data for source: ${source}`, error);
    }

    return null;
  }

  /**
   * Component renderers
   */
  private renderHeroComponent(props: any, styling: any): React.ReactElement {
    return (
      <div key={props.id} className={`hero-component ${styling.className || ''}`}>
        <div className="hero-content">
          <h1 className="hero-title">{props.title || 'Welcome'}</h1>
          <p className="hero-subtitle">{props.subtitle || ''}</p>
          {props.ctaText && (
            <button className="hero-cta">{props.ctaText}</button>
          )}
        </div>
        {props.backgroundImage && (
          <div 
            className="hero-background"
            style={{ backgroundImage: `url(${props.backgroundImage})` }}
          />
        )}
      </div>
    );
  }

  private renderServicesComponent(props: any, styling: any): React.ReactElement {
    const services = props.services || [];
    
    return (
      <div key={props.id} className={`services-component ${styling.className || ''}`}>
        <h2 className="services-title">{props.title || 'Our Services'}</h2>
        <div className="services-grid">
          {services.map((service: any) => (
            <div key={service.id} className="service-card">
              <h3>{service.name}</h3>
              <p>{service.description}</p>
              <div className="service-details">
                <span className="duration">{service.duration} min</span>
                <span className="price">£{service.price}</span>
              </div>
              <button 
                className="book-service-btn"
                data-service-id={service.id}
              >
                Book Now
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  private renderStaffComponent(props: any, styling: any): React.ReactElement {
    const staff = props.staff || [];
    
    return (
      <div key={props.id} className={`staff-component ${styling.className || ''}`}>
        <h2 className="staff-title">{props.title || 'Meet Our Team'}</h2>
        <div className="staff-grid">
          {staff.map((member: any) => (
            <div key={member.id} className="staff-card">
              {member.image && (
                <img src={member.image} alt={member.name} className="staff-image" />
              )}
              <h3>{member.name}</h3>
              <p className="staff-role">{member.role}</p>
              <div className="staff-skills">
                {member.skills?.map((skill: any) => (
                  <span key={skill.id} className="skill-tag">{skill.name}</span>
                ))}
              </div>
              <button 
                className="book-staff-btn"
                data-staff-id={member.id}
              >
                Book with {member.name}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  private renderProductsComponent(props: any, styling: any): React.ReactElement {
    const products = props.products || [];
    
    return (
      <div key={props.id} className={`products-component ${styling.className || ''}`}>
        <h2 className="products-title">{props.title || 'Our Products'}</h2>
        <div className="products-grid">
          {products.map((product: any) => (
            <div key={product.id} className="product-card">
              {product.images?.[0] && (
                <img src={product.images[0]} alt={product.name} className="product-image" />
              )}
              <h3>{product.name}</h3>
              <p>{product.description}</p>
              <div className="product-price">£{product.price}</div>
              <button 
                className="add-to-cart-btn"
                data-product-id={product.id}
              >
                Add to Cart
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  private renderBookingFormComponent(props: any, styling: any): React.ReactElement {
    return (
      <div key={props.id} className={`booking-form-component ${styling.className || ''}`}>
        <h2>{props.title || 'Book an Appointment'}</h2>
        <div id="booking-form-container" data-tenant-id={this.tenant.id}>
          {/* Booking form will be hydrated client-side */}
        </div>
      </div>
    );
  }

  private renderContactComponent(props: any, styling: any): React.ReactElement {
    return (
      <div key={props.id} className={`contact-component ${styling.className || ''}`}>
        <h2>{props.title || 'Contact Us'}</h2>
        <div className="contact-info">
          {props.phone && <p>Phone: {props.phone}</p>}
          {props.email && <p>Email: {props.email}</p>}
          {props.address && <p>Address: {props.address}</p>}
        </div>
      </div>
    );
  }

  private renderFooterComponent(props: any, styling: any): React.ReactElement {
    return (
      <footer key={props.id} className={`footer-component ${styling.className || ''}`}>
        <div className="footer-content">
          <div className="footer-section">
            <h3>{this.tenant.name}</h3>
            <p>{props.description || ''}</p>
          </div>
          {props.links && (
            <div className="footer-section">
              <h4>Quick Links</h4>
              <ul>
                {props.links.map((link: any, index: number) => (
                  <li key={index}>
                    <a href={link.url}>{link.text}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} {this.tenant.name}. All rights reserved.</p>
        </div>
      </footer>
    );
  }

  private renderGenericComponent(type: string, props: any, styling: any): React.ReactElement {
    return (
      <div key={props.id} className={`${type}-component ${styling.className || ''}`}>
        <p>Component type: {type}</p>
        <pre>{JSON.stringify(props, null, 2)}</pre>
      </div>
    );
  }

  /**
   * Generate CSS from theme configuration
   */
  private generateThemeCSS(theme: any): string {
    if (!theme) return '';

    const css = [];
    
    if (theme.colors) {
      Object.entries(theme.colors).forEach(([key, value]) => {
        css.push(`--color-${key}: ${value};`);
      });
    }

    if (theme.fonts) {
      Object.entries(theme.fonts).forEach(([key, value]) => {
        css.push(`--font-${key}: ${value};`);
      });
    }

    if (theme.spacing) {
      Object.entries(theme.spacing).forEach(([key, value]) => {
        css.push(`--spacing-${key}: ${value};`);
      });
    }

    return css.join('\n');
  }
}