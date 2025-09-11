import Stripe from 'stripe';
import { z } from 'zod';

export interface PaymentIntent {
  id: string;
  tenantId: string;
  customerId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethodId?: string;
  stripePaymentIntentId: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConnectedAccount {
  id: string;
  tenantId: string;
  stripeAccountId: string;
  isActive: boolean;
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirements: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

export interface CreatePaymentIntentOptions {
  tenantId: string;
  amount: number;
  currency?: string;
  customerId?: string;
  paymentMethodId?: string;
  description?: string;
  metadata?: Record<string, any>;
  captureMethod?: 'automatic' | 'manual';
  confirmationMethod?: 'automatic' | 'manual';
  applicationFeeAmount?: number; // Platform fee
}

export interface RefundOptions {
  paymentIntentId: string;
  amount?: number; // Partial refund if specified
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  metadata?: Record<string, any>;
}

export const paymentIntentSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  amount: z.number().min(50), // Minimum 50p
  currency: z.string().length(3).default('GBP'),
  status: z.nativeEnum(PaymentStatus),
  paymentMethodId: z.string().optional(),
  stripePaymentIntentId: z.string(),
  metadata: z.record(z.any()).default({}),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export interface PlatformSubscription {
  id: string;
  tenantId: string;
  planId: string;
  status: 'active' | 'past_due' | 'canceled' | 'incomplete';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingPayment {
  id: string;
  tenantId: string;
  bookingId: string;
  customerId: string;
  amount: number;
  depositAmount?: number;
  paymentType: 'deposit' | 'full_payment' | 'remaining_balance';
  status: PaymentStatus;
  stripePaymentIntentId: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export class StripeIntegration {
  private stripe: Stripe;
  private platformStripe: Stripe;
  private paymentIntents: Map<string, PaymentIntent> = new Map();
  private connectedAccounts: Map<string, ConnectedAccount> = new Map();
  private platformSubscriptions: Map<string, PlatformSubscription> = new Map();
  private bookingPayments: Map<string, BookingPayment> = new Map();
  private webhookSecret: string;

  constructor(
    platformSecretKey: string,
    webhookSecret: string
  ) {
    this.platformStripe = new Stripe(platformSecretKey);
    this.stripe = this.platformStripe; // Default to platform stripe
    this.webhookSecret = webhookSecret;
  }

  /**
   * Create platform subscription for tenant (Requirement 15.1)
   */
  async createPlatformSubscription(
    tenantId: string,
    planId: string,
    customerInfo: {
      email: string;
      name: string;
      businessName: string;
    },
    paymentMethodId?: string
  ): Promise<{
    success: boolean;
    subscription?: PlatformSubscription;
    clientSecret?: string;
    error?: string;
  }> {
    try {
      // Create or retrieve Stripe customer for the tenant
      let customer: Stripe.Customer;
      
      // Check if customer already exists
      const existingCustomers = await this.platformStripe.customers.list({
        email: customerInfo.email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
      } else {
        customer = await this.platformStripe.customers.create({
          email: customerInfo.email,
          name: customerInfo.name,
          metadata: {
            tenantId,
            businessName: customerInfo.businessName,
          },
        });
      }

      // Attach payment method if provided
      if (paymentMethodId) {
        await this.platformStripe.paymentMethods.attach(paymentMethodId, {
          customer: customer.id,
        });

        // Set as default payment method
        await this.platformStripe.customers.update(customer.id, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });
      }

      // Create subscription
      const subscription = await this.platformStripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: planId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          tenantId,
          businessName: customerInfo.businessName,
        },
      });

      // Create internal subscription record
      const platformSubscription: PlatformSubscription = {
        id: this.generateId(),
        tenantId,
        planId,
        status: subscription.status as any,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: customer.id,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.platformSubscriptions.set(platformSubscription.id, platformSubscription);

      const invoice = subscription.latest_invoice as Stripe.Invoice;
      const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent;

      return {
        success: true,
        subscription: platformSubscription,
        clientSecret: paymentIntent?.client_secret || undefined,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create platform subscription',
      };
    }
  }

  /**
   * Update platform subscription
   */
  async updatePlatformSubscription(
    tenantId: string,
    newPlanId: string
  ): Promise<{
    success: boolean;
    subscription?: PlatformSubscription;
    error?: string;
  }> {
    try {
      const subscription = Array.from(this.platformSubscriptions.values()).find(
        sub => sub.tenantId === tenantId && sub.status === 'active'
      );

      if (!subscription) {
        return { success: false, error: 'No active subscription found' };
      }

      // Update Stripe subscription
      const updatedStripeSubscription = await this.platformStripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        {
          items: [{
            id: (await this.platformStripe.subscriptions.retrieve(subscription.stripeSubscriptionId)).items.data[0].id,
            price: newPlanId,
          }],
          proration_behavior: 'create_prorations',
        }
      );

      // Update internal record
      const updatedSubscription: PlatformSubscription = {
        ...subscription,
        planId: newPlanId,
        status: updatedStripeSubscription.status as any,
        currentPeriodStart: new Date(updatedStripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(updatedStripeSubscription.current_period_end * 1000),
        updatedAt: new Date(),
      };

      this.platformSubscriptions.set(subscription.id, updatedSubscription);

      return {
        success: true,
        subscription: updatedSubscription,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update subscription',
      };
    }
  }

  /**
   * Cancel platform subscription
   */
  async cancelPlatformSubscription(
    tenantId: string,
    immediately: boolean = false
  ): Promise<{
    success: boolean;
    subscription?: PlatformSubscription;
    error?: string;
  }> {
    try {
      const subscription = Array.from(this.platformSubscriptions.values()).find(
        sub => sub.tenantId === tenantId && sub.status === 'active'
      );

      if (!subscription) {
        return { success: false, error: 'No active subscription found' };
      }

      // Cancel Stripe subscription
      const canceledSubscription = immediately
        ? await this.platformStripe.subscriptions.cancel(subscription.stripeSubscriptionId)
        : await this.platformStripe.subscriptions.update(subscription.stripeSubscriptionId, {
            cancel_at_period_end: true,
          });

      // Update internal record
      const updatedSubscription: PlatformSubscription = {
        ...subscription,
        status: canceledSubscription.status as any,
        updatedAt: new Date(),
      };

      this.platformSubscriptions.set(subscription.id, updatedSubscription);

      return {
        success: true,
        subscription: updatedSubscription,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel subscription',
      };
    }
  }

  /**
   * Create Stripe Connect account for tenant (Requirement 15.2)
   */
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
  ): Promise<{
    success: boolean;
    account?: ConnectedAccount;
    onboardingUrl?: string;
    error?: string;
  }> {
    try {
      // Create Stripe Connect account
      const account = await this.platformStripe.accounts.create({
        type: 'express',
        country: businessInfo.country,
        email: businessInfo.email,
        business_type: businessInfo.businessType,
        company: businessInfo.businessType === 'company' ? {
          name: businessInfo.businessName,
          phone: businessInfo.phone,
        } : undefined,
        individual: businessInfo.businessType === 'individual' ? {
          email: businessInfo.email,
          phone: businessInfo.phone,
        } : undefined,
        business_profile: {
          name: businessInfo.businessName,
          url: businessInfo.website,
          support_email: businessInfo.email,
          support_phone: businessInfo.phone,
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          tenantId,
        },
      });

      // Create onboarding link
      const accountLink = await this.platformStripe.accountLinks.create({
        account: account.id,
        refresh_url: `${process.env.FRONTEND_URL}/settings/payments/refresh`,
        return_url: `${process.env.FRONTEND_URL}/settings/payments/success`,
        type: 'account_onboarding',
      });

      // Store connected account
      const connectedAccount: ConnectedAccount = {
        id: this.generateId(),
        tenantId,
        stripeAccountId: account.id,
        isActive: false,
        onboardingComplete: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        requirements: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.connectedAccounts.set(connectedAccount.id, connectedAccount);

      return {
        success: true,
        account: connectedAccount,
        onboardingUrl: accountLink.url,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create connected account',
      };
    }
  }

  /**
   * Get connected account status
   */
  async getConnectedAccountStatus(tenantId: string): Promise<ConnectedAccount | null> {
    const account = Array.from(this.connectedAccounts.values()).find(
      acc => acc.tenantId === tenantId
    );

    if (!account) {
      return null;
    }

    try {
      // Fetch latest status from Stripe
      const stripeAccount = await this.platformStripe.accounts.retrieve(account.stripeAccountId);

      // Update account status
      const updatedAccount: ConnectedAccount = {
        ...account,
        isActive: stripeAccount.charges_enabled && stripeAccount.payouts_enabled,
        onboardingComplete: stripeAccount.details_submitted,
        chargesEnabled: stripeAccount.charges_enabled,
        payoutsEnabled: stripeAccount.payouts_enabled,
        requirements: stripeAccount.requirements?.currently_due || [],
        updatedAt: new Date(),
      };

      this.connectedAccounts.set(account.id, updatedAccount);
      return updatedAccount;

    } catch (error) {
      console.error('Error fetching connected account status:', error);
      return account;
    }
  }

  /**
   * Create booking payment with deposit support (Requirement 15.4)
   */
  async createBookingPayment(
    tenantId: string,
    bookingId: string,
    customerId: string,
    totalAmount: number,
    options: {
      paymentType: 'deposit' | 'full_payment';
      depositPercentage?: number; // Default 20%
      description?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<{
    success: boolean;
    bookingPayment?: BookingPayment;
    clientSecret?: string;
    error?: string;
  }> {
    try {
      // Get connected account for tenant
      const connectedAccount = Array.from(this.connectedAccounts.values()).find(
        acc => acc.tenantId === tenantId && acc.isActive
      );

      if (!connectedAccount) {
        return {
          success: false,
          error: 'No active payment account found for tenant',
        };
      }

      // Calculate payment amount
      const depositPercentage = options.depositPercentage || 0.2; // 20% default
      const paymentAmount = options.paymentType === 'deposit' 
        ? Math.round(totalAmount * depositPercentage)
        : totalAmount;

      // Calculate platform fee (2.9% + 30p)
      const platformFeeAmount = Math.round(paymentAmount * 0.029) + 30;

      // Create Stripe payment intent through connected account
      const stripePaymentIntent = await this.platformStripe.paymentIntents.create({
        amount: paymentAmount,
        currency: 'gbp',
        customer: customerId,
        description: options.description || `Booking payment - ${options.paymentType}`,
        metadata: {
          tenantId,
          bookingId,
          paymentType: options.paymentType,
          totalAmount: totalAmount.toString(),
          ...options.metadata,
        },
        application_fee_amount: platformFeeAmount,
        transfer_data: {
          destination: connectedAccount.stripeAccountId,
        },
      });

      // Create internal booking payment record
      const bookingPayment: BookingPayment = {
        id: this.generateId(),
        tenantId,
        bookingId,
        customerId,
        amount: paymentAmount,
        depositAmount: options.paymentType === 'deposit' ? paymentAmount : undefined,
        paymentType: options.paymentType,
        status: this.mapStripeStatus(stripePaymentIntent.status),
        stripePaymentIntentId: stripePaymentIntent.id,
        metadata: options.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.bookingPayments.set(bookingPayment.id, bookingPayment);

      return {
        success: true,
        bookingPayment,
        clientSecret: stripePaymentIntent.client_secret || undefined,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create booking payment',
      };
    }
  }

  /**
   * Process remaining balance payment for booking
   */
  async processRemainingBalance(
    tenantId: string,
    bookingId: string,
    customerId: string
  ): Promise<{
    success: boolean;
    bookingPayment?: BookingPayment;
    clientSecret?: string;
    error?: string;
  }> {
    try {
      // Find the original deposit payment
      const depositPayment = Array.from(this.bookingPayments.values()).find(
        payment => payment.tenantId === tenantId && 
                  payment.bookingId === bookingId && 
                  payment.paymentType === 'deposit' &&
                  payment.status === PaymentStatus.SUCCEEDED
      );

      if (!depositPayment || !depositPayment.depositAmount) {
        return {
          success: false,
          error: 'No successful deposit payment found for this booking',
        };
      }

      // Calculate remaining amount from metadata
      const totalAmount = parseInt(depositPayment.metadata.totalAmount || '0');
      const remainingAmount = totalAmount - depositPayment.depositAmount;

      if (remainingAmount <= 0) {
        return {
          success: false,
          error: 'No remaining balance to pay',
        };
      }

      // Get connected account for tenant
      const connectedAccount = Array.from(this.connectedAccounts.values()).find(
        acc => acc.tenantId === tenantId && acc.isActive
      );

      if (!connectedAccount) {
        return {
          success: false,
          error: 'No active payment account found for tenant',
        };
      }

      // Calculate platform fee
      const platformFeeAmount = Math.round(remainingAmount * 0.029) + 30;

      // Create payment intent for remaining balance
      const stripePaymentIntent = await this.platformStripe.paymentIntents.create({
        amount: remainingAmount,
        currency: 'gbp',
        customer: customerId,
        description: `Booking payment - remaining balance`,
        metadata: {
          tenantId,
          bookingId,
          paymentType: 'remaining_balance',
          originalDepositPaymentId: depositPayment.id,
        },
        application_fee_amount: platformFeeAmount,
        transfer_data: {
          destination: connectedAccount.stripeAccountId,
        },
      });

      // Create internal booking payment record
      const bookingPayment: BookingPayment = {
        id: this.generateId(),
        tenantId,
        bookingId,
        customerId,
        amount: remainingAmount,
        paymentType: 'remaining_balance',
        status: this.mapStripeStatus(stripePaymentIntent.status),
        stripePaymentIntentId: stripePaymentIntent.id,
        metadata: {
          originalDepositPaymentId: depositPayment.id,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.bookingPayments.set(bookingPayment.id, bookingPayment);

      return {
        success: true,
        bookingPayment,
        clientSecret: stripePaymentIntent.client_secret || undefined,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process remaining balance',
      };
    }
  }

  /**
   * Create payment intent (Requirement 15.3)
   */
  async createPaymentIntent(
    options: CreatePaymentIntentOptions
  ): Promise<{
    success: boolean;
    paymentIntent?: PaymentIntent;
    clientSecret?: string;
    error?: string;
  }> {
    try {
      // Get connected account for tenant
      const connectedAccount = Array.from(this.connectedAccounts.values()).find(
        acc => acc.tenantId === options.tenantId && acc.isActive
      );

      if (!connectedAccount) {
        return {
          success: false,
          error: 'No active payment account found for tenant',
        };
      }

      // Calculate application fee (platform commission)
      const applicationFeeAmount = options.applicationFeeAmount || 
        Math.round(options.amount * 0.029); // 2.9% platform fee

      // Create Stripe payment intent
      const stripePaymentIntent = await this.platformStripe.paymentIntents.create({
        amount: options.amount,
        currency: options.currency || 'gbp',
        customer: options.customerId,
        payment_method: options.paymentMethodId,
        description: options.description,
        metadata: {
          tenantId: options.tenantId,
          ...options.metadata,
        },
        capture_method: options.captureMethod || 'automatic',
        confirmation_method: options.confirmationMethod || 'automatic',
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: connectedAccount.stripeAccountId,
        },
      });

      // Create internal payment intent record
      const paymentIntent: PaymentIntent = {
        id: this.generateId(),
        tenantId: options.tenantId,
        customerId: options.customerId,
        amount: options.amount,
        currency: options.currency || 'GBP',
        status: this.mapStripeStatus(stripePaymentIntent.status),
        paymentMethodId: options.paymentMethodId,
        stripePaymentIntentId: stripePaymentIntent.id,
        metadata: options.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.paymentIntents.set(paymentIntent.id, paymentIntent);

      return {
        success: true,
        paymentIntent,
        clientSecret: stripePaymentIntent.client_secret || undefined,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment intent',
      };
    }
  }

  /**
   * Confirm payment intent
   */
  async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId?: string
  ): Promise<{
    success: boolean;
    paymentIntent?: PaymentIntent;
    error?: string;
  }> {
    try {
      const paymentIntent = this.paymentIntents.get(paymentIntentId);
      if (!paymentIntent) {
        return { success: false, error: 'Payment intent not found' };
      }

      // Confirm with Stripe
      const stripePaymentIntent = await this.platformStripe.paymentIntents.confirm(
        paymentIntent.stripePaymentIntentId,
        paymentMethodId ? { payment_method: paymentMethodId } : undefined
      );

      // Update internal record
      const updatedPaymentIntent: PaymentIntent = {
        ...paymentIntent,
        status: this.mapStripeStatus(stripePaymentIntent.status),
        paymentMethodId: paymentMethodId || paymentIntent.paymentMethodId,
        updatedAt: new Date(),
      };

      this.paymentIntents.set(paymentIntentId, updatedPaymentIntent);

      return {
        success: true,
        paymentIntent: updatedPaymentIntent,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to confirm payment',
      };
    }
  }

  /**
   * Process refund for platform and tenant payments (Requirements 15.6)
   */
  async processRefund(
    options: RefundOptions & {
      initiatedBy: 'platform' | 'tenant';
      tenantId?: string;
    }
  ): Promise<{
    success: boolean;
    refund?: any;
    error?: string;
  }> {
    try {
      // Check if it's a booking payment or regular payment intent
      const bookingPayment = Array.from(this.bookingPayments.values()).find(
        bp => bp.stripePaymentIntentId === options.paymentIntentId
      );

      const paymentIntent = this.paymentIntents.get(options.paymentIntentId);

      if (!bookingPayment && !paymentIntent) {
        return { success: false, error: 'Payment not found' };
      }

      const targetPayment = bookingPayment || paymentIntent;
      if (!targetPayment || targetPayment.status !== PaymentStatus.SUCCEEDED) {
        return { success: false, error: 'Payment must be succeeded to refund' };
      }

      // Validate refund permissions
      if (options.initiatedBy === 'tenant' && bookingPayment) {
        if (bookingPayment.tenantId !== options.tenantId) {
          return { success: false, error: 'Unauthorized: Cannot refund payment for different tenant' };
        }
      }

      // Create refund with Stripe
      const refundData: Stripe.RefundCreateParams = {
        payment_intent: targetPayment.stripePaymentIntentId,
        amount: options.amount,
        reason: options.reason,
        metadata: {
          initiatedBy: options.initiatedBy,
          tenantId: options.tenantId || '',
          ...options.metadata,
        },
      };

      // For connected account payments, specify the account
      if (bookingPayment) {
        const connectedAccount = Array.from(this.connectedAccounts.values()).find(
          acc => acc.tenantId === bookingPayment.tenantId
        );
        if (connectedAccount) {
          // Refund will be processed through the connected account
          refundData.reverse_transfer = true;
        }
      }

      const refund = await this.platformStripe.refunds.create(refundData);

      // Update payment status
      const refundAmount = options.amount || targetPayment.amount;
      const updatedStatus = refundAmount < targetPayment.amount
        ? PaymentStatus.PARTIALLY_REFUNDED
        : PaymentStatus.REFUNDED;

      if (bookingPayment) {
        const updatedBookingPayment: BookingPayment = {
          ...bookingPayment,
          status: updatedStatus,
          updatedAt: new Date(),
        };
        this.bookingPayments.set(bookingPayment.id, updatedBookingPayment);
      } else if (paymentIntent) {
        const updatedPaymentIntent: PaymentIntent = {
          ...paymentIntent,
          status: updatedStatus,
          updatedAt: new Date(),
        };
        this.paymentIntents.set(options.paymentIntentId, updatedPaymentIntent);
      }

      return {
        success: true,
        refund,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process refund',
      };
    }
  }

  /**
   * Process platform subscription refund
   */
  async processSubscriptionRefund(
    tenantId: string,
    amount?: number,
    reason?: string
  ): Promise<{
    success: boolean;
    refund?: any;
    error?: string;
  }> {
    try {
      const subscription = Array.from(this.platformSubscriptions.values()).find(
        sub => sub.tenantId === tenantId
      );

      if (!subscription) {
        return { success: false, error: 'Subscription not found' };
      }

      // Get the latest invoice for the subscription
      const invoices = await this.platformStripe.invoices.list({
        subscription: subscription.stripeSubscriptionId,
        limit: 1,
      });

      if (invoices.data.length === 0) {
        return { success: false, error: 'No invoices found for subscription' };
      }

      const latestInvoice = invoices.data[0];
      if (!latestInvoice.payment_intent) {
        return { success: false, error: 'No payment intent found for latest invoice' };
      }

      // Create refund for the subscription payment
      const refund = await this.platformStripe.refunds.create({
        payment_intent: latestInvoice.payment_intent as string,
        amount,
        reason: reason as any,
        metadata: {
          tenantId,
          subscriptionId: subscription.stripeSubscriptionId,
          initiatedBy: 'platform',
        },
      });

      return {
        success: true,
        refund,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process subscription refund',
      };
    }
  }

  /**
   * Handle Stripe webhook with comprehensive event processing (Requirement 26.1)
   */
  async handleWebhook(
    payload: string,
    signature: string,
    webhookSecret?: string
  ): Promise<{
    success: boolean;
    event?: Stripe.Event;
    webhooksTriggered?: string[];
    error?: string;
  }> {
    try {
      const event = this.platformStripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret || this.webhookSecret
      );

      const webhooksTriggered: string[] = [];

      // Handle different event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          webhooksTriggered.push(...await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent));
          break;

        case 'payment_intent.payment_failed':
          webhooksTriggered.push(...await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent));
          break;

        case 'payment_intent.requires_action':
          webhooksTriggered.push(...await this.handlePaymentRequiresAction(event.data.object as Stripe.PaymentIntent));
          break;

        case 'invoice.payment_succeeded':
          webhooksTriggered.push(...await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice));
          break;

        case 'invoice.payment_failed':
          webhooksTriggered.push(...await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice));
          break;

        case 'customer.subscription.updated':
          webhooksTriggered.push(...await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription));
          break;

        case 'customer.subscription.deleted':
          webhooksTriggered.push(...await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription));
          break;

        case 'account.updated':
          webhooksTriggered.push(...await this.handleAccountUpdated(event.data.object as Stripe.Account));
          break;

        case 'charge.dispute.created':
          webhooksTriggered.push(...await this.handleChargeDispute(event.data.object as Stripe.Dispute));
          break;

        case 'charge.refunded':
          webhooksTriggered.push(...await this.handleChargeRefunded(event.data.object as Stripe.Charge));
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return {
        success: true,
        event,
        webhooksTriggered,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Webhook processing failed',
      };
    }
  }

