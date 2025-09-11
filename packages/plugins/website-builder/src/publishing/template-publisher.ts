import { EventEmitter } from 'events'
import { IndustryTemplate, BusinessData, TemplateValidation } from '../templates/enhanced-industry-templates'

export interface PublishingConfig {
  domain?: string
  subdomain?: string
  customDomain?: string
  sslEnabled: boolean
  redirects: Array<{
    from: string
    to: string
    type: 'permanent' | 'temporary'
  }>
  seoSettings: {
    sitemap: boolean
    robotsTxt: boolean
    analytics: {
      googleAnalytics?: string
      facebookPixel?: string
      customScripts?: string[]
    }
  }
  performance: {
    caching: boolean
    compression: boolean
    imageOptimization: boolean
    lazyLoading: boolean
  }
}

export interface PublishedSite {
  id: string
  tenantId: string
  templateId: string
  name: string
  status: 'draft' | 'publishing' | 'published' | 'error'
  url: string
  customDomain?: string
  publishedAt?: Date
  lastUpdated: Date
  version: number
  config: PublishingConfig
  pages: PublishedPage[]
  theme: any
  metadata: {
    totalPages: number
    totalAssets: number
    buildTime: number
    lastBuildError?: string
  }
}

export interface PublishedPage {
  id: string
  name: string
  slug: string
  content: string
  seoMeta: {
    title: string
    description: string
    keywords: string[]
    ogImage?: string
    structuredData?: any
  }
  lastModified: Date
  status: 'draft' | 'published'
}

export interface TemplateApplicationResult {
  success: boolean
  siteId?: string
  pages: PublishedPage[]
  theme: any
  validation: TemplateValidation
  errors?: string[]
  warnings?: string[]
}

export interface PublishingProgress {
  stage: 'preparing' | 'building' | 'optimizing' | 'deploying' | 'complete' | 'error'
  progress: number
  message: string
  details?: any
}

export class TemplatePublisher extends EventEmitter {
  private publishedSites: Map<string, PublishedSite> = new Map()
  private publishingQueue: Map<string, PublishingProgress> = new Map()

  constructor() {
    super()
  }

