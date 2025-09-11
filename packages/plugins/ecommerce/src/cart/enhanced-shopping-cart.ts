import { EventEmitter } from 'events'

export interface CartItem {
  id: string
  productId: string
  variantId?: string
  quantity: number
  price: number
  compareAtPrice?: number
  name: string
  image?: string
  sku: string
  weight?: number
  isDigital: boolean
  requiresShipping: boolean
  metadata: Record<string, any>
}

export interface Cart {
  id: string
  tenantId: string
  userId?: string
  sessionId?: string
  items: CartItem[]
  subtotal: number
  tax: number
  shipping: number
  discount: number
  total: number
  currency: string
  shippingAddress?: Address
  billingAddress?: Address
  shippingMethod?: ShippingMethod
  paymentMethod?: PaymentMethod
  couponCode?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
  expiresAt: Date
  status: 'active' | 'abandoned' | 'converted' | 'expired'
}

export interface Address {
  id?: string
  firstName: string
  lastName: string
  company?: string
  address1: string
  address2?: string
  city: string
  province: string
  country: string
  zip: string
  phone?: string
}

export interface ShippingMethod {
  id: string
  name: string
  description: string
  price: number
  estimatedDays: number
  carrier?: string
  trackingSupported: boolean
}

export interface PaymentMethod {
  id: string
  type: 'card' | 'paypal' | 'bank_transfer' | 'cash_on_delivery'
  name: string
  last4?: string
  brand?: string
  expiryMonth?: number
  expiryYear?: number
}

export interface Coupon {
  id: string
  code: string
  type: 'percentage' | 'fixed_amount' | 'free_shipping'
  value: number
  minimumAmount?: number
  maximumDiscount?: number
  usageLimit?: number
  usageCount: number
  expiresAt?: Date
  isActive: boolean
  applicableProducts?: string[]
  applicableCategories?: string[]
}

export interface TaxRate {
  id: string
  name: string
  rate: number
  country: string
  province?: string
  isDefault: boolean
}

export interface CheckoutSession {
  id: string
  cartId: string
  tenantId: string
  userId?: string
  step: 'information' | 'shipping' | 'payment' | 'review' | 'complete'
  customerInfo?: {
    email: string
    firstName: string
    lastName: string
    phone?: string
  }
  shippingAddress?: Address
  billingAddress?: Address
  shippingMethod?: ShippingMethod
  paymentMethod?: PaymentMethod
  paymentIntentId?: string
  orderNumber?: string
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

export interface Order {
  id: string
  orderNumber: string
  tenantId: string
  userId?: string
  customerEmail: string
  items: CartItem[]
  subtotal: number
  tax: number
  shipping: number
  discount: number
  total: number
  currency: string
  shippingAddress: Address
  billingAddress: Address
  shippingMethod: ShippingMethod
  paymentMethod: PaymentMethod
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded'
  fulfillmentStatus: 'unfulfilled' | 'partial' | 'fulfilled' | 'cancelled'
  notes?: string
  createdAt: Date
  updatedAt: Date
  paidAt?: Date
  fulfilledAt?: Date
  cancelledAt?: Date
}

export class EnhancedShoppingCart extends EventEmitter {
  private carts: Map<string, Cart> = new Map()
  private checkoutSessions: Map<string, CheckoutSession> = new Map()
  private orders: Map<string, Order> = new Map()
  private coupons: Map<string, Coupon> = new Map()
  private taxRates: Map<string, TaxRate> = new Map()
  private shippingMethods: Map<string, ShippingMethod> = new Map()

  constructor() {
    super()
    this.initializeDefaultData()
    this.startCartCleanup()
  }

  /**
   * Create a new cart
   */
  async createCart(tenantId: string, userId?: string, sessionId?: string): Promise<Cart> {
    const cart: Cart = {
      id: this.generateId(),
      tenantId,
      userId,
      sessionId,
      items: [],
      subtotal: 0,
      tax: 0,
      shipping: 0,
      discount: 0,
      total: 0,
      currency: 'GBP',
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      status: 'active'
    }

    this.carts.set(cart.id, cart)
    this.emit('cart:created', cart)
    return cart
  }

