import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { z } from 'zod';
import { stripeIntegration } from '../stripe-integration';
import { validateTenantAccess } from '@bizbox/core/auth';
import { validateInput } from '@bizbox/core/api';

const router: ExpressRouter = Router();

// Validation schemas
const createConnectedAccountSchema = z.object({
  businessName: z.string().min(1),
  businessType: z.enum(['individual', 'company']),
  country: z.string().length(2).default('GB'),
  email: z.string().email(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
});

const createPlatformSubscriptionSchema = z.object({
  planId: z.string().min(1),
  customerInfo: z.object({
    email: z.string().email(),
    name: z.string().min(1),
    businessName: z.string().min(1),
  }),
  paymentMethodId: z.string().optional(),
});

const createBookingPaymentSchema = z.object({
  bookingId: z.string().uuid(),
  customerId: z.string().uuid(),
  totalAmount: z.number().min(50), // Minimum 50p
  paymentType: z.enum(['deposit', 'full_payment']),
  depositPercentage: z.number().min(0.1).max(1).optional(),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const processRefundSchema = z.object({
  paymentIntentId: z.string().min(1),
  amount: z.number().min(1).optional(),
  reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']).optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Create Stripe Connect account for tenant
 * POST /api/payments/stripe/connect-account
 */
router.post('/connect-account', validateTenantAccess, validateInput(createConnectedAccountSchema), async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const businessInfo = req.body;

    const result = await stripeIntegration.createConnectedAccount(tenantId, businessInfo);

    if (result.success) {
      res.json({
        success: true,
        account: result.account,
        onboardingUrl: result.onboardingUrl,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * Get connected account status
 * GET /api/payments/stripe/connect-account/status
 */
router.get('/connect-account/status', validateTenantAccess, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const account = await stripeIntegration.getConnectedAccountStatus(tenantId);

    if (account) {
      res.json({
        success: true,
        account,
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'No connected account found',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * Create platform subscription
 * POST /api/payments/stripe/subscription
 */
router.post('/subscription', validateTenantAccess, validateInput(createPlatformSubscriptionSchema), async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { planId, customerInfo, paymentMethodId } = req.body;

    const result = await stripeIntegration.createPlatformSubscription(
      tenantId,
      planId,
      customerInfo,
      paymentMethodId
    );

    if (result.success) {
      res.json({
        success: true,
        subscription: result.subscription,
        clientSecret: result.clientSecret,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * Update platform subscription
 * PUT /api/payments/stripe/subscription
 */
router.put('/subscription', validateTenantAccess, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { newPlanId } = req.body;

    if (!newPlanId) {
      return res.status(400).json({
        success: false,
        error: 'newPlanId is required',
      });
    }

    const result = await stripeIntegration.updatePlatformSubscription(tenantId, newPlanId);

    if (result.success) {
      res.json({
        success: true,
        subscription: result.subscription,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * Cancel platform subscription
 * DELETE /api/payments/stripe/subscription
 */
router.delete('/subscription', validateTenantAccess, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { immediately } = req.query;

    const result = await stripeIntegration.cancelPlatformSubscription(
      tenantId,
      immediately === 'true'
    );

    if (result.success) {
      res.json({
        success: true,
        subscription: result.subscription,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * Get platform subscription
 * GET /api/payments/stripe/subscription
 */
router.get('/subscription', validateTenantAccess, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const subscription = await stripeIntegration.getPlatformSubscription(tenantId);

    if (subscription) {
      res.json({
        success: true,
        subscription,
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'No subscription found',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * Create booking payment
 * POST /api/payments/stripe/booking-payment
 */
router.post('/booking-payment', validateTenantAccess, validateInput(createBookingPaymentSchema), async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { bookingId, customerId, totalAmount, paymentType, depositPercentage, description, metadata } = req.body;

    const result = await stripeIntegration.createBookingPayment(
      tenantId,
      bookingId,
      customerId,
      totalAmount,
      {
        paymentType,
        depositPercentage,
        description,
        metadata,
      }
    );

    if (result.success) {
      res.json({
        success: true,
        bookingPayment: result.bookingPayment,
        clientSecret: result.clientSecret,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * Process remaining balance payment
 * POST /api/payments/stripe/booking-payment/remaining-balance
 */
router.post('/booking-payment/remaining-balance', validateTenantAccess, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { bookingId, customerId } = req.body;

    if (!bookingId || !customerId) {
      return res.status(400).json({
        success: false,
        error: 'bookingId and customerId are required',
      });
    }

    const result = await stripeIntegration.processRemainingBalance(tenantId, bookingId, customerId);

    if (result.success) {
      res.json({
        success: true,
        bookingPayment: result.bookingPayment,
        clientSecret: result.clientSecret,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * Get booking payments
 * GET /api/payments/stripe/booking-payment/:bookingId
 */
router.get('/booking-payment/:bookingId', validateTenantAccess, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { bookingId } = req.params;

    const payments = await stripeIntegration.getBookingPayments(tenantId, bookingId);

    res.json({
      success: true,
      payments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * Process refund
 * POST /api/payments/stripe/refund
 */
router.post('/refund', validateTenantAccess, validateInput(processRefundSchema), async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { paymentIntentId, amount, reason, metadata } = req.body;

    const result = await stripeIntegration.processRefund({
      paymentIntentId,
      amount,
      reason,
      metadata,
      initiatedBy: 'tenant',
      tenantId,
    });

    if (result.success) {
      res.json({
        success: true,
        refund: result.refund,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * Get payment analytics
 * GET /api/payments/stripe/analytics
 */
router.get('/analytics', validateTenantAccess, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required',
      });
    }

    const analytics = await stripeIntegration.getPaymentAnalytics(
      tenantId,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json({
      success: true,
      analytics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * Stripe webhook endpoint
 * POST /api/payments/stripe/webhook
 */
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    const payload = req.body;

    if (!signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing stripe-signature header',
      });
    }

    const result = await stripeIntegration.handleWebhook(
      payload,
      signature
    );

    if (result.success) {
      res.json({
        success: true,
        event: result.event,
        webhooksTriggered: result.webhooksTriggered,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;