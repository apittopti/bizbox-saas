import { ComponentInstance } from '../components/component-library'

export interface DataBinding {
  id: string
  componentId: string
  propertyPath: string
  dataSource: string
  transform?: DataTransform
  fallback?: any
}

export interface DataTransform {
  type: 'format' | 'filter' | 'map' | 'reduce' | 'custom'
  config: Record<string, any>
  customFunction?: string
}

export interface DataSource {
  id: string
  name: string
  type: 'business' | 'services' | 'staff' | 'bookings' | 'api' | 'static'
  endpoint?: string
  refreshInterval?: number
  cache?: boolean
  schema?: Record<string, any>
}

export interface BusinessData {
  id: string
  tenantId: string
  name: string
  description?: string
  logo?: string
  phone?: string
  email?: string
  address?: string
  website?: string
  socialMedia?: {
    facebook?: string
    instagram?: string
    twitter?: string
    linkedin?: string
  }
  theme?: {
    primaryColor: string
    secondaryColor: string
    fontFamily: string
    borderRadius: string
  }
  settings?: Record<string, any>
}

export interface ServiceData {
  id: string
  tenantId: string
  name: string
  description?: string
  duration: number
  price: number
  currency: string
  category?: string
  image?: string
  isActive: boolean
}

export interface StaffData {
  id: string
  tenantId: string
  name: string
  role: string
  bio?: string
  avatar?: string
  skills: string[]
  specializations: string[]
  isActive: boolean
}

export class DataBindingEngine {
  private bindings: Map<string, DataBinding> = new Map()
  private dataSources: Map<string, DataSource> = new Map()
  private dataCache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map()

  constructor() {
    this.registerDefaultDataSources()
  }

  /**
   * Register a data binding
   */
  registerBinding(binding: DataBinding): void {
    this.bindings.set(binding.id, binding)
  }

  /**
   * Remove a data binding
   */
  removeBinding(bindingId: string): void {
    this.bindings.delete(bindingId)
  }

  /**
   * Register a data source
   */
  registerDataSource(source: DataSource): void {
    this.dataSources.set(source.id, source)
  }

  /**
   * Bind data to component instances
   */
  async bindData(
    components: ComponentInstance[],
    tenantId: string,
    context: Record<string, any> = {}
  ): Promise<ComponentInstance[]> {
    // Fetch all required data
    const requiredSources = this.getRequiredDataSources(components)
    const data = await this.fetchData(requiredSources, tenantId, context)

    // Apply bindings to components
    return components.map(component => this.bindComponentData(component, data))
  }

  /**
   * Bind data to a single component
   */
  private bindComponentData(component: ComponentInstance, data: Record<string, any>): ComponentInstance {
    const bindings = Array.from(this.bindings.values()).filter(
      binding => binding.componentId === component.componentId
    )

    if (bindings.length === 0) {
      return component
    }

    const boundProps = { ...component.props }

    for (const binding of bindings) {
      try {
        const value = this.resolveDataPath(data, binding.dataSource)
        const transformedValue = binding.transform 
          ? this.applyTransform(value, binding.transform)
          : value

        this.setPropertyValue(boundProps, binding.propertyPath, transformedValue || binding.fallback)
      } catch (error) {
        console.warn(`Data binding failed for ${binding.id}:`, error)
        if (binding.fallback !== undefined) {
          this.setPropertyValue(boundProps, binding.propertyPath, binding.fallback)
        }
      }
    }

    return {
      ...component,
      props: boundProps,
      children: component.children?.map(child => this.bindComponentData(child, data))
    }
  }

  /**
   * Resolve a data path (e.g., "business.name" or "services[0].price")
   */
  private resolveDataPath(data: Record<string, any>, path: string): any {
    const parts = path.split('.')
    let current = data

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined
      }

