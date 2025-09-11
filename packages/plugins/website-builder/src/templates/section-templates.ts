import { z } from 'zod'

export interface SectionTemplate {
  id: string
  name: string
  description: string
  category: 'hero' | 'services' | 'about' | 'contact' | 'gallery' | 'testimonials' | 'pricing' | 'team' | 'custom'
  industry?: string[]
  thumbnail: string
  previewUrl?: string
  components: ComponentConfig[]
  dataBindings: DataBinding[]
  styles: SectionStyles
  metadata: {
    createdBy: string
    createdAt: Date
    updatedAt: Date
    version: string
    tags: string[]
    usageCount: number
    rating: number
    isPublic: boolean
    isVerified: boolean
  }
  requirements?: {
    plugins: string[]
    features: string[]
    minVersion: string
  }
}

export interface ComponentConfig {
  id: string
  type: string
  props: Record<string, any>
  children?: ComponentConfig[]
  layout: {
    position: { x: number; y: number }
    size: { width: number; height: number }
    zIndex: number
    responsive: {
      mobile: Partial<ComponentConfig['layout']>
      tablet: Partial<ComponentConfig['layout']>
      desktop: Partial<ComponentConfig['layout']>
    }
  }
  animations?: {
    entrance: string
    hover: string
    scroll: string
  }
}

export interface DataBinding {
  componentId: string
  property: string
  dataSource: string
  transform?: string
  fallback?: any
}

export interface SectionStyles {
  background: {
    type: 'color' | 'gradient' | 'image' | 'video'
    value: string
    overlay?: {
      color: string
      opacity: number
    }
  }
  spacing: {
    padding: { top: number; right: number; bottom: number; left: number }
    margin: { top: number; right: number; bottom: number; left: number }
  }
  typography: {
    fontFamily: string
    fontSize: Record<string, number>
    lineHeight: Record<string, number>
    fontWeight: Record<string, number>
  }
  colors: {
    primary: string
    secondary: string
    accent: string
    text: string
    background: string
  }
  responsive: {
    mobile: Partial<SectionStyles>
    tablet: Partial<SectionStyles>
    desktop: Partial<SectionStyles>
  }
}

export interface TemplateFilter {
  category?: string[]
  industry?: string[]
  tags?: string[]
  rating?: number
  isPublic?: boolean
  createdBy?: string
  search?: string
}

export class SectionTemplateManager {
  private templates: Map<string, SectionTemplate> = new Map()
  private userTemplates: Map<string, Set<string>> = new Map() // userId -> templateIds

  constructor() {
    this.initializeDefaultTemplates()
  }

  /**
   * Save a section as a template
   */
  async saveAsTemplate(
    tenantId: string,
    userId: string,
    sectionData: {
      name: string
      description: string
      category: SectionTemplate['category']
      components: ComponentConfig[]
      dataBindings: DataBinding[]
      styles: SectionStyles
      tags?: string[]
      isPublic?: boolean
    }
  ): Promise<SectionTemplate> {
    const template: SectionTemplate = {
      id: this.generateId(),
      name: sectionData.name,
      description: sectionData.description,
      category: sectionData.category,
      thumbnail: await this.generateThumbnail(sectionData.components, sectionData.styles),
      components: this.sanitizeComponents(sectionData.components),
      dataBindings: sectionData.dataBindings,
      styles: sectionData.styles,
      metadata: {
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: sectionData.tags || [],
        usageCount: 0,
        rating: 0,
        isPublic: sectionData.isPublic || false,
        isVerified: false
      }
    }

    this.templates.set(template.id, template)
    
    // Add to user's templates
    if (!this.userTemplates.has(userId)) {
      this.userTemplates.set(userId, new Set())
    }
    this.userTemplates.get(userId)!.add(template.id)

    return template
  }

