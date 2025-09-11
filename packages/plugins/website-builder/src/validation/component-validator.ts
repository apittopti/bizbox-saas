import { z } from 'zod'
import { ComponentInstance, ComponentDefinition } from '../components/component-library'

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  type: 'required' | 'type' | 'format' | 'constraint' | 'dependency'
  message: string
  path: string
  componentId?: string
  severity: 'error' | 'warning'
}

export interface ValidationWarning {
  type: 'accessibility' | 'performance' | 'seo' | 'usability'
  message: string
  path: string
  componentId?: string
  suggestion?: string
}

export interface ValidationRule {
  id: string
  name: string
  description: string
  type: 'component' | 'page' | 'site'
  category: 'structure' | 'content' | 'accessibility' | 'performance' | 'seo'
  severity: 'error' | 'warning' | 'info'
  validate: (context: ValidationContext) => ValidationResult
}

export interface ValidationContext {
  component?: ComponentInstance
  components?: ComponentInstance[]
  page?: {
    title?: string
    description?: string
    url?: string
  }
  site?: {
    domain?: string
    theme?: any
  }
  businessData?: any
}

export class ComponentValidator {
  private rules: Map<string, ValidationRule> = new Map()
  private componentDefinitions: Map<string, ComponentDefinition> = new Map()

  constructor() {
    this.registerDefaultRules()
  }

  /**
   * Register a component definition for validation
   */
  registerComponentDefinition(definition: ComponentDefinition): void {
    this.componentDefinitions.set(definition.type, definition)
  }

  /**
   * Register a validation rule
   */
  registerRule(rule: ValidationRule): void {
    this.rules.set(rule.id, rule)
  }

  /**
   * Validate a single component
   */
  validateComponent(component: ComponentInstance): ValidationResult {
    const definition = this.componentDefinitions.get(component.componentId)
    if (!definition) {
      return {
        valid: false,
        errors: [{
          type: 'constraint',
          message: `Unknown component type: ${component.componentId}`,
          path: `component.${component.id}`,
          componentId: component.id,
          severity: 'error'
        }],
        warnings: []
      }
    }

    const context: ValidationContext = { component }
    const results = this.runRules('component', context)
    
    // Validate props against component schema
    const propValidation = this.validateProps(component, definition)
    
    return this.mergeResults([results, propValidation])
  }

  /**
   * Validate multiple components (page level)
   */
  validatePage(components: ComponentInstance[], pageInfo?: any): ValidationResult {
    const context: ValidationContext = { 
      components, 
      page: pageInfo 
    }
    
    // Validate individual components
    const componentResults = components.map(component => this.validateComponent(component))
    
    // Validate page-level rules
    const pageResults = this.runRules('page', context)
    
    return this.mergeResults([...componentResults, pageResults])
  }

  /**
   * Validate entire site
   */
  validateSite(pages: Array<{ components: ComponentInstance[]; info?: any }>, siteInfo?: any): ValidationResult {
    const context: ValidationContext = { 
      site: siteInfo 
    }
    
    // Validate individual pages
    const pageResults = pages.map(page => this.validatePage(page.components, page.info))
    
    // Validate site-level rules
    const siteResults = this.runRules('site', context)
    
    return this.mergeResults([...pageResults, siteResults])
  }

  /**
   * Validate component props against schema
   */
  private validateProps(component: ComponentInstance, definition: ComponentDefinition): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Check required props
    definition.props.forEach(propDef => {
      if (propDef.required && !(propDef.name in component.props)) {
        errors.push({
          type: 'required',
          message: `Required property '${propDef.name}' is missing`,
          path: `component.${component.id}.props.${propDef.name}`,
          componentId: component.id,
          severity: 'error'
        })
      }
    })

