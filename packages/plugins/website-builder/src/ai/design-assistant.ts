import { ComponentInstance, ComponentDefinition, componentLibraryInstance } from '../components/component-library'

export interface DesignSuggestion {
  id: string
  type: 'layout' | 'content' | 'styling' | 'optimization' | 'accessibility'
  title: string
  description: string
  confidence: number // 0-1
  impact: 'low' | 'medium' | 'high'
  action: {
    type: 'add_component' | 'modify_component' | 'reorder_components' | 'style_change' | 'content_change'
    componentId?: string
    componentType?: string
    changes?: Record<string, any>
    position?: number
  }
  reasoning: string
  examples?: string[]
}

export interface DesignAnalysis {
  score: number // 0-100
  suggestions: DesignSuggestion[]
  strengths: string[]
  weaknesses: string[]
  categories: {
    layout: number
    content: number
    accessibility: number
    seo: number
    performance: number
  }
}

export interface BusinessContext {
  industry: string
  targetAudience: string
  businessType: 'service' | 'retail' | 'restaurant' | 'professional' | 'creative'
  goals: string[]
  brandPersonality: string[]
}

export class DesignAssistant {
  private industryTemplates: Map<string, ComponentInstance[]> = new Map()
  private designPatterns: Map<string, any> = new Map()

  constructor() {
    this.initializeTemplates()
    this.initializePatterns()
  }

  /**
   * Analyze current page design and provide suggestions
   */
  analyzeDesign(
    components: ComponentInstance[],
    businessContext?: BusinessContext,
    pageType: string = 'home'
  ): DesignAnalysis {
    const suggestions: DesignSuggestion[] = []
    const strengths: string[] = []
    const weaknesses: string[] = []

    // Analyze structure
    const structureAnalysis = this.analyzeStructure(components, pageType)
    suggestions.push(...structureAnalysis.suggestions)
    strengths.push(...structureAnalysis.strengths)
    weaknesses.push(...structureAnalysis.weaknesses)

    // Analyze content
    const contentAnalysis = this.analyzeContent(components, businessContext)
    suggestions.push(...contentAnalysis.suggestions)
    strengths.push(...contentAnalysis.strengths)
    weaknesses.push(...contentAnalysis.weaknesses)

    // Analyze accessibility
    const accessibilityAnalysis = this.analyzeAccessibility(components)
    suggestions.push(...accessibilityAnalysis.suggestions)
    strengths.push(...accessibilityAnalysis.strengths)
    weaknesses.push(...accessibilityAnalysis.weaknesses)

    // Analyze SEO
    const seoAnalysis = this.analyzeSEO(components, pageType)
    suggestions.push(...seoAnalysis.suggestions)
    strengths.push(...seoAnalysis.strengths)
    weaknesses.push(...seoAnalysis.weaknesses)

    // Calculate overall score
    const score = this.calculateOverallScore(suggestions, strengths, weaknesses)

    // Calculate category scores
    const categories = this.calculateCategoryScores(suggestions)

    return {
      score,
      suggestions: suggestions.sort((a, b) => b.confidence - a.confidence),
      strengths,
      weaknesses,
      categories
    }
  }

  /**
   * Generate layout suggestions based on business context
   */
  generateLayoutSuggestions(
    businessContext: BusinessContext,
    pageType: string = 'home'
  ): ComponentInstance[] {
    const template = this.getIndustryTemplate(businessContext.industry, pageType)
    
    if (template) {
      return this.customizeTemplate(template, businessContext)
    }

    // Fallback to generic layout
    return this.generateGenericLayout(businessContext, pageType)
  }

  /**
   * Suggest component improvements
   */
  suggestComponentImprovements(
    component: ComponentInstance,
    context: { position: number; totalComponents: number; businessContext?: BusinessContext }
  ): DesignSuggestion[] {
    const suggestions: DesignSuggestion[] = []
    const definition = componentLibraryInstance.getComponent(component.componentId)
    
    if (!definition) return suggestions

    // Analyze component props
    const propSuggestions = this.analyzeComponentProps(component, definition, context)
    suggestions.push(...propSuggestions)

    // Analyze component positioning
    const positionSuggestions = this.analyzeComponentPosition(component, context)
    suggestions.push(...positionSuggestions)

    return suggestions
  }

