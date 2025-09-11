import { z } from 'zod';
import { createHash, createHmac } from 'crypto';

export interface WebhookEvent {
  id: string;
  type: string;
  data: Record<string, any>;
  tenantId: string;
  userId?: string;
  timestamp: Date;
  version: string;
}

export interface WebhookEndpoint {
  id: string;
  tenantId: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  headers?: Record<string, string>;
  retryConfig: {
    maxRetries: number;
    backoffMultiplier: number;
    maxBackoffMs: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  eventId: string;
  url: string;
  httpStatus?: number;
  responseBody?: string;
  responseHeaders?: Record<string, string>;
  attempt: number;
  deliveredAt?: Date;
  nextRetryAt?: Date;
  error?: string;
  createdAt: Date;
}

export interface WebhookConfig {
  maxRetries: number;
  initialBackoffMs: number;
  maxBackoffMs: number;
  backoffMultiplier: number;
  timeoutMs: number;
  maxPayloadSize: number;
  signatureHeader: string;
  timestampHeader: string;
  userAgentHeader: string;
}

const defaultConfig: WebhookConfig = {
  maxRetries: 3,
  initialBackoffMs: 1000,
  maxBackoffMs: 300000, // 5 minutes
  backoffMultiplier: 2,
  timeoutMs: 30000, // 30 seconds
  maxPayloadSize: 1024 * 1024, // 1MB
  signatureHeader: 'X-BizBox-Signature',
  timestampHeader: 'X-BizBox-Timestamp',
  userAgentHeader: 'BizBox-Webhooks/1.0',
};

export class WebhookSystem {
  private static instance: WebhookSystem;
  private config: WebhookConfig;
  private endpoints: Map<string, WebhookEndpoint> = new Map();
  private deliveryQueue: WebhookDelivery[] = [];
  private isProcessing = false;

  constructor(config: Partial<WebhookConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  static getInstance(config?: Partial<WebhookConfig>): WebhookSystem {
    if (!WebhookSystem.instance) {
      WebhookSystem.instance = new WebhookSystem(config);
    }
    return WebhookSystem.instance;
  }

  /**
   * Register a webhook endpoint
   */
  async registerEndpoint(endpoint: Omit<WebhookEndpoint, 'id' | 'createdAt' | 'updatedAt'>): Promise<WebhookEndpoint> {
    const id = this.generateId();
    const now = new Date();

    const webhookEndpoint: WebhookEndpoint = {
      id,
      ...endpoint,
      secret: endpoint.secret || this.generateSecret(),
      retryConfig: {
        maxRetries: this.config.maxRetries,
        backoffMultiplier: this.config.backoffMultiplier,
        maxBackoffMs: this.config.maxBackoffMs,
        ...endpoint.retryConfig,
      },
      createdAt: now,
      updatedAt: now,
    };

    this.endpoints.set(id, webhookEndpoint);
    console.log(`Registered webhook endpoint: ${id} for tenant: ${endpoint.tenantId}`);
    
    return webhookEndpoint;
  }

  /**
   * Update a webhook endpoint
   */
  async updateEndpoint(id: string, updates: Partial<WebhookEndpoint>): Promise<WebhookEndpoint | null> {
    const endpoint = this.endpoints.get(id);
    if (!endpoint) {
      return null;
    }

    const updatedEndpoint = {
      ...endpoint,
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date(),
    };

    this.endpoints.set(id, updatedEndpoint);
    return updatedEndpoint;
  }

  /**
   * Delete a webhook endpoint
   */
  async deleteEndpoint(id: string): Promise<boolean> {
    return this.endpoints.delete(id);
  }

  /**
   * Get webhook endpoint by ID
   */
  async getEndpoint(id: string): Promise<WebhookEndpoint | null> {
    return this.endpoints.get(id) || null;
  }

  /**
   * Get all webhook endpoints for a tenant
   */
  async getEndpointsByTenant(tenantId: string): Promise<WebhookEndpoint[]> {
    return Array.from(this.endpoints.values()).filter(
      endpoint => endpoint.tenantId === tenantId
    );
  }

  /**
   * Emit a webhook event
   */
  async emit(event: Omit<WebhookEvent, 'id' | 'timestamp' | 'version'>): Promise<string> {
    const webhookEvent: WebhookEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      version: '1.0',
      ...event,
    };

    // Find matching endpoints
    const matchingEndpoints = Array.from(this.endpoints.values()).filter(
      endpoint => 
        endpoint.tenantId === event.tenantId &&
        endpoint.active &&
        endpoint.events.includes(event.type)
    );

    // Queue deliveries
    for (const endpoint of matchingEndpoints) {
      const delivery: WebhookDelivery = {
        id: this.generateId(),
        endpointId: endpoint.id,
        eventId: webhookEvent.id,
        url: endpoint.url,
        attempt: 0,
        createdAt: new Date(),
      };

      this.deliveryQueue.push(delivery);
    }

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processDeliveryQueue();
    }

