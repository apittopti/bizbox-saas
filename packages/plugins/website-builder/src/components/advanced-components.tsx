import * as React from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@bizbox/shared-ui';

// Gallery Component
export const GallerySection: React.FC<{
  title?: string;
  images?: Array<{ id: string; url: string; alt: string; caption?: string }>;
  layout?: 'grid' | 'masonry' | 'carousel';
  columns?: number;
}> = ({ 
  title = "Gallery",
  images = [],
  layout = 'grid',
  columns = 3
}) => {
  const defaultImages = images.length > 0 ? images : [
    { id: '1', url: '/placeholder-1.jpg', alt: 'Gallery Image 1', caption: 'Beautiful work' },
    { id: '2', url: '/placeholder-2.jpg', alt: 'Gallery Image 2', caption: 'Professional results' },
    { id: '3', url: '/placeholder-3.jpg', alt: 'Gallery Image 3', caption: 'Quality service' },
  ];

  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  }[columns] || 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-12">{title}</h2>
        <div className={`grid ${gridCols} gap-6`}>
          {defaultImages.map((image) => (
            <div key={image.id} className="group cursor-pointer">
              <div className="relative overflow-hidden rounded-lg shadow-lg">
                <img 
                  src={image.url} 
                  alt={image.alt}
                  className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {image.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-3">
                    <p className="text-sm">{image.caption}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Testimonials Component
export const TestimonialsSection: React.FC<{
  title?: string;
  testimonials?: Array<{
    id: string;
    name: string;
    rating: number;
    comment: string;
    avatar?: string;
    service?: string;
  }>;
}> = ({ 
  title = "What Our Customers Say",
  testimonials = []
}) => {
  const defaultTestimonials = testimonials.length > 0 ? testimonials : [
    {
      id: '1',
      name: 'Sarah Johnson',
      rating: 5,
      comment: 'Excellent service! Professional and friendly staff.',
      avatar: '/placeholder-avatar.jpg',
      service: 'Hair Styling'
    },
    {
      id: '2',
      name: 'Mike Chen',
      rating: 5,
      comment: 'Great experience, will definitely come back.',
      avatar: '/placeholder-avatar.jpg',
      service: 'Car Valeting'
    },
  ];

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={`text-lg ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}>
        ★
      </span>
    ));
  };

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-12">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {defaultTestimonials.map((testimonial) => (
            <Card key={testimonial.id} className="h-full">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <img 
                    src={testimonial.avatar} 
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full mr-4"
                  />
                  <div>
                    <h4 className="font-semibold">{testimonial.name}</h4>
                    {testimonial.service && (
                      <p className="text-sm text-gray-600">{testimonial.service}</p>
                    )}
                  </div>
                </div>
                <div className="flex mb-3">
                  {renderStars(testimonial.rating)}
                </div>
                <p className="text-gray-700 italic">"{testimonial.comment}"</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

// Pricing Component
export const PricingSection: React.FC<{
  title?: string;
  packages?: Array<{
    id: string;
    name: string;
    price: number;
    currency: string;
    period?: string;
    features: string[];
    popular?: boolean;
    ctaText?: string;
  }>;
}> = ({ 
  title = "Our Packages",
  packages = []
}) => {
  const defaultPackages = packages.length > 0 ? packages : [
    {
      id: '1',
      name: 'Basic',
      price: 50,
      currency: 'GBP',
      period: 'session',
      features: ['1 Hour Session', 'Basic Service', 'Consultation'],
      ctaText: 'Book Now'
    },
    {
      id: '2',
      name: 'Premium',
      price: 100,
      currency: 'GBP',
      period: 'session',
      features: ['2 Hour Session', 'Premium Service', 'Consultation', 'Follow-up'],
      popular: true,
      ctaText: 'Book Now'
    },
  ];

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-12">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {defaultPackages.map((pkg) => (
            <Card key={pkg.id} className={`relative ${pkg.popular ? 'ring-2 ring-primary' : ''}`}>
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{pkg.name}</CardTitle>
                <div className="text-4xl font-bold text-primary">
                  £{pkg.price}
                  {pkg.period && <span className="text-lg text-gray-600">/{pkg.period}</span>}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {pkg.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button className="w-full" variant={pkg.popular ? 'default' : 'outline'}>
                  {pkg.ctaText || 'Select Package'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

// About Section Component
export const AboutSection: React.FC<{
  title?: string;
  content?: string;
  image?: string;
  layout?: 'left' | 'right';
  businessData?: any;
}> = ({ 
  title = "About Us",
  content = "We are passionate about delivering exceptional service to our customers.",
  image = '/placeholder-about.jpg',
  layout = 'left',
  businessData
}) => {
  const displayContent = businessData?.about || content;

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${
          layout === 'right' ? 'lg:grid-flow-col-dense' : ''
        }`}>
          <div className={layout === 'right' ? 'lg:col-start-2' : ''}>
            <h2 className="text-4xl font-bold mb-6">{title}</h2>
            <div className="prose prose-lg max-w-none">
              <p className="text-gray-700 leading-relaxed">{displayContent}</p>
            </div>
          </div>
          <div className={layout === 'right' ? 'lg:col-start-1' : ''}>
            <img 
              src={image} 
              alt="About us"
              className="w-full h-96 object-cover rounded-lg shadow-lg"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

// FAQ Section Component
export const FAQSection: React.FC<{
  title?: string;
  faqs?: Array<{
    id: string;
    question: string;
    answer: string;
  }>;
}> = ({ 
  title = "Frequently Asked Questions",
  faqs = []
}) => {
  const [openFaq, setOpenFaq] = React.useState<string | null>(null);

  const defaultFaqs = faqs.length > 0 ? faqs : [
    {
      id: '1',
      question: 'How do I book an appointment?',
      answer: 'You can book an appointment through our online booking system or by calling us directly.'
    },
    {
      id: '2',
      question: 'What is your cancellation policy?',
      answer: 'We require 24 hours notice for cancellations to avoid any fees.'
    },
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-12">{title}</h2>
        <div className="max-w-3xl mx-auto">
          {defaultFaqs.map((faq) => (
            <div key={faq.id} className="mb-4">
              <button
                className="w-full text-left p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
                onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
              >
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-lg">{faq.question}</h3>
                  <span className="text-2xl">
                    {openFaq === faq.id ? '−' : '+'}
                  </span>
                </div>
              </button>
              {openFaq === faq.id && (
                <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-700">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// CTA Section Component
export const CTASection: React.FC<{
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  backgroundColor?: string;
}> = ({ 
  title = "Ready to Get Started?",
  subtitle = "Book your appointment today and experience our professional service.",
  ctaText = "Book Now",
  ctaLink = "/book",
  backgroundColor = "bg-primary"
}) => {
  return (
    <section className={`py-16 ${backgroundColor} text-white`}>
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-4xl font-bold mb-4">{title}</h2>
        <p className="text-xl mb-8 opacity-90">{subtitle}</p>
        <Button size="lg" variant="secondary" className="text-lg px-8 py-4">
          {ctaText}
        </Button>
      </div>
    </section>
  );
};

export const advancedComponents = {
  gallery: {
    type: 'gallery',
    name: 'Image Gallery',
    description: 'Showcase your work with a responsive image gallery',
    category: 'media' as const,
    icon: 'image',
    defaultProps: {
      title: 'Gallery',
      layout: 'grid',
      columns: 3,
    },
    propSchema: {
      title: { type: 'string', label: 'Section Title' },
      layout: { type: 'select', label: 'Layout', options: ['grid', 'masonry', 'carousel'] },
      columns: { type: 'number', label: 'Columns', min: 2, max: 4 },
    },
    previewComponent: GallerySection,
    renderComponent: GallerySection,
    dataBindings: ['gallery'],
  },

  testimonials: {
    type: 'testimonials',
    name: 'Customer Testimonials',
    description: 'Display customer reviews and testimonials',
    category: 'content' as const,
    icon: 'star',
    defaultProps: {
      title: 'What Our Customers Say',
    },
    propSchema: {
      title: { type: 'string', label: 'Section Title' },
    },
    previewComponent: TestimonialsSection,
    renderComponent: TestimonialsSection,
    dataBindings: ['testimonials'],
  },

  pricing: {
    type: 'pricing',
    name: 'Pricing Packages',
    description: 'Display service packages and pricing',
    category: 'ecommerce' as const,
    icon: 'dollar-sign',
    defaultProps: {
      title: 'Our Packages',
    },
    propSchema: {
      title: { type: 'string', label: 'Section Title' },
    },
    previewComponent: PricingSection,
    renderComponent: PricingSection,
    dataBindings: ['packages'],
  },

  about: {
    type: 'about',
    name: 'About Section',
    description: 'Tell your story with text and images',
    category: 'content' as const,
    icon: 'info',
    defaultProps: {
      title: 'About Us',
      layout: 'left',
    },
    propSchema: {
      title: { type: 'string', label: 'Section Title' },
      content: { type: 'textarea', label: 'Content' },
      image: { type: 'image', label: 'Image' },
      layout: { type: 'select', label: 'Layout', options: ['left', 'right'] },
    },
    previewComponent: AboutSection,
    renderComponent: AboutSection,
    dataBindings: ['businessData.about'],
  },

  faq: {
    type: 'faq',
    name: 'FAQ Section',
    description: 'Answer common customer questions',
    category: 'content' as const,
    icon: 'help-circle',
    defaultProps: {
      title: 'Frequently Asked Questions',
    },
    propSchema: {
      title: { type: 'string', label: 'Section Title' },
    },
    previewComponent: FAQSection,
    renderComponent: FAQSection,
    dataBindings: ['faqs'],
  },

  cta: {
    type: 'cta',
    name: 'Call to Action',
    description: 'Encourage visitors to take action',
    category: 'content' as const,
    icon: 'arrow-right',
    defaultProps: {
      title: 'Ready to Get Started?',
      subtitle: 'Book your appointment today and experience our professional service.',
      ctaText: 'Book Now',
      ctaLink: '/book',
      backgroundColor: 'bg-primary',
    },
    propSchema: {
      title: { type: 'string', label: 'Title' },
      subtitle: { type: 'string', label: 'Subtitle' },
      ctaText: { type: 'string', label: 'Button Text' },
      ctaLink: { type: 'string', label: 'Button Link' },
      backgroundColor: { type: 'color', label: 'Background Color' },
    },
    previewComponent: CTASection,
    renderComponent: CTASection,
    dataBindings: [],
  },
};