  /**
   * Generate smart content suggestions
   */
  generateContentSuggestions(
    componentType: string,
    businessContext?: BusinessContext
  ): Record<string, any> {
    const suggestions: Record<string, any> = {}

    switch (componentType) {
      case 'hero-section':
        suggestions.title = this.generateHeroTitle(businessContext)
        suggestions.subtitle = this.generateHeroSubtitle(businessContext)
        suggestions.ctaText = this.generateCTAText(businessContext)
        break

      case 'services-grid':
        suggestions.title = this.generateServicesTitle(businessContext)
        break

      case 'staff-team':
        suggestions.title = this.generateTeamTitle(businessContext)
        break

      case 'contact-info':
        suggestions.title = this.generateContactTitle(businessContext)
        break
    }

    return suggestions
  }

  /**
   * Analyze page structure
   */
  private analyzeStructure(
    components: ComponentInstance[],
    pageType: string
  ): { suggestions: DesignSuggestion[]; strengths: string[]; weaknesses: string[] } {
    const suggestions: DesignSuggestion[] = []
    const strengths: string[] = []
    const weaknesses: string[] = []

    const componentTypes = components.map(c => c.componentId)

    // Check for hero section
    if (!componentTypes.includes('hero-section') && pageType === 'home') {
      suggestions.push({
        id: 'add-hero',
        type: 'layout',
        title: 'Add Hero Section',
        description: 'A hero section creates a strong first impression and clearly communicates your value proposition',
        confidence: 0.9,
        impact: 'high',
        action: {
          type: 'add_component',
          componentType: 'hero-section',
          position: 0
        },
        reasoning: 'Hero sections are essential for home pages to capture visitor attention and communicate key messages',
        examples: ['Welcome visitors with a compelling headline', 'Showcase your main service or product', 'Include a clear call-to-action']
      })
    } else if (componentTypes.includes('hero-section')) {
      strengths.push('Strong opening with hero section')
    }

    // Check for footer
    if (!componentTypes.includes('footer')) {
      suggestions.push({
        id: 'add-footer',
        type: 'layout',
        title: 'Add Footer',
        description: 'Footers provide important navigation and contact information',
        confidence: 0.8,
        impact: 'medium',
        action: {
          type: 'add_component',
          componentType: 'footer',
          position: components.length
        },
        reasoning: 'Footers help with navigation and provide essential business information',
        examples: ['Contact information', 'Quick links', 'Social media links']
      })
    } else {
      strengths.push('Complete page structure with footer')
    }

    // Check component order
    const heroIndex = componentTypes.indexOf('hero-section')
    const footerIndex = componentTypes.indexOf('footer')
    
    if (heroIndex > 0) {
      suggestions.push({
        id: 'move-hero-top',
        type: 'layout',
        title: 'Move Hero to Top',
        description: 'Hero sections should be the first thing visitors see',
        confidence: 0.95,
        impact: 'medium',
        action: {
          type: 'reorder_components',
          componentId: components[heroIndex].id,
          position: 0
        },
        reasoning: 'Hero sections are most effective when placed at the top of the page',
        examples: []
      })
    }

    if (footerIndex >= 0 && footerIndex < components.length - 1) {
      suggestions.push({
        id: 'move-footer-bottom',
        type: 'layout',
        title: 'Move Footer to Bottom',
        description: 'Footers should be at the bottom of the page',
        confidence: 0.9,
        impact: 'medium',
        action: {
          type: 'reorder_components',
          componentId: components[footerIndex].id,
          position: components.length - 1
        },
        reasoning: 'Footers provide closure and should be the last element on the page',
        examples: []
      })
    }

    // Check for balanced content
    if (components.length < 3) {
      weaknesses.push('Page could benefit from more content sections')
    } else if (components.length > 8) {
      weaknesses.push('Page might be too long - consider splitting content')
    } else {
      strengths.push('Good content balance')
    }

    return { suggestions, strengths, weaknesses }
  }