    // Validate prop types and formats
    Object.entries(component.props).forEach(([key, value]) => {
      const propDef = definition.props.find(p => p.name === key)
      if (propDef) {
        const typeValidation = this.validatePropType(value, propDef, component.id, key)
        errors.push(...typeValidation.errors)
        warnings.push(...typeValidation.warnings)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate a single prop type
   */
  private validatePropType(
    value: any, 
    propDef: any, 
    componentId: string, 
    propName: string
  ): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const path = `component.${componentId}.props.${propName}`

    // Type validation
    switch (propDef.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push({
            type: 'type',
            message: `Expected string, got ${typeof value}`,
            path,
            componentId,
            severity: 'error'
          })
        } else {
          // String-specific validations
          if (propDef.validation?.minLength && value.length < propDef.validation.minLength) {
            errors.push({
              type: 'constraint',
              message: `String too short (minimum ${propDef.validation.minLength} characters)`,
              path,
              componentId,
              severity: 'error'
            })
          }
          
          if (propDef.validation?.maxLength && value.length > propDef.validation.maxLength) {
            warnings.push({
              type: 'usability',
              message: `String too long (maximum ${propDef.validation.maxLength} characters recommended)`,
              path,
              componentId,
              suggestion: 'Consider shortening the text for better readability'
            })
          }
        }
        break

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push({
            type: 'type',
            message: `Expected number, got ${typeof value}`,
            path,
            componentId,
            severity: 'error'
          })
        }
        break

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push({
            type: 'type',
            message: `Expected boolean, got ${typeof value}`,
            path,
            componentId,
            severity: 'error'
          })
        }
        break

      case 'array':
        if (!Array.isArray(value)) {
          errors.push({
            type: 'type',
            message: `Expected array, got ${typeof value}`,
            path,
            componentId,
            severity: 'error'
          })
        }
        break

      case 'image':
        if (typeof value !== 'string') {
          errors.push({
            type: 'type',
            message: `Expected image URL string, got ${typeof value}`,
            path,
            componentId,
            severity: 'error'
          })
        } else if (value && !this.isValidImageUrl(value)) {
          warnings.push({
            type: 'usability',
            message: 'Image URL format may not be valid',
            path,
            componentId,
            suggestion: 'Ensure the URL points to a valid image file'
          })
        }
        break

      case 'color':
        if (typeof value !== 'string') {
          errors.push({
            type: 'type',
            message: `Expected color string, got ${typeof value}`,
            path,
            componentId,
            severity: 'error'
          })
        } else if (value && !this.isValidColor(value)) {
          errors.push({
            type: 'format',
            message: 'Invalid color format',
            path,
            componentId,
            severity: 'error'
          })
        }
        break
    }

