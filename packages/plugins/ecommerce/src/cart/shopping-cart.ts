import { z } from 'zod';
import { Product, ProductVariant } from '../models/product';

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
  compareAtPrice?: number;
  customizations?: Record<string, any>;
  addedAt: Date;
}

export interface Cart {
  id: string;
  tenantId: string;
  customerId?: string;
  sessionId?: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
  appliedCoupons: string[];
  shippingAddress?: Address;
  billingAddress?: Address;
  notes?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  country: string;
  postalCode: string;
  phone?: string;
}

export interface ShippingOption {
  id: string;
  name: string;
  description?: string;
  price: number;
  estimatedDays?: number;
  carrier?: string;
  trackingSupported: boolean;
}

export interface TaxCalculation {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  breakdown: Array<{
    name: string;
    rate: number;
    amount: number;
  }>;
}

export const cartItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: z.number().min(1).max(999),
  price: z.number().min(0),
  compareAtPrice: z.number().min(0).optional(),
  customizations: z.record(z.any()).optional(),
  addedAt: z.date(),
});

export const addressSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  company: z.string().max(100).optional(),
  address1: z.string().min(1).max(255),
  address2: z.string().max(255).optional(),
  city: z.string().min(1).max(100),
  province: z.string().min(1).max(100),
  country: z.string().length(2), // ISO country code
  postalCode: z.string().min(1).max(20),
  phone: z.string().max(20).optional(),
});

export class ShoppingCart {
  private carts: Map<string, Cart> = new Map();
  private products: Map<string, Product> = new Map(); // Would be injected from ProductManager

  /**
   * Create a new cart
   */
  async createCart(tenantId: string, customerId?: string, sessionId?: string): Promise<Cart> {
    const cart: Cart = {
      id: this.generateId(),
      tenantId,
      customerId,
      sessionId,
      items: [],
      subtotal: 0,
      tax: 0,
      shipping: 0,
      discount: 0,
      total: 0,
      currency: 'GBP',
      appliedCoupons: [],
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.carts.set(cart.id, cart);
    return cart;
  }

  /**
   * Get cart by ID
   */
  async getCart(id: string): Promise<Cart | null> {
    const cart = this.carts.get(id);
    if (!cart) {
      return null;
    }

    // Check if cart has expired
    if (cart.expiresAt && cart.expiresAt < new Date()) {
      this.carts.delete(id);
      return null;
    }

    return cart;
  }

  /**
   * Get cart by customer ID
   */
  async getCartByCustomer(tenantId: string, customerId: string): Promise<Cart | null> {
    return Array.from(this.carts.values()).find(
      cart => cart.tenantId === tenantId && cart.customerId === customerId
    ) || null;
  }

  /**
   * Get cart by session ID
   */
  async getCartBySession(tenantId: string, sessionId: string): Promise<Cart | null> {
    return Array.from(this.carts.values()).find(
      cart => cart.tenantId === tenantId && cart.sessionId === sessionId
    ) || null;
  }

  /**
   * Add item to cart
   */
  async addItem(
    cartId: string,
    productId: string,
    quantity: number,
    variantId?: string,
    customizations?: Record<string, any>
  ): Promise<{
    success: boolean;
    cart?: Cart;
    error?: string;
  }> {
    const cart = await this.getCart(cartId);
    if (!cart) {
      return { success: false, error: 'Cart not found' };
    }

    const product = this.products.get(productId);
    if (!product) {
      return { success: false, error: 'Product not found' };
    }

    if (!product.isActive) {
      return { success: false, error: 'Product is not available' };
    }

    // Check inventory
    const inStock = this.isInStock(product, variantId, quantity);
    if (!inStock) {
      return { success: false, error: 'Insufficient inventory' };
    }

    // Get price
    const pricing = this.calculateProductPrice(product, variantId);

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.productId === productId && item.variantId === variantId
    );

    if (existingItemIndex !== -1) {
      // Update existing item
      cart.items[existingItemIndex].quantity += quantity;
      cart.items[existingItemIndex].price = pricing.price;
      cart.items[existingItemIndex].compareAtPrice = pricing.compareAtPrice;
    } else {
      // Add new item
      const cartItem: CartItem = {
        id: this.generateId(),
        productId,
        variantId,
        quantity,
        price: pricing.price,
        compareAtPrice: pricing.compareAtPrice,
        customizations,
        addedAt: new Date(),
      };
      cart.items.push(cartItem);
    }

    // Recalculate totals
    await this.recalculateCart(cart);

    this.carts.set(cartId, cart);
    return { success: true, cart };
  }