  /**
   * Analyze content quality
   */
  private analyzeContent(
    components: ComponentInstance[],
    businessContext?: BusinessContext
  ): { suggestions: DesignSuggestion[]; strengths: string[]; weaknesses: string[] } {
    const suggestions: DesignSuggestion[] = []
    const strengths: string[] = []
    const weaknesses: string[] = []

    components.forEach((component, index) => {
      const definition = componentLibraryInstance.getComponent(component.componentId)
      if (!definition) return

      // Check for empty or placeholder content
      definition.props.forEach(propDef => {
        const value = component.props[propDef.name]
        
        if (propDef.required && (!value || value === propDef.defaultValue)) {
          suggestions.push({
            id: `content-${component.id}-${propDef.name}`,
            type: 'content',
            title: `Customize ${propDef.label}`,
            description: `Replace placeholder ${propDef.label.toLowerCase()} with your own content`,
            confidence: 0.8,
            impact: 'medium',
            action: {
              type: 'content_change',
              componentId: component.id,
              changes: {
                [propDef.name]: this.generateContentSuggestion(propDef.name, businessContext)
              }
            },
            reasoning: 'Personalized content performs better than generic placeholders',
            examples: []
          })
        }
      })

      // Check for missing call-to-actions
      if (component.componentId === 'hero-section' && !component.props.ctaText) {
        suggestions.push({
          id: `cta-${component.id}`,
          type: 'content',
          title: 'Add Call-to-Action',
          description: 'Hero sections should include a clear call-to-action button',
          confidence: 0.9,
          impact: 'high',
          action: {
            type: 'modify_component',
            componentId: component.id,
            changes: {
              ctaText: this.generateCTAText(businessContext),
              ctaLink: '/contact'
            }
          },
          reasoning: 'Call-to-action buttons guide visitors toward desired actions',
          examples: ['Book Now', 'Get Started', 'Contact Us', 'Learn More']
        })
      }
    })

    return { suggestions, strengths, weaknesses }
  }

  /**
   * Analyze accessibility
   */
  private analyzeAccessibility(
    components: ComponentInstance[]
  ): { suggestions: DesignSuggestion[]; strengths: string[]; weaknesses: string[] } {
    const suggestions: DesignSuggestion[] = []
    const strengths: string[] = []
    const weaknesses: string[] = []

    components.forEach(component => {
      // Check for images without alt text
      if (component.props.backgroundImage && !component.props.altText) {
        suggestions.push({
          id: `alt-text-${component.id}`,
          type: 'accessibility',
          title: 'Add Alt Text for Background Image',
          description: 'Background images should have descriptive alt text for screen readers',
          confidence: 0.8,
          impact: 'medium',
          action: {
            type: 'modify_component',
            componentId: component.id,
            changes: {
              altText: 'Descriptive text for background image'
            }
          },
          reasoning: 'Alt text helps visually impaired users understand image content',
          examples: ['Professional team working together', 'Modern office space', 'Happy customers']
        })
      }

      // Check for proper heading hierarchy
      if (component.componentId === 'hero-section' && component.props.title) {
        strengths.push('Proper heading structure with hero title')
      }
    })

    return { suggestions, strengths, weaknesses }
  }