    return { errors, warnings }
  }

  /**
   * Run validation rules of a specific type
   */
  private runRules(type: ValidationRule['type'], context: ValidationContext): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    for (const rule of this.rules.values()) {
      if (rule.type === type) {
        try {
          const result = rule.validate(context)
          errors.push(...result.errors)
          warnings.push(...result.warnings)
        } catch (error) {
          console.error(`Validation rule ${rule.id} failed:`, error)
        }
      }
    }

    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings
    }
  }

  /**
   * Merge multiple validation results
   */
  private mergeResults(results: ValidationResult[]): ValidationResult {
    const allErrors: ValidationError[] = []
    const allWarnings: ValidationWarning[] = []

    results.forEach(result => {
      allErrors.push(...result.errors)
      allWarnings.push(...result.warnings)
    })

    return {
      valid: allErrors.filter(e => e.severity === 'error').length === 0,
      errors: allErrors,
      warnings: allWarnings
    }
  }

  /**
   * Check if a URL is a valid image URL
   */
  private isValidImageUrl(url: string): boolean {
    try {
      new URL(url)
      return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)
    } catch {
      return false
    }
  }

  /**
   * Check if a string is a valid color
   */
  private isValidColor(color: string): boolean {
    // Check hex colors
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
      return true
    }
    
    // Check RGB/RGBA
    if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+)?\s*\)$/.test(color)) {
      return true
    }
    
    // Check HSL/HSLA
    if (/^hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(,\s*[\d.]+)?\s*\)$/.test(color)) {
      return true
    }
    
    // Check named colors (basic set)
    const namedColors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black', 'white', 'gray', 'grey']
    return namedColors.includes(color.toLowerCase())
  }

  /**
   * Register default validation rules
   */
  private registerDefaultRules(): void {
    // Accessibility rules
    this.registerRule({
      id: 'hero-alt-text',
      name: 'Hero Image Alt Text',
      description: 'Hero sections with background images should have descriptive alt text',
      type: 'component',
      category: 'accessibility',
      severity: 'warning',
      validate: (context) => {
        const errors: ValidationError[] = []
        const warnings: ValidationWarning[] = []

        if (context.component?.componentId === 'hero-section') {
          const props = context.component.props
          if (props.backgroundImage && !props.altText) {
            warnings.push({
              type: 'accessibility',
              message: 'Hero section with background image should include alt text for accessibility',
              path: `component.${context.component.id}.props.altText`,
              componentId: context.component.id,
              suggestion: 'Add an altText property describing the background image'
            })
          }
        }

        return { valid: true, errors, warnings }
      }
    })

    // SEO rules
    this.registerRule({
      id: 'page-title-length',
      name: 'Page Title Length',
      description: 'Page titles should be between 30-60 characters for optimal SEO',
      type: 'page',
      category: 'seo',
      severity: 'warning',
      validate: (context) => {
        const errors: ValidationError[] = []
        const warnings: ValidationWarning[] = []

        if (context.page?.title) {
          const length = context.page.title.length
          if (length < 30) {
            warnings.push({
              type: 'seo',
              message: 'Page title is too short for optimal SEO (minimum 30 characters recommended)',
              path: 'page.title',
              suggestion: 'Expand the title to include more descriptive keywords'
            })
          } else if (length > 60) {
            warnings.push({
              type: 'seo',
              message: 'Page title is too long for optimal SEO (maximum 60 characters recommended)',
              path: 'page.title',
              suggestion: 'Shorten the title to fit within search result displays'
            })
          }
        }

        return { valid: true, errors, warnings }
      }
    })

    // Performance rules
    this.registerRule({
      id: 'image-optimization',
      name: 'Image Optimization',
      description: 'Images should be optimized for web use',
      type: 'component',
      category: 'performance',
      severity: 'warning',
      validate: (context) => {
        const errors: ValidationError[] = []
        const warnings: ValidationWarning[] = []

        if (context.component) {
          const props = context.component.props
          
          // Check for unoptimized image URLs
          Object.entries(props).forEach(([key, value]) => {
            if (typeof value === 'string' && this.isValidImageUrl(value)) {
              if (!value.includes('webp') && !value.includes('avif')) {
                warnings.push({
                  type: 'performance',
                  message: `Image at ${key} could be optimized using modern formats (WebP, AVIF)`,
                  path: `component.${context.component!.id}.props.${key}`,
                  componentId: context.component!.id,
                  suggestion: 'Consider using WebP or AVIF format for better performance'
                })
              }
            }
          })
        }

        return { valid: true, errors, warnings }
      }
    })

    // Content rules
    this.registerRule({
      id: 'empty-content',
      name: 'Empty Content',
      description: 'Components should not have empty required content',
      type: 'component',
      category: 'content',
      severity: 'error',
      validate: (context) => {
        const errors: ValidationError[] = []
        const warnings: ValidationWarning[] = []

        if (context.component) {
          const props = context.component.props
          
          // Check for empty titles in components that typically need them
          if (['hero-section', 'services-grid', 'staff-team'].includes(context.component.componentId)) {
            if (!props.title || props.title.trim() === '') {
              errors.push({
                type: 'required',
                message: 'Component title is required and cannot be empty',
                path: `component.${context.component.id}.props.title`,
                componentId: context.component.id,
                severity: 'error'
              })
            }
          }
        }

        return { valid: errors.length === 0, errors, warnings }
      }
    })

    // Structure rules
    this.registerRule({
      id: 'page-structure',
      name: 'Page Structure',
      description: 'Pages should have proper structure with hero and footer',
      type: 'page',
      category: 'structure',
      severity: 'warning',
      validate: (context) => {
        const errors: ValidationError[] = []
        const warnings: ValidationWarning[] = []

        if (context.components) {
          const componentTypes = context.components.map(c => c.componentId)
          
          if (!componentTypes.includes('hero-section')) {
            warnings.push({
              type: 'usability',
              message: 'Page should include a hero section for better user engagement',
              path: 'page.components',
              suggestion: 'Add a hero section at the top of the page'
            })
          }
          
          if (!componentTypes.includes('footer')) {
            warnings.push({
              type: 'usability',
              message: 'Page should include a footer for navigation and contact information',
              path: 'page.components',
              suggestion: 'Add a footer at the bottom of the page'
            })
          }
        }

        return { valid: true, errors, warnings }
      }
    })
  }

  /**
   * Get validation summary
   */
  getValidationSummary(result: ValidationResult): {
    errorCount: number
    warningCount: number
    categories: Record<string, number>
    severity: 'error' | 'warning' | 'success'
  } {
    const errorCount = result.errors.filter(e => e.severity === 'error').length
    const warningCount = result.warnings.length
    
    const categories: Record<string, number> = {}
    
    result.errors.forEach(error => {
      const category = this.rules.get(error.type)?.category || 'other'
      categories[category] = (categories[category] || 0) + 1
    })
    
    result.warnings.forEach(warning => {
      categories[warning.type] = (categories[warning.type] || 0) + 1
    })

    return {
      errorCount,
      warningCount,
      categories,
      severity: errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'success'
    }
  }
}

export const componentValidator = new ComponentValidator()