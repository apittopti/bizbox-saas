import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@bizbox/shared-ui'
import { Button } from '@bizbox/shared-ui'
import { Badge } from '@bizbox/shared-ui'

export interface BusinessData {
  name: string
  description?: string
  phone?: string
  email?: string
  address?: string
  logo?: string
  socialMedia?: {
    facebook?: string
    instagram?: string
    twitter?: string
    linkedin?: string
  }
}

export interface ServiceData {
  id: string
  name: string
  description?: string
  duration: number
  price: number
  currency: string
  category?: string
  image?: string
}

export interface StaffData {
  id: string
  name: string
  role: string
  bio?: string
  avatar?: string
  skills: string[]
  specializations: string[]
}

export interface ComponentProps {
  data?: any
  theme?: {
    primaryColor?: string
    secondaryColor?: string
    fontFamily?: string
    borderRadius?: string
  }
  className?: string
  editable?: boolean
  onEdit?: (componentId: string, data: any) => void
}

// Hero Section Component
export const HeroSection: React.FC<ComponentProps & {
  data?: {
    title: string
    subtitle?: string
    backgroundImage?: string
    ctaText?: string
    ctaLink?: string
  }
}> = ({ data, theme, className, editable, onEdit }) => {
  const defaultData = {
    title: 'Welcome to Our Business',
    subtitle: 'Professional services you can trust',
    ctaText: 'Book Now',
    ctaLink: '/book'
  }

  const componentData = { ...defaultData, ...data }

  return (
    <section 
      className={`relative min-h-[500px] flex items-center justify-center text-white ${className || ''}`}
      style={{
        backgroundImage: componentData.backgroundImage ? `url(${componentData.backgroundImage})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      <div className="relative z-10 text-center max-w-4xl mx-auto px-4">
        <h1 
          className="text-4xl md:text-6xl font-bold mb-4"
          style={{ fontFamily: theme?.fontFamily }}
        >
          {componentData.title}
        </h1>
        {componentData.subtitle && (
          <p className="text-xl md:text-2xl mb-8 opacity-90">
            {componentData.subtitle}
          </p>
        )}
        {componentData.ctaText && (
          <Button 
            size="lg"
            className="text-lg px-8 py-3"
            style={{ 
              backgroundColor: theme?.primaryColor,
              borderRadius: theme?.borderRadius 
            }}
          >
            {componentData.ctaText}
          </Button>
        )}
      </div>
      {editable && (
        <div className="absolute top-4 right-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onEdit?.('hero', componentData)}
          >
            Edit
          </Button>
        </div>
      )}
    </section>
  )
}

// Services Grid Component
export const ServicesGrid: React.FC<ComponentProps & {
  data?: {
    title?: string
    services: ServiceData[]
    showPricing?: boolean
    columns?: number
  }
}> = ({ data, theme, className, editable, onEdit }) => {
  const defaultData = {
    title: 'Our Services',
    services: [],
    showPricing: true,
    columns: 3
  }

  const componentData = { ...defaultData, ...data }

  return (
    <section className={`py-16 px-4 ${className || ''}`}>
      <div className="max-w-6xl mx-auto">
        {componentData.title && (
          <h2 
            className="text-3xl md:text-4xl font-bold text-center mb-12"
            style={{ 
              fontFamily: theme?.fontFamily,
              color: theme?.primaryColor 
            }}
          >
            {componentData.title}
          </h2>
        )}
        
        <div 
          className={`grid gap-6 ${
            componentData.columns === 2 ? 'md:grid-cols-2' :
            componentData.columns === 4 ? 'md:grid-cols-2 lg:grid-cols-4' :
            'md:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {componentData.services.map((service: ServiceData) => (
            <Card 
              key={service.id} 
              className="hover:shadow-lg transition-shadow"
              style={{ borderRadius: theme?.borderRadius }}
            >
              {service.image && (
                <div className="aspect-video overflow-hidden">
                  <img 
                    src={service.image} 
                    alt={service.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <span>{service.name}</span>
                  {componentData.showPricing && (
                    <Badge variant="secondary">
                      £{(service.price / 100).toFixed(2)}
                    </Badge>
                  )}
                </CardTitle>
                {service.category && (
                  <Badge variant="outline" className="w-fit">
                    {service.category}
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                {service.description && (
                  <CardDescription className="mb-4">
                    {service.description}
                  </CardDescription>
                )}
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>{service.duration} minutes</span>
                  <Button 
                    size="sm"
                    style={{ 
                      backgroundColor: theme?.primaryColor,
                      borderRadius: theme?.borderRadius 
                    }}
                  >
                    Book Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      
      {editable && (
        <div className="fixed bottom-4 right-4">
          <Button 
            variant="outline"
            onClick={() => onEdit?.('services', componentData)}
          >
            Edit Services
          </Button>
        </div>
      )}
    </section>
  )
}

// Staff Team Component
export const StaffTeam: React.FC<ComponentProps & {
  data?: {
    title?: string
    staff: StaffData[]
    layout?: 'grid' | 'carousel'
    showBio?: boolean
  }
}> = ({ data, theme, className, editable, onEdit }) => {
  const defaultData = {
    title: 'Meet Our Team',
    staff: [],
    layout: 'grid' as const,
    showBio: true
  }

  const componentData = { ...defaultData, ...data }

  return (
    <section className={`py-16 px-4 bg-gray-50 ${className || ''}`}>
      <div className="max-w-6xl mx-auto">
        {componentData.title && (
          <h2 
            className="text-3xl md:text-4xl font-bold text-center mb-12"
            style={{ 
              fontFamily: theme?.fontFamily,
              color: theme?.primaryColor 
            }}
          >
            {componentData.title}
          </h2>
        )}
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {componentData.staff.map((member: StaffData) => (
            <Card key={member.id} className="text-center">
              <CardContent className="pt-6">
                <div className="mb-4">
                  {member.avatar ? (
                    <img 
                      src={member.avatar} 
                      alt={member.name}
                      className="w-24 h-24 rounded-full mx-auto object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full mx-auto bg-gray-300 flex items-center justify-center">
                      <span className="text-2xl font-bold text-gray-600">
                        {member.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                
                <h3 className="text-xl font-semibold mb-1">{member.name}</h3>
                <p className="text-gray-600 mb-3">{member.role}</p>
                
                {componentData.showBio && member.bio && (
                  <p className="text-sm text-gray-700 mb-4">{member.bio}</p>
                )}
                
                {member.specializations.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-center">
                    {member.specializations.map((spec, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      
      {editable && (
        <div className="fixed bottom-4 left-4">
          <Button 
            variant="outline"
            onClick={() => onEdit?.('staff', componentData)}
          >
            Edit Team
          </Button>
        </div>
      )}
    </section>
  )
}

// Contact Information Component
export const ContactInfo: React.FC<ComponentProps & {
  data?: BusinessData & {
    title?: string
    showMap?: boolean
    mapEmbedUrl?: string
  }
}> = ({ data, theme, className, editable, onEdit }) => {
  const defaultData = {
    title: 'Contact Us',
    name: 'Your Business Name',
    showMap: false
  }

  const componentData = { ...defaultData, ...data }

  return (
    <section className={`py-16 px-4 ${className || ''}`}>
      <div className="max-w-6xl mx-auto">
        {componentData.title && (
          <h2 
            className="text-3xl md:text-4xl font-bold text-center mb-12"
            style={{ 
              fontFamily: theme?.fontFamily,
              color: theme?.primaryColor 
            }}
          >
            {componentData.title}
          </h2>
        )}
        
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Get in Touch</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {componentData.phone && (
                  <div className="flex items-center space-x-3">
                    <span className="font-medium">Phone:</span>
                    <a 
                      href={`tel:${componentData.phone}`}
                      className="text-blue-600 hover:underline"
                    >
                      {componentData.phone}
                    </a>
                  </div>
                )}
                
                {componentData.email && (
                  <div className="flex items-center space-x-3">
                    <span className="font-medium">Email:</span>
                    <a 
                      href={`mailto:${componentData.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {componentData.email}
                    </a>
                  </div>
                )}
                
                {componentData.address && (
                  <div className="flex items-start space-x-3">
                    <span className="font-medium">Address:</span>
                    <span>{componentData.address}</span>
                  </div>
                )}
                
                {componentData.socialMedia && (
                  <div className="pt-4">
                    <h4 className="font-medium mb-2">Follow Us</h4>
                    <div className="flex space-x-4">
                      {componentData.socialMedia.facebook && (
                        <a 
                          href={componentData.socialMedia.facebook}
                          className="text-blue-600 hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Facebook
                        </a>
                      )}
                      {componentData.socialMedia.instagram && (
                        <a 
                          href={componentData.socialMedia.instagram}
                          className="text-pink-600 hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Instagram
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {componentData.showMap && componentData.mapEmbedUrl && (
            <div>
              <Card>
                <CardContent className="p-0">
                  <iframe
                    src={componentData.mapEmbedUrl}
                    width="100%"
                    height="300"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  ></iframe>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
      
      {editable && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2">
          <Button 
            variant="outline"
            onClick={() => onEdit?.('contact', componentData)}
          >
            Edit Contact
          </Button>
        </div>
      )}
    </section>
  )
}

// Footer Component
export const Footer: React.FC<ComponentProps & {
  data?: BusinessData & {
    copyrightText?: string
    links?: Array<{ text: string; url: string }>
  }
}> = ({ data, theme, className, editable, onEdit }) => {
  const currentYear = new Date().getFullYear()
  const defaultData = {
    name: 'Your Business Name',
    copyrightText: `© ${currentYear} Your Business Name. All rights reserved.`,
    links: []
  }

  const componentData = { ...defaultData, ...data }

  return (
    <footer 
      className={`py-8 px-4 text-white ${className || ''}`}
      style={{ backgroundColor: theme?.primaryColor || '#1f2937' }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">{componentData.name}</h3>
            {componentData.description && (
              <p className="text-gray-300 mb-4">{componentData.description}</p>
            )}
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <div className="space-y-2 text-gray-300">
              {componentData.phone && (
                <p>{componentData.phone}</p>
              )}
              {componentData.email && (
                <p>{componentData.email}</p>
              )}
              {componentData.address && (
                <p>{componentData.address}</p>
              )}
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <div className="space-y-2">
              {componentData.links?.map((link, index) => (
                <a 
                  key={index}
                  href={link.url}
                  className="block text-gray-300 hover:text-white transition-colors"
                >
                  {link.text}
                </a>
              ))}
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-600 mt-8 pt-8 text-center text-gray-300">
          <p>{componentData.copyrightText}</p>
        </div>
      </div>
      
      {editable && (
        <div className="fixed bottom-4 right-1/2 transform translate-x-1/2">
          <Button 
            variant="outline"
            onClick={() => onEdit?.('footer', componentData)}
          >
            Edit Footer
          </Button>
        </div>
      )}
    </footer>
  )
}

// Component Registry
export const componentRegistry = {
  hero: HeroSection,
  services: ServicesGrid,
  staff: StaffTeam,
  contact: ContactInfo,
  footer: Footer
}

export type ComponentType = keyof typeof componentRegistry