export interface IndustryTemplate {
  id: string
  name: string
  industry: string
  subCategory?: string
  description: string
  pages: PageTemplate[]
  theme: ThemeConfig
  requiredData: string[]
  optionalData: string[]
  features: string[]
  previewImages: string[]
  metadata: {
    difficulty: 'beginner' | 'intermediate' | 'advanced'
    estimatedSetupTime: number // minutes
    popularity: number
    lastUpdated: Date
    version: string
    tags: string[]
  }
  customizations: {
    colorSchemes: ColorScheme[]
    layoutVariants: LayoutVariant[]
    contentSuggestions: ContentSuggestion[]
  }
}

export interface PageTemplate {
  id: string
  name: string
  slug: string
  sections: SectionConfig[]
  seoConfig: SEOConfig
  isRequired: boolean
  dependencies?: string[]
}

export interface SectionConfig {
  id: string
  type: string
  name: string
  props: Record<string, any>
  dataBindings: Record<string, string>
  isRequired: boolean
  alternatives?: SectionConfig[]
  customizationOptions: {
    canReorder: boolean
    canRemove: boolean
    canDuplicate: boolean
    editableProps: string[]
  }
}

export interface ThemeConfig {
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
    muted: string
    border: string
    success: string
    warning: string
    error: string
  }
  fonts: {
    heading: string
    body: string
    accent?: string
  }
  spacing: Record<string, number>
  borderRadius: Record<string, number>
  shadows: Record<string, string>
  animations: {
    duration: Record<string, string>
    easing: Record<string, string>
  }
}

export interface SEOConfig {
  title: string
  description: string
  keywords: string[]
  ogImage?: string
  structuredData?: Record<string, any>
}

export interface ColorScheme {
  id: string
  name: string
  colors: ThemeConfig['colors']
  preview: string
}

export interface LayoutVariant {
  id: string
  name: string
  description: string
  sections: string[]
  preview: string
}

export interface ContentSuggestion {
  section: string
  property: string
  suggestions: string[]
  industry: string
}

export interface TemplateValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
  completionPercentage: number
  missingData: string[]
  suggestions: string[]
}

export interface BusinessData {
  name: string
  tagline?: string
  description?: string
  phone: string
  email: string
  address?: string
  hours?: Record<string, string>
  services?: Array<{
    id: string
    name: string
    description: string
    price: number
    duration: number
    category?: string
  }>
  staff?: Array<{
    id: string
    name: string
    role: string
    bio?: string
    image?: string
    skills?: string[]
  }>
  gallery?: Array<{
    id: string
    url: string
    alt: string
    category?: string
  }>
  testimonials?: Array<{
    id: string
    name: string
    content: string
    rating: number
    image?: string
  }>
}

export class EnhancedIndustryTemplateManager {
  private templates: Map<string, IndustryTemplate> = new Map()
  private industryCategories: Map<string, string[]> = new Map()

  constructor() {
    this.initializeIndustryCategories()
    this.initializeTemplates()
  }

  /**
   * Get templates by industry with filtering options
   */
  getTemplatesByIndustry(
    industry: string,
    options: {
      subCategory?: string
      difficulty?: string
      features?: string[]
      sortBy?: 'popularity' | 'recent' | 'name'
    } = {}
  ): IndustryTemplate[] {
    let templates = Array.from(this.templates.values())
      .filter(template => template.industry === industry)

    if (options.subCategory) {
      templates = templates.filter(t => t.subCategory === options.subCategory)
    }

    if (options.difficulty) {
      templates = templates.filter(t => t.metadata.difficulty === options.difficulty)
    }

    if (options.features?.length) {
      templates = templates.filter(t => 
        options.features!.every(feature => t.features.includes(feature))
      )
    }

    // Sort templates
    switch (options.sortBy) {
      case 'popularity':
        templates.sort((a, b) => b.metadata.popularity - a.metadata.popularity)
        break
      case 'recent':
        templates.sort((a, b) => b.metadata.lastUpdated.getTime() - a.metadata.lastUpdated.getTime())
        break
      case 'name':
        templates.sort((a, b) => a.name.localeCompare(b.name))
        break
    }

    return templates
  }