  /**
   * Get templates with filtering and context-aware suggestions
   */
  async getTemplates(
    tenantId: string,
    userId: string,
    filter: TemplateFilter = {},
    context?: {
      currentPage?: string
      existingSections?: string[]
      businessType?: string
      targetAudience?: string
    }
  ): Promise<{
    templates: SectionTemplate[]
    suggestions: SectionTemplate[]
    categories: Array<{ name: string; count: number }>
  }> {
    let templates = Array.from(this.templates.values())

    // Apply filters
    if (filter.category?.length) {
      templates = templates.filter(t => filter.category!.includes(t.category))
    }

    if (filter.industry?.length) {
      templates = templates.filter(t => 
        !t.industry || t.industry.some(i => filter.industry!.includes(i))
      )
    }

    if (filter.tags?.length) {
      templates = templates.filter(t =>
        t.metadata.tags.some(tag => filter.tags!.includes(tag))
      )
    }

    if (filter.rating) {
      templates = templates.filter(t => t.metadata.rating >= filter.rating!)
    }

    if (filter.isPublic !== undefined) {
      templates = templates.filter(t => t.metadata.isPublic === filter.isPublic)
    }

    if (filter.createdBy) {
      templates = templates.filter(t => t.metadata.createdBy === filter.createdBy)
    }

    if (filter.search) {
      const searchLower = filter.search.toLowerCase()
      templates = templates.filter(t =>
        t.name.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower) ||
        t.metadata.tags.some(tag => tag.toLowerCase().includes(searchLower))
      )
    }

    // Filter by access permissions
    templates = templates.filter(t => 
      t.metadata.isPublic || 
      t.metadata.createdBy === userId ||
      this.hasTemplateAccess(tenantId, userId, t.id)
    )

    // Generate context-aware suggestions
    const suggestions = await this.generateSuggestions(templates, context)

    // Calculate categories
    const categories = this.calculateCategories(templates)

    // Sort templates by relevance and rating
    templates.sort((a, b) => {
      // Prioritize user's own templates
      if (a.metadata.createdBy === userId && b.metadata.createdBy !== userId) return -1
      if (b.metadata.createdBy === userId && a.metadata.createdBy !== userId) return 1
      
      // Then by rating and usage
      const aScore = a.metadata.rating * 0.7 + (a.metadata.usageCount / 100) * 0.3
      const bScore = b.metadata.rating * 0.7 + (b.metadata.usageCount / 100) * 0.3
      return bScore - aScore
    })

