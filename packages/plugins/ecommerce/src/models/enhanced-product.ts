import { EventEmitter } from 'events'

export interface Product {
  id: string
  tenantId: string
  name: string
  description: string
  shortDescription?: string
  price: number
  compareAtPrice?: number
  currency: string
  category: string
  subcategory?: string
  tags: string[]
  images: ProductImage[]
  inStock: boolean
  stockQuantity: number
  lowStockThreshold: number
  sku: string
  barcode?: string
  weight?: number
  dimensions?: {
    length: number
    width: number
    height: number
    unit: 'cm' | 'in'
  }
  seoTitle?: string
  seoDescription?: string
  seoKeywords?: string[]
  isActive: boolean
  isFeatured: boolean
  isDigital: boolean
  requiresShipping: boolean
  taxable: boolean
  taxCategory?: string
  vendor?: string
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
  metadata: Record<string, any>
}

export interface ProductImage {
  id: string
  url: string
  alt: string
  position: number
  isMain: boolean
}

export interface ProductVariant {
  id: string
  productId: string
  name: string
  price: number
  compareAtPrice?: number
  sku: string
  barcode?: string
  attributes: Record<string, string> // e.g., { color: 'red', size: 'large' }
  stockQuantity: number
  lowStockThreshold: number
  weight?: number
  images: ProductImage[]
  isActive: boolean
  position: number
}

export interface ProductCategory {
  id: string
  tenantId: string
  name: string
  slug: string
  description?: string
  parentId?: string
  image?: string
  isActive: boolean
  position: number
  seoTitle?: string
  seoDescription?: string
  createdAt: Date
  updatedAt: Date
}

export interface ProductCollection {
  id: string
  tenantId: string
  name: string
  slug: string
  description?: string
  image?: string
  productIds: string[]
  rules?: CollectionRule[]
  isActive: boolean
  isFeatured: boolean
  position: number
  createdAt: Date
  updatedAt: Date
}

export interface CollectionRule {
  field: 'category' | 'tag' | 'price' | 'vendor' | 'title'
  condition: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than'
  value: string | number
}

export interface InventoryAdjustment {
  id: string
  productId: string
  variantId?: string
  type: 'sale' | 'restock' | 'adjustment' | 'return' | 'damage' | 'transfer'
  quantity: number
  reason?: string
  reference?: string
  userId: string
  createdAt: Date
}

export interface ProductAnalytics {
  productId: string
  views: number
  addToCarts: number
  purchases: number
  revenue: number
  conversionRate: number
  averageOrderValue: number
  topVariants: Array<{
    variantId: string
    name: string
    sales: number
    revenue: number
  }>
  performanceMetrics: {
    viewsToCart: number
    cartToPurchase: number
    returnRate: number
  }
}

export interface StockAlert {
  id: string
  productId: string
  variantId?: string
  type: 'low_stock' | 'out_of_stock' | 'overstock'
  currentStock: number
  threshold: number
  message: string
  isResolved: boolean
  createdAt: Date
  resolvedAt?: Date
}

export class EnhancedProductManager extends EventEmitter {
  private products: Map<string, Product> = new Map()
  private variants: Map<string, ProductVariant> = new Map()
  private categories: Map<string, ProductCategory> = new Map()
  private collections: Map<string, ProductCollection> = new Map()
  private inventoryAdjustments: InventoryAdjustment[] = []
  private stockAlerts: Map<string, StockAlert> = new Map()

  constructor() {
    super()
    this.initializeDefaultCategories()
  }

  /**
   * Create a new product
   */
  async createProduct(
    tenantId: string,
    productData: Omit<Product, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>
  ): Promise<Product> {
    const product: Product = {
      ...productData,
      id: this.generateId(),
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: productData.isActive ? new Date() : undefined
    }

    // Validate SKU uniqueness
    await this.validateSKU(tenantId, product.sku)

    this.products.set(product.id, product)

    // Check for low stock alerts
    if (product.stockQuantity <= product.lowStockThreshold) {
      await this.createStockAlert(product.id, undefined, 'low_stock')
    }

    this.emit('product:created', product)
    return product
  }