  /**
   * Get all available industries
   */
  getIndustries(): Array<{ id: string; name: string; subCategories: string[] }> {
    return Array.from(this.industryCategories.entries()).map(([id, subCategories]) => ({
      id,
      name: this.formatIndustryName(id),
      subCategories
    }))
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): IndustryTemplate | undefined {
    return this.templates.get(id)
  }

  /**
   * Apply template to business data
   */
  async applyTemplate(
    templateId: string,
    businessData: BusinessData,
    customizations?: {
      colorScheme?: string
      layoutVariant?: string
      selectedPages?: string[]
      contentOverrides?: Record<string, any>
    }
  ): Promise<{
    success: boolean
    pages: any[]
    theme: ThemeConfig
    validation: TemplateValidation
  }> {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error('Template not found')
    }

    // Validate business data
    const validation = this.validateBusinessData(template, businessData)

    // Apply customizations
    let theme = { ...template.theme }
    if (customizations?.colorScheme) {
      const colorScheme = template.customizations.colorSchemes.find(
        cs => cs.id === customizations.colorScheme
      )
      if (colorScheme) {
        theme.colors = { ...colorScheme.colors }
      }
    }

    // Process pages
    let pages = template.pages
    if (customizations?.selectedPages) {
      pages = pages.filter(page => 
        page.isRequired || customizations.selectedPages!.includes(page.id)
      )
    }

    // Apply data bindings and content overrides
    const processedPages = pages.map(page => ({
      ...page,
      sections: page.sections.map(section => ({
        ...section,
        props: this.processDataBindings(
          section.props,
          section.dataBindings,
          businessData,
          customizations?.contentOverrides
        )
      })),
      seoConfig: {
        ...page.seoConfig,
        title: this.processTemplate(page.seoConfig.title, businessData),
        description: this.processTemplate(page.seoConfig.description, businessData)
      }
    }))

