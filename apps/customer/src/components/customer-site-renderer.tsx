'use client';

import React, { useEffect } from 'react';
import { ComponentRenderer, PageData } from '../lib/component-renderer';
import { ThemeInjector } from '../lib/theme-injector';
import { TenantInfo } from '../lib/tenant-resolver';
import { CartProvider, ShoppingCartWidget } from './ecommerce/shopping-cart';
import { EmbeddedBookingForm } from './booking/embedded-booking-form';
import { ProductBrowser } from './ecommerce/product-browser';

interface CustomerSiteRendererProps {
  tenant: TenantInfo;
  pageData: PageData;
  liveData: Record<string, any>;
  path: string;
}

export function CustomerSiteRenderer({
  tenant,
  pageData,
  liveData,
  path,
}: CustomerSiteRendererProps) {
  useEffect(() => {
    // Inject theme CSS
    const css = ThemeInjector.injectCSS(tenant);
    const styleElement = document.createElement('style');
    styleElement.textContent = css;
    document.head.appendChild(styleElement);

    // Initialize client-side functionality
    initializeBookingIntegration();
    initializeEcommerceIntegration();
    initializeAnalytics(tenant.id);

    return () => {
      // Cleanup
      document.head.removeChild(styleElement);
    };
  }, [tenant]);

  const renderer = new ComponentRenderer(tenant, liveData);

  return (
    <CartProvider tenantId={tenant.id}>
      <div className="customer-site">
        {/* Shopping cart widget */}
        <div className="cart-widget-container">
          <ShoppingCartWidget />
        </div>

        {/* Render page sections */}
        {pageData.sections.map((section) => (
          <SectionRenderer
            key={section.id}
            section={section}
            renderer={renderer}
            tenant={tenant}
          />
        ))}
        
        {/* Client-side data for JavaScript */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__BIZBOX_DATA__ = {
                tenant: ${JSON.stringify(tenant)},
                liveData: ${JSON.stringify(liveData)},
                pageData: ${JSON.stringify(pageData)}
              };
            `,
          }}
        />

        <style jsx>{`
          .cart-widget-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
          }
        `}</style>
      </div>
    </CartProvider>
  );
}

interface SectionRendererProps {
  section: any;
  renderer: ComponentRenderer;
  tenant: TenantInfo;
}

function SectionRenderer({ section, renderer, tenant }: SectionRendererProps) {
  const sectionStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${section.layout.columns}, 1fr)`,
    gap: section.layout.gap,
    padding: section.layout.padding,
    backgroundColor: section.styling.backgroundColor,
    backgroundImage: section.styling.backgroundImage,
  };

  return (
    <section
      className={section.styling.className}
      style={sectionStyle}
    >
      {section.components.map((component: any) => (
        <ComponentRenderer
          key={component.id}
          component={component}
          renderer={renderer}
          tenant={tenant}
        />
      ))}
    </section>
  );
}

interface ComponentRendererProps {
  component: any;
  renderer: ComponentRenderer;
  tenant: TenantInfo;
}

function ComponentRenderer({ component, renderer, tenant }: ComponentRendererProps) {
  // This would use the renderer to create the component
  // For now, we'll create a simplified version
  
  switch (component.type) {
    case 'hero':
      return <HeroComponent {...component.props} styling={component.styling} />;
    case 'services':
      return <ServicesComponent {...component.props} styling={component.styling} />;
    case 'staff':
      return <StaffComponent {...component.props} styling={component.styling} />;
    case 'products':
      return <ProductsComponent {...component.props} styling={component.styling} tenant={tenant} />;
    case 'product-browser':
      return <ProductBrowser tenantId={tenant.id} className={component.styling.className} {...component.props} />;
    case 'booking-form':
      return <BookingFormComponent {...component.props} styling={component.styling} tenant={tenant} />;
    case 'contact':
      return <ContactComponent {...component.props} styling={component.styling} />;
    case 'footer':
      return <FooterComponent {...component.props} styling={component.styling} />;
    default:
      return <div>Unknown component: {component.type}</div>;
  }
}

// Component implementations
function HeroComponent({ title, subtitle, ctaText, backgroundImage, styling }: any) {
  return (
    <div className={`hero-component ${styling.className || ''}`}>
      <div className="hero-content">
        <h1 className="hero-title">{title || 'Welcome'}</h1>
        <p className="hero-subtitle">{subtitle || ''}</p>
        {ctaText && (
          <button 
            className="hero-cta"
            onClick={() => handleBookingClick()}
          >
            {ctaText}
          </button>
        )}
      </div>
      {backgroundImage && (
        <div 
          className="hero-background"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      )}
    </div>
  );
}

