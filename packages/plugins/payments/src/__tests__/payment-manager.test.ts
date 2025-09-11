import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PaymentManager, PaymentErrorDetails } from '../payment-manager';
import { stripeIntegration, PaymentStatus } from '../stripe-integration';

// Mock the stripe integration
jest.mock('../stripe-integration', () => ({
  stripeIntegration: {
    processRefund: jest.fn(),
    getPaymentStatus: jest.fn(),
    getPaymentAnalytics: jest.fn(),
  },
  PaymentStatus: {
    SUCCEEDED: 'succeeded',
    FAILED: 'failed',
    PENDING: 'pending',
    REFUNDED: 'refunded',
  },
}));

describe('PaymentManager', () => {
  let paymentManager: PaymentManager;
  const mockTenantId = 'tenant_123';
  const mockPaymentId = 'payment_123';

  beforeEach(() => {
    jest.clearAllMocks();
    paymentManager = new PaymentManager();
  });

  describe('processPaymentWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockPaymentFunction = jest.fn().mockResolvedValue({ success: true });

      const result = await paymentManager.processPaymentWithRetry(mockPaymentFunction);

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(1);
      expect(mockPaymentFunction).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const mockPaymentFunction = jest.fn()
        .mockRejectedValueOnce({ type: 'StripeRateLimitError', message: 'Rate limit exceeded' })
        .mockRejectedValueOnce({ type: 'StripeConnectionError', message: 'Network error' })
        .mockResolvedValueOnce({ success: true });

      const result = await paymentManager.processPaymentWithRetry(mockPaymentFunction);

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
      expect(mockPaymentFunction).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const mockPaymentFunction = jest.fn()
        .mockRejectedValue({ type: 'StripeCardError', code: 'card_declined', message: 'Card declined' });

      const result = await paymentManager.processPaymentWithRetry(mockPaymentFunction);

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(result.error?.retryable).toBe(false);
      expect(mockPaymentFunction).toHaveBeenCalledTimes(1);
    });

    it('should respect max retries limit', async () => {
      const mockPaymentFunction = jest.fn()
        .mockRejectedValue({ type: 'StripeRateLimitError', message: 'Rate limit exceeded' });

      const result = await paymentManager.processPaymentWithRetry(
        mockPaymentFunction,
        { maxRetries: 2 }
      );

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(2);
      expect(mockPaymentFunction).toHaveBeenCalledTimes(2);
    });
  });

  describe('processRefundWithValidation', () => {
    beforeEach(() => {
      (stripeIntegration.getPaymentStatus as jest.Mock).mockResolvedValue({
        success: true,
        status: PaymentStatus.SUCCEEDED,
      });
    });

    it('should process refund successfully with validation', async () => {
      const mockRefund = { id: 'ref_123', amount: 5000, status: 'succeeded' };
      (stripeIntegration.processRefund as jest.Mock).mockResolvedValue({
        success: true,
        refund: mockRefund,
      });

      const result = await paymentManager.processRefundWithValidation(
        mockTenantId,
        mockPaymentId,
        {
          amount: 5000,
          reason: 'requested_by_customer',
          initiatedBy: 'tenant',
        }
      );

      expect(result.success).toBe(true);
      expect(result.refund).toEqual(mockRefund);
      expect(stripeIntegration.getPaymentStatus).toHaveBeenCalledWith(mockPaymentId);
      expect(stripeIntegration.processRefund).toHaveBeenCalledWith({
        paymentIntentId: mockPaymentId,
        amount: 5000,
        reason: 'requested_by_customer',
        metadata: undefined,
        initiatedBy: 'tenant',
        tenantId: mockTenantId,
      });
    });

    it('should fail validation for non-succeeded payment', async () => {
      (stripeIntegration.getPaymentStatus as jest.Mock).mockResolvedValue({
        success: true,
        status: PaymentStatus.FAILED,
      });

      const result = await paymentManager.processRefundWithValidation(
        mockTenantId,
        mockPaymentId,
        {
          initiatedBy: 'tenant',
        }
      );

      expect(result.success).toBe(false);
      expect(result.validationErrors).toContain('Payment must be succeeded to process refund');
      expect(stripeIntegration.processRefund).not.toHaveBeenCalled();
    });

    it('should fail validation for invalid refund amount', async () => {
      const result = await paymentManager.processRefundWithValidation(
        mockTenantId,
        mockPaymentId,
        {
          amount: -100,
          initiatedBy: 'tenant',
        }
      );

      expect(result.success).toBe(false);
      expect(result.validationErrors).toContain('Refund amount must be greater than 0');
    });

    it('should handle refund processing failure', async () => {
      (stripeIntegration.processRefund as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Refund failed',
      });

      const result = await paymentManager.processRefundWithValidation(
        mockTenantId,
        mockPaymentId,
        {
          initiatedBy: 'tenant',
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Refund failed');
    });
  });

  describe('trackPaymentStatus', () => {
    it('should track payment status successfully', async () => {
      (stripeIntegration.getPaymentStatus as jest.Mock).mockResolvedValue({
        success: true,
        status: PaymentStatus.SUCCEEDED,
      });

      const result = await paymentManager.trackPaymentStatus(mockPaymentId, {
        webhookUrl: 'https://example.com/webhook',
        notificationEmail: 'test@example.com',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe(PaymentStatus.SUCCEEDED);
      expect(result.trackingId).toBeDefined();
    });

    it('should handle payment status retrieval failure', async () => {
      (stripeIntegration.getPaymentStatus as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Payment not found',
      });

      const result = await paymentManager.trackPaymentStatus(mockPaymentId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment not found');
    });
  });

  describe('generatePaymentReport', () => {
    it('should generate comprehensive payment report', async () => {
      const mockAnalytics = {
        totalRevenue: 100000,
        totalTransactions: 50,
        successRate: 95,
        refundRate: 2,
        averageTransactionValue: 2000,
        platformFees: 2900,
        byStatus: {
          [PaymentStatus.SUCCEEDED]: 47,
          [PaymentStatus.FAILED]: 2,
          [PaymentStatus.REFUNDED]: 1,
        },
        bookingPayments: {
          totalBookingRevenue: 80000,
          depositPayments: 20,
          fullPayments: 15,
          remainingBalancePayments: 12,
        },
        subscriptionMetrics: {
          activeSubscriptions: 5,
          monthlyRecurringRevenue: 149.95,
          churnRate: 0,
        },
      };

      (stripeIntegration.getPaymentAnalytics as jest.Mock).mockResolvedValue(mockAnalytics);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await paymentManager.generatePaymentReport(mockTenantId, {
        startDate,
        endDate,
        includeRefunds: true,
        format: 'json',
      });

      expect(result.success).toBe(true);
      expect(result.report).toBeDefined();
      expect(result.report.summary.totalRevenue).toBe(100000);
      expect(result.report.reportPeriod.start).toEqual(startDate);
      expect(result.report.reportPeriod.end).toEqual(endDate);
      expect(result.downloadUrl).toBeDefined();
    });

    it('should handle analytics retrieval failure', async () => {
      (stripeIntegration.getPaymentAnalytics as jest.Mock).mockRejectedValue(
        new Error('Analytics service unavailable')
      );

      const result = await paymentManager.generatePaymentReport(mockTenantId, {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Analytics service unavailable');
    });
  });

  describe('reconcilePayments', () => {
    it('should reconcile payments for a specific date', async () => {
      const mockAnalytics = {
        totalTransactions: 25,
        totalRevenue: 50000,
        platformFees: 1450,
        byStatus: {
          [PaymentStatus.SUCCEEDED]: 23,
          [PaymentStatus.FAILED]: 1,
          [PaymentStatus.REFUNDED]: 1,
        },
      };

      (stripeIntegration.getPaymentAnalytics as jest.Mock).mockResolvedValue(mockAnalytics);

      const reconciliationDate = new Date('2024-01-15');
      const result = await paymentManager.reconcilePayments(mockTenantId, reconciliationDate);

      expect(result.success).toBe(true);
      expect(result.reconciliation).toBeDefined();
      expect(result.reconciliation?.totalProcessed).toBe(25);
      expect(result.reconciliation?.summary.successfulPayments).toBe(23);
      expect(result.reconciliation?.summary.totalRevenue).toBe(50000);
    });

    it('should handle reconciliation failure', async () => {
      (stripeIntegration.getPaymentAnalytics as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await paymentManager.reconcilePayments(
        mockTenantId,
        new Date('2024-01-15')
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
    });
  });

  describe('Error Parsing', () => {
    it('should parse Stripe card errors correctly', async () => {
      const cardError = {
        type: 'StripeCardError',
        code: 'card_declined',
        message: 'Your card was declined.',
        decline_code: 'insufficient_funds',
      };

      const mockPaymentFunction = jest.fn().mockRejectedValue(cardError);

      const result = await paymentManager.processPaymentWithRetry(mockPaymentFunction);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('card_error');
      expect(result.error?.code).toBe('card_declined');
      expect(result.error?.declineCode).toBe('insufficient_funds');
      expect(result.error?.retryable).toBe(true); // insufficient_funds is retryable
    });

    it('should parse Stripe rate limit errors correctly', async () => {
      const rateLimitError = {
        type: 'StripeRateLimitError',
        message: 'Too many requests',
      };

      const mockPaymentFunction = jest.fn().mockRejectedValue(rateLimitError);

      const result = await paymentManager.processPaymentWithRetry(mockPaymentFunction);

      expect(result.error?.type).toBe('rate_limit_error');
      expect(result.error?.retryable).toBe(true);
    });

    it('should parse unknown errors correctly', async () => {
      const unknownError = new Error('Unknown error occurred');

      const mockPaymentFunction = jest.fn().mockRejectedValue(unknownError);

      const result = await paymentManager.processPaymentWithRetry(mockPaymentFunction);

      expect(result.error?.type).toBe('api_error');
      expect(result.error?.code).toBe('unknown_error');
      expect(result.error?.retryable).toBe(false);
    });
  });
});