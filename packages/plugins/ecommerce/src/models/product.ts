import { z } from 'zod';

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  shortDescription?: string;
  sku: string;
  barcode?: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  currency: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'in';
  };
  images: string[];
  categories: string[];
  tags: string[];
  variants: ProductVariant[];
  inventory: InventoryItem[];
  isActive: boolean;
  isDigital: boolean;
  requiresShipping: boolean;
  taxable: boolean;
  taxCategory?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  price?: number;
  compareAtPrice?: number;
  costPrice?: number;
  weight?: number;
  barcode?: string;
  options: VariantOption[];
  inventory: InventoryItem;
  isActive: boolean;
  position: number;
  image?: string;
}

export interface VariantOption {
  name: string; // e.g., "Color", "Size"
  value: string; // e.g., "Red", "Large"
}

export interface InventoryItem {
  id: string;
  productId?: string;
  variantId?: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockThreshold?: number;
  trackQuantity: boolean;
  allowBackorder: boolean;
  location?: string;
  supplier?: string;
  lastRestocked?: Date;
  notes?: string;
}

export interface Category {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  slug: string;
  parentId?: string;
  image?: string;
  isActive: boolean;
  sortOrder: number;
  seoTitle?: string;
  seoDescription?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export const productSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  shortDescription: z.string().max(500).optional(),
  sku: z.string().min(1).max(100),
  barcode: z.string().max(50).optional(),
  price: z.number().min(0),
  compareAtPrice: z.number().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  currency: z.string().length(3).default('GBP'),
  weight: z.number().min(0).optional(),
  dimensions: z.object({
    length: z.number().min(0),
    width: z.number().min(0),
    height: z.number().min(0),
    unit: z.enum(['cm', 'in']).default('cm'),
  }).optional(),
  images: z.array(z.string().url()).default([]),
  categories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  variants: z.array(z.any()).default([]), // Will be validated separately
  inventory: z.array(z.any()).default([]), // Will be validated separately
  isActive: z.boolean().default(true),
  isDigital: z.boolean().default(false),
  requiresShipping: z.boolean().default(true),
  taxable: z.boolean().default(true),
  taxCategory: z.string().optional(),
  seoTitle: z.string().max(60).optional(),
  seoDescription: z.string().max(160).optional(),
  seoKeywords: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createProductSchema = productSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateProductSchema = createProductSchema.partial();

export class ProductManager {
  private products: Map<string, Product> = new Map();
  private categories: Map<string, Category> = new Map();
  private inventory: Map<string, InventoryItem> = new Map();