function ServicesComponent({ title, services, styling }: any) {
  // Get services from global data if not provided
  const serviceList = services || (window as any).__BIZBOX_DATA__?.liveData?.services || [];
  
  return (
    <div className={`services-component ${styling.className || ''}`}>
      <h2 className="services-title">{title || 'Our Services'}</h2>
      <div className="services-grid">
        {serviceList.map((service: any) => (
          <div key={service.id} className="service-card">
            <h3>{service.name}</h3>
            <p>{service.description}</p>
            <div className="service-details">
              <span className="duration">{service.duration} min</span>
              <span className="price">£{service.price}</span>
            </div>
            <button 
              className="book-service-btn"
              onClick={() => handleServiceBooking(service.id)}
            >
              Book Now
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function StaffComponent({ title, staff, styling }: any) {
  const staffList = staff || (window as any).__BIZBOX_DATA__?.liveData?.staff || [];
  
  return (
    <div className={`staff-component ${styling.className || ''}`}>
      <h2 className="staff-title">{title || 'Meet Our Team'}</h2>
      <div className="staff-grid">
        {staffList.map((member: any) => (
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
              onClick={() => handleStaffBooking(member.id)}
            >
              Book with {member.name}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductsComponent({ title, products, styling, tenant, showFilters = false, gridColumns = 3 }: any) {
  // If products are provided as props, render them directly
  if (products && products.length > 0) {
    return (
      <div className={`products-component ${styling.className || ''}`}>
        <h2 className="products-title">{title || 'Our Products'}</h2>
        <ProductBrowser
          tenantId={tenant.id}
          showFilters={showFilters}
          showSearch={false}
          gridColumns={gridColumns}
        />
      </div>
    );
  }

  // Otherwise use the full product browser
  return (
    <div className={`products-component ${styling.className || ''}`}>
      <h2 className="products-title">{title || 'Our Products'}</h2>
      <ProductBrowser
        tenantId={tenant.id}
        showFilters={showFilters}
        gridColumns={gridColumns}
      />
    </div>
  );
}

function BookingFormComponent({ title, styling, tenant, preSelectedService, preSelectedStaff }: any) {
  return (
    <div className={`booking-form-component ${styling.className || ''}`}>
      <h2>{title || 'Book an Appointment'}</h2>
      <EmbeddedBookingForm
        tenantId={tenant.id}
        preSelectedService={preSelectedService}
        preSelectedStaff={preSelectedStaff}
      />
    </div>
  );
}

function ContactComponent({ title, phone, email, address, styling }: any) {
  const business = (window as any).__BIZBOX_DATA__?.liveData?.business || {};
  
  return (
    <div className={`contact-component ${styling.className || ''}`}>
      <h2>{title || 'Contact Us'}</h2>
      <div className="contact-info">
        {(phone || business.phone) && <p>Phone: {phone || business.phone}</p>}
        {(email || business.email) && <p>Email: {email || business.email}</p>}
        {(address || business.address) && (
          <p>Address: {address || `${business.address?.street}, ${business.address?.city}`}</p>
        )}
      </div>
    </div>
  );
}

function FooterComponent({ description, links, styling }: any) {
  const tenant = (window as any).__BIZBOX_DATA__?.tenant || {};
  
  return (
    <footer className={`footer-component ${styling.className || ''}`}>
      <div className="footer-content">
        <div className="footer-section">
          <h3>{tenant.name}</h3>
          <p>{description || ''}</p>
        </div>
        {links && (
          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              {links.map((link: any, index: number) => (
                <li key={index}>
                  <a href={link.url}>{link.text}</a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} {tenant.name}. All rights reserved.</p>
      </div>
    </footer>
  );
}

// Event handlers
function handleBookingClick() {
  // Open booking modal or navigate to booking page
  console.log('Opening booking interface...');
}

function handleServiceBooking(serviceId: string) {
  // Open booking with pre-selected service
  console.log('Booking service:', serviceId);
}

function handleStaffBooking(staffId: string) {
  // Open booking with pre-selected staff
  console.log('Booking with staff:', staffId);
}

function handleAddToCart(productId: string) {
  // Add product to cart
  console.log('Adding to cart:', productId);
}

// Initialize client-side functionality
function initializeBookingIntegration() {
  // Initialize booking system integration
  console.log('Initializing booking integration...');
}

function initializeEcommerceIntegration() {
  // Initialize e-commerce integration
  console.log('Initializing e-commerce integration...');
}

function initializeAnalytics(tenantId: string) {
  // Initialize analytics tracking
  console.log('Initializing analytics for tenant:', tenantId);
}