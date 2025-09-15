import { Router, Request, Response } from 'express'
import { z } from 'zod'
import crypto from 'crypto'
import { webhookSystem } from './webhook-system'
import { requireAuth, requirePermission } from '@bizbox/core-auth'
import { validateRequest } from '../middleware/validation'

const router = Router()

const CreateWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  secret: z.string().min(8).optional(),
})

const UpdateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string()).min(1).optional(),
  active: z.boolean().optional(),
})

// Create webhook endpoint
router.post('/webhooks',
  requireAuth,
  requirePermission('webhooks:create'),
  validateRequest({ body: CreateWebhookSchema }),
  async (req: Request, res: Response) => {
    try {
      const { url, events, secret } = req.body
      const tenantId = req.user.tenantId

      const endpoint = await webhookSystem.registerEndpoint({
        tenantId,
        url,
        events,
        secret: secret || crypto.randomBytes(32).toString('hex'),
        active: true,
        retryConfig: {
          maxRetries: 3,
          backoffMultiplier: 2,
          maxBackoffMs: 60000
        }
      })

      res.status(201).json({
        success: true,
        data: {
          id: endpoint.id,
          url: endpoint.url,
          events: endpoint.events,
          active: endpoint.active,
          createdAt: endpoint.createdAt,
        }
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create webhook'
      })
    }
  }
)

// List webhook endpoints
router.get('/webhooks',
  requireAuth,
  requirePermission('webhooks:read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.user.tenantId
      const endpoints = await webhookSystem.getEndpointsByTenant(tenantId)

      res.json({
        success: true,
        data: endpoints.map(endpoint => ({
          id: endpoint.id,
          url: endpoint.url,
          events: endpoint.events,
          active: endpoint.active,
          createdAt: endpoint.createdAt,
          updatedAt: endpoint.updatedAt,
        }))
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch webhooks'
      })
    }
  }
)

// Update webhook endpoint
router.put('/webhooks/:id',
  requireAuth,
  requirePermission('webhooks:update'),
  validateRequest({ body: UpdateWebhookSchema }),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      const updates = req.body

      const endpoint = await webhookSystem.updateEndpoint(id, updates)
      
      if (!endpoint) {
        return res.status(404).json({
          success: false,
          error: 'Webhook endpoint not found'
        })
      }

      res.json({
        success: true,
        data: {
          id: endpoint.id,
          url: endpoint.url,
          events: endpoint.events,
          active: endpoint.active,
          updatedAt: endpoint.updatedAt,
        }
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update webhook'
      })
    }
  }
)

// Delete webhook endpoint
router.delete('/webhooks/:id',
  requireAuth,
  requirePermission('webhooks:delete'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      const deleted = await webhookSystem.deleteEndpoint(id)
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Webhook endpoint not found'
        })
      }

      res.json({
        success: true,
        message: 'Webhook endpoint deleted successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete webhook'
      })
    }
  }
)

// Get webhook delivery history
router.get('/webhooks/:id/deliveries',
  requireAuth,
  requirePermission('webhooks:read'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      const { limit = 50, offset = 0 } = req.query
      
      const deliveries = await webhookSystem.getDeliveryHistory(id, {
        limit: Number(limit),
        offset: Number(offset),
      })

      res.json({
        success: true,
        data: deliveries
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch webhook deliveries'
      })
    }
  }
)

// Get webhook delivery status
router.get('/webhooks/deliveries/:deliveryId',
  requireAuth,
  requirePermission('webhooks:read'),
  async (req: Request, res: Response) => {
    try {
      const { deliveryId } = req.params
      const delivery = await webhookSystem.getDeliveryStatus(deliveryId)
      
      if (!delivery) {
        return res.status(404).json({
          success: false,
          error: 'Webhook delivery not found'
        })
      }

      res.json({
        success: true,
        data: delivery
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch webhook delivery'
      })
    }
  }
)

// Test webhook endpoint
router.post('/webhooks/:id/test',
  requireAuth,
  requirePermission('webhooks:create'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      
      const result = await webhookSystem.testEndpoint(id)

      res.json({
        success: result.success,
        data: result
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test webhook'
      })
    }
  }
)

// Retry webhook delivery
router.post('/webhooks/deliveries/:deliveryId/retry',
  requireAuth,
  requirePermission('webhooks:create'),
  async (req: Request, res: Response) => {
    try {
      const { deliveryId } = req.params
      
      const success = await webhookSystem.retryDelivery(deliveryId)

      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Webhook delivery not found or cannot be retried'
        })
      }

      res.json({
        success: true,
        message: 'Webhook delivery retry scheduled'
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retry webhook delivery'
      })
    }
  }
)

export default router