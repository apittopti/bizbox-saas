import { EventEmitter } from 'events'
import crypto from 'crypto'
import { z } from 'zod'

export interface WebhookEvent {
  id: string
  tenantId: string
  event: string
  data: Record<string, any>
  timestamp: Date
  attempts: number
  maxAttempts: number
  nextRetry?: Date
  status: 'pending' | 'delivered' | 'failed' | 'dead_letter'
}

export interface WebhookEndpoint {
  id: string
  tenantId: string
  url: string
  secret: string
  events: string[]
  active: boolean
  createdAt: Date
  updatedAt: Date
}

const WebhookEventSchema = z.object({
  event: z.string(),
  data: z.record(z.any()),
  tenantId: z.string(),
})

export class WebhookDeliveryService extends EventEmitter {
  private deliveryQueue: Map<string, WebhookEvent> = new Map()
  private endpoints: Map<string, WebhookEndpoint[]> = new Map()
  private retryIntervals = [1000, 5000, 15000, 60000, 300000] // 1s, 5s, 15s, 1m, 5m

  constructor() {
    super()
    this.startDeliveryProcessor()
  }

  async registerEndpoint(endpoint: Omit<WebhookEndpoint, 'id' | 'createdAt' | 'updatedAt'>): Promise<WebhookEndpoint> {
    const webhookEndpoint: WebhookEndpoint = {
      ...endpoint,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const tenantEndpoints = this.endpoints.get(endpoint.tenantId) || []
    tenantEndpoints.push(webhookEndpoint)
    this.endpoints.set(endpoint.tenantId, tenantEndpoints)

    return webhookEndpoint
  }

  async updateEndpoint(endpointId: string, updates: Partial<WebhookEndpoint>): Promise<WebhookEndpoint | null> {
    for (const [tenantId, endpoints] of this.endpoints.entries()) {
      const endpointIndex = endpoints.findIndex(e => e.id === endpointId)
      if (endpointIndex !== -1) {
        const endpoint = endpoints[endpointIndex]
        const updatedEndpoint = {
          ...endpoint,
          ...updates,
          updatedAt: new Date(),
        }
        endpoints[endpointIndex] = updatedEndpoint
        return updatedEndpoint
      }
    }
    return null
  }

  async deleteEndpoint(endpointId: string): Promise<boolean> {
    for (const [tenantId, endpoints] of this.endpoints.entries()) {
      const endpointIndex = endpoints.findIndex(e => e.id === endpointId)
      if (endpointIndex !== -1) {
        endpoints.splice(endpointIndex, 1)
        return true
      }
    }
    return false
  }

  async sendWebhook(event: string, data: Record<string, any>, tenantId: string): Promise<void> {
    const validation = WebhookEventSchema.safeParse({ event, data, tenantId })
    if (!validation.success) {
      throw new Error(`Invalid webhook event: ${validation.error.message}`)
    }

    const endpoints = this.endpoints.get(tenantId) || []
    const relevantEndpoints = endpoints.filter(
      endpoint => endpoint.active && endpoint.events.includes(event)
    )

    for (const endpoint of relevantEndpoints) {
      const webhookEvent: WebhookEvent = {
        id: crypto.randomUUID(),
        tenantId,
        event,
        data,
        timestamp: new Date(),
        attempts: 0,
        maxAttempts: 5,
        status: 'pending',
      }

      this.deliveryQueue.set(webhookEvent.id, webhookEvent)
      this.emit('webhook:queued', webhookEvent)
    }
  }

  private async deliverWebhook(event: WebhookEvent): Promise<boolean> {
    const endpoints = this.endpoints.get(event.tenantId) || []
    const endpoint = endpoints.find(e => e.events.includes(event.event) && e.active)

    if (!endpoint) {
      this.emit('webhook:no_endpoint', event)
      return false
    }

    try {
      const payload = {
        id: event.id,
        event: event.event,
        data: event.data,
        timestamp: event.timestamp.toISOString(),
      }

      const signature = this.generateSignature(JSON.stringify(payload), endpoint.secret)
      
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event.event,
          'X-Webhook-ID': event.id,
          'User-Agent': 'BizBox-Webhooks/1.0',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      })

      if (response.ok) {
        event.status = 'delivered'
        this.emit('webhook:delivered', event, endpoint)
        return true
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      event.attempts++
      
      if (event.attempts >= event.maxAttempts) {
        event.status = 'dead_letter'
        this.emit('webhook:dead_letter', event, error)
        return false
      } else {
        event.status = 'failed'
        event.nextRetry = new Date(Date.now() + this.retryIntervals[event.attempts - 1])
        this.emit('webhook:retry_scheduled', event, error)
        return false
      }
    }
  }

  private generateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
  }

  public verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret)
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  }

  private startDeliveryProcessor(): void {
    setInterval(async () => {
      const now = new Date()
      
      for (const [eventId, event] of this.deliveryQueue.entries()) {
        if (event.status === 'pending' || (event.status === 'failed' && event.nextRetry && event.nextRetry <= now)) {
          const delivered = await this.deliverWebhook(event)
          
          if (delivered || event.status === 'dead_letter') {
            this.deliveryQueue.delete(eventId)
          }
        }
      }
    }, 1000) // Check every second
  }

  async getDeliveryStatus(eventId: string): Promise<WebhookEvent | null> {
    return this.deliveryQueue.get(eventId) || null
  }

  async getEndpoints(tenantId: string): Promise<WebhookEndpoint[]> {
    return this.endpoints.get(tenantId) || []
  }

  async getDeliveryStats(tenantId: string): Promise<{
    total: number
    delivered: number
    failed: number
    pending: number
    deadLetter: number
  }> {
    const events = Array.from(this.deliveryQueue.values()).filter(e => e.tenantId === tenantId)
    
    return {
      total: events.length,
      delivered: events.filter(e => e.status === 'delivered').length,
      failed: events.filter(e => e.status === 'failed').length,
      pending: events.filter(e => e.status === 'pending').length,
      deadLetter: events.filter(e => e.status === 'dead_letter').length,
    }
  }
}

export const webhookDelivery = new WebhookDeliveryService()