  /**
   * Get product by ID
   */
  async getProduct(id: string): Promise<Product | null> {
    return this.products.get(id) || null
  }

  /**
   * Update product
   */
  async updateProduct(
    id: string,
    updates: Partial<Omit<Product, 'id' | 'tenantId' | 'createdAt'>>
  ): Promise<Product | null> {
    const product = this.products.get(id)
    if (!product) return null

    // Validate SKU if being updated
    if (updates.sku && updates.sku !== product.sku) {
      await this.validateSKU(product.tenantId, updates.sku, id)
    }

    const updatedProduct: Product = {
      ...product,
      ...updates,
      updatedAt: new Date(),
      publishedAt: updates.isActive && !product.publishedAt ? new Date() : product.publishedAt
    }

    this.products.set(id, updatedProduct)

    // Check stock levels if quantity changed
    if (updates.stockQuantity !== undefined || updates.lowStockThreshold !== undefined) {
      await this.checkStockLevels(updatedProduct)
    }

    this.emit('product:updated', updatedProduct)
    return updatedProduct
  }

  /**
   * Delete product
   */
  async deleteProduct(id: string): Promise<boolean> {
    const product = this.products.get(id)
    if (!product) return false

    // Delete associated variants
    const variants = await this.getProductVariants(id)
    for (const variant of variants) {
      this.variants.delete(variant.id)
    }

    // Remove from collections
    for (const collection of this.collections.values()) {
      if (collection.productIds.includes(id)) {
        collection.productIds = collection.productIds.filter(pid => pid !== id)
      }
    }

    this.products.delete(id)
    this.emit('product:deleted', { productId: id, tenantId: product.tenantId })
    return true
  }