      // Handle array access like "services[0]"
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/)
      if (arrayMatch) {
        const [, arrayName, index] = arrayMatch
        current = current[arrayName]?.[parseInt(index)]
      } else {
        current = current[part]
      }
    }

    return current
  }

  /**
   * Set a property value using dot notation
   */
  private setPropertyValue(obj: Record<string, any>, path: string, value: any): void {
    const parts = path.split('.')
    let current = obj

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      if (!(part in current) || typeof current[part] !== 'object') {
        current[part] = {}
      }
      current = current[part]
    }

    current[parts[parts.length - 1]] = value
  }

  /**
   * Apply data transformation
   */
  private applyTransform(value: any, transform: DataTransform): any {
    switch (transform.type) {
      case 'format':
        return this.formatValue(value, transform.config)
      
      case 'filter':
        return Array.isArray(value) 
          ? value.filter(item => this.matchesFilter(item, transform.config))
          : value
      
      case 'map':
        return Array.isArray(value)
          ? value.map(item => this.mapItem(item, transform.config))
          : value
      
      case 'reduce':
        return Array.isArray(value)
          ? value.reduce((acc, item) => this.reduceItem(acc, item, transform.config), transform.config.initialValue)
          : value
      
      case 'custom':
        return transform.customFunction 
          ? this.executeCustomFunction(value, transform.customFunction, transform.config)
          : value
      
      default:
        return value
    }
  }

  /**
   * Format a value based on configuration
   */
  private formatValue(value: any, config: Record<string, any>): any {
    switch (config.format) {
      case 'currency':
        return new Intl.NumberFormat('en-GB', {
          style: 'currency',
          currency: config.currency || 'GBP'
        }).format(value / 100) // Assuming value is in pence

      case 'date':
        return new Intl.DateTimeFormat('en-GB', config.options || {}).format(new Date(value))

      case 'number':
        return new Intl.NumberFormat('en-GB', config.options || {}).format(value)

      case 'truncate':
        return typeof value === 'string' && value.length > config.maxLength
          ? value.substring(0, config.maxLength) + '...'
          : value

      case 'uppercase':
        return typeof value === 'string' ? value.toUpperCase() : value

      case 'lowercase':
        return typeof value === 'string' ? value.toLowerCase() : value

      case 'capitalize':
        return typeof value === 'string' 
          ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
          : value

      default:
        return value
    }
  }

  /**
   * Check if an item matches filter criteria
   */
  private matchesFilter(item: any, config: Record<string, any>): boolean {
    for (const [key, criteria] of Object.entries(config)) {
      const itemValue = this.resolveDataPath(item, key)
      
      if (criteria.equals !== undefined && itemValue !== criteria.equals) {
        return false
      }
      
      if (criteria.contains !== undefined && 
          (!itemValue || !itemValue.toString().toLowerCase().includes(criteria.contains.toLowerCase()))) {
        return false
      }
      
      if (criteria.greaterThan !== undefined && itemValue <= criteria.greaterThan) {
        return false
      }
      
      if (criteria.lessThan !== undefined && itemValue >= criteria.lessThan) {
        return false
      }
    }
    
    return true
  }

  /**
   * Map an item based on configuration
   */
  private mapItem(item: any, config: Record<string, any>): any {
    const mapped: Record<string, any> = {}
    
    for (const [newKey, sourcePath] of Object.entries(config.mapping || {})) {
      mapped[newKey] = this.resolveDataPath(item, sourcePath as string)
    }
    
    return config.preserveOriginal ? { ...item, ...mapped } : mapped
  }

  /**
   * Reduce items based on configuration
   */
  private reduceItem(accumulator: any, item: any, config: Record<string, any>): any {
    switch (config.operation) {
      case 'sum':
        return accumulator + this.resolveDataPath(item, config.field)
      
      case 'count':
        return accumulator + 1
      
      case 'average':
        // This would need more complex handling for proper averaging
        return accumulator + this.resolveDataPath(item, config.field)
      
      case 'concat':
        return accumulator.concat(this.resolveDataPath(item, config.field))
      
      default:
        return accumulator
    }
  }

  /**
   * Execute custom transformation function
   */
  private executeCustomFunction(value: any, functionCode: string, config: Record<string, any>): any {
    try {
      // Create a safe execution context
      const context = { value, config, console: { log: console.log } }
      const func = new Function('context', `
        const { value, config } = context;
        ${functionCode}
      `)
      
      return func(context)
    } catch (error) {
      console.error('Custom function execution failed:', error)
      return value
    }
  }

  /**
   * Get required data sources from components
   */
  private getRequiredDataSources(components: ComponentInstance[]): string[] {
    const sources = new Set<string>()
    
    const processComponent = (component: ComponentInstance) => {
      const bindings = Array.from(this.bindings.values()).filter(
        binding => binding.componentId === component.componentId
      )
      
      bindings.forEach(binding => {
        const sourceId = binding.dataSource.split('.')[0]
        sources.add(sourceId)
      })
      
      component.children?.forEach(processComponent)
    }
    
    components.forEach(processComponent)
    return Array.from(sources)
  }

  /**
   * Fetch data from multiple sources
   */
  private async fetchData(
    sourceIds: string[],
    tenantId: string,
    context: Record<string, any>
  ): Promise<Record<string, any>> {
    const data: Record<string, any> = {}
    
    for (const sourceId of sourceIds) {
      const source = this.dataSources.get(sourceId)
      if (!source) {
        console.warn(`Data source not found: ${sourceId}`)
        continue
      }
      
      try {
        data[sourceId] = await this.fetchFromSource(source, tenantId, context)
      } catch (error) {
        console.error(`Failed to fetch data from ${sourceId}:`, error)
        data[sourceId] = null
      }
    }
    
    return data
  }

  /**
   * Fetch data from a single source
   */
  private async fetchFromSource(
    source: DataSource,
    tenantId: string,
    context: Record<string, any>
  ): Promise<any> {
    // Check cache first
    if (source.cache) {
      const cached = this.dataCache.get(`${source.id}:${tenantId}`)
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        return cached.data
      }
    }
    
    let data: any
    
    switch (source.type) {
      case 'business':
        data = await this.fetchBusinessData(tenantId)
        break
      
      case 'services':
        data = await this.fetchServicesData(tenantId)
        break
      
      case 'staff':
        data = await this.fetchStaffData(tenantId)
        break
      
      case 'api':
        data = await this.fetchApiData(source, tenantId, context)
        break
      
      case 'static':
        data = source.schema || {}
        break
      
      default:
        throw new Error(`Unknown data source type: ${source.type}`)
    }
    
    // Cache the result
    if (source.cache) {
      this.dataCache.set(`${source.id}:${tenantId}`, {
        data,
        timestamp: Date.now(),
        ttl: source.refreshInterval || 300000 // 5 minutes default
      })
    }
    
    return data
  }

  /**
   * Fetch business data
   */
  private async fetchBusinessData(tenantId: string): Promise<BusinessData | null> {
    // This would integrate with the business model
    // For now, return mock data
    return {
      id: tenantId,
      tenantId,
      name: 'Sample Business',
      description: 'Professional services you can trust',
      phone: '+44 20 1234 5678',
      email: 'info@samplebusiness.com',
      address: '123 Business Street, London, UK',
      theme: {
        primaryColor: '#3b82f6',
        secondaryColor: '#64748b',
        fontFamily: 'Inter, sans-serif',
        borderRadius: '0.5rem'
      }
    }
  }

  /**
   * Fetch services data
   */
  private async fetchServicesData(tenantId: string): Promise<ServiceData[]> {
    // This would integrate with the service model
    // For now, return mock data
    return [
      {
        id: '1',
        tenantId,
        name: 'Premium Service',
        description: 'Our flagship service offering',
        duration: 60,
        price: 5000, // £50.00 in pence
        currency: 'GBP',
        category: 'Premium',
        isActive: true
      },
      {
        id: '2',
        tenantId,
        name: 'Standard Service',
        description: 'Quality service at a great price',
        duration: 45,
        price: 3500, // £35.00 in pence
        currency: 'GBP',
        category: 'Standard',
        isActive: true
      }
    ]
  }

  /**
   * Fetch staff data
   */
  private async fetchStaffData(tenantId: string): Promise<StaffData[]> {
    // This would integrate with the staff model
    // For now, return mock data
    return [
      {
        id: '1',
        tenantId,
        name: 'John Smith',
        role: 'Senior Specialist',
        bio: 'Experienced professional with 10+ years in the industry',
        skills: ['skill1', 'skill2'],
        specializations: ['Premium Services'],
        isActive: true
      },
      {
        id: '2',
        tenantId,
        name: 'Sarah Johnson',
        role: 'Specialist',
        bio: 'Dedicated professional focused on customer satisfaction',
        skills: ['skill2', 'skill3'],
        specializations: ['Standard Services'],
        isActive: true
      }
    ]
  }

  /**
   * Fetch data from external API
   */
  private async fetchApiData(
    source: DataSource,
    tenantId: string,
    context: Record<string, any>
  ): Promise<any> {
    if (!source.endpoint) {
      throw new Error('API endpoint not configured')
    }
    
    const url = source.endpoint.replace('{tenantId}', tenantId)
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId,
        ...context.headers
      }
    })
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }
    
    return response.json()
  }

  /**
   * Register default data sources
   */
  private registerDefaultDataSources(): void {
    this.registerDataSource({
      id: 'business',
      name: 'Business Information',
      type: 'business',
      cache: true,
      refreshInterval: 600000 // 10 minutes
    })
    
    this.registerDataSource({
      id: 'services',
      name: 'Services',
      type: 'services',
      cache: true,
      refreshInterval: 300000 // 5 minutes
    })
    
    this.registerDataSource({
      id: 'staff',
      name: 'Staff Members',
      type: 'staff',
      cache: true,
      refreshInterval: 300000 // 5 minutes
    })
  }

  /**
   * Clear cache for a tenant
   */
  clearCache(tenantId?: string): void {
    if (tenantId) {
      for (const key of this.dataCache.keys()) {
        if (key.includes(`:${tenantId}`)) {
          this.dataCache.delete(key)
        }
      }
    } else {
      this.dataCache.clear()
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.dataCache.size,
      keys: Array.from(this.dataCache.keys())
    }
  }
}

export const dataBindingEngine = new DataBindingEngine()