  /**
   * Update item quantity
   */
  async updateItemQuantity(
    cartId: string,
    itemId: string,
    quantity: number
  ): Promise<{
    success: boolean;
    cart?: Cart;
    error?: string;
  }> {
    const cart = await this.getCart(cartId);
    if (!cart) {
      return { success: false, error: 'Cart not found' };
    }

    const itemIndex = cart.items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      return { success: false, error: 'Item not found in cart' };
    }

    if (quantity <= 0) {
      // Remove item
      cart.items.splice(itemIndex, 1);
    } else {
      // Check inventory
      const item = cart.items[itemIndex];
      const product = this.products.get(item.productId);
      if (!product) {
        return { success: false, error: 'Product not found' };
      }

      const inStock = this.isInStock(product, item.variantId, quantity);
      if (!inStock) {
        return { success: false, error: 'Insufficient inventory' };
      }

      // Update quantity
      cart.items[itemIndex].quantity = quantity;
    }

    // Recalculate totals
    await this.recalculateCart(cart);

    this.carts.set(cartId, cart);
    return { success: true, cart };
  }

  /**
   * Remove item from cart
   */
  async removeItem(cartId: string, itemId: string): Promise<{
    success: boolean;
    cart?: Cart;
    error?: string;
  }> {
    return await this.updateItemQuantity(cartId, itemId, 0);
  }

  /**
   * Clear cart
   */
  async clearCart(cartId: string): Promise<Cart | null> {
    const cart = await this.getCart(cartId);
    if (!cart) {
      return null;
    }

    cart.items = [];
    await this.recalculateCart(cart);

    this.carts.set(cartId, cart);
    return cart;
  }

  /**
   * Apply coupon code
   */
  async applyCoupon(cartId: string, couponCode: string): Promise<{
    success: boolean;
    cart?: Cart;
    error?: string;
    discount?: number;
  }> {
    const cart = await this.getCart(cartId);
    if (!cart) {
      return { success: false, error: 'Cart not found' };
    }

    if (cart.appliedCoupons.includes(couponCode)) {
      return { success: false, error: 'Coupon already applied' };
    }

    // Validate coupon (would integrate with coupon system)
    const couponValidation = await this.validateCoupon(couponCode, cart);
    if (!couponValidation.valid) {
      return { success: false, error: couponValidation.error };
    }

    cart.appliedCoupons.push(couponCode);
    await this.recalculateCart(cart);

    this.carts.set(cartId, cart);
    return { 
      success: true, 
      cart, 
      discount: couponValidation.discount 
    };
  }

  /**
   * Remove coupon
   */
  async removeCoupon(cartId: string, couponCode: string): Promise<Cart | null> {
    const cart = await this.getCart(cartId);
    if (!cart) {
      return null;
    }

    cart.appliedCoupons = cart.appliedCoupons.filter(code => code !== couponCode);
    await this.recalculateCart(cart);

    this.carts.set(cartId, cart);
    return cart;
  }

  /**
   * Update shipping address
   */
  async updateShippingAddress(cartId: string, address: Address): Promise<Cart | null> {
    const cart = await this.getCart(cartId);
    if (!cart) {
      return null;
    }

    const validation = addressSchema.safeParse(address);
    if (!validation.success) {
      throw new Error(`Address validation failed: ${JSON.stringify(validation.error.errors)}`);
    }

    cart.shippingAddress = validation.data;
    await this.recalculateCart(cart); // Recalculate shipping

    this.carts.set(cartId, cart);
    return cart;
  }

  /**
   * Update billing address
   */
  async updateBillingAddress(cartId: string, address: Address): Promise<Cart | null> {
    const cart = await this.getCart(cartId);
    if (!cart) {
      return null;
    }

    const validation = addressSchema.safeParse(address);
    if (!validation.success) {
      throw new Error(`Address validation failed: ${JSON.stringify(validation.error.errors)}`);
    }

    cart.billingAddress = validation.data;
    await this.recalculateCart(cart); // Recalculate tax

    this.carts.set(cartId, cart);
    return cart;
  }

  /**
   * Get available shipping options
   */
  async getShippingOptions(cartId: string): Promise<ShippingOption[]> {
    const cart = await this.getCart(cartId);
    if (!cart || !cart.shippingAddress) {
      return [];
    }

    // Calculate shipping options based on cart contents and address
    const options: ShippingOption[] = [
      {
        id: 'standard',
        name: 'Standard Shipping',
        description: '5-7 business days',
        price: 5.99,
        estimatedDays: 6,
        trackingSupported: true,
      },
      {
        id: 'express',
        name: 'Express Shipping',
        description: '2-3 business days',
        price: 12.99,
        estimatedDays: 2,
        trackingSupported: true,
      },
    ];

    // Free shipping for orders over £50
    if (cart.subtotal >= 50) {
      options.unshift({
        id: 'free',
        name: 'Free Shipping',
        description: '5-7 business days',
        price: 0,
        estimatedDays: 6,
        trackingSupported: true,
      });
    }

    return options;
  }

  /**
   * Apply shipping option
   */
  async applyShippingOption(cartId: string, shippingOptionId: string): Promise<Cart | null> {
    const cart = await this.getCart(cartId);
    if (!cart) {
      return null;
    }

    const shippingOptions = await this.getShippingOptions(cartId);
    const selectedOption = shippingOptions.find(option => option.id === shippingOptionId);
    
    if (!selectedOption) {
      throw new Error('Invalid shipping option');
    }

    cart.shipping = selectedOption.price;
    await this.recalculateCart(cart);

    this.carts.set(cartId, cart);
    return cart;
  }

  /**
   * Get cart summary
   */
  async getCartSummary(cartId: string): Promise<{
    itemCount: number;
    subtotal: number;
    tax: number;
    shipping: number;
    discount: number;
    total: number;
    currency: string;
    savings?: number;
  } | null> {
    const cart = await this.getCart(cartId);
    if (!cart) {
      return null;
    }

    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const savings = cart.items.reduce((sum, item) => {
      if (item.compareAtPrice && item.compareAtPrice > item.price) {
        return sum + ((item.compareAtPrice - item.price) * item.quantity);
      }
      return sum;
    }, 0);

    return {
      itemCount,
      subtotal: cart.subtotal,
      tax: cart.tax,
      shipping: cart.shipping,
      discount: cart.discount,
      total: cart.total,
      currency: cart.currency,
      savings: savings > 0 ? savings : undefined,
    };
  }

  /**
   * Recalculate cart totals
   */
  private async recalculateCart(cart: Cart): Promise<void> {
    // Calculate subtotal
    cart.subtotal = cart.items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    // Calculate discount from coupons
    cart.discount = await this.calculateDiscount(cart);

    // Calculate tax
    cart.tax = await this.calculateTax(cart);

    // Calculate total
    cart.total = cart.subtotal + cart.tax + cart.shipping - cart.discount;
    cart.total = Math.max(0, cart.total); // Ensure total is not negative

    cart.updatedAt = new Date();
  }

  private async calculateDiscount(cart: Cart): Promise<number> {
    let totalDiscount = 0;

    for (const couponCode of cart.appliedCoupons) {
      const discount = await this.getCouponDiscount(couponCode, cart);
      totalDiscount += discount;
    }

    return totalDiscount;
  }

  private async calculateTax(cart: Cart): Promise<number> {
    if (!cart.billingAddress) {
      return 0;
    }

    // UK VAT calculation (simplified)
    const vatRate = 0.20; // 20% VAT
    const taxableAmount = cart.subtotal - cart.discount;
    
    return Math.round(taxableAmount * vatRate * 100) / 100;
  }

  private calculateProductPrice(product: Product, variantId?: string): {
    price: number;
    compareAtPrice?: number;
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

    return { price, compareAtPrice };
  }

  private isInStock(product: Product, variantId?: string, quantity: number = 1): boolean {
    if (product.isDigital) {
      return true;
    }

    // Simplified inventory check
    return true; // Would integrate with inventory system
  }

  private async validateCoupon(couponCode: string, cart: Cart): Promise<{
    valid: boolean;
    error?: string;
    discount?: number;
  }> {
    // Simplified coupon validation
    if (couponCode === 'SAVE10') {
      return {
        valid: true,
        discount: cart.subtotal * 0.1, // 10% discount
      };
    }

    return {
      valid: false,
      error: 'Invalid coupon code',
    };
  }

  private async getCouponDiscount(couponCode: string, cart: Cart): Promise<number> {
    if (couponCode === 'SAVE10') {
      return cart.subtotal * 0.1;
    }
    return 0;
  }

  private generateId(): string {
    return 'cart_' + Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}

export const shoppingCart = new ShoppingCart();