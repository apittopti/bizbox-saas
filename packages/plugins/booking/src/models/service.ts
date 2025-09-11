import { z } from 'zod';

export interface Service {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  duration: number; // in minutes
  price: number; // in pence/cents
  currency: string;
  bufferBefore: number; // in minutes
  bufferAfter: number; // in minutes
  requiredSkills: string[];
  category?: string;
  isActive: boolean;
  maxAdvanceBooking?: number; // days
  minAdvanceBooking?: number; // hours
  cancellationPolicy?: {
    allowCancellation: boolean;
    cancellationDeadline: number; // hours before appointment
    cancellationFee?: number; // percentage or fixed amount
  };
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceAvailability {
  serviceId: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  isAvailable: boolean;
}

export interface ServicePricing {
  serviceId: string;
  priceType: 'fixed' | 'variable' | 'tiered';
  basePrice: number;
  variations?: Array<{
    name: string;
    description?: string;
    priceModifier: number; // percentage or fixed amount
    modifierType: 'percentage' | 'fixed';
  }>;
  discounts?: Array<{
    name: string;
    type: 'percentage' | 'fixed';
    value: number;
    conditions?: Record<string, any>;
    validFrom?: Date;
    validTo?: Date;
  }>;
}

export const serviceSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  duration: z.number().min(1).max(1440), // max 24 hours
  price: z.number().min(0),
  currency: z.string().length(3).default('GBP'),
  bufferBefore: z.number().min(0).max(120).default(0),
  bufferAfter: z.number().min(0).max(120).default(0),
  requiredSkills: z.array(z.string()).default([]),
  category: z.string().max(100).optional(),
  isActive: z.boolean().default(true),
  maxAdvanceBooking: z.number().min(1).max(365).optional(),
  minAdvanceBooking: z.number().min(0).max(168).optional(), // max 1 week
  cancellationPolicy: z.object({
    allowCancellation: z.boolean().default(true),
    cancellationDeadline: z.number().min(0).max(168).default(24),
    cancellationFee: z.number().min(0).max(100).optional(),
  }).optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createServiceSchema = serviceSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateServiceSchema = createServiceSchema.partial();

export class ServiceManager {
  private services: Map<string, Service> = new Map();

  /**
   * Create a new service
   */
  async createService(data: z.infer<typeof createServiceSchema>): Promise<Service> {
    const validation = createServiceSchema.safeParse(data);
    if (!validation.success) {
      throw new Error(`Service validation failed: ${JSON.stringify(validation.error.errors)}`);
    }

    const service: Service = {
      id: this.generateId(),
      ...validation.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.services.set(service.id, service);
    return service;
  }

  /**
   * Update an existing service
   */
  async updateService(id: string, updates: z.infer<typeof updateServiceSchema>): Promise<Service | null> {
    const service = this.services.get(id);
    if (!service) {
      return null;
    }

    const validation = updateServiceSchema.safeParse(updates);
    if (!validation.success) {
      throw new Error(`Service validation failed: ${JSON.stringify(validation.error.errors)}`);
    }

    const updatedService: Service = {
      ...service,
      ...validation.data,
      updatedAt: new Date(),
    };

    this.services.set(id, updatedService);
    return updatedService;
  }

  /**
   * Get service by ID
   */
  async getService(id: string): Promise<Service | null> {
    return this.services.get(id) || null;
  }

  /**
   * Get all services for a tenant
   */
  async getServicesByTenant(tenantId: string): Promise<Service[]> {
    return Array.from(this.services.values()).filter(
      service => service.tenantId === tenantId
    );
  }

  /**
   * Get active services for a tenant
   */
  async getActiveServices(tenantId: string): Promise<Service[]> {
    return Array.from(this.services.values()).filter(
      service => service.tenantId === tenantId && service.isActive
    );
  }

  /**
   * Get services by category
   */
  async getServicesByCategory(tenantId: string, category: string): Promise<Service[]> {
    return Array.from(this.services.values()).filter(
      service => service.tenantId === tenantId && service.category === category
    );
  }

  /**
   * Delete a service
   */
  async deleteService(id: string): Promise<boolean> {
    return this.services.delete(id);
  }

  /**
   * Calculate service price with variations and discounts
   */
  calculatePrice(service: Service, pricing?: ServicePricing, options?: {
    variations?: string[];
    discountCodes?: string[];
    customerType?: string;
  }): {
    basePrice: number;
    variations: number;
    discounts: number;
    totalPrice: number;
    breakdown: Array<{ type: string; name: string; amount: number }>;
  } {
    let totalPrice = service.price;
    const breakdown: Array<{ type: string; name: string; amount: number }> = [
      { type: 'base', name: 'Base Price', amount: service.price }
    ];

    // Apply variations
    let variationAmount = 0;
    if (pricing?.variations && options?.variations) {
      for (const variationName of options.variations) {
        const variation = pricing.variations.find(v => v.name === variationName);
        if (variation) {
          const amount = variation.modifierType === 'percentage'
            ? (service.price * variation.priceModifier) / 100
            : variation.priceModifier;
          
          variationAmount += amount;
          breakdown.push({ type: 'variation', name: variation.name, amount });
        }
      }
    }

    // Apply discounts
    let discountAmount = 0;
    if (pricing?.discounts) {
      for (const discount of pricing.discounts) {
        // Check if discount is valid
        const now = new Date();
        if (discount.validFrom && discount.validFrom > now) continue;
        if (discount.validTo && discount.validTo < now) continue;

        // Apply discount conditions logic here
        const amount = discount.type === 'percentage'
          ? ((service.price + variationAmount) * discount.value) / 100
          : discount.value;
        
        discountAmount += amount;
        breakdown.push({ type: 'discount', name: discount.name, amount: -amount });
      }
    }

    totalPrice = service.price + variationAmount - discountAmount;

    return {
      basePrice: service.price,
      variations: variationAmount,
      discounts: discountAmount,
      totalPrice: Math.max(0, totalPrice), // Ensure price doesn't go negative
      breakdown,
    };
  }

  /**
   * Check if service requires specific skills
   */
  requiresSkills(service: Service, staffSkills: string[]): boolean {
    if (service.requiredSkills.length === 0) {
      return true; // No specific skills required
    }

    return service.requiredSkills.every(skill => staffSkills.includes(skill));
  }

  /**
   * Get service duration including buffers
   */
  getTotalDuration(service: Service): number {
    return service.duration + service.bufferBefore + service.bufferAfter;
  }

  /**
   * Validate booking timing constraints
   */
  validateBookingTime(service: Service, bookingTime: Date): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const now = new Date();

    // Check minimum advance booking
    if (service.minAdvanceBooking) {
      const minTime = new Date(now.getTime() + service.minAdvanceBooking * 60 * 60 * 1000);
      if (bookingTime < minTime) {
        errors.push(`Booking must be at least ${service.minAdvanceBooking} hours in advance`);
      }
    }

    // Check maximum advance booking
    if (service.maxAdvanceBooking) {
      const maxTime = new Date(now.getTime() + service.maxAdvanceBooking * 24 * 60 * 60 * 1000);
      if (bookingTime > maxTime) {
        errors.push(`Booking cannot be more than ${service.maxAdvanceBooking} days in advance`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private generateId(): string {
    return 'svc_' + Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}

export const serviceManager = new ServiceManager();