  /**
   * Get cart by ID
   */
  async getCart(cartId: string): Promise<Cart | null> {
    const cart = this.carts.get(cartId)
    if (!cart || cart.status === 'expired') return null
    return cart
  }

  /**
   * Get or create cart for user/session
   */
  async getOrCreateCart(tenantId: string, userId?: string, sessionId?: string): Promise<Cart> {
    // Try to find existing active cart
    const existingCart = Array.from(this.carts.values()).find(cart =>
      cart.tenantId === tenantId &&
      cart.status === 'active' &&
      ((userId && cart.userId === userId) || (sessionId && cart.sessionId === sessionId))
    )

    if (existingCart) {
      return existingCart
    }

    return this.createCart(tenantId, userId, sessionId)
  }

  /**
   * Add item to cart
   */
  async addItem(cartId: string, item: Omit<CartItem, 'id'>): Promise<Cart | null> {
    const cart = this.carts.get(cartId)
    if (!cart || cart.status !== 'active') return null

    const existingItem = cart.items.find(
      i => i.productId === item.productId && i.variantId === item.variantId
    )

    if (existingItem) {
      existingItem.quantity += item.quantity
    } else {
      cart.items.push({
        ...item,
        id: this.generateId()
      })
    }

    await this.updateCartTotals(cart)
    this.emit('cart:item_added', { cart, item })
    return cart
  }

  /**
   * Update item quantity
   */
  async updateItemQuantity(cartId: string, itemId: string, quantity: number): Promise<Cart | null> {
    const cart = this.carts.get(cartId)
    if (!cart || cart.status !== 'active') return null

    const item = cart.items.find(i => i.id === itemId)
    if (!item) return null

    const oldQuantity = item.quantity

    if (quantity <= 0) {
      cart.items = cart.items.filter(i => i.id !== itemId)
      this.emit('cart:item_removed', { cart, item })
    } else {
      item.quantity = quantity
      this.emit('cart:item_updated', { cart, item, oldQuantity })
    }

    await this.updateCartTotals(cart)
    return cart
  }

  /**
   * Remove item from cart
   */
  async removeItem(cartId: string, itemId: string): Promise<Cart | null> {
    const cart = this.carts.get(cartId)
    if (!cart || cart.status !== 'active') return null

    const item = cart.items.find(i => i.id === itemId)
    if (!item) return null

    cart.items = cart.items.filter(i => i.id !== itemId)
    await this.updateCartTotals(cart)
    
    this.emit('cart:item_removed', { cart, item })
    return cart
  }

  /**
   * Apply coupon code
   */
  async applyCoupon(cartId: string, couponCode: string): Promise<{
    success: boolean
    message: string
    cart?: Cart
  }> {
    const cart = this.carts.get(cartId)
    if (!cart || cart.status !== 'active') {
      return { success: false, message: 'Cart not found' }
    }

    const coupon = Array.from(this.coupons.values())
      .find(c => c.code.toLowerCase() === couponCode.toLowerCase())

    if (!coupon) {
      return { success: false, message: 'Invalid coupon code' }
    }

    if (!coupon.isActive) {
      return { success: false, message: 'Coupon is no longer active' }
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return { success: false, message: 'Coupon has expired' }
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return { success: false, message: 'Coupon usage limit reached' }
    }

    if (coupon.minimumAmount && cart.subtotal < coupon.minimumAmount) {
      return { 
        success: false, 
        message: `Minimum order amount of £${coupon.minimumAmount.toFixed(2)} required` 
      }
    }

    cart.couponCode = coupon.code
    await this.updateCartTotals(cart)

    this.emit('cart:coupon_applied', { cart, coupon })
    return { 
      success: true, 
      message: 'Coupon applied successfully', 
      cart 
    }
  }

