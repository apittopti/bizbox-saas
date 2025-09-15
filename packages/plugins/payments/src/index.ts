import { BasePlugin } from '@bizbox/core-framework';
import type { PluginContext, PluginManifest } from '@bizbox/core-framework';
import { stripeIntegration } from './stripe-integration';
import { paymentManager } from './payment-manager';
import { paymentWebhookIntegration } from './webhook-integration';
import stripeRoutes from './api/stripe-routes';
import paymentManagementRoutes from './api/payment-management-routes';

const manifest: PluginManifest = {
  id: 'payments',
  name: 'Payments Plugin',
  version: '1.0.0',
  description: 'Stripe payment integration for BizBox platform',
  dependencies: {},
  routes: [
    { path: '/api/payments/stripe', router: stripeRoutes },
    { path: '/api/payments/management', router: paymentManagementRoutes }
  ]
};

export class PaymentsPlugin extends BasePlugin {
  private routeHandlers: Map<string, any> = new Map();
  private webhookHandlers: Map<string, (payload: any, signature: string) => Promise<any>> = new Map();

  constructor() {
    super(manifest);
  }

  async initialize(context: PluginContext) {
    this.context = context;
    
    // Store route handlers for later use
    this.routeHandlers.set('/api/payments/stripe', stripeRoutes);
    this.routeHandlers.set('/api/payments/management', paymentManagementRoutes);

    // Store webhook handler
    this.webhookHandlers.set('stripe', async (payload: any, signature: string) => {
      const result = await stripeIntegration.handleWebhook(payload, signature);
      
      // Process webhooks through the webhook integration system
      if (result.success && result.event) {
        await paymentWebhookIntegration.processStripeWebhook(result.event);
      }
      
      return result;
    });

    // Register payment webhook events
    paymentWebhookIntegration.registerPaymentWebhookEvents();

    // Subscribe to events using the event bus
    this.subscribeToEvent('booking.created', this.handleBookingCreated.bind(this));
    this.subscribeToEvent('subscription.payment_due', this.handleSubscriptionPaymentDue.bind(this));
    this.subscribeToEvent('payment.failed', this.handlePaymentFailed.bind(this));
    this.subscribeToEvent('refund.requested', this.handleRefundRequested.bind(this));

    console.log('Payments plugin initialized successfully');
  }

  async destroy() {
    // Cleanup resources if needed
    this.routeHandlers.clear();
    this.webhookHandlers.clear();
    console.log('Payments plugin destroyed');
  }

  // Helper methods for accessing stored handlers
  registerRoutes(path: string, router: any) {
    this.routeHandlers.set(path, router);
  }

  registerWebhookHandler(name: string, handler: (payload: any, signature: string) => Promise<any>) {
    this.webhookHandlers.set(name, handler);
  }

  private async handleBookingCreated(data: any) {
    // Handle booking creation - could trigger payment intent creation
    console.log('Booking created, payment processing available:', data.bookingId);
    
    // Trigger webhook for booking creation
    await paymentWebhookIntegration.triggerPaymentWebhook(
      data.tenantId,
      'booking.payment_available',
      {
        bookingId: data.bookingId,
        customerId: data.customerId,
        serviceId: data.serviceId,
        totalAmount: data.totalAmount,
      }
    );
  }

  private async handleSubscriptionPaymentDue(data: any) {
    // Handle subscription payment due notifications
    console.log('Subscription payment due:', data.subscriptionId);
    
    // Trigger webhook for subscription payment due
    await paymentWebhookIntegration.triggerPaymentWebhook(
      data.tenantId,
      'subscription.payment_due',
      {
        subscriptionId: data.subscriptionId,
        amount: data.amount,
        dueDate: data.dueDate,
      }
    );
  }