  /**
   * Apply template and create a new site
   */
  async applyTemplate(
    tenantId: string,
    template: IndustryTemplate,
    businessData: BusinessData,
    customizations?: {
      colorScheme?: string
      layoutVariant?: string
      selectedPages?: string[]
      contentOverrides?: Record<string, any>
      publishingConfig?: Partial<PublishingConfig>
    }
  ): Promise<TemplateApplicationResult> {
    try {
      // Validate business data
      const validation = this.validateBusinessData(template, businessData)
      
      if (!validation.isValid && validation.errors.length > 0) {
        return {
          success: false,
          pages: [],
          theme: {},
          validation,
          errors: validation.errors
        }
      }

      // Generate site ID
      const siteId = this.generateSiteId()

      // Process template pages
      const pages = await this.processTemplatePages(
        template,
        businessData,
        customizations
      )

      // Apply theme customizations
      const theme = this.applyThemeCustomizations(
        template.theme,
        customizations?.colorScheme
      )

      // Create default publishing config
      const defaultConfig: PublishingConfig = {
        subdomain: this.generateSubdomain(businessData.name),
        sslEnabled: true,
        redirects: [],
        seoSettings: {
          sitemap: true,
          robotsTxt: true,
          analytics: {}
        },
        performance: {
          caching: true,
          compression: true,
          imageOptimization: true,
          lazyLoading: true
        }
      }

      const config = { ...defaultConfig, ...customizations?.publishingConfig }

      // Create published site record
      const publishedSite: PublishedSite = {
        id: siteId,
        tenantId,
        templateId: template.id,
        name: businessData.name,
        status: 'draft',
        url: this.generateSiteUrl(config),
        customDomain: config.customDomain,
        lastUpdated: new Date(),
        version: 1,
        config,
        pages,
        theme,
        metadata: {
          totalPages: pages.length,
          totalAssets: 0,
          buildTime: 0
        }
      }

      this.publishedSites.set(siteId, publishedSite)

      this.emit('template:applied', {
        siteId,
        templateId: template.id,
        tenantId,
        validation
      })

      return {
        success: true,
        siteId,
        pages,
        theme,
        validation
      }

    } catch (error) {
      console.error('Template application failed:', error)
      return {
        success: false,
        pages: [],
        theme: {},
        validation: {
          isValid: false,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          warnings: [],
          completionPercentage: 0,
          missingData: [],
          suggestions: []
        },
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Publish a site to make it live
   */
  async publishSite(
    siteId: string,
    options: {
      customDomain?: string
      sslCertificate?: boolean
      previewMode?: boolean
    } = {}
  ): Promise<{
    success: boolean
    url?: string
    errors?: string[]
  }> {
    const site = this.publishedSites.get(siteId)
    if (!site) {
      return {
        success: false,
        errors: ['Site not found']
      }
    }

    try {
      // Start publishing process
      site.status = 'publishing'
      this.updatePublishingProgress(siteId, {
        stage: 'preparing',
        progress: 0,
        message: 'Preparing site for publishing...'
      })

      // Build static files
      await this.buildStaticSite(site)
      this.updatePublishingProgress(siteId, {
        stage: 'building',
        progress: 25,
        message: 'Building static files...'
      })

      // Optimize assets
      await this.optimizeAssets(site)
      this.updatePublishingProgress(siteId, {
        stage: 'optimizing',
        progress: 50,
        message: 'Optimizing images and assets...'
      })

      // Deploy to CDN/hosting
      const deploymentResult = await this.deployToHosting(site, options)
      this.updatePublishingProgress(siteId, {
        stage: 'deploying',
        progress: 75,
        message: 'Deploying to hosting platform...'
      })

      if (!deploymentResult.success) {
        throw new Error(deploymentResult.error || 'Deployment failed')
      }

      // Update site status
      site.status = 'published'
      site.publishedAt = new Date()
      site.url = deploymentResult.url
      
      if (options.customDomain) {
        site.customDomain = options.customDomain
        site.config.customDomain = options.customDomain
      }

      this.updatePublishingProgress(siteId, {
        stage: 'complete',
        progress: 100,
        message: 'Site published successfully!'
      })

      // Generate sitemap and robots.txt
      if (site.config.seoSettings.sitemap) {
        await this.generateSitemap(site)
      }

      if (site.config.seoSettings.robotsTxt) {
        await this.generateRobotsTxt(site)
      }

      this.emit('site:published', {
        siteId,
        tenantId: site.tenantId,
        url: site.url,
        customDomain: site.customDomain
      })

      return {
        success: true,
        url: site.url
      }

    } catch (error) {
      site.status = 'error'
      site.metadata.lastBuildError = error instanceof Error ? error.message : 'Unknown error'

      this.updatePublishingProgress(siteId, {
        stage: 'error',
        progress: 0,
        message: 'Publishing failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      })

      this.emit('site:publish_failed', {
        siteId,
        tenantId: site.tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Update an existing site
   */
  async updateSite(
    siteId: string,
    updates: {
      businessData?: Partial<BusinessData>
      customizations?: any
      pages?: Partial<PublishedPage>[]
      theme?: any
      config?: Partial<PublishingConfig>
    }
  ): Promise<{
    success: boolean
    requiresRepublish: boolean
    errors?: string[]
  }> {
    const site = this.publishedSites.get(siteId)
    if (!site) {
      return {
        success: false,
        requiresRepublish: false,
        errors: ['Site not found']
      }
    }

    try {
      let requiresRepublish = false

      // Update business data and regenerate pages if needed
      if (updates.businessData) {
        // This would trigger page regeneration
        requiresRepublish = true
      }

      // Update theme
      if (updates.theme) {
        site.theme = { ...site.theme, ...updates.theme }
        requiresRepublish = true
      }

      // Update individual pages
      if (updates.pages) {
        updates.pages.forEach(pageUpdate => {
          const existingPage = site.pages.find(p => p.id === pageUpdate.id)
          if (existingPage && pageUpdate) {
            Object.assign(existingPage, pageUpdate)
            existingPage.lastModified = new Date()
            requiresRepublish = true
          }
        })
      }

      // Update publishing config
      if (updates.config) {
        site.config = { ...site.config, ...updates.config }
        requiresRepublish = true
      }

      site.lastUpdated = new Date()
      site.version++

      this.emit('site:updated', {
        siteId,
        tenantId: site.tenantId,
        requiresRepublish
      })

      return {
        success: true,
        requiresRepublish
      }

    } catch (error) {
      return {
        success: false,
        requiresRepublish: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Get site by ID
   */
  getSite(siteId: string): PublishedSite | undefined {
    return this.publishedSites.get(siteId)
  }

  /**
   * Get sites by tenant
   */
  getSitesByTenant(tenantId: string): PublishedSite[] {
    return Array.from(this.publishedSites.values())
      .filter(site => site.tenantId === tenantId)
      .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())
  }

  /**
   * Get publishing progress
   */
  getPublishingProgress(siteId: string): PublishingProgress | undefined {
    return this.publishingQueue.get(siteId)
  }

  /**
   * Delete a site
   */
  async deleteSite(siteId: string): Promise<boolean> {
    const site = this.publishedSites.get(siteId)
    if (!site) {
      return false
    }

    try {
      // Remove from hosting if published
      if (site.status === 'published') {
        await this.removeFromHosting(site)
      }

      // Remove from local storage
      this.publishedSites.delete(siteId)
      this.publishingQueue.delete(siteId)

      this.emit('site:deleted', {
        siteId,
        tenantId: site.tenantId
      })

      return true
    } catch (error) {
      console.error('Failed to delete site:', error)
      return false
    }
  }

  /**
   * Preview site before publishing
   */
  async generatePreview(siteId: string): Promise<{
    success: boolean
    previewUrl?: string
    errors?: string[]
  }> {
    const site = this.publishedSites.get(siteId)
    if (!site) {
      return {
        success: false,
        errors: ['Site not found']
      }
    }

    try {
      // Generate preview build
      const previewUrl = await this.buildPreview(site)
      
      return {
        success: true,
        previewUrl
      }
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Preview generation failed']
      }
    }
  }

  /**
   * Process template pages with business data
   */
  private async processTemplatePages(
    template: IndustryTemplate,
    businessData: BusinessData,
    customizations?: any
  ): Promise<PublishedPage[]> {
    const pages: PublishedPage[] = []

    for (const pageTemplate of template.pages) {
      // Skip pages not selected in customizations
      if (customizations?.selectedPages && 
          !pageTemplate.isRequired && 
          !customizations.selectedPages.includes(pageTemplate.id)) {
        continue
      }

      // Process sections and generate HTML content
      const content = await this.generatePageContent(
        pageTemplate,
        businessData,
        customizations
      )

      // Process SEO metadata
      const seoMeta = {
        title: this.processTemplate(pageTemplate.seoConfig.title, businessData),
        description: this.processTemplate(pageTemplate.seoConfig.description, businessData),
        keywords: pageTemplate.seoConfig.keywords,
        ogImage: pageTemplate.seoConfig.ogImage,
        structuredData: this.processStructuredData(
          pageTemplate.seoConfig.structuredData,
          businessData
        )
      }

      pages.push({
        id: pageTemplate.id,
        name: pageTemplate.name,
        slug: pageTemplate.slug,
        content,
        seoMeta,
        lastModified: new Date(),
        status: 'published'
      })
    }

    return pages
  }

  /**
   * Generate HTML content for a page
   */
  private async generatePageContent(
    pageTemplate: any,
    businessData: BusinessData,
    customizations?: any
  ): Promise<string> {
    // This would use the component rendering system
    // For now, return a basic HTML structure
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTemplate.name}</title>
</head>
<body>`

    // Process each section
    for (const section of pageTemplate.sections) {
      const processedProps = this.processDataBindings(
        section.props,
        section.dataBindings,
        businessData,
        customizations?.contentOverrides
      )

      html += this.renderSection(section.type, processedProps)
    }

    html += `</body></html>`
    return html
  }

  /**
   * Render a section to HTML
   */
  private renderSection(type: string, props: any): string {
    switch (type) {
      case 'hero':
        return `
          <section class="hero">
            <h1>${props.title || ''}</h1>
            <p>${props.subtitle || ''}</p>
            ${props.ctaText ? `<a href="${props.ctaLink || '#'}" class="cta-button">${props.ctaText}</a>` : ''}
          </section>
        `
      case 'services-grid':
        const servicesHtml = (props.services || []).map((service: any) => `
          <div class="service-card">
            <h3>${service.name}</h3>
            <p>${service.description}</p>
            <span class="price">${service.price}</span>
          </div>
        `).join('')
        
        return `
          <section class="services">
            <h2>${props.title || ''}</h2>
            <p>${props.subtitle || ''}</p>
            <div class="services-grid">${servicesHtml}</div>
          </section>
        `
      case 'contact-section':
        return `
          <section class="contact">
            <h2>${props.title || ''}</h2>
            <p>${props.subtitle || ''}</p>
            <div class="contact-info">
              ${props.phone ? `<p>Phone: ${props.phone}</p>` : ''}
              ${props.email ? `<p>Email: ${props.email}</p>` : ''}
              ${props.address ? `<p>Address: ${props.address}</p>` : ''}
            </div>
          </section>
        `
      default:
        return `<section class="${type}"><!-- ${type} section --></section>`
    }
  }

  /**
   * Apply theme customizations
   */
  private applyThemeCustomizations(baseTheme: any, colorSchemeId?: string): any {
    // This would apply color scheme and other theme customizations
    return { ...baseTheme }
  }

  /**
   * Process data bindings
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
   * Process template strings
   */
  private processTemplate(template: string, data: BusinessData): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this.getNestedValue(data, path.trim())
      return value !== undefined ? String(value) : match
    })
  }

  /**
   * Process structured data
   */
  private processStructuredData(structuredData: any, businessData: BusinessData): any {
    if (!structuredData) return undefined

    const processed = JSON.parse(JSON.stringify(structuredData))
    
    // Process template strings in structured data
    const processObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return this.processTemplate(obj, businessData)
      } else if (Array.isArray(obj)) {
        return obj.map(processObject)
      } else if (obj && typeof obj === 'object') {
        const result: any = {}
        for (const [key, value] of Object.entries(obj)) {
          result[key] = processObject(value)
        }
        return result
      }
      return obj
    }

    return processObject(processed)
  }

  /**
   * Validate business data
   */
  private validateBusinessData(template: IndustryTemplate, businessData: BusinessData): TemplateValidation {
    const errors: string[] = []
    const warnings: string[] = []
    const missingData: string[] = []

    // Check required fields
    template.requiredData.forEach(field => {
      const value = this.getNestedValue(businessData, field)
      if (!value || value.toString().trim() === '') {
        errors.push(`Required field '${field}' is missing`)
        missingData.push(field)
      }
    })

    // Check optional fields
    template.optionalData.forEach(field => {
      const value = this.getNestedValue(businessData, field)
      if (!value) {
        warnings.push(`Optional field '${field}' is not provided`)
      }
    })

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
      suggestions: []
    }
  }

  /**
   * Build static site files
   */
  private async buildStaticSite(site: PublishedSite): Promise<void> {
    const startTime = Date.now()
    
    // Generate CSS from theme
    const css = this.generateCSS(site.theme)
    
    // Process each page
    for (const page of site.pages) {
      // Add CSS and other assets to page content
      page.content = this.injectAssets(page.content, css, site.config)
    }

    site.metadata.buildTime = Date.now() - startTime
  }

  /**
   * Generate CSS from theme
   */
  private generateCSS(theme: any): string {
    return `
      :root {
        --color-primary: ${theme.colors.primary};
        --color-secondary: ${theme.colors.secondary};
        --color-accent: ${theme.colors.accent};
        --color-background: ${theme.colors.background};
        --color-text: ${theme.colors.text};
        --font-heading: ${theme.fonts.heading};
        --font-body: ${theme.fonts.body};
      }
      
      body {
        font-family: var(--font-body);
        color: var(--color-text);
        background-color: var(--color-background);
        margin: 0;
        padding: 0;
      }
      
      h1, h2, h3, h4, h5, h6 {
        font-family: var(--font-heading);
        color: var(--color-primary);
      }
      
      .hero {
        background-color: var(--color-primary);
        color: white;
        padding: 4rem 2rem;
        text-align: center;
      }
      
      .cta-button {
        background-color: var(--color-accent);
        color: white;
        padding: 1rem 2rem;
        text-decoration: none;
        border-radius: 0.5rem;
        display: inline-block;
        margin-top: 1rem;
      }
      
      .services {
        padding: 4rem 2rem;
      }
      
      .services-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 2rem;
        margin-top: 2rem;
      }
      
      .service-card {
        border: 1px solid var(--color-border);
        padding: 2rem;
        border-radius: 0.5rem;
      }
      
      .contact {
        padding: 4rem 2rem;
        background-color: var(--color-muted);
      }
    `
  }

  /**
   * Inject CSS and other assets into page content
   */
  private injectAssets(content: string, css: string, config: PublishingConfig): string {
    // Inject CSS
    content = content.replace('</head>', `<style>${css}</style></head>`)
    
    // Inject analytics scripts
    if (config.seoSettings.analytics.googleAnalytics) {
      const gaScript = `
        <script async src="https://www.googletagmanager.com/gtag/js?id=${config.seoSettings.analytics.googleAnalytics}"></script>
        <script>
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${config.seoSettings.analytics.googleAnalytics}');
        </script>
      `
      content = content.replace('</head>', `${gaScript}</head>`)
    }

    return content
  }

  /**
   * Optimize assets
   */
  private async optimizeAssets(site: PublishedSite): Promise<void> {
    // This would optimize images, minify CSS/JS, etc.
    // For now, just simulate the process
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  /**
   * Deploy to hosting platform
   */
  private async deployToHosting(
    site: PublishedSite,
    options: any
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // This would deploy to actual hosting (Vercel, Netlify, etc.)
      // For now, simulate deployment
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const url = site.config.customDomain || 
                  `https://${site.config.subdomain}.bizbox.app`
      
      return { success: true, url }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Deployment failed' 
      }
    }
  }

  /**
   * Generate sitemap
   */
  private async generateSitemap(site: PublishedSite): Promise<void> {
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${site.pages.map(page => `
  <url>
    <loc>${site.url}${page.slug}</loc>
    <lastmod>${page.lastModified.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`).join('')}
</urlset>`

    // This would upload sitemap to hosting
    console.log('Generated sitemap for site:', site.id)
  }

  /**
   * Generate robots.txt
   */
  private async generateRobotsTxt(site: PublishedSite): Promise<void> {
    const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${site.url}/sitemap.xml`

    // This would upload robots.txt to hosting
    console.log('Generated robots.txt for site:', site.id)
  }

  /**
   * Build preview version
   */
  private async buildPreview(site: PublishedSite): Promise<string> {
    // Generate preview URL
    const previewUrl = `https://preview-${site.id}.bizbox.app`
    
    // This would create a preview deployment
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return previewUrl
  }

  /**
   * Remove site from hosting
   */
  private async removeFromHosting(site: PublishedSite): Promise<void> {
    // This would remove the site from hosting platform
    console.log('Removing site from hosting:', site.id)
  }

  /**
   * Update publishing progress
   */
  private updatePublishingProgress(siteId: string, progress: PublishingProgress): void {
    this.publishingQueue.set(siteId, progress)
    this.emit('publishing:progress', { siteId, progress })
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  /**
   * Generate unique site ID
   */
  private generateSiteId(): string {
    return 'site_' + Date.now().toString(36) + Math.random().toString(36).substring(2)
  }

  /**
   * Generate subdomain from business name
   */
  private generateSubdomain(businessName: string): string {
    return businessName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 30)
  }

  /**
   * Generate site URL
   */
  private generateSiteUrl(config: PublishingConfig): string {
    if (config.customDomain) {
      return `https://${config.customDomain}`
    }
    return `https://${config.subdomain}.bizbox.app`
  }
}

export const templatePublisher = new TemplatePublisher()