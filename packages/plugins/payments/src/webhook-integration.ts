import { WebhookSystem } from '@bizbox/core-api';

export interface PaymentWebhookEvent {
  type: string;
  tenantId: string;
  data: any;
  timestamp: Date;
  source: 'stripe' | 'platform';
}

export class PaymentWebhookIntegration {
  private webhookSystem: WebhookSystem;

  constructor(webhookSystem: WebhookSystem) {
    this.webhookSystem = webhookSystem;
  }

  /**
   * Trigger payment-related webhooks (Requirement 26.1)
   */
  async triggerPaymentWebhook(
    tenantId: string,
    eventType: string,
    eventData: any
  ): Promise<string> {
    try {
      const webhookEvent: PaymentWebhookEvent = {
        type: eventType,
        tenantId,
        data: eventData,
        timestamp: new Date(),
        source: 'stripe',
      };

      // Use the existing webhook system to deliver the webhook
      const deliveryId = await this.webhookSystem.triggerWebhook(
        tenantId,
        eventType,
        webhookEvent.data,
        {
          source: 'payments_plugin',
          priority: this.getEventPriority(eventType),
          retryConfig: this.getRetryConfig(eventType),
        }
      );

      // Log webhook trigger for monitoring
      await this.logWebhookTrigger(webhookEvent, deliveryId);

      return deliveryId;

    } catch (error) {
      console.error('Failed to trigger payment webhook:', error);
      throw error;
    }
  }

  /**
   * Handle Stripe webhook events and convert to internal webhooks
   */
  async processStripeWebhook(
    stripeEvent: any,
    tenantId?: string
  ): Promise<string[]> {
    const webhookIds: string[] = [];

    try {
      // Map Stripe events to internal webhook events
      const internalEvents = this.mapStripeEventToInternal(stripeEvent, tenantId);

      for (const event of internalEvents) {
        const webhookId = await this.triggerPaymentWebhook(
          event.tenantId,
          event.type,
          event.data
        );
        webhookIds.push(webhookId);
      }

      return webhookIds;

    } catch (error) {
      console.error('Failed to process Stripe webhook:', error);
      return webhookIds;
    }
  }

  /**
   * Register payment webhook event types
   */
  registerPaymentWebhookEvents(): void {
    const paymentEvents = [
      // Payment events
      'payment.created',
      'payment.succeeded',
      'payment.failed',
      'payment.requires_action',
      'payment.refunded',
      
      // Booking payment events
      'booking.payment_created',
      'booking.payment_succeeded',
      'booking.payment_failed',
      'booking.deposit_received',
      'booking.balance_due',
      'booking.payment_completed',
      
      // Subscription events
      'subscription.created',
      'subscription.updated',
      'subscription.payment_succeeded',
      'subscription.payment_failed',
      'subscription.canceled',
      'subscription.trial_ending',
      
      // Account events
      'account.connected',
      'account.activated',
      'account.deactivated',
      'account.requirements_updated',
      
      // Dispute events
      'payment.dispute_created',
      'payment.dispute_updated',
      'payment.dispute_resolved',
      
      // Platform events
      'platform.fee_collected',
      'platform.payout_processed',
    ];

    // Register each event type with the webhook system
    paymentEvents.forEach(eventType => {
      this.webhookSystem.registerEventType(eventType, {
        description: this.getEventDescription(eventType),
        schema: this.getEventSchema(eventType),
        retryConfig: this.getRetryConfig(eventType),
      });
    });
  }

  /**
   * Create webhook configuration for tenant
   */
  async configurePaymentWebhooks(
    tenantId: string,
    webhookConfig: {
      url: string;
      events: string[];
      secret?: string;
      enabled?: boolean;
    }
  ): Promise<{
    success: boolean;
    webhookId?: string;
    error?: string;
  }> {
    try {
      const webhookId = await this.webhookSystem.createWebhook(tenantId, {
        url: webhookConfig.url,
        events: webhookConfig.events,
        secret: webhookConfig.secret,
        enabled: webhookConfig.enabled !== false,
        metadata: {
          source: 'payments_plugin',
          configuredAt: new Date().toISOString(),
        },
      });

      return {
        success: true,
        webhookId,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to configure webhooks',
      };
    }
  }