  /**
   * Create a new product
   */
  async createProduct(data: z.infer<typeof createProductSchema>): Promise<Product> {
    const validation = createProductSchema.safeParse(data);
    if (!validation.success) {
      throw new Error(`Product validation failed: ${JSON.stringify(validation.error.errors)}`);
    }

    // Check SKU uniqueness
    const existingProduct = Array.from(this.products.values()).find(
      p => p.tenantId === data.tenantId && p.sku === data.sku
    );
    if (existingProduct) {
      throw new Error(`Product with SKU '${data.sku}' already exists`);
    }

    const product: Product = {
      id: this.generateId(),
      ...validation.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Create default inventory if none provided
    if (product.inventory.length === 0) {
      const inventoryItem: InventoryItem = {
        id: this.generateId(),
        productId: product.id,
        quantity: 0,
        reservedQuantity: 0,
        availableQuantity: 0,
        trackQuantity: !product.isDigital,
        allowBackorder: false,
      };
      product.inventory = [inventoryItem];
      this.inventory.set(inventoryItem.id, inventoryItem);
    }

    this.products.set(product.id, product);
    return product;
  }

  /**
   * Update an existing product
   */
  async updateProduct(id: string, updates: z.infer<typeof updateProductSchema>): Promise<Product | null> {
    const product = this.products.get(id);
    if (!product) {
      return null;
    }

    const validation = updateProductSchema.safeParse(updates);
    if (!validation.success) {
      throw new Error(`Product validation failed: ${JSON.stringify(validation.error.errors)}`);
    }

    // Check SKU uniqueness if SKU is being updated
    if (updates.sku && updates.sku !== product.sku) {
      const existingProduct = Array.from(this.products.values()).find(
        p => p.tenantId === product.tenantId && p.sku === updates.sku && p.id !== id
      );
      if (existingProduct) {
        throw new Error(`Product with SKU '${updates.sku}' already exists`);
      }
    }

    const updatedProduct: Product = {
      ...product,
      ...validation.data,
      updatedAt: new Date(),
    };

    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  /**
   * Get product by ID
   */
  async getProduct(id: string): Promise<Product | null> {
    return this.products.get(id) || null;
  }

  /**
   * Get product by SKU
   */
  async getProductBySku(tenantId: string, sku: string): Promise<Product | null> {
    return Array.from(this.products.values()).find(
      p => p.tenantId === tenantId && p.sku === sku
    ) || null;
  }

  /**
   * Get all products for a tenant
   */
  async getProductsByTenant(
    tenantId: string,
    filters?: {
      category?: string;
      isActive?: boolean;
      inStock?: boolean;
      search?: string;
      tags?: string[];
    }
  ): Promise<Product[]> {
    let products = Array.from(this.products.values()).filter(
      product => product.tenantId === tenantId
    );

    if (filters) {
      if (filters.category) {
        products = products.filter(p => p.categories.includes(filters.category!));
      }
      if (filters.isActive !== undefined) {
        products = products.filter(p => p.isActive === filters.isActive);
      }
      if (filters.inStock) {
        products = products.filter(p => this.isInStock(p));
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        products = products.filter(p => 
          p.name.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower) ||
          p.sku.toLowerCase().includes(searchLower)
        );
      }
      if (filters.tags && filters.tags.length > 0) {
        products = products.filter(p => 
          filters.tags!.some(tag => p.tags.includes(tag))
        );
      }
    }

    return products.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Delete a product
   */
  async deleteProduct(id: string): Promise<boolean> {
    const product = this.products.get(id);
    if (!product) {
      return false;
    }

    // Delete associated inventory
    product.inventory.forEach(inv => {
      this.inventory.delete(inv.id);
    });

    return this.products.delete(id);
  }

  /**
   * Add product variant
   */
  async addVariant(productId: string, variant: Omit<ProductVariant, 'id' | 'productId'>): Promise<Product | null> {
    const product = this.products.get(productId);
    if (!product) {
      return null;
    }

    const newVariant: ProductVariant = {
      id: this.generateId(),
      productId,
      ...variant,
    };

    // Create inventory for variant
    const inventoryItem: InventoryItem = {
      id: this.generateId(),
      productId,
      variantId: newVariant.id,
      quantity: 0,
      reservedQuantity: 0,
      availableQuantity: 0,
      trackQuantity: !product.isDigital,
      allowBackorder: false,
    };

    newVariant.inventory = inventoryItem;
    this.inventory.set(inventoryItem.id, inventoryItem);

    const updatedProduct: Product = {
      ...product,
      variants: [...product.variants, newVariant],
      updatedAt: new Date(),
    };

    this.products.set(productId, updatedProduct);
    return updatedProduct;
  }

  /**
   * Update inventory
   */
  async updateInventory(
    inventoryId: string,
    updates: Partial<InventoryItem>
  ): Promise<InventoryItem | null> {
    const inventory = this.inventory.get(inventoryId);
    if (!inventory) {
      return null;
    }

    const updatedInventory: InventoryItem = {
      ...inventory,
      ...updates,
      availableQuantity: (updates.quantity ?? inventory.quantity) - 
                        (updates.reservedQuantity ?? inventory.reservedQuantity),
    };

    this.inventory.set(inventoryId, updatedInventory);

    // Update product inventory
    if (inventory.productId) {
      const product = this.products.get(inventory.productId);
      if (product) {
        const inventoryIndex = product.inventory.findIndex(inv => inv.id === inventoryId);
        if (inventoryIndex !== -1) {
          product.inventory[inventoryIndex] = updatedInventory;
          product.updatedAt = new Date();
          this.products.set(product.id, product);
        }
      }
    }

    return updatedInventory;
  }

  /**
   * Reserve inventory
   */
  async reserveInventory(productId: string, quantity: number, variantId?: string): Promise<{
    success: boolean;
    reservationId?: string;
    error?: string;
  }> {
    const product = this.products.get(productId);
    if (!product) {
      return { success: false, error: 'Product not found' };
    }

    let inventoryItem: InventoryItem | undefined;

    if (variantId) {
      const variant = product.variants.find(v => v.id === variantId);
      if (!variant) {
        return { success: false, error: 'Variant not found' };
      }
      inventoryItem = variant.inventory;
    } else {
      inventoryItem = product.inventory[0];
    }

    if (!inventoryItem) {
      return { success: false, error: 'Inventory not found' };
    }

    if (inventoryItem.trackQuantity && inventoryItem.availableQuantity < quantity) {
      if (!inventoryItem.allowBackorder) {
        return { success: false, error: 'Insufficient inventory' };
      }
    }

    // Reserve inventory
    const updatedInventory: InventoryItem = {
      ...inventoryItem,
      reservedQuantity: inventoryItem.reservedQuantity + quantity,
      availableQuantity: inventoryItem.availableQuantity - quantity,
    };

    await this.updateInventory(inventoryItem.id, updatedInventory);

    return {
      success: true,
      reservationId: this.generateId(),
    };
  }

  /**
   * Release inventory reservation
   */
  async releaseReservation(productId: string, quantity: number, variantId?: string): Promise<boolean> {
    const product = this.products.get(productId);
    if (!product) {
      return false;
    }

    let inventoryItem: InventoryItem | undefined;

    if (variantId) {
      const variant = product.variants.find(v => v.id === variantId);
      inventoryItem = variant?.inventory;
    } else {
      inventoryItem = product.inventory[0];
    }

    if (!inventoryItem) {
      return false;
    }

    const updatedInventory: InventoryItem = {
      ...inventoryItem,
      reservedQuantity: Math.max(0, inventoryItem.reservedQuantity - quantity),
      availableQuantity: inventoryItem.availableQuantity + quantity,
    };

    await this.updateInventory(inventoryItem.id, updatedInventory);
    return true;
  }

  /**
   * Check if product is in stock
   */
  isInStock(product: Product, variantId?: string): boolean {
    if (product.isDigital) {
      return true;
    }

    let inventoryItem: InventoryItem | undefined;

    if (variantId) {
      const variant = product.variants.find(v => v.id === variantId);
      inventoryItem = variant?.inventory;
    } else {
      inventoryItem = product.inventory[0];
    }

    if (!inventoryItem || !inventoryItem.trackQuantity) {
      return true;
    }

    return inventoryItem.availableQuantity > 0 || inventoryItem.allowBackorder;
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(tenantId: string): Promise<Array<{
    product: Product;
    inventory: InventoryItem;
    variant?: ProductVariant;
  }>> {
    const lowStockItems: Array<{
      product: Product;
      inventory: InventoryItem;
      variant?: ProductVariant;
    }> = [];

    for (const product of this.products.values()) {
      if (product.tenantId !== tenantId || product.isDigital) {
        continue;
      }

      // Check main product inventory
      for (const inventory of product.inventory) {
        if (inventory.trackQuantity && 
            inventory.lowStockThreshold && 
            inventory.availableQuantity <= inventory.lowStockThreshold) {
          lowStockItems.push({ product, inventory });
        }
      }

      // Check variant inventory
      for (const variant of product.variants) {
        if (variant.inventory.trackQuantity && 
            variant.inventory.lowStockThreshold && 
            variant.inventory.availableQuantity <= variant.inventory.lowStockThreshold) {
          lowStockItems.push({ 
            product, 
            inventory: variant.inventory, 
            variant 
          });
        }
      }
    }

    return lowStockItems;
  }

  /**
   * Calculate product price with variants
   */
  calculatePrice(product: Product, variantId?: string): {
    price: number;
    compareAtPrice?: number;
    savings?: number;
    savingsPercentage?: number;
  } {
    let price = product.price;
    let compareAtPrice = product.compareAtPrice;

    if (variantId) {
      const variant = product.variants.find(v => v.id === variantId);
      if (variant) {
        price = variant.price ?? product.price;
        compareAtPrice = variant.compareAtPrice ?? product.compareAtPrice;
      }
    }

    const result: any = { price };

    if (compareAtPrice && compareAtPrice > price) {
      result.compareAtPrice = compareAtPrice;
      result.savings = compareAtPrice - price;
      result.savingsPercentage = Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
    }

    return result;
  }

  private generateId(): string {
    return 'prd_' + Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}

export const productManager = new ProductManager();