  /**
   * Get comprehensive payment analytics for tenant
   */
  async getPaymentAnalytics(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalRevenue: number;
    totalTransactions: number;
    averageTransactionValue: number;
    successRate: number;
    refundRate: number;
    platformFees: number;
    byStatus: Record<PaymentStatus, number>;
    bookingPayments: {
      totalBookingRevenue: number;
      depositPayments: number;
      fullPayments: number;
      remainingBalancePayments: number;
    };
    subscriptionMetrics: {
      activeSubscriptions: number;
      monthlyRecurringRevenue: number;
      churnRate: number;
    };
  }> {
    // Regular payment intents
    const payments = Array.from(this.paymentIntents.values()).filter(
      p => p.tenantId === tenantId &&
           p.createdAt >= startDate &&
           p.createdAt <= endDate
    );

    // Booking payments
    const bookingPayments = Array.from(this.bookingPayments.values()).filter(
      bp => bp.tenantId === tenantId &&
            bp.createdAt >= startDate &&
            bp.createdAt <= endDate
    );

    // Subscription data
    const subscriptions = Array.from(this.platformSubscriptions.values()).filter(
      sub => sub.tenantId === tenantId
    );

    // Calculate regular payment metrics
    const totalRevenue = payments
      .filter(p => p.status === PaymentStatus.SUCCEEDED)
      .reduce((sum, p) => sum + p.amount, 0);

    const totalTransactions = payments.length;
    const successfulTransactions = payments.filter(p => p.status === PaymentStatus.SUCCEEDED).length;
    const refundedTransactions = payments.filter(p => 
      p.status === PaymentStatus.REFUNDED || p.status === PaymentStatus.PARTIALLY_REFUNDED
    ).length;

    const byStatus = payments.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {} as Record<PaymentStatus, number>);