  /**
   * Get webhook delivery status and analytics
   */
  async getWebhookAnalytics(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    averageDeliveryTime: number;
    topEvents: Array<{ eventType: string; count: number }>;
    failureReasons: Array<{ reason: string; count: number }>;
  }> {
    // Get webhook analytics from the webhook system
    const analytics = await this.webhookSystem.getWebhookAnalytics(
      tenantId,
      startDate,
      endDate,
      { source: 'payments_plugin' }
    );

    return {
      totalDeliveries: analytics.totalAttempts,
      successfulDeliveries: analytics.successfulDeliveries,
      failedDeliveries: analytics.failedDeliveries,
      averageDeliveryTime: analytics.averageDeliveryTime,
      topEvents: analytics.eventTypeBreakdown,
      failureReasons: analytics.failureReasons,
    };
  }

  // Private helper methods

  private mapStripeEventToInternal(
    stripeEvent: any,
    tenantId?: string
  ): PaymentWebhookEvent[] {
    const events: PaymentWebhookEvent[] = [];
    const eventTenantId = tenantId || stripeEvent.data?.object?.metadata?.tenantId;

    if (!eventTenantId) {
      return events;
    }

    switch (stripeEvent.type) {
      case 'payment_intent.succeeded':
        events.push({
          type: 'payment.succeeded',
          tenantId: eventTenantId,
          data: {
            paymentIntentId: stripeEvent.data.object.id,
            amount: stripeEvent.data.object.amount,
            currency: stripeEvent.data.object.currency,
            customerId: stripeEvent.data.object.customer,
            metadata: stripeEvent.data.object.metadata,
          },
          timestamp: new Date(stripeEvent.created * 1000),
          source: 'stripe',
        });

        // Check if this is a booking payment
        if (stripeEvent.data.object.metadata?.bookingId) {
          events.push({
            type: 'booking.payment_succeeded',
            tenantId: eventTenantId,
            data: {
              bookingId: stripeEvent.data.object.metadata.bookingId,
              paymentType: stripeEvent.data.object.metadata.paymentType,
              amount: stripeEvent.data.object.amount,
              paymentIntentId: stripeEvent.data.object.id,
            },
            timestamp: new Date(stripeEvent.created * 1000),
            source: 'stripe',
          });
        }
        break;

      case 'payment_intent.payment_failed':
        events.push({
          type: 'payment.failed',
          tenantId: eventTenantId,
          data: {
            paymentIntentId: stripeEvent.data.object.id,
            amount: stripeEvent.data.object.amount,
            currency: stripeEvent.data.object.currency,
            failureReason: stripeEvent.data.object.last_payment_error?.message,
            failureCode: stripeEvent.data.object.last_payment_error?.code,
          },
          timestamp: new Date(stripeEvent.created * 1000),
          source: 'stripe',
        });
        break;

      case 'invoice.payment_succeeded':
        if (stripeEvent.data.object.subscription) {
          events.push({
            type: 'subscription.payment_succeeded',
            tenantId: eventTenantId,
            data: {
              subscriptionId: stripeEvent.data.object.subscription,
              invoiceId: stripeEvent.data.object.id,
              amount: stripeEvent.data.object.amount_paid,
              periodStart: new Date(stripeEvent.data.object.period_start * 1000),
              periodEnd: new Date(stripeEvent.data.object.period_end * 1000),
            },
            timestamp: new Date(stripeEvent.created * 1000),
            source: 'stripe',
          });
        }
        break;

      case 'customer.subscription.updated':
        events.push({
          type: 'subscription.updated',
          tenantId: eventTenantId,
          data: {
            subscriptionId: stripeEvent.data.object.id,
            status: stripeEvent.data.object.status,
            currentPeriodStart: new Date(stripeEvent.data.object.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeEvent.data.object.current_period_end * 1000),
            cancelAtPeriodEnd: stripeEvent.data.object.cancel_at_period_end,
          },
          timestamp: new Date(stripeEvent.created * 1000),
          source: 'stripe',
        });
        break;

      case 'account.updated':
        events.push({
          type: 'account.requirements_updated',
          tenantId: eventTenantId,
          data: {
            accountId: stripeEvent.data.object.id,
            chargesEnabled: stripeEvent.data.object.charges_enabled,
            payoutsEnabled: stripeEvent.data.object.payouts_enabled,
            requirements: stripeEvent.data.object.requirements?.currently_due || [],
          },
          timestamp: new Date(stripeEvent.created * 1000),
          source: 'stripe',
        });
        break;

      case 'charge.dispute.created':
        events.push({
          type: 'payment.dispute_created',
          tenantId: eventTenantId,
          data: {
            disputeId: stripeEvent.data.object.id,
            chargeId: stripeEvent.data.object.charge,
            amount: stripeEvent.data.object.amount,
            reason: stripeEvent.data.object.reason,
            status: stripeEvent.data.object.status,
            evidenceDueBy: stripeEvent.data.object.evidence_details?.due_by,
          },
          timestamp: new Date(stripeEvent.created * 1000),
          source: 'stripe',
        });
        break;
    }

    return events;
  }