  /**
   * Remove coupon
   */
  async removeCoupon(cartId: string): Promise<Cart | null> {
    const cart = this.carts.get(cartId)
    if (!cart || cart.status !== 'active') return null

    cart.couponCode = undefined
    await this.updateCartTotals(cart)
    
    this.emit('cart:coupon_removed', cart)
    return cart
  }

  /**
   * Set shipping address
   */
  async setShippingAddress(cartId: string, address: Address): Promise<Cart | null> {
    const cart = this.carts.get(cartId)
    if (!cart || cart.status !== 'active') return null

    cart.shippingAddress = address
    await this.updateCartTotals(cart) // Recalculate tax based on address
    
    this.emit('cart:shipping_address_updated', { cart, address })
    return cart
  }

  /**
   * Set shipping method
   */
  async setShippingMethod(cartId: string, shippingMethodId: string): Promise<Cart | null> {
    const cart = this.carts.get(cartId)
    if (!cart || cart.status !== 'active') return null

    const shippingMethod = this.shippingMethods.get(shippingMethodId)
    if (!shippingMethod) return null

    cart.shippingMethod = shippingMethod
    await this.updateCartTotals(cart)
    
    this.emit('cart:shipping_method_updated', { cart, shippingMethod })
    return cart
  }

  /**
   * Get available shipping methods
   */
  async getShippingMethods(cartId: string): Promise<ShippingMethod[]> {
    const cart = this.carts.get(cartId)
    if (!cart) return []

    // Filter shipping methods based on cart contents and destination
    const hasPhysicalItems = cart.items.some(item => item.requiresShipping)
    if (!hasPhysicalItems) return []

    return Array.from(this.shippingMethods.values())
      .filter(method => {
        // Add logic to filter based on destination, weight, etc.
        return true
      })
      .sort((a, b) => a.price - b.price)
  }

