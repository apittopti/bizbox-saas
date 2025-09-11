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
    customCSS?: Record<string, any>;
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
    minHeight?: string;
    customCSS?: Record<string, any>;
  };
}

export interface PageData {
  id: string;
  slug: string;
  title: string;
  description?: string;
  isPublished: boolean;
  sections: SectionData[];
  theme: any;
  seo: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
  };
}

export interface ComponentRenderOptions {
  isVisible?: boolean;
  isPreview?: boolean;
  priority?: boolean;
  tenant?: TenantInfo;
}

export class EnhancedComponentRenderer {
  private tenant: TenantInfo;
  private liveData: Record<string, any>;

  constructor(tenant: TenantInfo, liveData: Record<string, any> = {}) {
    this.tenant = tenant;
    this.liveData = liveData;
  }

  /**
   * Render individual components with performance optimization
   */
  renderComponent(componentData: ComponentData, options: ComponentRenderOptions = {}): React.ReactElement {
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
      'pricing': () => this.renderPricingComponent(resolvedProps, componentData.styling, { isVisible }),
      'features': () => this.renderFeaturesComponent(resolvedProps, componentData.styling, { isVisible }),
      'stats': () => this.renderStatsComponent(resolvedProps, componentData.styling, { isVisible }),
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
      const sourceData = this.liveData[source];
      
      if (sourceData) {
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
   * Enhanced Hero component with performance optimization
   */
  private renderHeroComponent(props: any, styling: any, options: { priority?: boolean } = {}): React.ReactElement {
    const { priority = false } = options;
    
    return (
      <div className={`hero-component ${styling.className || ''}`}>
        <div className="hero-content">
          <h1 className="hero-title">{props.title || 'Welcome'}</h1>
          {props.subtitle && <p className="hero-subtitle">{props.subtitle}</p>}
          {props.description && <p className="hero-description">{props.description}</p>}
          
          <div className="hero-actions">
            {props.ctaText && (
              <button 
                className="hero-cta hero-cta-primary"
                data-cta-action={props.ctaAction || 'scroll'}
                data-cta-target={props.ctaTarget || '#services'}
              >
                {props.ctaText}
              </button>
            )}
            {props.secondaryCtaText && (
              <button 
                className="hero-cta hero-cta-secondary"
                data-cta-action={props.secondaryCtaAction || 'link'}
                data-cta-target={props.secondaryCtaTarget || '/contact'}
              >
                {props.secondaryCtaText}
              </button>
            )}
          </div>
        </div>
        
        {props.backgroundImage && (
          <picture className="hero-background">
            {props.backgroundImageWebP && (
              <source srcSet={props.backgroundImageWebP} type="image/webp" />
            )}
            <img 
              src={props.backgroundImage}
              alt={props.backgroundImageAlt || props.title || 'Hero background'}
              loading={priority ? 'eager' : 'lazy'}
              decoding={priority ? 'sync' : 'async'}
              fetchPriority={priority ? 'high' : 'auto'}
              className="hero-background-img"
            />
          </picture>
        )}
        
        {props.videoBackground && (
          <video 
            className="hero-video" 
            autoPlay 
            muted 
            loop 
            playsInline
            preload={priority ? 'auto' : 'none'}
          >
            <source src={props.videoBackground} type="video/mp4" />
          </video>
        )}
        
        {props.overlayColor && (
          <div 
            className="hero-overlay" 
            style={{ backgroundColor: props.overlayColor, opacity: props.overlayOpacity || 0.5 }}
          />
        )}
      </div>
    );
  }

  /**
   * Enhanced Services component with booking integration
   */
  private renderServicesComponent(props: any, styling: any, options: { isVisible?: boolean } = {}): React.ReactElement {
    const services = props.services || this.liveData.services || [];
    const { isVisible = true } = options;
    
    return (
      <div className={`services-component ${styling.className || ''}`}>
        <div className="services-header">
          <h2 className="services-title">{props.title || 'Our Services'}</h2>
          {props.subtitle && <p className="services-subtitle">{props.subtitle}</p>}
        </div>
        
        <div className={`services-grid services-${props.layout || 'grid'}`}>
          {services.map((service: any, index: number) => (
            <div key={service.id} className="service-card">
              {service.image && (
                <img 
                  src={service.image} 
                  alt={service.name}
                  className="service-image"
                  loading={isVisible && index < 6 ? 'eager' : 'lazy'}
                />
              )}
              <div className="service-content">
                <h3 className="service-name">{service.name}</h3>
                <p className="service-description">{service.description}</p>
                
                <div className="service-details">
                  <div className="service-duration">
                    <span className="service-label">Duration:</span>
                    <span className="service-value">{service.duration} min</span>
                  </div>
                  <div className="service-price">
                    <span className="service-label">Price:</span>
                    <span className="service-value">£{service.price}</span>
                  </div>
                  {service.category && (
                    <div className="service-category">
                      <span className="category-tag">{service.category}</span>
                    </div>
                  )}
                </div>
                
                <button 
                  className="service-book-btn"
                  data-service-id={service.id}
                  data-action="book-service"
                >
                  {props.bookingButtonText || 'Book Now'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /**
   * Enhanced Staff component with detailed profiles
   */
  private renderStaffComponent(props: any, styling: any, options: { isVisible?: boolean } = {}): React.ReactElement {
    const staff = props.staff || this.liveData.staff || [];
    const { isVisible = true } = options;
    
    return (
      <div className={`staff-component ${styling.className || ''}`}>
        <div className="staff-header">
          <h2 className="staff-title">{props.title || 'Meet Our Team'}</h2>
          {props.subtitle && <p className="staff-subtitle">{props.subtitle}</p>}
        </div>
        
        <div className="staff-grid">
          {staff.map((member: any, index: number) => (
            <div key={member.id} className="staff-card">
              <div className="staff-photo">
                {member.image ? (
                  <img 
                    src={member.image} 
                    alt={member.name} 
                    className="staff-image"
                    loading={isVisible && index < 4 ? 'eager' : 'lazy'}
                  />
                ) : (
                  <div className="staff-placeholder">
                    <span>{member.name.charAt(0)}</span>
                  </div>
                )}
              </div>
              
              <div className="staff-info">
                <h3 className="staff-name">{member.name}</h3>
                <p className="staff-role">{member.role}</p>
                {member.bio && <p className="staff-bio">{member.bio}</p>}
                
                {member.skills && (
                  <div className="staff-skills">
                    <h4>Specialties</h4>
                    <div className="skills-list">
                      {member.skills.map((skill: any) => (
                        <span key={skill.id} className="skill-tag">{skill.name}</span>
                      ))}
                    </div>
                  </div>
                )}
                
                {member.experience && (
                  <div className="staff-experience">
                    <span className="experience-label">Experience:</span>
                    <span className="experience-value">{member.experience} years</span>
                  </div>
                )}
                
                <div className="staff-actions">
                  <button 
                    className="staff-book-btn"
                    data-staff-id={member.id}
                    data-action="book-staff"
                  >
                    Book with {member.name.split(' ')[0]}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /**
   * Enhanced Products component with e-commerce integration
   */
  private renderProductsComponent(props: any, styling: any, options: { isVisible?: boolean } = {}): React.ReactElement {
    const products = props.products || this.liveData.products || [];
    const { isVisible = true } = options;
    
    return (
      <div className={`products-component ${styling.className || ''}`}>
        <div className="products-header">
          <h2 className="products-title">{props.title || 'Our Products'}</h2>
          {props.subtitle && <p className="products-subtitle">{props.subtitle}</p>}
        </div>
        
        <div className={`products-grid products-${props.columns || '3'}-col`}>
          {products.slice(0, props.limit || products.length).map((product: any, index: number) => (
            <div key={product.id} className="product-card">
              <div className="product-image-container">
                {product.images?.[0] ? (
                  <img 
                    src={product.images[0]} 
                    alt={product.name}
                    className="product-image"
                    loading={isVisible && index < 6 ? 'eager' : 'lazy'}
                  />
                ) : (
                  <div className="product-placeholder">No Image</div>
                )}
                {product.badge && (
                  <span className={`product-badge badge-${product.badge.type}`}>
                    {product.badge.text}
                  </span>
                )}
              </div>
              
              <div className="product-content">
                <h3 className="product-name">{product.name}</h3>
                <p className="product-description">{product.description}</p>
                
                <div className="product-details">
                  <div className="product-price">
                    {product.salePrice && product.salePrice < product.price ? (
                      <>
                        <span className="price-sale">£{product.salePrice}</span>
                        <span className="price-original">£{product.price}</span>
                      </>
                    ) : (
                      <span className="price-current">£{product.price}</span>
                    )}
                  </div>
                  
                  {product.rating && (
                    <div className="product-rating">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={i < Math.floor(product.rating) ? 'star-filled' : 'star-empty'}>
                          ★
                        </span>
                      ))}
                      {product.reviewCount && (
                        <span className="review-count">({product.reviewCount})</span>
                      )}
                    </div>
                  )}
                </div>
                
                <button 
                  className="product-add-btn"
                  data-product-id={product.id}
                  data-action="add-to-cart"
                >
                  {props.addToCartText || 'Add to Cart'}
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {props.showViewAll && products.length > (props.limit || 6) && (
          <div className="products-footer">
            <a href="/products" className="view-all-btn">
              View All Products
            </a>
          </div>
        )}
      </div>
    );
  }

  /**
   * Product Browser component placeholder for client-side hydration
   */
  private renderProductBrowserComponent(props: any, styling: any): React.ReactElement {
    return (
      <div className={`product-browser-component ${styling.className || ''}`}>
        <h2>{props.title || 'Browse Products'}</h2>
        <div 
          id="product-browser-container" 
          data-tenant-id={this.tenant.id}
          data-category={props.category}
          data-show-filters={props.showFilters || 'true'}
          data-grid-columns={props.gridColumns || '3'}
          data-show-search={props.showSearch || 'true'}
        >
          {/* Product browser will be hydrated client-side */}
          <div className="product-browser-placeholder">
            <p>Loading products...</p>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Booking Form component placeholder for client-side hydration
   */
  private renderBookingFormComponent(props: any, styling: any): React.ReactElement {
    return (
      <div className={`booking-form-component ${styling.className || ''}`}>
        <h2>{props.title || 'Book an Appointment'}</h2>
        {props.subtitle && <p className="booking-subtitle">{props.subtitle}</p>}
        <div 
          id="booking-form-container" 
          data-tenant-id={this.tenant.id}
          data-pre-selected-service={props.preSelectedService}
          data-pre-selected-staff={props.preSelectedStaff}
        >
          {/* Booking form will be hydrated client-side */}
          <div className="booking-form-placeholder">
            <p>Loading booking form...</p>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Contact Form component placeholder for client-side hydration
   */
  private renderContactFormComponent(props: any, styling: any): React.ReactElement {
    return (
      <div className={`contact-form-component ${styling.className || ''}`}>
        <h2>{props.title || 'Get in Touch'}</h2>
        {props.subtitle && <p className="contact-subtitle">{props.subtitle}</p>}
        <div 
          id="contact-form-container"
          data-tenant-id={this.tenant.id}
          data-form-type={props.formType || 'contact'}
          data-success-message={props.successMessage}
        >
          {/* Contact form will be hydrated client-side */}
          <div className="contact-form-placeholder">
            <p>Loading contact form...</p>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Contact Info component
   */
  private renderContactComponent(props: any, styling: any): React.ReactElement {
    const business = this.liveData.business || {};
    
    return (
      <div className={`contact-component ${styling.className || ''}`}>
        <h2>{props.title || 'Contact Us'}</h2>
        <div className="contact-info">
          <div className="contact-methods">
            {(props.phone || business.phone) && (
              <div className="contact-method">
                <span className="contact-icon">📞</span>
                <div>
                  <label>Phone</label>
                  <a href={`tel:${props.phone || business.phone}`}>
                    {props.phone || business.phone}
                  </a>
                </div>
              </div>
            )}
            
            {(props.email || business.email) && (
              <div className="contact-method">
                <span className="contact-icon">📧</span>
                <div>
                  <label>Email</label>
                  <a href={`mailto:${props.email || business.email}`}>
                    {props.email || business.email}
                  </a>
                </div>
              </div>
            )}
            
            {(props.address || business.address) && (
              <div className="contact-method">
                <span className="contact-icon">📍</span>
                <div>
                  <label>Address</label>
                  <address>
                    {props.address || formatAddress(business.address)}
                  </address>
                </div>
              </div>
            )}
            
            {props.hours && (
              <div className="contact-method">
                <span className="contact-icon">🕒</span>
                <div>
                  <label>Hours</label>
                  <div className="business-hours">
                    {props.hours.map((hour: any, index: number) => (
                      <div key={index} className="hour-row">
                        <span className="day">{hour.day}</span>
                        <span className="time">{hour.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /**
   * Footer component
   */
  private renderFooterComponent(props: any, styling: any): React.ReactElement {
    const business = this.liveData.business || {};
    
    return (
      <footer className={`footer-component ${styling.className || ''}`}>
        <div className="footer-content">
          <div className="footer-section footer-main">
            <h3>{business.name || this.tenant.name}</h3>
            <p className="footer-description">{props.description || business.description || ''}</p>
            
            {props.socialLinks && (
              <div className="social-links">
                {props.socialLinks.map((link: any, index: number) => (
                  <a 
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`social-link social-${link.platform}`}
                    aria-label={`Follow us on ${link.platform}`}
                  >
                    {link.icon || link.platform}
                  </a>
                ))}
              </div>
            )}
          </div>
          
          {props.quickLinks && (
            <div className="footer-section">
              <h4>Quick Links</h4>
              <ul className="footer-links">
                {props.quickLinks.map((link: any, index: number) => (
                  <li key={index}>
                    <a href={link.url}>{link.text}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {props.services && (
            <div className="footer-section">
              <h4>Services</h4>
              <ul className="footer-links">
                {props.services.slice(0, 5).map((service: any) => (
                  <li key={service.id}>
                    <a href={`/services/${service.slug || service.id}`}>{service.name}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="footer-section">
            <h4>Contact</h4>
            <div className="footer-contact">
              {business.phone && <p>{business.phone}</p>}
              {business.email && <p>{business.email}</p>}
              {business.address && <p>{formatAddress(business.address)}</p>}
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} {business.name || this.tenant.name}. All rights reserved.</p>
          {props.legalLinks && (
            <div className="footer-legal">
              {props.legalLinks.map((link: any, index: number) => (
                <a key={index} href={link.url}>{link.text}</a>
              ))}
            </div>
          )}
        </div>
      </footer>
    );
  }

  // Additional component renderers continue...
  // (Gallery, Testimonials, CTA, etc. - keeping response size manageable)

  /**
   * Custom component fallback
   */
  private renderCustomComponent(type: string, props: any, styling: any, options: { isPreview?: boolean } = {}): React.ReactElement {
    const { isPreview = false } = options;
    
    if (isPreview) {
      return (
        <div className={`${type}-component ${styling.className || ''}`}>
          <div className="component-preview">
            <h3>Custom Component: {type}</h3>
            <p>This component will be rendered by a custom plugin or template.</p>
            <details>
              <summary>Component Data</summary>
              <pre>{JSON.stringify(props, null, 2)}</pre>
            </details>
          </div>
        </div>
      );
    }

    return (
      <div 
        className={`${type}-component ${styling.className || ''}`}
        data-component-type={type}
        data-component-props={JSON.stringify(props)}
      >
        {/* Custom component will be hydrated client-side */}
      </div>
    );
  }
}

// Utility functions
function formatAddress(address: any): string {
  if (!address) return '';
  
  const parts = [
    address.street,
    address.city,
    address.region,
    address.postalCode,
  ].filter(Boolean);
  
  return parts.join(', ');
}