  private async handlePaymentFailed(data: any) {
    // Handle payment failures with retry logic
    console.log('Payment failed, initiating retry logic:', data.paymentId);
    
    // Use payment manager to handle retry logic
    const retryResult = await paymentManager.processPaymentWithRetry(async () => {
      // This would integrate with the actual payment retry mechanism
      return { success: false, error: 'Retry not implemented in demo' };
    });
    
    if (!retryResult.success) {
      // Trigger webhook for payment failure after retries
      await paymentWebhookIntegration.triggerPaymentWebhook(
        data.tenantId,
        'payment.retry_exhausted',
        {
          paymentId: data.paymentId,
          attempts: retryResult.attempts,
          finalError: retryResult.error,
        }
      );
    }
  }

  private async handleRefundRequested(data: any) {
    // Handle refund requests with validation
    console.log('Refund requested:', data.paymentId);
    
    const refundResult = await paymentManager.processRefundWithValidation(
      data.tenantId,
      data.paymentId,
      {
        amount: data.amount,
        reason: data.reason,
        initiatedBy: data.initiatedBy || 'tenant',
        metadata: data.metadata,
      }
    );
    
    if (refundResult.success) {
      await paymentWebhookIntegration.triggerPaymentWebhook(
        data.tenantId,
        'refund.processed',
        {
          paymentId: data.paymentId,
          refundId: refundResult.refund?.id,
          amount: data.amount,
          reason: data.reason,
        }
      );
    }
  }

  // Public API methods for other plugins
  async createBookingPayment(
    tenantId: string,
    bookingId: string,
    customerId: string,
    totalAmount: number,
    options: {
      paymentType: 'deposit' | 'full_payment';
      depositPercentage?: number;
      description?: string;
      metadata?: Record<string, any>;
    }
  ) {
    return await stripeIntegration.createBookingPayment(
      tenantId,
      bookingId,
      customerId,
      totalAmount,
      options
    );
  }

  async processRefund(
    paymentIntentId: string,
    options: {
      amount?: number;
      reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
      initiatedBy: 'platform' | 'tenant';
      tenantId?: string;
      metadata?: Record<string, any>;
    }
  ) {
    return await paymentManager.processRefundWithValidation(
      options.tenantId!,
      paymentIntentId,
      {
        amount: options.amount,
        reason: options.reason,
        initiatedBy: options.initiatedBy,
        metadata: options.metadata,
      }
    );
  }

  async getPaymentAnalytics(tenantId: string, startDate: Date, endDate: Date) {
    return await stripeIntegration.getPaymentAnalytics(tenantId, startDate, endDate);
  }

  async generatePaymentReport(
    tenantId: string,
    options: {
      startDate: Date;
      endDate: Date;
      includeRefunds?: boolean;
      includeFailures?: boolean;
      groupBy?: 'day' | 'week' | 'month';
      format?: 'json' | 'csv';
    }
  ) {
    return await paymentManager.generatePaymentReport(tenantId, options);
  }

  async trackPaymentStatus(
    paymentId: string,
    options?: {
      webhookUrl?: string;
      notificationEmail?: string;
      maxTrackingDuration?: number;
    }
  ) {
    return await paymentManager.trackPaymentStatus(paymentId, options);
  }

  async reconcilePayments(tenantId: string, date: Date) {
    return await paymentManager.reconcilePayments(tenantId, date);
  }

  async createConnectedAccount(
    tenantId: string,
    businessInfo: {
      businessName: string;
      businessType: 'individual' | 'company';
      country: string;
      email: string;
      phone?: string;
      website?: string;
    }
  ) {
    return await stripeIntegration.createConnectedAccount(tenantId, businessInfo);
  }

  async getConnectedAccountStatus(tenantId: string) {
    return await stripeIntegration.getConnectedAccountStatus(tenantId);
  }

  async configureWebhooks(
    tenantId: string,
    config: {
      url: string;
      events: string[];
      secret?: string;
      enabled?: boolean;
    }
  ) {
    return await paymentWebhookIntegration.configurePaymentWebhooks(tenantId, config);
  }
}

// Export the plugin instance
export const paymentsPlugin = new PaymentsPlugin();

// Export types and utilities
export * from './stripe-integration';
export * from './payment-manager';
export * from './webhook-integration';
export { default as stripeRoutes } from './api/stripe-routes';
export { default as paymentManagementRoutes } from './api/payment-management-routes';

// Default export
export default paymentsPlugin;