  /**
   * Get products with advanced filtering
   */
  async getProducts(
    tenantId: string,
    filters: {
      category?: string
      subcategory?: string
      tags?: string[]
      inStock?: boolean
      isActive?: boolean
      isFeatured?: boolean
      priceRange?: { min: number; max: number }
      search?: string
      vendor?: string
      sortBy?: 'name' | 'price' | 'created' | 'updated' | 'stock'
      sortOrder?: 'asc' | 'desc'
      limit?: number
      offset?: number
    } = {}
  ): Promise<{
    products: Product[]
    total: number
    facets: {
      categories: Record<string, number>
      vendors: Record<string, number>
      priceRanges: Record<string, number>
    }
  }> {
    let products = Array.from(this.products.values())
      .filter(p => p.tenantId === tenantId)

    // Apply filters
    if (filters.category) {
      products = products.filter(p => p.category === filters.category)
    }

    if (filters.subcategory) {
      products = products.filter(p => p.subcategory === filters.subcategory)
    }

    if (filters.tags?.length) {
      products = products.filter(p =>
        filters.tags!.some(tag => p.tags.includes(tag))
      )
    }

    if (filters.inStock !== undefined) {
      products = products.filter(p => p.inStock === filters.inStock)
    }

    if (filters.isActive !== undefined) {
      products = products.filter(p => p.isActive === filters.isActive)
    }

    if (filters.isFeatured !== undefined) {
      products = products.filter(p => p.isFeatured === filters.isFeatured)
    }

    if (filters.priceRange) {
      products = products.filter(p =>
        p.price >= filters.priceRange!.min && p.price <= filters.priceRange!.max
      )
    }

    if (filters.vendor) {
      products = products.filter(p => p.vendor === filters.vendor)
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      products = products.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower) ||
        p.sku.toLowerCase().includes(searchLower) ||
        p.tags.some(tag => tag.toLowerCase().includes(searchLower))
      )
    }

    // Calculate facets
    const facets = {
      categories: this.calculateFacets(products, 'category'),
      vendors: this.calculateFacets(products, 'vendor'),
      priceRanges: this.calculatePriceRangeFacets(products)
    }

    const total = products.length

    // Apply sorting
    products.sort((a, b) => {
      const order = filters.sortOrder === 'desc' ? -1 : 1
      
      switch (filters.sortBy) {
        case 'name':
          return a.name.localeCompare(b.name) * order
        case 'price':
          return (a.price - b.price) * order
        case 'created':
          return (a.createdAt.getTime() - b.createdAt.getTime()) * order
        case 'updated':
          return (a.updatedAt.getTime() - b.updatedAt.getTime()) * order
        case 'stock':
          return (a.stockQuantity - b.stockQuantity) * order
        default:
          return (b.createdAt.getTime() - a.createdAt.getTime()) * order
      }
    })

    // Apply pagination
    const offset = filters.offset || 0
    const limit = filters.limit || 50
    products = products.slice(offset, offset + limit)

    return { products, total, facets }
  }

  /**
   * Create product variant
   */
  async createVariant(
    productId: string,
    variantData: Omit<ProductVariant, 'id' | 'productId'>
  ): Promise<ProductVariant> {
    const product = this.products.get(productId)
    if (!product) {
      throw new Error('Product not found')
    }

    // Validate SKU uniqueness
    await this.validateSKU(product.tenantId, variantData.sku)

    const variant: ProductVariant = {
      ...variantData,
      id: this.generateId(),
      productId
    }

    this.variants.set(variant.id, variant)

    // Check for low stock alerts
    if (variant.stockQuantity <= variant.lowStockThreshold) {
      await this.createStockAlert(productId, variant.id, 'low_stock')
    }

    this.emit('variant:created', variant)
    return variant
  }

  /**
   * Get product variants
   */
  async getProductVariants(productId: string): Promise<ProductVariant[]> {
    return Array.from(this.variants.values())
      .filter(v => v.productId === productId)
      .sort((a, b) => a.position - b.position)
  }

  /**
   * Update inventory
   */
  async updateInventory(
    productId: string,
    variantId: string | undefined,
    adjustment: {
      type: InventoryAdjustment['type']
      quantity: number
      reason?: string
      reference?: string
      userId: string
    }
  ): Promise<void> {
    const product = this.products.get(productId)
    if (!product) {
      throw new Error('Product not found')
    }

    let currentStock: number
    let newStock: number

    if (variantId) {
      const variant = this.variants.get(variantId)
      if (!variant) {
        throw new Error('Variant not found')
      }
      
      currentStock = variant.stockQuantity
      newStock = currentStock + adjustment.quantity
      variant.stockQuantity = Math.max(0, newStock)
      
      // Check stock levels
      await this.checkVariantStockLevels(variant)
    } else {
      currentStock = product.stockQuantity
      newStock = currentStock + adjustment.quantity
      product.stockQuantity = Math.max(0, newStock)
      product.inStock = product.stockQuantity > 0
      
      // Check stock levels
      await this.checkStockLevels(product)
    }

    // Record adjustment
    const inventoryAdjustment: InventoryAdjustment = {
      id: this.generateId(),
      productId,
      variantId,
      type: adjustment.type,
      quantity: adjustment.quantity,
      reason: adjustment.reason,
      reference: adjustment.reference,
      userId: adjustment.userId,
      createdAt: new Date()
    }

    this.inventoryAdjustments.push(inventoryAdjustment)
    this.emit('inventory:updated', inventoryAdjustment)
  }

  /**
   * Get low stock alerts
   */
  async getLowStockAlerts(tenantId: string): Promise<StockAlert[]> {
    return Array.from(this.stockAlerts.values())
      .filter(alert => {
        const product = this.products.get(alert.productId)
        return product?.tenantId === tenantId && !alert.isResolved
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  /**
   * Create product category
   */
  async createCategory(
    tenantId: string,
    categoryData: Omit<ProductCategory, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>
  ): Promise<ProductCategory> {
    const category: ProductCategory = {
      ...categoryData,
      id: this.generateId(),
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.categories.set(category.id, category)
    this.emit('category:created', category)
    return category
  }

  /**
   * Get categories
   */
  async getCategories(tenantId: string): Promise<ProductCategory[]> {
    return Array.from(this.categories.values())
      .filter(c => c.tenantId === tenantId)
      .sort((a, b) => a.position - b.position)
  }

  /**
   * Create product collection
   */
  async createCollection(
    tenantId: string,
    collectionData: Omit<ProductCollection, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>
  ): Promise<ProductCollection> {
    const collection: ProductCollection = {
      ...collectionData,
      id: this.generateId(),
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Apply rules if specified
    if (collection.rules?.length) {
      collection.productIds = await this.applyCollectionRules(tenantId, collection.rules)
    }

    this.collections.set(collection.id, collection)
    this.emit('collection:created', collection)
    return collection
  }

  /**
   * Get product analytics
   */
  async getProductAnalytics(
    productId: string,
    dateRange: { from: Date; to: Date }
  ): Promise<ProductAnalytics> {
    // Mock analytics data - in real implementation would query actual data
    return {
      productId,
      views: 1250,
      addToCarts: 89,
      purchases: 23,
      revenue: 1150,
      conversionRate: 0.018,
      averageOrderValue: 50,
      topVariants: [
        { variantId: 'var1', name: 'Red Large', sales: 12, revenue: 600 },
        { variantId: 'var2', name: 'Blue Medium', sales: 8, revenue: 400 }
      ],
      performanceMetrics: {
        viewsToCart: 0.071,
        cartToPurchase: 0.258,
        returnRate: 0.05
      }
    }
  }

  /**
   * Bulk update products
   */
  async bulkUpdateProducts(
    productIds: string[],
    updates: Partial<Pick<Product, 'category' | 'tags' | 'isActive' | 'isFeatured' | 'vendor'>>
  ): Promise<Product[]> {
    const updatedProducts: Product[] = []

    for (const productId of productIds) {
      const product = await this.updateProduct(productId, updates)
      if (product) {
        updatedProducts.push(product)
      }
    }

    this.emit('products:bulk_updated', { productIds, updates })
    return updatedProducts
  }

  /**
   * Import products from CSV
   */
  async importProducts(
    tenantId: string,
    csvData: string,
    options: {
      updateExisting?: boolean
      skipErrors?: boolean
    } = {}
  ): Promise<{
    imported: number
    updated: number
    errors: Array<{ row: number; error: string }>
  }> {
    // Mock CSV import - in real implementation would parse CSV
    const result = {
      imported: 0,
      updated: 0,
      errors: [] as Array<{ row: number; error: string }>
    }

    // This would parse CSV and create/update products
    this.emit('products:imported', result)
    return result
  }

  /**
   * Private helper methods
   */
  private async validateSKU(tenantId: string, sku: string, excludeProductId?: string): Promise<void> {
    const existingProduct = Array.from(this.products.values())
      .find(p => p.tenantId === tenantId && p.sku === sku && p.id !== excludeProductId)
    
    if (existingProduct) {
      throw new Error(`SKU '${sku}' already exists`)
    }

    const existingVariant = Array.from(this.variants.values())
      .find(v => {
        const product = this.products.get(v.productId)
        return product?.tenantId === tenantId && v.sku === sku
      })

    if (existingVariant) {
      throw new Error(`SKU '${sku}' already exists in variants`)
    }
  }

  private async checkStockLevels(product: Product): Promise<void> {
    if (product.stockQuantity <= 0) {
      await this.createStockAlert(product.id, undefined, 'out_of_stock')
    } else if (product.stockQuantity <= product.lowStockThreshold) {
      await this.createStockAlert(product.id, undefined, 'low_stock')
    } else {
      // Resolve existing alerts
      await this.resolveStockAlerts(product.id)
    }
  }

  private async checkVariantStockLevels(variant: ProductVariant): Promise<void> {
    if (variant.stockQuantity <= 0) {
      await this.createStockAlert(variant.productId, variant.id, 'out_of_stock')
    } else if (variant.stockQuantity <= variant.lowStockThreshold) {
      await this.createStockAlert(variant.productId, variant.id, 'low_stock')
    } else {
      // Resolve existing alerts
      await this.resolveStockAlerts(variant.productId, variant.id)
    }
  }

  private async createStockAlert(
    productId: string,
    variantId: string | undefined,
    type: StockAlert['type']
  ): Promise<void> {
    const alertKey = `${productId}_${variantId || 'main'}_${type}`
    
    // Don't create duplicate alerts
    if (this.stockAlerts.has(alertKey)) return

    const product = this.products.get(productId)
    if (!product) return

    let currentStock: number
    let threshold: number

    if (variantId) {
      const variant = this.variants.get(variantId)
      if (!variant) return
      currentStock = variant.stockQuantity
      threshold = variant.lowStockThreshold
    } else {
      currentStock = product.stockQuantity
      threshold = product.lowStockThreshold
    }

    const alert: StockAlert = {
      id: alertKey,
      productId,
      variantId,
      type,
      currentStock,
      threshold,
      message: this.generateStockAlertMessage(product.name, type, currentStock),
      isResolved: false,
      createdAt: new Date()
    }

    this.stockAlerts.set(alertKey, alert)
    this.emit('stock:alert', alert)
  }

  private async resolveStockAlerts(productId: string, variantId?: string): Promise<void> {
    const alertsToResolve = Array.from(this.stockAlerts.values())
      .filter(alert => 
        alert.productId === productId && 
        alert.variantId === variantId &&
        !alert.isResolved
      )

    for (const alert of alertsToResolve) {
      alert.isResolved = true
      alert.resolvedAt = new Date()
      this.emit('stock:alert_resolved', alert)
    }
  }

  private generateStockAlertMessage(productName: string, type: StockAlert['type'], currentStock: number): string {
    switch (type) {
      case 'out_of_stock':
        return `${productName} is out of stock`
      case 'low_stock':
        return `${productName} is low on stock (${currentStock} remaining)`
      case 'overstock':
        return `${productName} has excess stock (${currentStock} units)`
      default:
        return `Stock alert for ${productName}`
    }
  }

  private calculateFacets(products: Product[], field: keyof Product): Record<string, number> {
    return products.reduce((acc, product) => {
      const value = String(product[field] || 'uncategorized')
      acc[value] = (acc[value] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  private calculatePriceRangeFacets(products: Product[]): Record<string, number> {
    const ranges = {
      '0-25': 0,
      '25-50': 0,
      '50-100': 0,
      '100-250': 0,
      '250+': 0
    }

    products.forEach(product => {
      if (product.price < 25) ranges['0-25']++
      else if (product.price < 50) ranges['25-50']++
      else if (product.price < 100) ranges['50-100']++
      else if (product.price < 250) ranges['100-250']++
      else ranges['250+']++
    })

    return ranges
  }

  private async applyCollectionRules(tenantId: string, rules: CollectionRule[]): Promise<string[]> {
    const products = Array.from(this.products.values())
      .filter(p => p.tenantId === tenantId)

    return products
      .filter(product => {
        return rules.every(rule => {
          const fieldValue = product[rule.field as keyof Product]
          
          switch (rule.condition) {
            case 'equals':
              return fieldValue === rule.value
            case 'contains':
              return String(fieldValue).toLowerCase().includes(String(rule.value).toLowerCase())
            case 'greater_than':
              return Number(fieldValue) > Number(rule.value)
            case 'less_than':
              return Number(fieldValue) < Number(rule.value)
            default:
              return false
          }
        })
      })
      .map(product => product.id)
  }

  private initializeDefaultCategories(): void {
    // Initialize with common categories
    const defaultCategories = [
      'Clothing',
      'Electronics',
      'Home & Garden',
      'Sports & Outdoors',
      'Health & Beauty',
      'Books & Media',
      'Toys & Games',
      'Food & Beverages'
    ]

    // These would be created per tenant in a real implementation
  }

  private generateId(): string {
    return 'prod_' + Date.now().toString(36) + Math.random().toString(36).substring(2)
  }
}

export const enhancedProductManager = new EnhancedProductManager()