    return { templates, suggestions, categories }
  }

  /**
   * Apply template to a page section
   */
  async applyTemplate(
    tenantId: string,
    templateId: string,
    targetSectionId: string,
    customizations?: {
      dataOverrides?: Record<string, any>
      styleOverrides?: Partial<SectionStyles>
      componentOverrides?: Record<string, any>
    }
  ): Promise<{
    success: boolean
    sectionConfig: ComponentConfig[]
    dataBindings: DataBinding[]
    styles: SectionStyles
  }> {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error('Template not found')
    }

    // Clone template data to avoid mutations
    let components = JSON.parse(JSON.stringify(template.components))
    let dataBindings = JSON.parse(JSON.stringify(template.dataBindings))
    let styles = JSON.parse(JSON.stringify(template.styles))

    // Apply customizations
    if (customizations?.dataOverrides) {
      dataBindings = this.applyDataOverrides(dataBindings, customizations.dataOverrides)
    }

    if (customizations?.styleOverrides) {
      styles = { ...styles, ...customizations.styleOverrides }
    }

    if (customizations?.componentOverrides) {
      components = this.applyComponentOverrides(components, customizations.componentOverrides)
    }

    // Update component IDs to avoid conflicts
    components = this.regenerateComponentIds(components, targetSectionId)

    // Update usage count
    template.metadata.usageCount++
    template.metadata.updatedAt = new Date()

    return {
      success: true,
      sectionConfig: components,
      dataBindings,
      styles
    }
  }

  /**
   * Update existing template
   */
  async updateTemplate(
    templateId: string,
    userId: string,
    updates: Partial<Pick<SectionTemplate, 'name' | 'description' | 'components' | 'dataBindings' | 'styles' | 'metadata'>>
  ): Promise<SectionTemplate> {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error('Template not found')
    }

    if (template.metadata.createdBy !== userId) {
      throw new Error('Unauthorized to update this template')
    }

    const updatedTemplate: SectionTemplate = {
      ...template,
      ...updates,
      metadata: {
        ...template.metadata,
        ...updates.metadata,
        updatedAt: new Date(),
        version: this.incrementVersion(template.metadata.version)
      }
    }

    this.templates.set(templateId, updatedTemplate)
    return updatedTemplate
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string, userId: string): Promise<boolean> {
    const template = this.templates.get(templateId)
    if (!template) {
      return false
    }

    if (template.metadata.createdBy !== userId) {
      throw new Error('Unauthorized to delete this template')
    }

    this.templates.delete(templateId)
    
    // Remove from user's templates
    this.userTemplates.get(userId)?.delete(templateId)

    return true
  }

  /**
   * Share template with other users
   */
  async shareTemplate(
    templateId: string,
    userId: string,
    shareWith: string[],
    permissions: 'view' | 'edit' = 'view'
  ): Promise<boolean> {
    const template = this.templates.get(templateId)
    if (!template || template.metadata.createdBy !== userId) {
      throw new Error('Template not found or unauthorized')
    }

    // Implementation would store sharing permissions in database
    // For now, just mark as public if sharing broadly
    if (shareWith.length > 5) {
      template.metadata.isPublic = true
    }

    return true
  }

  /**
   * Rate and review template
   */
  async rateTemplate(
    templateId: string,
    userId: string,
    rating: number,
    review?: string
  ): Promise<boolean> {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5')
    }

    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error('Template not found')
    }

    // In a real implementation, this would store individual ratings
    // and calculate the average. For now, we'll simulate it.
    const currentRating = template.metadata.rating
    const newRating = (currentRating + rating) / 2
    template.metadata.rating = Math.round(newRating * 10) / 10

    return true
  }

  /**
   * Get template usage analytics
   */
  async getTemplateAnalytics(
    templateId: string,
    userId: string
  ): Promise<{
    usageCount: number
    rating: number
    reviews: number
    popularWith: string[]
    recentUsage: Array<{ date: Date; count: number }>
    topCustomizations: Array<{ property: string; frequency: number }>
  }> {
    const template = this.templates.get(templateId)
    if (!template || template.metadata.createdBy !== userId) {
      throw new Error('Template not found or unauthorized')
    }

    // Mock analytics data - in real implementation, this would come from database
    return {
      usageCount: template.metadata.usageCount,
      rating: template.metadata.rating,
      reviews: Math.floor(template.metadata.usageCount * 0.3),
      popularWith: ['hairdressing', 'beauty', 'automotive'],
      recentUsage: [
        { date: new Date(Date.now() - 86400000), count: 5 },
        { date: new Date(Date.now() - 172800000), count: 8 },
        { date: new Date(Date.now() - 259200000), count: 3 }
      ],
      topCustomizations: [
        { property: 'colors.primary', frequency: 0.8 },
        { property: 'typography.fontFamily', frequency: 0.6 },
        { property: 'background.value', frequency: 0.4 }
      ]
    }
  }

  /**
   * Generate context-aware suggestions
   */
  private async generateSuggestions(
    templates: SectionTemplate[],
    context?: {
      currentPage?: string
      existingSections?: string[]
      businessType?: string
      targetAudience?: string
    }
  ): Promise<SectionTemplate[]> {
    if (!context) return []

    let suggestions = [...templates]

    // Filter by business type
    if (context.businessType) {
      suggestions = suggestions.filter(t =>
        !t.industry || t.industry.includes(context.businessType!)
      )
    }

    // Suggest complementary sections
    if (context.existingSections?.length) {
      const existing = new Set(context.existingSections)
      
      // If they have hero but no services, suggest services
      if (existing.has('hero') && !existing.has('services')) {
        suggestions = suggestions.filter(t => t.category === 'services')
      }
      
      // If they have services but no contact, suggest contact
      if (existing.has('services') && !existing.has('contact')) {
        suggestions = suggestions.filter(t => t.category === 'contact')
      }
    }

    // Sort by relevance
    suggestions.sort((a, b) => {
      let aScore = 0
      let bScore = 0

      // Boost templates matching business type
      if (context.businessType && a.industry?.includes(context.businessType)) aScore += 10
      if (context.businessType && b.industry?.includes(context.businessType)) bScore += 10

      // Boost highly rated templates
      aScore += a.metadata.rating * 2
      bScore += b.metadata.rating * 2

      return bScore - aScore
    })

    return suggestions.slice(0, 5)
  }

  /**
   * Calculate category distribution
   */
  private calculateCategories(templates: SectionTemplate[]): Array<{ name: string; count: number }> {
    const categories = new Map<string, number>()
    
    templates.forEach(template => {
      const count = categories.get(template.category) || 0
      categories.set(template.category, count + 1)
    })

    return Array.from(categories.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }

  /**
   * Sanitize components to remove sensitive data
   */
  private sanitizeComponents(components: ComponentConfig[]): ComponentConfig[] {
    return components.map(component => ({
      ...component,
      props: this.sanitizeProps(component.props),
      children: component.children ? this.sanitizeComponents(component.children) : undefined
    }))
  }

  /**
   * Sanitize component props
   */
  private sanitizeProps(props: Record<string, any>): Record<string, any> {
    const sanitized = { ...props }
    
    // Remove sensitive data
    delete sanitized.apiKey
    delete sanitized.secretKey
    delete sanitized.password
    delete sanitized.token
    
    return sanitized
  }

  /**
   * Apply data overrides to bindings
   */
  private applyDataOverrides(
    bindings: DataBinding[],
    overrides: Record<string, any>
  ): DataBinding[] {
    return bindings.map(binding => {
      if (overrides[binding.property]) {
        return {
          ...binding,
          dataSource: overrides[binding.property]
        }
      }
      return binding
    })
  }

  /**
   * Apply component overrides
   */
  private applyComponentOverrides(
    components: ComponentConfig[],
    overrides: Record<string, any>
  ): ComponentConfig[] {
    return components.map(component => {
      const override = overrides[component.id]
      if (override) {
        return {
          ...component,
          props: { ...component.props, ...override },
          children: component.children ? 
            this.applyComponentOverrides(component.children, overrides) : 
            undefined
        }
      }
      return {
        ...component,
        children: component.children ? 
          this.applyComponentOverrides(component.children, overrides) : 
          undefined
      }
    })
  }

  /**
   * Regenerate component IDs to avoid conflicts
   */
  private regenerateComponentIds(
    components: ComponentConfig[],
    prefix: string
  ): ComponentConfig[] {
    return components.map((component, index) => ({
      ...component,
      id: `${prefix}_${component.type}_${index}`,
      children: component.children ? 
        this.regenerateComponentIds(component.children, `${prefix}_${index}`) : 
        undefined
    }))
  }

  /**
   * Generate thumbnail for template
   */
  private async generateThumbnail(
    components: ComponentConfig[],
    styles: SectionStyles
  ): Promise<string> {
    // In a real implementation, this would generate an actual thumbnail
    // For now, return a placeholder
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${styles.colors.background}"/>
        <text x="50%" y="50%" text-anchor="middle" fill="${styles.colors.text}">
          Template Preview
        </text>
      </svg>
    `)}`
  }

  /**
   * Check if user has access to template
   */
  private hasTemplateAccess(tenantId: string, userId: string, templateId: string): boolean {
    // In a real implementation, this would check sharing permissions
    return false
  }

  /**
   * Increment version number
   */
  private incrementVersion(version: string): string {
    const parts = version.split('.')
    const patch = parseInt(parts[2] || '0') + 1
    return `${parts[0]}.${parts[1]}.${patch}`
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return 'template_' + Date.now().toString(36) + Math.random().toString(36).substring(2)
  }

  /**
   * Initialize default templates
   */
  private initializeDefaultTemplates(): void {
    const defaultTemplates: Omit<SectionTemplate, 'id'>[] = [
      {
        name: 'Modern Hero Section',
        description: 'Clean, modern hero section with call-to-action',
        category: 'hero',
        industry: ['general'],
        thumbnail: '',
        components: [
          {
            id: 'hero-container',
            type: 'Container',
            props: {
              className: 'hero-section',
              fullWidth: true
            },
            layout: {
              position: { x: 0, y: 0 },
              size: { width: 100, height: 60 },
              zIndex: 1,
              responsive: {
                mobile: { size: { width: 100, height: 80 } },
                tablet: { size: { width: 100, height: 70 } },
                desktop: { size: { width: 100, height: 60 } }
              }
            },
            children: [
              {
                id: 'hero-title',
                type: 'Heading',
                props: {
                  level: 1,
                  text: '{{business.name}}',
                  className: 'hero-title'
                },
                layout: {
                  position: { x: 10, y: 20 },
                  size: { width: 80, height: 15 },
                  zIndex: 2,
                  responsive: {
                    mobile: { position: { x: 5, y: 15 }, size: { width: 90, height: 20 } },
                    tablet: { position: { x: 8, y: 18 }, size: { width: 84, height: 18 } },
                    desktop: { position: { x: 10, y: 20 }, size: { width: 80, height: 15 } }
                  }
                }
              },
              {
                id: 'hero-subtitle',
                type: 'Text',
                props: {
                  text: '{{business.tagline}}',
                  className: 'hero-subtitle'
                },
                layout: {
                  position: { x: 10, y: 35 },
                  size: { width: 60, height: 10 },
                  zIndex: 2,
                  responsive: {
                    mobile: { position: { x: 5, y: 35 }, size: { width: 90, height: 15 } },
                    tablet: { position: { x: 8, y: 36 }, size: { width: 75, height: 12 } },
                    desktop: { position: { x: 10, y: 35 }, size: { width: 60, height: 10 } }
                  }
                }
              },
              {
                id: 'hero-cta',
                type: 'Button',
                props: {
                  text: 'Book Now',
                  variant: 'primary',
                  size: 'large',
                  onClick: 'openBooking'
                },
                layout: {
                  position: { x: 10, y: 50 },
                  size: { width: 20, height: 8 },
                  zIndex: 2,
                  responsive: {
                    mobile: { position: { x: 5, y: 55 }, size: { width: 40, height: 10 } },
                    tablet: { position: { x: 8, y: 52 }, size: { width: 30, height: 9 } },
                    desktop: { position: { x: 10, y: 50 }, size: { width: 20, height: 8 } }
                  }
                }
              }
            ]
          }
        ],
        dataBindings: [
          {
            componentId: 'hero-title',
            property: 'text',
            dataSource: 'business.name',
            fallback: 'Your Business Name'
          },
          {
            componentId: 'hero-subtitle',
            property: 'text',
            dataSource: 'business.tagline',
            fallback: 'Professional services you can trust'
          }
        ],
        styles: {
          background: {
            type: 'gradient',
            value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          },
          spacing: {
            padding: { top: 80, right: 40, bottom: 80, left: 40 },
            margin: { top: 0, right: 0, bottom: 0, left: 0 }
          },
          typography: {
            fontFamily: 'Inter, sans-serif',
            fontSize: { h1: 48, h2: 36, body: 16 },
            lineHeight: { h1: 1.2, h2: 1.3, body: 1.5 },
            fontWeight: { h1: 700, h2: 600, body: 400 }
          },
          colors: {
            primary: '#667eea',
            secondary: '#764ba2',
            accent: '#f093fb',
            text: '#ffffff',
            background: 'transparent'
          },
          responsive: {
            mobile: {
              spacing: {
                padding: { top: 60, right: 20, bottom: 60, left: 20 },
                margin: { top: 0, right: 0, bottom: 0, left: 0 }
              },
              typography: {
                fontSize: { h1: 32, h2: 24, body: 14 }
              }
            },
            tablet: {
              spacing: {
                padding: { top: 70, right: 30, bottom: 70, left: 30 },
                margin: { top: 0, right: 0, bottom: 0, left: 0 }
              },
              typography: {
                fontSize: { h1: 40, h2: 30, body: 15 }
              }
            },
            desktop: {}
          }
        },
        metadata: {
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0',
          tags: ['hero', 'modern', 'gradient', 'cta'],
          usageCount: 0,
          rating: 5,
          isPublic: true,
          isVerified: true
        }
      }
    ]

    defaultTemplates.forEach(template => {
      const fullTemplate: SectionTemplate = {
        ...template,
        id: this.generateId()
      }
      this.templates.set(fullTemplate.id, fullTemplate)
    })
  }
}

export const sectionTemplateManager = new SectionTemplateManager()