    // Calculate booking payment metrics
    const totalBookingRevenue = bookingPayments
      .filter(bp => bp.status === PaymentStatus.SUCCEEDED)
      .reduce((sum, bp) => sum + bp.amount, 0);

    const depositPayments = bookingPayments.filter(bp => bp.paymentType === 'deposit').length;
    const fullPayments = bookingPayments.filter(bp => bp.paymentType === 'full_payment').length;
    const remainingBalancePayments = bookingPayments.filter(bp => bp.paymentType === 'remaining_balance').length;

    // Calculate subscription metrics
    const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active').length;
    const monthlyRecurringRevenue = activeSubscriptions * 29.99; // Assuming £29.99 base plan
    const churnRate = 0; // Would need historical data to calculate properly

    return {
      totalRevenue: totalRevenue + totalBookingRevenue,
      totalTransactions: totalTransactions + bookingPayments.length,
      averageTransactionValue: totalTransactions > 0 ? totalRevenue / successfulTransactions : 0,
      successRate: totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0,
      refundRate: successfulTransactions > 0 ? (refundedTransactions / successfulTransactions) * 100 : 0,
      platformFees: (totalRevenue + totalBookingRevenue) * 0.029, // 2.9% platform fee
      byStatus,
      bookingPayments: {
        totalBookingRevenue,
        depositPayments,
        fullPayments,
        remainingBalancePayments,
      },
      subscriptionMetrics: {
        activeSubscriptions,
        monthlyRecurringRevenue,
        churnRate,
      },
    };
  }

  /**
   * Get payment status with retry logic
   */
  async getPaymentStatus(
    paymentIntentId: string,
    maxRetries: number = 3
  ): Promise<{
    success: boolean;
    status?: PaymentStatus;
    error?: string;
  }> {
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        const stripePaymentIntent = await this.platformStripe.paymentIntents.retrieve(paymentIntentId);
        const status = this.mapStripeStatus(stripePaymentIntent.status);
        
        return {
          success: true,
          status,
        };
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get payment status',
          };
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
      }
    }

    return {
      success: false,
      error: 'Max retries exceeded',
    };
  }

  /**
   * Validate tenant payment permissions
   */
  private validateTenantPermissions(
    tenantId: string,
    requiredPermissions: string[]
  ): boolean {
    // In a real implementation, this would check against the tenant's permissions
    // For now, we'll assume all tenants have basic payment permissions
    return true;
  }

  /**
   * Get platform subscription for tenant
   */
  async getPlatformSubscription(tenantId: string): Promise<PlatformSubscription | null> {
    return Array.from(this.platformSubscriptions.values()).find(
      sub => sub.tenantId === tenantId
    ) || null;
  }

  /**
   * Get booking payments for a specific booking
   */
  async getBookingPayments(tenantId: string, bookingId: string): Promise<BookingPayment[]> {
    return Array.from(this.bookingPayments.values()).filter(
      bp => bp.tenantId === tenantId && bp.bookingId === bookingId
    );
  }

  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<string[]> {
    const tenantId = paymentIntent.metadata.tenantId;
    const webhooksTriggered: string[] = [];
    
    if (!tenantId) return webhooksTriggered;

    // Find and update internal payment intent or booking payment
    const internalPayment = Array.from(this.paymentIntents.values()).find(
      p => p.stripePaymentIntentId === paymentIntent.id
    );

    const bookingPayment = Array.from(this.bookingPayments.values()).find(
      bp => bp.stripePaymentIntentId === paymentIntent.id
    );

    if (internalPayment) {
      internalPayment.status = PaymentStatus.SUCCEEDED;
      internalPayment.updatedAt = new Date();
      this.paymentIntents.set(internalPayment.id, internalPayment);

      // Trigger webhook for general payment success
      webhooksTriggered.push(await this.triggerWebhook(tenantId, 'payment.succeeded', {
        paymentId: internalPayment.id,
        amount: internalPayment.amount,
        currency: internalPayment.currency,
        customerId: internalPayment.customerId,
        stripePaymentIntentId: paymentIntent.id,
      }));
    }

    if (bookingPayment) {
      bookingPayment.status = PaymentStatus.SUCCEEDED;
      bookingPayment.updatedAt = new Date();
      this.bookingPayments.set(bookingPayment.id, bookingPayment);

      // Trigger webhook for booking payment success
      webhooksTriggered.push(await this.triggerWebhook(tenantId, 'booking.payment_succeeded', {
        bookingPaymentId: bookingPayment.id,
        bookingId: bookingPayment.bookingId,
        paymentType: bookingPayment.paymentType,
        amount: bookingPayment.amount,
        customerId: bookingPayment.customerId,
        stripePaymentIntentId: paymentIntent.id,
      }));
    }

    return webhooksTriggered.filter(Boolean);
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<string[]> {
    const tenantId = paymentIntent.metadata.tenantId;
    const webhooksTriggered: string[] = [];
    
    if (!tenantId) return webhooksTriggered;

    // Find and update internal payment intent or booking payment
    const internalPayment = Array.from(this.paymentIntents.values()).find(
      p => p.stripePaymentIntentId === paymentIntent.id
    );

    const bookingPayment = Array.from(this.bookingPayments.values()).find(
      bp => bp.stripePaymentIntentId === paymentIntent.id
    );

    if (internalPayment) {
      internalPayment.status = PaymentStatus.FAILED;
      internalPayment.updatedAt = new Date();
      this.paymentIntents.set(internalPayment.id, internalPayment);

      webhooksTriggered.push(await this.triggerWebhook(tenantId, 'payment.failed', {
        paymentId: internalPayment.id,
        amount: internalPayment.amount,
        currency: internalPayment.currency,
        customerId: internalPayment.customerId,
        stripePaymentIntentId: paymentIntent.id,
        failureReason: paymentIntent.last_payment_error?.message,
      }));
    }

    if (bookingPayment) {
      bookingPayment.status = PaymentStatus.FAILED;
      bookingPayment.updatedAt = new Date();
      this.bookingPayments.set(bookingPayment.id, bookingPayment);

      webhooksTriggered.push(await this.triggerWebhook(tenantId, 'booking.payment_failed', {
        bookingPaymentId: bookingPayment.id,
        bookingId: bookingPayment.bookingId,
        paymentType: bookingPayment.paymentType,
        amount: bookingPayment.amount,
        customerId: bookingPayment.customerId,
        stripePaymentIntentId: paymentIntent.id,
        failureReason: paymentIntent.last_payment_error?.message,
      }));
    }

    return webhooksTriggered.filter(Boolean);
  }

  private async handlePaymentRequiresAction(paymentIntent: Stripe.PaymentIntent): Promise<string[]> {
    const tenantId = paymentIntent.metadata.tenantId;
    const webhooksTriggered: string[] = [];
    
    if (!tenantId) return webhooksTriggered;

    webhooksTriggered.push(await this.triggerWebhook(tenantId, 'payment.requires_action', {
      stripePaymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      nextAction: paymentIntent.next_action,
    }));

    return webhooksTriggered.filter(Boolean);
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<string[]> {
    const tenantId = invoice.metadata?.tenantId;
    const webhooksTriggered: string[] = [];
    
    if (!tenantId) return webhooksTriggered;

    // Update subscription status if this is a subscription invoice
    if (invoice.subscription) {
      const subscription = Array.from(this.platformSubscriptions.values()).find(
        sub => sub.stripeSubscriptionId === invoice.subscription
      );

      if (subscription) {
        subscription.status = 'active';
        subscription.updatedAt = new Date();
        this.platformSubscriptions.set(subscription.id, subscription);

        webhooksTriggered.push(await this.triggerWebhook(tenantId, 'subscription.payment_succeeded', {
          subscriptionId: subscription.id,
          planId: subscription.planId,
          amount: invoice.amount_paid,
          periodStart: subscription.currentPeriodStart,
          periodEnd: subscription.currentPeriodEnd,
        }));
      }
    }

    return webhooksTriggered.filter(Boolean);
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<string[]> {
    const tenantId = invoice.metadata?.tenantId;
    const webhooksTriggered: string[] = [];
    
    if (!tenantId) return webhooksTriggered;

    // Update subscription status if this is a subscription invoice
    if (invoice.subscription) {
      const subscription = Array.from(this.platformSubscriptions.values()).find(
        sub => sub.stripeSubscriptionId === invoice.subscription
      );

      if (subscription) {
        subscription.status = 'past_due';
        subscription.updatedAt = new Date();
        this.platformSubscriptions.set(subscription.id, subscription);

        webhooksTriggered.push(await this.triggerWebhook(tenantId, 'subscription.payment_failed', {
          subscriptionId: subscription.id,
          planId: subscription.planId,
          amount: invoice.amount_due,
          attemptCount: invoice.attempt_count,
          nextPaymentAttempt: invoice.next_payment_attempt,
        }));
      }
    }

    return webhooksTriggered.filter(Boolean);
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<string[]> {
    const tenantId = subscription.metadata?.tenantId;
    const webhooksTriggered: string[] = [];
    
    if (!tenantId) return webhooksTriggered;

    const internalSubscription = Array.from(this.platformSubscriptions.values()).find(
      sub => sub.stripeSubscriptionId === subscription.id
    );

    if (internalSubscription) {
      internalSubscription.status = subscription.status as any;
      internalSubscription.currentPeriodStart = new Date(subscription.current_period_start * 1000);
      internalSubscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
      internalSubscription.updatedAt = new Date();
      this.platformSubscriptions.set(internalSubscription.id, internalSubscription);

      webhooksTriggered.push(await this.triggerWebhook(tenantId, 'subscription.updated', {
        subscriptionId: internalSubscription.id,
        status: subscription.status,
        planId: internalSubscription.planId,
        periodStart: internalSubscription.currentPeriodStart,
        periodEnd: internalSubscription.currentPeriodEnd,
      }));
    }

    return webhooksTriggered.filter(Boolean);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<string[]> {
    const tenantId = subscription.metadata?.tenantId;
    const webhooksTriggered: string[] = [];
    
    if (!tenantId) return webhooksTriggered;

    const internalSubscription = Array.from(this.platformSubscriptions.values()).find(
      sub => sub.stripeSubscriptionId === subscription.id
    );

    if (internalSubscription) {
      internalSubscription.status = 'canceled';
      internalSubscription.updatedAt = new Date();
      this.platformSubscriptions.set(internalSubscription.id, internalSubscription);

      webhooksTriggered.push(await this.triggerWebhook(tenantId, 'subscription.canceled', {
        subscriptionId: internalSubscription.id,
        planId: internalSubscription.planId,
        canceledAt: new Date(),
      }));
    }

    return webhooksTriggered.filter(Boolean);
  }

  private async handleChargeRefunded(charge: Stripe.Charge): Promise<string[]> {
    const tenantId = charge.metadata?.tenantId;
    const webhooksTriggered: string[] = [];
    
    if (!tenantId) return webhooksTriggered;

    webhooksTriggered.push(await this.triggerWebhook(tenantId, 'payment.refunded', {
      chargeId: charge.id,
      paymentIntentId: charge.payment_intent,
      amount: charge.amount_refunded,
      refundReason: charge.refunds?.data[0]?.reason,
    }));

    return webhooksTriggered.filter(Boolean);
  }

  private async handleAccountUpdated(account: Stripe.Account): Promise<string[]> {
    const tenantId = account.metadata?.tenantId;
    const webhooksTriggered: string[] = [];
    
    if (!tenantId) return webhooksTriggered;

    // Update connected account status
    const connectedAccount = Array.from(this.connectedAccounts.values()).find(
      acc => acc.stripeAccountId === account.id
    );

    if (connectedAccount) {
      const wasActive = connectedAccount.isActive;
      
      connectedAccount.isActive = account.charges_enabled && account.payouts_enabled;
      connectedAccount.onboardingComplete = account.details_submitted;
      connectedAccount.chargesEnabled = account.charges_enabled;
      connectedAccount.payoutsEnabled = account.payouts_enabled;
      connectedAccount.requirements = account.requirements?.currently_due || [];
      connectedAccount.updatedAt = new Date();

      this.connectedAccounts.set(connectedAccount.id, connectedAccount);

      // Trigger webhook if account status changed
      if (wasActive !== connectedAccount.isActive) {
        const eventType = connectedAccount.isActive ? 'account.activated' : 'account.deactivated';
        webhooksTriggered.push(await this.triggerWebhook(tenantId, eventType, {
          accountId: connectedAccount.id,
          stripeAccountId: account.id,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          requirements: account.requirements?.currently_due || [],
        }));
      }
    }

    return webhooksTriggered.filter(Boolean);
  }

  private async handleChargeDispute(dispute: Stripe.Dispute): Promise<string[]> {
    const tenantId = dispute.metadata?.tenantId;
    const webhooksTriggered: string[] = [];
    
    if (!tenantId) return webhooksTriggered;

    webhooksTriggered.push(await this.triggerWebhook(tenantId, 'payment.dispute_created', {
      disputeId: dispute.id,
      chargeId: dispute.charge,
      amount: dispute.amount,
      reason: dispute.reason,
      status: dispute.status,
      evidenceDueBy: dispute.evidence_details?.due_by,
    }));

    return webhooksTriggered.filter(Boolean);
  }

  /**
   * Trigger webhook for tenant (integrates with webhook system)
   */
  private async triggerWebhook(
    tenantId: string,
    eventType: string,
    data: any
  ): Promise<string> {
    try {
      // This would integrate with the existing webhook system
      // For now, we'll simulate the webhook trigger
      const webhookId = `webhook_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      
      console.log(`Triggering webhook for tenant ${tenantId}:`, {
        webhookId,
        eventType,
        data,
        timestamp: new Date().toISOString(),
      });

      // In a real implementation, this would call the webhook delivery system
      // await webhookSystem.triggerWebhook(tenantId, eventType, data);

      return webhookId;
    } catch (error) {
      console.error('Failed to trigger webhook:', error);
      return '';
    }
  }

  private mapStripeStatus(stripeStatus: string): PaymentStatus {
    switch (stripeStatus) {
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
        return PaymentStatus.PENDING;
      case 'processing':
        return PaymentStatus.PROCESSING;
      case 'succeeded':
        return PaymentStatus.SUCCEEDED;
      case 'canceled':
        return PaymentStatus.CANCELLED;
      default:
        return PaymentStatus.FAILED;
    }
  }

  private generateId(): string {
    return 'pay_' + Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}

export const stripeIntegration = new StripeIntegration(
  process.env.STRIPE_SECRET_KEY || '',
  process.env.STRIPE_WEBHOOK_SECRET || ''
);