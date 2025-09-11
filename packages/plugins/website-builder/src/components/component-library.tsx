import * as React from 'react';
import { Button } from '@bizbox/shared-ui';

export interface ComponentProps {
  id: string;
  type: string;
  props: Record<string, any>;
  children?: ComponentProps[];
  style?: React.CSSProperties;
  className?: string;
}

export interface ComponentDefinition {
  type: string;
  name: string;
  description: string;
  category: 'layout' | 'content' | 'media' | 'form' | 'ecommerce' | 'booking';
  icon: string;
  defaultProps: Record<string, any>;
  propSchema: Record<string, any>;
  previewComponent: React.ComponentType<any>;
  renderComponent: React.ComponentType<any>;
  dataBindings?: string[];
}

// Hero Section Component
export const HeroSection: React.FC<{
  title?: string;
  subtitle?: string;
  backgroundImage?: string;
  ctaText?: string;
  ctaLink?: string;
  businessData?: any;
}> = ({ 
  title = "Welcome to Our Business",
  subtitle = "Professional services you can trust",
  backgroundImage,
  ctaText = "Book Now",
  ctaLink = "/book",
  businessData
}) => {
  const displayTitle = businessData?.name || title;
  const displaySubtitle = businessData?.description || subtitle;

  return (
    <section 
      className="relative h-screen flex items-center justify-center text-white"
      style={{
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black bg-opacity-40" />
      <div className="relative z-10 text-center max-w-4xl mx-auto px-4">
        <h1 className="text-5xl md:text-7xl font-bold mb-6">{displayTitle}</h1>
        <p className="text-xl md:text-2xl mb-8 opacity-90">{displaySubtitle}</p>
        <Button size="lg" className="text-lg px-8 py-4">
          {ctaText}
        </Button>
      </div>
    </section>
  );
};

// Services Section Component
export const ServicesSection: React.FC<{
  title?: string;
  services?: any[];
  businessData?: any;
}> = ({ 
  title = "Our Services",
  services = [],
  businessData
}) => {
  const displayServices = services.length > 0 ? services : [
    { id: '1', name: 'Service 1', description: 'Professional service description', price: 50 },
    { id: '2', name: 'Service 2', description: 'Another great service', price: 75 },
    { id: '3', name: 'Service 3', description: 'Premium service offering', price: 100 },
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-12">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayServices.map((service) => (
            <div key={service.id} className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold mb-3">{service.name}</h3>
              <p className="text-gray-600 mb-4">{service.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-primary">£{service.price}</span>
                <Button>Book Now</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Staff Section Component
export const StaffSection: React.FC<{
  title?: string;
  staff?: any[];
  businessData?: any;
}> = ({ 
  title = "Meet Our Team",
  staff = [],
  businessData
}) => {
  const displayStaff = staff.length > 0 ? staff : [
    { id: '1', name: 'John Doe', bio: 'Experienced professional', avatar: '/placeholder-avatar.jpg' },
    { id: '2', name: 'Jane Smith', bio: 'Skilled specialist', avatar: '/placeholder-avatar.jpg' },
  ];

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-12">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {displayStaff.map((member) => (
            <div key={member.id} className="text-center">
              <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden">
                <img 
                  src={member.avatar} 
                  alt={member.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-xl font-semibold mb-2">{member.name}</h3>
              <p className="text-gray-600">{member.bio}</p>
              <Button variant="outline" className="mt-4">
                Book with {member.name.split(' ')[0]}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Contact Section Component
export const ContactSection: React.FC<{
  title?: string;
  businessData?: any;
}> = ({ 
  title = "Contact Us",
  businessData
}) => {
  const contact = businessData?.contact || {
    email: 'info@business.com',
    phone: '+44 20 1234 5678',
    address: '123 Business Street, London, UK'
  };

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-12">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h3 className="text-2xl font-semibold mb-6">Get in Touch</h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <span className="font-medium mr-3">Email:</span>
                <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                  {contact.email}
                </a>
              </div>
              <div className="flex items-center">
                <span className="font-medium mr-3">Phone:</span>
                <a href={`tel:${contact.phone}`} className="text-primary hover:underline">
                  {contact.phone}
                </a>
              </div>
              <div className="flex items-start">
                <span className="font-medium mr-3">Address:</span>
                <span>{contact.address}</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-semibold mb-6">Send us a Message</h3>
            <form className="space-y-4">
              <input 
                type="text" 
                placeholder="Your Name" 
                className="w-full p-3 border rounded-lg"
              />
              <input 
                type="email" 
                placeholder="Your Email" 
                className="w-full p-3 border rounded-lg"
              />
              <textarea 
                placeholder="Your Message" 
                rows={4}
                className="w-full p-3 border rounded-lg"
              />
              <Button className="w-full">Send Message</Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

// Footer Component
export const Footer: React.FC<{
  businessData?: any;
}> = ({ businessData }) => {
  const business = businessData || {
    name: 'Your Business',
    contact: { email: 'info@business.com', phone: '+44 20 1234 5678' },
    socialMedia: {}
  };

  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-semibold mb-4">{business.name}</h3>
            <p className="text-gray-400">
              Professional services delivered with excellence.
            </p>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact</h4>
            <div className="space-y-2 text-gray-400">
              <p>{business.contact.email}</p>
              <p>{business.contact.phone}</p>
            </div>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4">Follow Us</h4>
            <div className="flex space-x-4">
              {business.socialMedia.facebook && (
                <a href={business.socialMedia.facebook} className="text-gray-400 hover:text-white">
                  Facebook
                </a>
              )}
              {business.socialMedia.instagram && (
                <a href={business.socialMedia.instagram} className="text-gray-400 hover:text-white">
                  Instagram
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2024 {business.name}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

// Component Library Registry
export const componentLibrary: Record<string, ComponentDefinition> = {
  hero: {
    type: 'hero',
    name: 'Hero Section',
    description: 'Eye-catching header section with title, subtitle, and call-to-action',
    category: 'layout',
    icon: 'layout',
    defaultProps: {
      title: 'Welcome to Our Business',
      subtitle: 'Professional services you can trust',
      ctaText: 'Book Now',
      ctaLink: '/book',
    },
    propSchema: {
      title: { type: 'string', label: 'Title' },
      subtitle: { type: 'string', label: 'Subtitle' },
      backgroundImage: { type: 'image', label: 'Background Image' },
      ctaText: { type: 'string', label: 'Button Text' },
      ctaLink: { type: 'string', label: 'Button Link' },
    },
    previewComponent: HeroSection,
    renderComponent: HeroSection,
    dataBindings: ['businessData.name', 'businessData.description'],
  },

  services: {
    type: 'services',
    name: 'Services Grid',
    description: 'Display services in a responsive grid layout',
    category: 'content',
    icon: 'grid',
    defaultProps: {
      title: 'Our Services',
    },
    propSchema: {
      title: { type: 'string', label: 'Section Title' },
    },
    previewComponent: ServicesSection,
    renderComponent: ServicesSection,
    dataBindings: ['services'],
  },

  staff: {
    type: 'staff',
    name: 'Staff Grid',
    description: 'Display team members with photos and booking buttons',
    category: 'content',
    icon: 'users',
    defaultProps: {
      title: 'Meet Our Team',
    },
    propSchema: {
      title: { type: 'string', label: 'Section Title' },
    },
    previewComponent: StaffSection,
    renderComponent: StaffSection,
    dataBindings: ['staff'],
  },

  contact: {
    type: 'contact',
    name: 'Contact Section',
    description: 'Contact information and contact form',
    category: 'content',
    icon: 'phone',
    defaultProps: {
      title: 'Contact Us',
    },
    propSchema: {
      title: { type: 'string', label: 'Section Title' },
    },
    previewComponent: ContactSection,
    renderComponent: ContactSection,
    dataBindings: ['businessData.contact'],
  },

  footer: {
    type: 'footer',
    name: 'Footer',
    description: 'Website footer with business information and links',
    category: 'layout',
    icon: 'layout',
    defaultProps: {},
    propSchema: {},
    previewComponent: Footer,
    renderComponent: Footer,
    dataBindings: ['businessData'],
  },
};

export class ComponentRenderer {
  /**
   * Render a component with data binding
   */
  static render(
    component: ComponentProps,
    businessData?: any,
    services?: any[],
    staff?: any[]
  ): React.ReactElement {
    const definition = componentLibrary[component.type];
    if (!definition) {
      return <div>Unknown component: {component.type}</div>;
    }

    const Component = definition.renderComponent;
    const props = {
      ...definition.defaultProps,
      ...component.props,
      businessData,
      services,
      staff,
    };

    return <Component key={component.id} {...props} />;
  }

  /**
   * Validate component props
   */
  static validate(component: ComponentProps): {
    valid: boolean;
    errors: string[];
  } {
    const definition = componentLibrary[component.type];
    if (!definition) {
      return { valid: false, errors: [`Unknown component type: ${component.type}`] };
    }

    const errors: string[] = [];
    
    // Validate required props
    Object.entries(definition.propSchema).forEach(([key, schema]: [string, any]) => {
      if (schema.required && !component.props[key]) {
        errors.push(`Missing required prop: ${key}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get component data requirements
   */
  static getDataRequirements(components: ComponentProps[]): string[] {
    const requirements = new Set<string>();

    components.forEach(component => {
      const definition = componentLibrary[component.type];
      if (definition?.dataBindings) {
        definition.dataBindings.forEach(binding => requirements.add(binding));
      }
    });

    return Array.from(requirements);
  }
}

export { ComponentProps, ComponentDefinition };