  /**
   * Analyze SEO factors
   */
  private analyzeSEO(
    components: ComponentInstance[],
    pageType: string
  ): { suggestions: DesignSuggestion[]; strengths: string[]; weaknesses: string[] } {
    const suggestions: DesignSuggestion[] = []
    const strengths: string[] = []
    const weaknesses: string[] = []

    const hasHero = components.some(c => c.componentId === 'hero-section')
    const hasContact = components.some(c => c.componentId === 'contact-info')
    const hasServices = components.some(c => c.componentId === 'services-grid')

    if (hasHero) {
      strengths.push('Clear page title in hero section')
    }

    if (hasContact) {
      strengths.push('Contact information available for local SEO')
    }

    if (!hasServices && pageType === 'home') {
      suggestions.push({
        id: 'add-services-seo',
        type: 'optimization',
        title: 'Add Services Section',
        description: 'Services sections help with keyword optimization and user understanding',
        confidence: 0.7,
        impact: 'medium',
        action: {
          type: 'add_component',
          componentType: 'services-grid'
        },
        reasoning: 'Service descriptions provide valuable content for search engines',
        examples: []
      })
    }

    return { suggestions, strengths, weaknesses }
  }

  /**
   * Calculate overall design score
   */
  private calculateOverallScore(
    suggestions: DesignSuggestion[],
    strengths: string[],
    weaknesses: string[]
  ): number {
    const baseScore = 70
    const strengthBonus = strengths.length * 5
    const weaknessPenalty = weaknesses.length * 3
    const criticalIssues = suggestions.filter(s => s.impact === 'high').length * 10

    return Math.max(0, Math.min(100, baseScore + strengthBonus - weaknessPenalty - criticalIssues))
  }

  /**
   * Calculate category scores
   */
  private calculateCategoryScores(suggestions: DesignSuggestion[]): {
    layout: number
    content: number
    accessibility: number
    seo: number
    performance: number
  } {
    const categories = {
      layout: 85,
      content: 80,
      accessibility: 75,
      seo: 70,
      performance: 90
    }

    // Reduce scores based on suggestions
    suggestions.forEach(suggestion => {
      const penalty = suggestion.impact === 'high' ? 15 : suggestion.impact === 'medium' ? 10 : 5
      
      switch (suggestion.type) {
        case 'layout':
          categories.layout = Math.max(0, categories.layout - penalty)
          break
        case 'content':
          categories.content = Math.max(0, categories.content - penalty)
          break
        case 'accessibility':
          categories.accessibility = Math.max(0, categories.accessibility - penalty)
          break
        case 'optimization':
          categories.seo = Math.max(0, categories.seo - penalty)
          break
      }
    })

    return categories
  }

  /**
   * Initialize industry templates
   */
  private initializeTemplates(): void {
    // This would be populated with pre-built templates for different industries
    // For now, we'll use a simple structure
  }

  /**
   * Initialize design patterns
   */
  private initializePatterns(): void {
    // This would contain design patterns and best practices
  }

  /**
   * Get industry-specific template
   */
  private getIndustryTemplate(industry: string, pageType: string): ComponentInstance[] | null {
    return this.industryTemplates.get(`${industry}-${pageType}`) || null
  }

  /**
   * Customize template for business context
   */
  private customizeTemplate(
    template: ComponentInstance[],
    businessContext: BusinessContext
  ): ComponentInstance[] {
    return template.map(component => ({
      ...component,
      props: {
        ...component.props,
        ...this.generateContentSuggestions(component.componentId, businessContext)
      }
    }))
  }

  /**
   * Generate generic layout
   */
  private generateGenericLayout(
    businessContext: BusinessContext,
    pageType: string
  ): ComponentInstance[] {
    const components: ComponentInstance[] = []

    // Add hero section
    const hero = componentLibraryInstance.createInstance('hero-section', {
      title: this.generateHeroTitle(businessContext),
      subtitle: this.generateHeroSubtitle(businessContext),
      ctaText: this.generateCTAText(businessContext)
    })
    if (hero) components.push(hero)

    // Add services section for business types
    if (['service', 'professional'].includes(businessContext.businessType)) {
      const services = componentLibraryInstance.createInstance('services-grid', {
        title: this.generateServicesTitle(businessContext)
      })
      if (services) components.push(services)
    }

    // Add team section
    const team = componentLibraryInstance.createInstance('staff-team', {
      title: this.generateTeamTitle(businessContext)
    })
    if (team) components.push(team)

    // Add contact section
    const contact = componentLibraryInstance.createInstance('contact-info', {
      title: this.generateContactTitle(businessContext)
    })
    if (contact) components.push(contact)

    // Add footer
    const footer = componentLibraryInstance.createInstance('footer')
    if (footer) components.push(footer)

    return components
  }