  /**
   * Start checkout process
   */
  async startCheckout(cartId: string, customerInfo: {
    email: string
    firstName: string
    lastName: string
    phone?: string
  }): Promise<CheckoutSession> {
    const cart = this.carts.get(cartId)
    if (!cart || cart.status !== 'active' || cart.items.length === 0) {
      throw new Error('Invalid cart for checkout')
    }

    const session: CheckoutSession = {
      id: this.generateId(),
      cartId,
      tenantId: cart.tenantId,
      userId: cart.userId,
      step: 'information',
      customerInfo,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.checkoutSessions.set(session.id, session)
    this.emit('checkout:started', session)
    return session
  }

  /**
   * Update checkout session
   */
  async updateCheckoutSession(
    sessionId: string,
    updates: Partial<Pick<CheckoutSession, 'step' | 'shippingAddress' | 'billingAddress' | 'shippingMethod' | 'paymentMethod'>>
  ): Promise<CheckoutSession | null> {
    const session = this.checkoutSessions.get(sessionId)
    if (!session) return null

    Object.assign(session, updates, { updatedAt: new Date() })
    
    this.emit('checkout:updated', session)
    return session
  }

  /**
   * Complete checkout and create order
   */
  async completeCheckout(sessionId: string, paymentIntentId: string): Promise<Order> {
    const session = this.checkoutSessions.get(sessionId)
    if (!session) {
      throw new Error('Checkout session not found')
    }

    const cart = this.carts.get(session.cartId)
    if (!cart) {
      throw new Error('Cart not found')
    }

    if (!session.shippingAddress || !session.shippingMethod) {
      throw new Error('Missing required checkout information')
    }

    const order: Order = {
      id: this.generateId(),
      orderNumber: this.generateOrderNumber(),
      tenantId: cart.tenantId,
      userId: cart.userId,
      customerEmail: session.customerInfo!.email,
      items: [...cart.items],
      subtotal: cart.subtotal,
      tax: cart.tax,
      shipping: cart.shipping,
      discount: cart.discount,
      total: cart.total,
      currency: cart.currency,
      shippingAddress: session.shippingAddress,
      billingAddress: session.billingAddress || session.shippingAddress,
      shippingMethod: session.shippingMethod,
      paymentMethod: session.paymentMethod!,
      paymentStatus: 'paid',
      fulfillmentStatus: 'unfulfilled',
      notes: cart.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
      paidAt: new Date()
    }

    this.orders.set(order.id, order)

    // Mark cart as converted
    cart.status = 'converted'
    cart.updatedAt = new Date()

    // Complete checkout session
    session.step = 'complete'
    session.orderNumber = order.orderNumber
    session.completedAt = new Date()
    session.updatedAt = new Date()

    // Update coupon usage if applicable
    if (cart.couponCode) {
      const coupon = Array.from(this.coupons.values())
        .find(c => c.code === cart.couponCode)
      if (coupon) {
        coupon.usageCount++
      }
    }

    this.emit('order:created', order)
    this.emit('checkout:completed', { session, order })
    
    return order
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<Order | null> {
    return this.orders.get(orderId) || null
  }

  /**
   * Get orders for tenant
   */
  async getOrders(
    tenantId: string,
    filters: {
      userId?: string
      status?: Order['paymentStatus']
      fulfillmentStatus?: Order['fulfillmentStatus']
      dateRange?: { from: Date; to: Date }
      limit?: number
      offset?: number
    } = {}
  ): Promise<{
    orders: Order[]
    total: number
  }> {
    let orders = Array.from(this.orders.values())
      .filter(order => order.tenantId === tenantId)

    if (filters.userId) {
      orders = orders.filter(order => order.userId === filters.userId)
    }

    if (filters.status) {
      orders = orders.filter(order => order.paymentStatus === filters.status)
    }

    if (filters.fulfillmentStatus) {
      orders = orders.filter(order => order.fulfillmentStatus === filters.fulfillmentStatus)
    }

    if (filters.dateRange) {
      orders = orders.filter(order =>
        order.createdAt >= filters.dateRange!.from &&
        order.createdAt <= filters.dateRange!.to
      )
    }

    const total = orders.length

    // Sort by creation date (newest first)
    orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    // Apply pagination
    const offset = filters.offset || 0
    const limit = filters.limit || 50
    orders = orders.slice(offset, offset + limit)

    return { orders, total }
  }

  /**
   * Calculate cart totals
   */
  private async updateCartTotals(cart: Cart): Promise<void> {
    // Calculate subtotal
    cart.subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)

    // Calculate discount
    cart.discount = 0
    if (cart.couponCode) {
      const coupon = Array.from(this.coupons.values())
        .find(c => c.code === cart.couponCode)
      
      if (coupon) {
        cart.discount = this.calculateCouponDiscount(cart, coupon)
      }
    }

    // Calculate tax
    cart.tax = this.calculateTax(cart)

    // Calculate shipping
    cart.shipping = this.calculateShipping(cart)

    // Calculate total
    cart.total = cart.subtotal + cart.tax + cart.shipping - cart.discount

    cart.updatedAt = new Date()
  }

  /**
   * Calculate coupon discount
   */
  private calculateCouponDiscount(cart: Cart, coupon: Coupon): number {
    let discount = 0

    switch (coupon.type) {
      case 'percentage':
        discount = (cart.subtotal * coupon.value) / 100
        if (coupon.maximumDiscount) {
          discount = Math.min(discount, coupon.maximumDiscount)
        }
        break
      case 'fixed_amount':
        discount = Math.min(coupon.value, cart.subtotal)
        break
      case 'free_shipping':
        discount = cart.shipping
        break
    }

    return Math.round(discount * 100) / 100
  }

  /**
   * Calculate tax
   */
  private calculateTax(cart: Cart): number {
    // Default UK VAT rate
    let taxRate = 0.2

    // Use address-specific tax rate if available
    if (cart.shippingAddress) {
      const addressTaxRate = Array.from(this.taxRates.values())
        .find(rate => 
          rate.country === cart.shippingAddress!.country &&
          (!rate.province || rate.province === cart.shippingAddress!.province)
        )
      
      if (addressTaxRate) {
        taxRate = addressTaxRate.rate
      }
    }

    const taxableAmount = cart.items
      .filter(item => !item.isDigital) // Assume digital products are tax-exempt
      .reduce((sum, item) => sum + (item.price * item.quantity), 0)

    return Math.round(taxableAmount * taxRate * 100) / 100
  }

  /**
   * Calculate shipping
   */
  private calculateShipping(cart: Cart): number {
    // No shipping for digital-only orders
    const hasPhysicalItems = cart.items.some(item => item.requiresShipping)
    if (!hasPhysicalItems) return 0

    // Use selected shipping method
    if (cart.shippingMethod) {
      return cart.shippingMethod.price
    }

    // Default shipping calculation
    const totalWeight = cart.items
      .filter(item => item.requiresShipping)
      .reduce((sum, item) => sum + ((item.weight || 0) * item.quantity), 0)

    if (cart.subtotal >= 50) return 0 // Free shipping over £50
    if (totalWeight <= 1) return 3.99 // Standard shipping
    return 5.99 // Heavy item shipping
  }

  /**
   * Clean up expired carts
   */
  private startCartCleanup(): void {
    setInterval(() => {
      const now = new Date()
      for (const [cartId, cart] of this.carts.entries()) {
        if (cart.expiresAt < now && cart.status === 'active') {
          cart.status = 'expired'
          this.emit('cart:expired', cart)
        }
      }
    }, 60 * 60 * 1000) // Check every hour
  }

  /**
   * Initialize default data
   */
  private initializeDefaultData(): void {
    // Default shipping methods
    const shippingMethods: ShippingMethod[] = [
      {
        id: 'standard',
        name: 'Standard Delivery',
        description: '3-5 business days',
        price: 3.99,
        estimatedDays: 4,
        trackingSupported: true
      },
      {
        id: 'express',
        name: 'Express Delivery',
        description: '1-2 business days',
        price: 7.99,
        estimatedDays: 1,
        trackingSupported: true
      },
      {
        id: 'next-day',
        name: 'Next Day Delivery',
        description: 'Order by 2pm for next day delivery',
        price: 12.99,
        estimatedDays: 1,
        trackingSupported: true
      }
    ]

    shippingMethods.forEach(method => {
      this.shippingMethods.set(method.id, method)
    })

    // Default tax rates
    const taxRates: TaxRate[] = [
      {
        id: 'uk-vat',
        name: 'UK VAT',
        rate: 0.2,
        country: 'GB',
        isDefault: true
      },
      {
        id: 'eu-vat',
        name: 'EU VAT',
        rate: 0.21,
        country: 'EU',
        isDefault: false
      }
    ]

    taxRates.forEach(rate => {
      this.taxRates.set(rate.id, rate)
    })

    // Sample coupons
    const coupons: Coupon[] = [
      {
        id: 'welcome10',
        code: 'WELCOME10',
        type: 'percentage',
        value: 10,
        minimumAmount: 25,
        maximumDiscount: 50,
        usageLimit: 1000,
        usageCount: 0,
        isActive: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'freeship',
        code: 'FREESHIP',
        type: 'free_shipping',
        value: 0,
        usageLimit: undefined,
        usageCount: 0,
        isActive: true
      }
    ]

    coupons.forEach(coupon => {
      this.coupons.set(coupon.id, coupon)
    })
  }

  /**
   * Generate unique IDs
   */
  private generateId(): string {
    return 'cart_' + Date.now().toString(36) + Math.random().toString(36).substring(2)
  }

  /**
   * Generate order number
   */
  private generateOrderNumber(): string {
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.random().toString(36).substring(2, 5).toUpperCase()
    return `ORD-${timestamp}-${random}`
  }
}

export const enhancedShoppingCart = new EnhancedShoppingCart()