    console.log(`Emitted webhook event: ${webhookEvent.id} (${event.type}) for tenant: ${event.tenantId}`);
    return webhookEvent.id;
  }

  /**
   * Process the delivery queue
   */
  private async processDeliveryQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    while (this.deliveryQueue.length > 0) {
      const delivery = this.deliveryQueue.shift()!;
      
      // Check if it's time to retry
      if (delivery.nextRetryAt && delivery.nextRetryAt > new Date()) {
        // Put it back in the queue for later
        this.deliveryQueue.push(delivery);
        continue;
      }

      await this.deliverWebhook(delivery);
    }

    this.isProcessing = false;
  }

  /**
   * Deliver a single webhook
   */
  private async deliverWebhook(delivery: WebhookDelivery): Promise<void> {
    const endpoint = this.endpoints.get(delivery.endpointId);
    if (!endpoint) {
      console.error(`Webhook endpoint not found: ${delivery.endpointId}`);
      return;
    }

    delivery.attempt++;

    try {
      // Get the event data (in a real implementation, this would come from storage)
      const eventData = this.getEventData(delivery.eventId);
      if (!eventData) {
        console.error(`Webhook event not found: ${delivery.eventId}`);
        return;
      }

      // Prepare payload
      const payload = JSON.stringify(eventData);
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = this.generateSignature(payload, endpoint.secret, timestamp);

      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': this.config.userAgentHeader,
        [this.config.signatureHeader]: signature,
        [this.config.timestampHeader]: timestamp.toString(),
        ...endpoint.headers,
      };

      // Make HTTP request
      const response = await this.makeHttpRequest(endpoint.url, {
        method: 'POST',
        headers,
        body: payload,
        timeout: this.config.timeoutMs,
      });

      // Update delivery record
      delivery.httpStatus = response.status;
      delivery.responseBody = response.body;
      delivery.responseHeaders = response.headers;
      delivery.deliveredAt = new Date();

      if (response.status >= 200 && response.status < 300) {
        console.log(`Webhook delivered successfully: ${delivery.id}`);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.body}`);
      }

    } catch (error) {
      delivery.error = error instanceof Error ? error.message : 'Unknown error';
      
      // Schedule retry if attempts remaining
      if (delivery.attempt < endpoint.retryConfig.maxRetries) {
        const backoffMs = Math.min(
          this.config.initialBackoffMs * Math.pow(endpoint.retryConfig.backoffMultiplier, delivery.attempt - 1),
          endpoint.retryConfig.maxBackoffMs
        );
        
        delivery.nextRetryAt = new Date(Date.now() + backoffMs);
        this.deliveryQueue.push(delivery);
        
        console.log(`Webhook delivery failed, scheduling retry: ${delivery.id} (attempt ${delivery.attempt}/${endpoint.retryConfig.maxRetries})`);
      } else {
        console.error(`Webhook delivery failed permanently: ${delivery.id} - ${delivery.error}`);
      }
    }
  }

  /**
   * Generate webhook signature
   */
  generateSignature(payload: string, secret: string, timestamp: number): string {
    const data = `${timestamp}.${payload}`;
    return createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload: string, signature: string, secret: string, timestamp: number): boolean {
    const expectedSignature = this.generateSignature(payload, secret, timestamp);
    return signature === expectedSignature;
  }

  /**
   * Create webhook verification middleware
   */
  createVerificationMiddleware(getSecret: (endpointId: string) => Promise<string | null>) {
    return async (req: any, res: any, next: any) => {
      try {
        const signature = req.headers[this.config.signatureHeader.toLowerCase()];
        const timestamp = req.headers[this.config.timestampHeader.toLowerCase()];
        const endpointId = req.params.endpointId || req.query.endpointId;

        if (!signature || !timestamp || !endpointId) {
          return res.status(400).json({
            error: {
              code: 'MISSING_WEBHOOK_HEADERS',
              message: 'Missing required webhook headers',
            },
          });
        }

        const secret = await getSecret(endpointId);
        if (!secret) {
          return res.status(404).json({
            error: {
              code: 'WEBHOOK_ENDPOINT_NOT_FOUND',
              message: 'Webhook endpoint not found',
            },
          });
        }

        const payload = JSON.stringify(req.body);
        const isValid = this.verifySignature(payload, signature, secret, parseInt(timestamp));

        if (!isValid) {
          return res.status(401).json({
            error: {
              code: 'INVALID_WEBHOOK_SIGNATURE',
              message: 'Invalid webhook signature',
            },
          });
        }

        next();
      } catch (error) {
        console.error('Webhook verification error:', error);
        res.status(500).json({
          error: {
            code: 'WEBHOOK_VERIFICATION_ERROR',
            message: 'Webhook verification failed',
          },
        });
      }
    };
  }

  /**
   * Get webhook delivery status
   */
  async getDeliveryStatus(deliveryId: string): Promise<WebhookDelivery | null> {
    // In a real implementation, this would query the database
    return null;
  }

  /**
   * Get webhook delivery history for an endpoint
   */
  async getDeliveryHistory(endpointId: string, options: {
    limit?: number;
    offset?: number;
    status?: 'success' | 'failed' | 'pending';
  } = {}): Promise<WebhookDelivery[]> {
    // In a real implementation, this would query the database
    return [];
  }

  /**
   * Retry a failed webhook delivery
   */
  async retryDelivery(deliveryId: string): Promise<boolean> {
    // In a real implementation, this would find the delivery and retry it
    return false;
  }

  /**
   * Test a webhook endpoint
   */
  async testEndpoint(endpointId: string): Promise<{
    success: boolean;
    status?: number;
    responseTime?: number;
    error?: string;
  }> {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) {
      return { success: false, error: 'Endpoint not found' };
    }

    const testEvent: WebhookEvent = {
      id: 'test-' + this.generateId(),
      type: 'test',
      data: { message: 'This is a test webhook' },
      tenantId: endpoint.tenantId,
      timestamp: new Date(),
      version: '1.0',
    };

    const startTime = Date.now();

    try {
      const payload = JSON.stringify(testEvent);
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = this.generateSignature(payload, endpoint.secret, timestamp);

      const response = await this.makeHttpRequest(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': this.config.userAgentHeader,
          [this.config.signatureHeader]: signature,
          [this.config.timestampHeader]: timestamp.toString(),
          ...endpoint.headers,
        },
        body: payload,
        timeout: this.config.timeoutMs,
      });

      const responseTime = Date.now() - startTime;

      return {
        success: response.status >= 200 && response.status < 300,
        status: response.status,
        responseTime,
        error: response.status >= 400 ? response.body : undefined,
      };

    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private generateId(): string {
    return 'wh_' + createHash('sha256').update(Date.now() + Math.random().toString()).digest('hex').substring(0, 16);
  }

  private generateSecret(): string {
    return createHash('sha256').update(Date.now() + Math.random().toString()).digest('hex');
  }

  private getEventData(eventId: string): WebhookEvent | null {
    // In a real implementation, this would query the database
    // For now, return a mock event
    return {
      id: eventId,
      type: 'test',
      data: { message: 'Test event' },
      tenantId: 'test-tenant',
      timestamp: new Date(),
      version: '1.0',
    };
  }

  private async makeHttpRequest(url: string, options: {
    method: string;
    headers: Record<string, string>;
    body: string;
    timeout: number;
  }): Promise<{
    status: number;
    body: string;
    headers: Record<string, string>;
  }> {
    // In a real implementation, use fetch or axios
    // This is a mock implementation
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate successful response
        resolve({
          status: 200,
          body: 'OK',
          headers: { 'content-type': 'text/plain' },
        });
      }, 100);
    });
  }
}

// Webhook event types
export const WebhookEventTypes = {
  // User events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  
  // Booking events
  BOOKING_CREATED: 'booking.created',
  BOOKING_UPDATED: 'booking.updated',
  BOOKING_CANCELLED: 'booking.cancelled',
  BOOKING_COMPLETED: 'booking.completed',
  
  // Payment events
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',
  
  // Order events
  ORDER_CREATED: 'order.created',
  ORDER_UPDATED: 'order.updated',
  ORDER_FULFILLED: 'order.fulfilled',
  ORDER_CANCELLED: 'order.cancelled',
  
  // Tenant events
  TENANT_CREATED: 'tenant.created',
  TENANT_UPDATED: 'tenant.updated',
  TENANT_SUSPENDED: 'tenant.suspended',
  
  // System events
  SYSTEM_MAINTENANCE: 'system.maintenance',
  SYSTEM_ALERT: 'system.alert',
} as const;

// Validation schemas
export const webhookSchemas = {
  endpoint: z.object({
    url: z.string().url(),
    events: z.array(z.string()).min(1),
    secret: z.string().optional(),
    active: z.boolean().default(true),
    headers: z.record(z.string()).optional(),
    retryConfig: z.object({
      maxRetries: z.number().min(0).max(10).default(3),
      backoffMultiplier: z.number().min(1).max(10).default(2),
      maxBackoffMs: z.number().min(1000).max(3600000).default(300000),
    }).optional(),
  }),

  event: z.object({
    type: z.string().min(1),
    data: z.record(z.any()),
    tenantId: z.string().uuid(),
    userId: z.string().uuid().optional(),
  }),
};

export type WebhookEventType = typeof WebhookEventTypes[keyof typeof WebhookEventTypes];

// Export singleton instance
export const webhookSystem = WebhookSystem.getInstance();