  private getEventPriority(eventType: string): 'high' | 'medium' | 'low' {
    const highPriorityEvents = [
      'payment.failed',
      'payment.dispute_created',
      'subscription.payment_failed',
      'account.deactivated',
    ];

    const mediumPriorityEvents = [
      'payment.succeeded',
      'booking.payment_succeeded',
      'subscription.payment_succeeded',
    ];

    if (highPriorityEvents.includes(eventType)) return 'high';
    if (mediumPriorityEvents.includes(eventType)) return 'medium';
    return 'low';
  }

  private getRetryConfig(eventType: string): any {
    const criticalEvents = [
      'payment.succeeded',
      'payment.failed',
      'subscription.payment_succeeded',
      'subscription.payment_failed',
    ];

    if (criticalEvents.includes(eventType)) {
      return {
        maxRetries: 5,
        backoffMultiplier: 2,
        maxDelay: 300000, // 5 minutes
      };
    }

    return {
      maxRetries: 3,
      backoffMultiplier: 1.5,
      maxDelay: 60000, // 1 minute
    };
  }

  private getEventDescription(eventType: string): string {
    const descriptions: Record<string, string> = {
      'payment.succeeded': 'Payment was successfully processed',
      'payment.failed': 'Payment processing failed',
      'payment.requires_action': 'Payment requires additional customer action',
      'payment.refunded': 'Payment was refunded',
      'booking.payment_succeeded': 'Booking payment was successful',
      'booking.payment_failed': 'Booking payment failed',
      'booking.deposit_received': 'Booking deposit was received',
      'subscription.created': 'New subscription was created',
      'subscription.updated': 'Subscription was updated',
      'subscription.payment_succeeded': 'Subscription payment was successful',
      'subscription.payment_failed': 'Subscription payment failed',
      'subscription.canceled': 'Subscription was canceled',
      'account.connected': 'Payment account was connected',
      'account.activated': 'Payment account was activated',
      'account.deactivated': 'Payment account was deactivated',
      'payment.dispute_created': 'Payment dispute was created',
    };

    return descriptions[eventType] || 'Payment-related event';
  }

  private getEventSchema(eventType: string): any {
    // Return JSON schema for event validation
    // This is a simplified example - in practice, each event would have a detailed schema
    return {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
        data: { type: 'object' },
      },
      required: ['tenantId', 'timestamp', 'data'],
    };
  }

  private async logWebhookTrigger(
    event: PaymentWebhookEvent,
    deliveryId: string
  ): Promise<void> {
    console.log('Payment webhook triggered:', {
      eventType: event.type,
      tenantId: event.tenantId,
      deliveryId,
      timestamp: event.timestamp,
    });
  }
}

// Export singleton instance
export const paymentWebhookIntegration = new PaymentWebhookIntegration(
  new WebhookSystem() // This would be injected in a real implementation
);