    return {
      success: true,
      pages: processedPages,
      theme,
      validation
    }
  }

  /**
   * Validate business data against template requirements
   */
  validateBusinessData(
    template: IndustryTemplate,
    businessData: BusinessData
  ): TemplateValidation {
    const errors: string[] = []
    const warnings: string[] = []
    const missingData: string[] = []
    const suggestions: string[] = []

    // Check required data
    template.requiredData.forEach(field => {
      const value = this.getNestedValue(businessData, field)
      if (!value || value.toString().trim() === '') {
        errors.push(`Required field '${field}' is missing`)
        missingData.push(field)
      }
    })

    // Check optional data and provide suggestions
    template.optionalData.forEach(field => {
      const value = this.getNestedValue(businessData, field)
      if (!value) {
        warnings.push(`Optional field '${field}' is not provided`)
        suggestions.push(`Consider adding '${field}' to improve your website`)
      }
    })

    // Industry-specific validations
    if (template.industry === 'automotive') {
      if (!businessData.services || businessData.services.length === 0) {
        warnings.push('No services defined - consider adding your car valeting services')
        suggestions.push('Add services like "Exterior Wash", "Interior Clean", "Full Valet"')
      }
    }

    if (template.industry === 'beauty') {
      if (!businessData.staff || businessData.staff.length === 0) {
        warnings.push('No staff profiles - consider adding your stylists')
        suggestions.push('Add staff profiles to build trust with potential clients')
      }
    }

    // Calculate completion percentage
    const totalFields = template.requiredData.length + template.optionalData.length
    const providedFields = template.requiredData.filter(field => this.getNestedValue(businessData, field)).length +
                          template.optionalData.filter(field => this.getNestedValue(businessData, field)).length
    const completionPercentage = Math.round((providedFields / totalFields) * 100)

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      completionPercentage,
      missingData,
      suggestions
    }
  }

  /**
   * Get content suggestions for a specific industry
   */
  getContentSuggestions(
    industry: string,
    section: string,
    property: string
  ): string[] {
    const template = Array.from(this.templates.values())
      .find(t => t.industry === industry)

    if (!template) return []

    const suggestion = template.customizations.contentSuggestions
      .find(cs => cs.section === section && cs.property === property)

    return suggestion?.suggestions || []
  }

  /**
   * Generate template completion checklist
   */
  generateCompletionChecklist(
    templateId: string,
    businessData: BusinessData
  ): Array<{
    category: string
    items: Array<{
      id: string
      title: string
      description: string
      completed: boolean
      required: boolean
      priority: 'high' | 'medium' | 'low'
    }>
  }> {
    const template = this.templates.get(templateId)
    if (!template) return []

    const checklist = [
      {
        category: 'Business Information',
        items: [
          {
            id: 'business-name',
            title: 'Business Name',
            description: 'Add your business name',
            completed: !!businessData.name,
            required: true,
            priority: 'high' as const
          },
          {
            id: 'contact-info',
            title: 'Contact Information',
            description: 'Add phone number and email address',
            completed: !!(businessData.phone && businessData.email),
            required: true,
            priority: 'high' as const
          },
          {
            id: 'business-description',
            title: 'Business Description',
            description: 'Write a compelling description of your business',
            completed: !!businessData.description,
            required: false,
            priority: 'medium' as const
          }
        ]
      },
      {
        category: 'Services & Pricing',
        items: [
          {
            id: 'services',
            title: 'Service Listings',
            description: 'Add your services with descriptions and pricing',
            completed: !!(businessData.services && businessData.services.length > 0),
            required: template.industry === 'automotive',
            priority: 'high' as const
          }
        ]
      },
      {
        category: 'Team & Staff',
        items: [
          {
            id: 'staff-profiles',
            title: 'Staff Profiles',
            description: 'Add team member profiles and photos',
            completed: !!(businessData.staff && businessData.staff.length > 0),
            required: template.industry === 'beauty',
            priority: 'medium' as const
          }
        ]
      },
      {
        category: 'Visual Content',
        items: [
          {
            id: 'gallery',
            title: 'Photo Gallery',
            description: 'Upload photos of your work and premises',
            completed: !!(businessData.gallery && businessData.gallery.length > 0),
            required: false,
            priority: 'medium' as const
          }
        ]
      }
    ]

    return checklist
  }

  /**
   * Process data bindings in props
   */
  private processDataBindings(
    props: Record<string, any>,
    dataBindings: Record<string, string>,
    businessData: BusinessData,
    overrides?: Record<string, any>
  ): Record<string, any> {
    const processed = { ...props }

    Object.entries(dataBindings).forEach(([prop, binding]) => {
      if (overrides && overrides[prop] !== undefined) {
        processed[prop] = overrides[prop]
      } else {
        const value = this.getNestedValue(businessData, binding)
        if (value !== undefined) {
          processed[prop] = value
        }
      }
    })

    return processed
  }

  /**
   * Process template strings with business data
   */
  private processTemplate(template: string, data: BusinessData): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this.getNestedValue(data, path.trim())
      return value !== undefined ? String(value) : match
    })
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  /**
   * Format industry name for display
   */
  private formatIndustryName(industry: string): string {
    return industry
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  /**
   * Initialize industry categories
   */
  private initializeIndustryCategories(): void {
    this.industryCategories.set('automotive', [
      'car-valeting',
      'car-repair',
      'bodyshop',
      'car-sales',
      'motorcycle-services'
    ])

    this.industryCategories.set('beauty', [
      'hairdressing',
      'barbershop',
      'nail-salon',
      'beauty-salon',
      'spa',
      'massage-therapy'
    ])

    this.industryCategories.set('health', [
      'dental',
      'physiotherapy',
      'optometry',
      'veterinary',
      'medical-practice'
    ])

    this.industryCategories.set('fitness', [
      'gym',
      'personal-training',
      'yoga-studio',
      'martial-arts',
      'dance-studio'
    ])

    this.industryCategories.set('food', [
      'restaurant',
      'cafe',
      'bakery',
      'catering',
      'food-truck'
    ])

    this.industryCategories.set('professional', [
      'accounting',
      'legal',
      'consulting',
      'real-estate',
      'insurance'
    ])
  }

  /**
   * Initialize comprehensive templates for each industry
   */
  private initializeTemplates(): void {
    // Car Valeting Template
    this.templates.set('car-valeting-premium', {
      id: 'car-valeting-premium',
      name: 'Premium Car Valeting',
      industry: 'automotive',
      subCategory: 'car-valeting',
      description: 'Professional car valeting website with booking system and service showcase',
      pages: [
        {
          id: 'home',
          name: 'Home',
          slug: '/',
          isRequired: true,
          sections: [
            {
              id: 'hero',
              type: 'hero',
              name: 'Hero Section',
              props: {
                title: 'Professional Car Valeting Services',
                subtitle: 'Transform your vehicle with our premium cleaning and detailing services',
                backgroundImage: '/templates/automotive/hero-car-valeting.jpg',
                ctaText: 'Book Now',
                ctaLink: '/booking'
              },
              dataBindings: {
                title: 'name',
                subtitle: 'tagline'
              },
              isRequired: true,
              customizationOptions: {
                canReorder: false,
                canRemove: false,
                canDuplicate: false,
                editableProps: ['title', 'subtitle', 'backgroundImage', 'ctaText']
              }
            },
            {
              id: 'services',
              type: 'services-grid',
              name: 'Services',
              props: {
                title: 'Our Services',
                subtitle: 'Professional car care services tailored to your needs',
                services: []
              },
              dataBindings: {
                services: 'services'
              },
              isRequired: true,
              customizationOptions: {
                canReorder: true,
                canRemove: false,
                canDuplicate: false,
                editableProps: ['title', 'subtitle']
              }
            },
            {
              id: 'contact',
              type: 'contact-section',
              name: 'Contact & Location',
              props: {
                title: 'Get In Touch',
                subtitle: 'Ready to book your car valeting service?'
              },
              dataBindings: {
                phone: 'phone',
                email: 'email',
                address: 'address'
              },
              isRequired: true,
              customizationOptions: {
                canReorder: true,
                canRemove: false,
                canDuplicate: false,
                editableProps: ['title', 'subtitle']
              }
            }
          ],
          seoConfig: {
            title: '{{name}} - Professional Car Valeting Services',
            description: 'Professional car valeting and detailing services. Book online for exterior wash, interior cleaning, and full valet services.',
            keywords: ['car valeting', 'car cleaning', 'car detailing', 'mobile valeting'],
            structuredData: {
              '@type': 'LocalBusiness',
              '@context': 'https://schema.org',
              'name': '{{name}}',
              'description': '{{description}}',
              'telephone': '{{phone}}',
              'address': '{{address}}'
            }
          }
        }
      ],
      theme: {
        colors: {
          primary: '#1e40af',
          secondary: '#64748b',
          accent: '#f59e0b',
          background: '#ffffff',
          text: '#1f2937',
          muted: '#6b7280',
          border: '#e5e7eb',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444'
        },
        fonts: {
          heading: 'Inter, sans-serif',
          body: 'Inter, sans-serif'
        },
        spacing: {
          xs: 4, sm: 8, md: 16, lg: 24, xl: 32, '2xl': 48, '3xl': 64
        },
        borderRadius: {
          sm: 4, md: 8, lg: 12, xl: 16
        },
        shadows: {
          sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
          xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
        },
        animations: {
          duration: { fast: '150ms', normal: '300ms', slow: '500ms' },
          easing: { ease: 'ease', 'ease-in': 'ease-in', 'ease-out': 'ease-out', 'ease-in-out': 'ease-in-out' }
        }
      },
      requiredData: ['name', 'phone', 'email'],
      optionalData: ['tagline', 'description', 'address', 'hours', 'services', 'staff'],
      features: ['responsive-design', 'seo-optimized', 'booking-integration', 'contact-forms', 'service-showcase', 'mobile-friendly'],
      previewImages: ['/templates/automotive/preview-1.jpg', '/templates/automotive/preview-2.jpg'],
      metadata: {
        difficulty: 'beginner',
        estimatedSetupTime: 15,
        popularity: 95,
        lastUpdated: new Date('2024-01-15'),
        version: '2.1.0',
        tags: ['automotive', 'car-valeting', 'booking', 'professional']
      },
      customizations: {
        colorSchemes: [
          {
            id: 'professional-blue',
            name: 'Professional Blue',
            colors: {
              primary: '#1e40af', secondary: '#64748b', accent: '#f59e0b', background: '#ffffff',
              text: '#1f2937', muted: '#6b7280', border: '#e5e7eb', success: '#10b981', warning: '#f59e0b', error: '#ef4444'
            },
            preview: '/templates/colors/professional-blue.jpg'
          }
        ],
        layoutVariants: [
          {
            id: 'standard',
            name: 'Standard Layout',
            description: 'Traditional layout with hero, services, and contact sections',
            sections: ['hero', 'services', 'contact'],
            preview: '/templates/layouts/standard.jpg'
          }
        ],
        contentSuggestions: [
          {
            section: 'hero',
            property: 'title',
            suggestions: ['Professional Car Valeting Services', 'Premium Car Cleaning & Detailing', 'Expert Mobile Car Valeting'],
            industry: 'automotive'
          }
        ]
      }
    })

    // Add more industry templates...
    this.initializeBeautyTemplates()
    this.initializeBodyshopTemplates()
  }

  /**
   * Initialize beauty industry templates
   */
  private initializeBeautyTemplates(): void {
    this.templates.set('hairdressing-modern', {
      id: 'hairdressing-modern',
      name: 'Modern Hair Salon',
      industry: 'beauty',
      subCategory: 'hairdressing',
      description: 'Stylish and modern website template for hair salons and stylists',
      pages: [
        {
          id: 'home',
          name: 'Home',
          slug: '/',
          isRequired: true,
          sections: [
            {
              id: 'hero',
              type: 'hero',
              name: 'Hero Section',
              props: {
                title: 'Beautiful Hair Starts Here',
                subtitle: 'Expert styling and cutting services in a relaxing environment',
                backgroundImage: '/templates/beauty/hero-salon.jpg',
                ctaText: 'Book Appointment',
                ctaLink: '/booking'
              },
              dataBindings: {
                title: 'name',
                subtitle: 'tagline'
              },
              isRequired: true,
              customizationOptions: {
                canReorder: false,
                canRemove: false,
                canDuplicate: false,
                editableProps: ['title', 'subtitle', 'backgroundImage', 'ctaText']
              }
            }
          ],
          seoConfig: {
            title: '{{name}} - Professional Hair Salon',
            description: 'Professional hair styling, cutting, and coloring services. Book your appointment online.',
            keywords: ['hair salon', 'hairdressing', 'hair styling', 'hair cutting']
          }
        }
      ],
      theme: {
        colors: {
          primary: '#ec4899', secondary: '#8b5cf6', accent: '#f59e0b', background: '#ffffff',
          text: '#1f2937', muted: '#6b7280', border: '#e5e7eb', success: '#10b981', warning: '#f59e0b', error: '#ef4444'
        },
        fonts: { heading: 'Playfair Display, serif', body: 'Inter, sans-serif' },
        spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, '2xl': 48, '3xl': 64 },
        borderRadius: { sm: 4, md: 8, lg: 12, xl: 16 },
        shadows: {
          sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)', md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)', xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
        },
        animations: {
          duration: { fast: '150ms', normal: '300ms', slow: '500ms' },
          easing: { ease: 'ease', 'ease-in': 'ease-in', 'ease-out': 'ease-out', 'ease-in-out': 'ease-in-out' }
        }
      },
      requiredData: ['name', 'phone', 'email'],
      optionalData: ['tagline', 'description', 'address', 'services', 'staff'],
      features: ['responsive-design', 'seo-optimized', 'booking-integration', 'gallery', 'staff-profiles'],
      previewImages: ['/templates/beauty/preview-1.jpg'],
      metadata: {
        difficulty: 'beginner',
        estimatedSetupTime: 20,
        popularity: 88,
        lastUpdated: new Date('2024-01-10'),
        version: '1.8.0',
        tags: ['beauty', 'hairdressing', 'salon', 'modern']
      },
      customizations: { colorSchemes: [], layoutVariants: [], contentSuggestions: [] }
    })
  }

  /**
   * Initialize bodyshop templates
   */
  private initializeBodyshopTemplates(): void {
    this.templates.set('bodyshop-professional', {
      id: 'bodyshop-professional',
      name: 'Professional Bodyshop',
      industry: 'automotive',
      subCategory: 'bodyshop',
      description: 'Professional website template for automotive bodyshops and repair services',
      pages: [
        {
          id: 'home',
          name: 'Home',
          slug: '/',
          isRequired: true,
          sections: [
            {
              id: 'hero',
              type: 'hero',
              name: 'Hero Section',
              props: {
                title: 'Expert Bodyshop Services',
                subtitle: 'Professional collision repair and automotive bodywork',
                backgroundImage: '/templates/automotive/hero-bodyshop.jpg',
                ctaText: 'Get Quote',
                ctaLink: '/quote'
              },
              dataBindings: {
                title: 'name',
                subtitle: 'tagline'
              },
              isRequired: true,
              customizationOptions: {
                canReorder: false,
                canRemove: false,
                canDuplicate: false,
                editableProps: ['title', 'subtitle', 'backgroundImage', 'ctaText']
              }
            }
          ],
          seoConfig: {
            title: '{{name}} - Professional Bodyshop Services',
            description: 'Expert collision repair, paintwork, and automotive bodyshop services. Get your free quote today.',
            keywords: ['bodyshop', 'collision repair', 'car repair', 'paintwork', 'automotive']
          }
        }
      ],
      theme: {
        colors: {
          primary: '#dc2626', secondary: '#374151', accent: '#f59e0b', background: '#ffffff',
          text: '#1f2937', muted: '#6b7280', border: '#e5e7eb', success: '#10b981', warning: '#f59e0b', error: '#ef4444'
        },
        fonts: { heading: 'Inter, sans-serif', body: 'Inter, sans-serif' },
        spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, '2xl': 48, '3xl': 64 },
        borderRadius: { sm: 4, md: 8, lg: 12, xl: 16 },
        shadows: {
          sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)', md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)', xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
        },
        animations: {
          duration: { fast: '150ms', normal: '300ms', slow: '500ms' },
          easing: { ease: 'ease', 'ease-in': 'ease-in', 'ease-out': 'ease-out', 'ease-in-out': 'ease-in-out' }
        }
      },
      requiredData: ['name', 'phone', 'email'],
      optionalData: ['tagline', 'description', 'address', 'services', 'gallery'],
      features: ['responsive-design', 'seo-optimized', 'quote-system', 'gallery', 'insurance-integration'],
      previewImages: ['/templates/automotive/bodyshop-preview-1.jpg'],
      metadata: {
        difficulty: 'intermediate',
        estimatedSetupTime: 25,
        popularity: 82,
        lastUpdated: new Date('2024-01-12'),
        version: '1.5.0',
        tags: ['automotive', 'bodyshop', 'repair', 'professional']
      },
      customizations: { colorSchemes: [], layoutVariants: [], contentSuggestions: [] }
    })
  }
}

export const enhancedIndustryTemplateManager = new EnhancedIndustryTemplateManager()