  /**
   * Generate content suggestions
   */
  private generateContentSuggestion(propName: string, businessContext?: BusinessContext): string {
    if (!businessContext) return ''

    switch (propName) {
      case 'title':
        return this.generateHeroTitle(businessContext)
      case 'subtitle':
        return this.generateHeroSubtitle(businessContext)
      case 'ctaText':
        return this.generateCTAText(businessContext)
      default:
        return ''
    }
  }

  /**
   * Generate hero title
   */
  private generateHeroTitle(businessContext?: BusinessContext): string {
    if (!businessContext) return 'Welcome to Our Business'

    const templates = {
      service: ['Professional [Service] Services', 'Expert [Service] Solutions', 'Quality [Service] You Can Trust'],
      retail: ['Shop the Best [Products]', 'Your [Product] Destination', 'Quality [Products] at Great Prices'],
      restaurant: ['Delicious [Cuisine] Experience', 'Fresh [Food] Daily', 'Taste the Difference'],
      professional: ['Professional [Service] Services', 'Expert [Industry] Solutions', 'Trusted [Service] Provider'],
      creative: ['Creative [Service] Solutions', 'Bringing Ideas to Life', 'Professional [Service] Services']
    }

    const typeTemplates = templates[businessContext.businessType] || templates.service
    return typeTemplates[Math.floor(Math.random() * typeTemplates.length)]
  }

  /**
   * Generate hero subtitle
   */
  private generateHeroSubtitle(businessContext?: BusinessContext): string {
    if (!businessContext) return 'Professional services you can trust'

    const templates = [
      'Serving the community with excellence since [year]',
      'Professional, reliable, and affordable services',
      'Your satisfaction is our top priority',
      'Quality service with a personal touch',
      'Trusted by hundreds of satisfied customers'
    ]

    return templates[Math.floor(Math.random() * templates.length)]
  }

  /**
   * Generate CTA text
   */
  private generateCTAText(businessContext?: BusinessContext): string {
    if (!businessContext) return 'Get Started'

    const templates = {
      service: ['Book Now', 'Get Quote', 'Schedule Service', 'Contact Us'],
      retail: ['Shop Now', 'Browse Products', 'View Catalog', 'Start Shopping'],
      restaurant: ['Order Now', 'Book Table', 'View Menu', 'Make Reservation'],
      professional: ['Get Consultation', 'Contact Us', 'Learn More', 'Schedule Meeting'],
      creative: ['View Portfolio', 'Get Quote', 'Start Project', 'Contact Us']
    }

    const typeTemplates = templates[businessContext.businessType] || templates.service
    return typeTemplates[Math.floor(Math.random() * typeTemplates.length)]
  }

  /**
   * Generate services title
   */
  private generateServicesTitle(businessContext?: BusinessContext): string {
    return 'Our Services'
  }

  /**
   * Generate team title
   */
  private generateTeamTitle(businessContext?: BusinessContext): string {
    return 'Meet Our Team'
  }

  /**
   * Generate contact title
   */
  private generateContactTitle(businessContext?: BusinessContext): string {
    return 'Contact Us'
  }

  /**
   * Analyze component props
   */
  private analyzeComponentProps(
    component: ComponentInstance,
    definition: ComponentDefinition,
    context: any
  ): DesignSuggestion[] {
    // Implementation for analyzing component properties
    return []
  }

  /**
   * Analyze component position
   */
  private analyzeComponentPosition(
    component: ComponentInstance,
    context: any
  ): DesignSuggestion[] {
    // Implementation for analyzing component positioning
    return []
  }
}

export const designAssistant = new DesignAssistant()