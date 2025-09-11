import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { StripeIntegration, PaymentStatus } from '../stripe-integration';

// Mock Stripe
const mockStripe = {
  accounts: {
    create: jest.fn(),
    retrieve: jest.fn(),
  },
  accountLinks: {
    create: jest.fn(),
  },
  customers: {
    create: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
  },
  paymentMethods: {
    attach: jest.fn(),
  },
  subscriptions: {
    create: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn(),
    retrieve: jest.fn(),
  },
  paymentIntents: {
    create: jest.fn(),
    confirm: jest.fn(),
    retrieve: jest.fn(),
  },
  refunds: {
    create: jest.fn(),
  },
  invoices: {
    list: jest.fn(),
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
};

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => mockStripe);
});

describe('StripeIntegration', () => {
  let stripeIntegration: StripeIntegration;
  const mockTenantId = 'tenant_123';
  const mockCustomerId = 'cus_123';
  const mockBookingId = 'booking_123';

  beforeEach(() => {
    jest.clearAllMocks();
    stripeIntegration = new StripeIntegration('sk_test_123', 'whsec_123');
  });

  describe('Platform Subscription Management', () => {
    it('should create platform subscription successfully', async () => {
      const mockCustomer = { id: 'cus_123', email: 'test@example.com' };
      const mockSubscription = {
        id: 'sub_123',
        status: 'active',
        current_period_start: 1640995200,
        current_period_end: 1643673600,
        latest_invoice: {
          payment_intent: {
            client_secret: 'pi_123_secret_123',
          },
        },
      };

      mockStripe.customers.list.mockResolvedValue({ data: [] });
      mockStripe.customers.create.mockResolvedValue(mockCustomer);
      mockStripe.subscriptions.create.mockResolvedValue(mockSubscription);

      const result = await stripeIntegration.createPlatformSubscription(
        mockTenantId,
        'price_123',
        {
          email: 'test@example.com',
          name: 'Test Business',
          businessName: 'Test Business Ltd',
        }
      );

      expect(result.success).toBe(true);
      expect(result.subscription).toBeDefined();
      expect(result.clientSecret).toBe('pi_123_secret_123');
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test Business',
        metadata: {
          tenantId: mockTenantId,
          businessName: 'Test Business Ltd',
        },
      });
    });

    it('should handle subscription creation failure', async () => {
      mockStripe.customers.list.mockResolvedValue({ data: [] });
      mockStripe.customers.create.mockRejectedValue(new Error('Customer creation failed'));

      const result = await stripeIntegration.createPlatformSubscription(
        mockTenantId,
        'price_123',
        {
          email: 'test@example.com',
          name: 'Test Business',
          businessName: 'Test Business Ltd',
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Customer creation failed');
    });

    it('should update platform subscription', async () => {
      // First create a subscription
      const mockCustomer = { id: 'cus_123', email: 'test@example.com' };
      const mockSubscription = {
        id: 'sub_123',
        status: 'active',
        current_period_start: 1640995200,
        current_period_end: 1643673600,
        latest_invoice: { payment_intent: { client_secret: 'pi_123_secret_123' } },
      };

      mockStripe.customers.list.mockResolvedValue({ data: [] });
      mockStripe.customers.create.mockResolvedValue(mockCustomer);
      mockStripe.subscriptions.create.mockResolvedValue(mockSubscription);

      await stripeIntegration.createPlatformSubscription(
        mockTenantId,
        'price_123',
        {
          email: 'test@example.com',
          name: 'Test Business',
          businessName: 'Test Business Ltd',
        }
      );

      // Mock subscription retrieval and update
      const mockUpdatedSubscription = {
        ...mockSubscription,
        items: { data: [{ id: 'si_123' }] },
      };

      mockStripe.subscriptions.retrieve.mockResolvedValue(mockUpdatedSubscription);
      mockStripe.subscriptions.update.mockResolvedValue({
        ...mockUpdatedSubscription,
        status: 'active',
      });

      const result = await stripeIntegration.updatePlatformSubscription(mockTenantId, 'price_456');

      expect(result.success).toBe(true);
      expect(result.subscription?.planId).toBe('price_456');
    });
  });

  describe('Connected Account Management', () => {
    it('should create connected account successfully', async () => {
      const mockAccount = {
        id: 'acct_123',
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
      };

      const mockAccountLink = {
        url: 'https://connect.stripe.com/setup/123',
      };

      mockStripe.accounts.create.mockResolvedValue(mockAccount);
      mockStripe.accountLinks.create.mockResolvedValue(mockAccountLink);

      const result = await stripeIntegration.createConnectedAccount(mockTenantId, {
        businessName: 'Test Business',
        businessType: 'company',
        country: 'GB',
        email: 'test@example.com',
      });

      expect(result.success).toBe(true);
      expect(result.account).toBeDefined();
      expect(result.onboardingUrl).toBe('https://connect.stripe.com/setup/123');
    });

    it('should get connected account status', async () => {
      // First create a connected account
      const mockAccount = {
        id: 'acct_123',
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
      };

      mockStripe.accounts.create.mockResolvedValue(mockAccount);
      mockStripe.accountLinks.create.mockResolvedValue({ url: 'https://connect.stripe.com/setup/123' });

      await stripeIntegration.createConnectedAccount(mockTenantId, {
        businessName: 'Test Business',
        businessType: 'company',
        country: 'GB',
        email: 'test@example.com',
      });

      // Mock account retrieval with updated status
      mockStripe.accounts.retrieve.mockResolvedValue({
        ...mockAccount,
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
        requirements: { currently_due: [] },
      });

      const result = await stripeIntegration.getConnectedAccountStatus(mockTenantId);

      expect(result).toBeDefined();
      expect(result?.isActive).toBe(true);
      expect(result?.onboardingComplete).toBe(true);
    });
  });

  describe('Booking Payment Processing', () => {
    beforeEach(async () => {
      // Setup connected account for booking payments
      const mockAccount = {
        id: 'acct_123',
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
      };

      mockStripe.accounts.create.mockResolvedValue(mockAccount);
      mockStripe.accountLinks.create.mockResolvedValue({ url: 'https://connect.stripe.com/setup/123' });

      await stripeIntegration.createConnectedAccount(mockTenantId, {
        businessName: 'Test Business',
        businessType: 'company',
        country: 'GB',
        email: 'test@example.com',
      });

      // Update account status to active
      mockStripe.accounts.retrieve.mockResolvedValue({
        ...mockAccount,
        requirements: { currently_due: [] },
      });

      await stripeIntegration.getConnectedAccountStatus(mockTenantId);
    });

    it('should create deposit payment successfully', async () => {
      const mockPaymentIntent = {
        id: 'pi_123',
        status: 'requires_payment_method',
        client_secret: 'pi_123_secret_123',
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const result = await stripeIntegration.createBookingPayment(
        mockTenantId,
        mockBookingId,
        mockCustomerId,
        10000, // £100.00
        {
          paymentType: 'deposit',
          depositPercentage: 0.3, // 30%
        }
      );

      expect(result.success).toBe(true);
      expect(result.bookingPayment).toBeDefined();
      expect(result.bookingPayment?.amount).toBe(3000); // 30% of £100
      expect(result.bookingPayment?.paymentType).toBe('deposit');
      expect(result.clientSecret).toBe('pi_123_secret_123');

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 3000,
        currency: 'gbp',
        customer: mockCustomerId,
        description: 'Booking payment - deposit',
        metadata: {
          tenantId: mockTenantId,
          bookingId: mockBookingId,
          paymentType: 'deposit',
          totalAmount: '10000',
        },
        application_fee_amount: 117, // 2.9% + 30p
        transfer_data: {
          destination: 'acct_123',
        },
      });
    });

    it('should create full payment successfully', async () => {
      const mockPaymentIntent = {
        id: 'pi_456',
        status: 'requires_payment_method',
        client_secret: 'pi_456_secret_456',
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const result = await stripeIntegration.createBookingPayment(
        mockTenantId,
        mockBookingId,
        mockCustomerId,
        10000, // £100.00
        {
          paymentType: 'full_payment',
        }
      );

      expect(result.success).toBe(true);
      expect(result.bookingPayment?.amount).toBe(10000); // Full amount
      expect(result.bookingPayment?.paymentType).toBe('full_payment');
    });

    it('should process remaining balance payment', async () => {
      // First create a successful deposit payment
      const mockDepositPaymentIntent = {
        id: 'pi_deposit_123',
        status: 'succeeded',
        client_secret: 'pi_deposit_123_secret',
      };

      mockStripe.paymentIntents.create.mockResolvedValueOnce(mockDepositPaymentIntent);

      const depositResult = await stripeIntegration.createBookingPayment(
        mockTenantId,
        mockBookingId,
        mockCustomerId,
        10000,
        { paymentType: 'deposit', depositPercentage: 0.3 }
      );

      // Simulate successful deposit payment
      if (depositResult.bookingPayment) {
        depositResult.bookingPayment.status = PaymentStatus.SUCCEEDED;
        depositResult.bookingPayment.metadata = { totalAmount: '10000' };
      }

      // Now process remaining balance
      const mockRemainingPaymentIntent = {
        id: 'pi_remaining_123',
        status: 'requires_payment_method',
        client_secret: 'pi_remaining_123_secret',
      };

      mockStripe.paymentIntents.create.mockResolvedValueOnce(mockRemainingPaymentIntent);

      const result = await stripeIntegration.processRemainingBalance(
        mockTenantId,
        mockBookingId,
        mockCustomerId
      );

      expect(result.success).toBe(true);
      expect(result.bookingPayment?.amount).toBe(7000); // £70 remaining
      expect(result.bookingPayment?.paymentType).toBe('remaining_balance');
    });
  });

  describe('Refund Processing', () => {
    it('should process refund successfully', async () => {
      const mockRefund = {
        id: 'ref_123',
        amount: 5000,
        status: 'succeeded',
      };

      mockStripe.refunds.create.mockResolvedValue(mockRefund);

      // Create a mock payment intent first
      const mockPaymentIntent = {
        id: 'pi_123',
        status: 'succeeded',
        client_secret: 'pi_123_secret',
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const paymentResult = await stripeIntegration.createPaymentIntent({
        tenantId: mockTenantId,
        amount: 10000,
        customerId: mockCustomerId,
      });

      if (paymentResult.paymentIntent) {
        paymentResult.paymentIntent.status = PaymentStatus.SUCCEEDED;
      }

      const result = await stripeIntegration.processRefund({
        paymentIntentId: paymentResult.paymentIntent!.id,
        amount: 5000,
        reason: 'requested_by_customer',
        initiatedBy: 'tenant',
        tenantId: mockTenantId,
      });

      expect(result.success).toBe(true);
      expect(result.refund).toEqual(mockRefund);
    });

    it('should handle refund failure', async () => {
      mockStripe.refunds.create.mockRejectedValue(new Error('Refund failed'));

      const result = await stripeIntegration.processRefund({
        paymentIntentId: 'nonexistent_payment',
        initiatedBy: 'tenant',
        tenantId: mockTenantId,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment not found');
    });
  });

  describe('Webhook Processing', () => {
    it('should handle payment_intent.succeeded webhook', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_123',
            status: 'succeeded',
            metadata: {
              tenantId: mockTenantId,
            },
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const result = await stripeIntegration.handleWebhook(
        'mock_payload',
        'mock_signature'
      );

      expect(result.success).toBe(true);
      expect(result.event).toEqual(mockEvent);
      expect(result.webhooksTriggered).toBeDefined();
    });

    it('should handle webhook signature verification failure', async () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const result = await stripeIntegration.handleWebhook(
        'mock_payload',
        'invalid_signature'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid signature');
    });
  });

  describe('Payment Analytics', () => {
    it('should calculate payment analytics correctly', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const analytics = await stripeIntegration.getPaymentAnalytics(
        mockTenantId,
        startDate,
        endDate
      );

      expect(analytics).toBeDefined();
      expect(analytics.totalRevenue).toBe(0); // No payments in test
      expect(analytics.totalTransactions).toBe(0);
      expect(analytics.successRate).toBe(0);
      expect(analytics.refundRate).toBe(0);
      expect(analytics.bookingPayments).toBeDefined();
      expect(analytics.subscriptionMetrics).toBeDefined();
    });
  });

  describe('Error Handling and Retry Logic', () => {
    it('should retry payment status retrieval on failure', async () => {
      mockStripe.paymentIntents.retrieve
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ id: 'pi_123', status: 'succeeded' });

      const result = await stripeIntegration.getPaymentStatus('pi_123', 3);

      expect(result.success).toBe(true);
      expect(result.status).toBe(PaymentStatus.SUCCEEDED);
      expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      mockStripe.paymentIntents.retrieve.mockRejectedValue(new Error('Persistent error'));

      const result = await stripeIntegration.getPaymentStatus('pi_123', 2);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Persistent error');
      expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledTimes(2);
    });
  });
});