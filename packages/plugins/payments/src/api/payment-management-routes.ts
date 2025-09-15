/// <reference path="../types/express.d.ts" />
import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { z } from 'zod';
import { paymentManager } from '../payment-manager';
import { paymentWebhookIntegration } from '../webhook-integration';
import { validateTenantAccess } from '@bizbox/core-auth';
import { validateInput } from '@bizbox/core-api';

const router: ExpressRouter = Router();

// Validation schemas
const processRefundSchema = z.object({
  paymentId: z.string().min(1),
  amount: z.number().min(1).optional(),
  reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']).optional(),
  metadata: z.record(z.any()).optional(),
});

const trackPaymentSchema = z.object({
  paymentId: z.string().min(1),
  webhookUrl: z.string().url().optional(),
  notificationEmail: z.string().email().optional(),
  maxTrackingDuration: z.number().min(1).max(1440).optional(), // 1-1440 minutes
});

const generateReportSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  includeRefunds: z.boolean().optional(),
  includeFailures: z.boolean().optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional(),
  format: z.enum(['json', 'csv']).optional(),
});

const configureWebhooksSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  secret: z.string().optional(),
  enabled: z.boolean().optional(),
});

/**
 * Process refund with validation and retry logic
 * POST /api/payments/management/refund
 */
router.post('/refund', validateTenantAccess, validateInput(processRefundSchema), async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { paymentId, amount, reason, metadata } = req.body;

    const result = await paymentManager.processRefundWithValidation(
      tenantId,
      paymentId,
      {
        amount,
        reason,
        initiatedBy: 'tenant',
        metadata,
      }
    );

    if (result.success) {
      res.json({
        success: true,
        refund: result.refund,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        validationErrors: result.validationErrors,
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
 * Track payment status with monitoring
 * POST /api/payments/management/track
 */
router.post('/track', validateTenantAccess, validateInput(trackPaymentSchema), async (req, res) => {
  try {
    const { paymentId, webhookUrl, notificationEmail, maxTrackingDuration } = req.body;

    const result = await paymentManager.trackPaymentStatus(paymentId, {
      webhookUrl,
      notificationEmail,
      maxTrackingDuration,
    });

    if (result.success) {
      res.json({
        success: true,
        status: result.status,
        trackingId: result.trackingId,
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
 * Generate comprehensive payment report
 * POST /api/payments/management/report
 */
router.post('/report', validateTenantAccess, validateInput(generateReportSchema), async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { startDate, endDate, includeRefunds, includeFailures, groupBy, format } = req.body;

    const result = await paymentManager.generatePaymentReport(tenantId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      includeRefunds,
      includeFailures,
      groupBy,
      format,
    });

    if (result.success) {
      res.json({
        success: true,
        report: result.report,
        downloadUrl: result.downloadUrl,
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
 * Reconcile payments for a specific date
 * POST /api/payments/management/reconcile
 */
router.post('/reconcile', validateTenantAccess, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Date is required for reconciliation',
      });
    }

    const result = await paymentManager.reconcilePayments(
      tenantId,
      new Date(date)
    );

    if (result.success) {
      res.json({
        success: true,
        reconciliation: result.reconciliation,
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
 * Configure payment webhooks
 * POST /api/payments/management/webhooks/configure
 */
router.post('/webhooks/configure', validateTenantAccess, validateInput(configureWebhooksSchema), async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { url, events, secret, enabled } = req.body;

    const result = await paymentWebhookIntegration.configurePaymentWebhooks(tenantId, {
      url,
      events,
      secret,
      enabled,
    });

    if (result.success) {
      res.json({
        success: true,
        webhookId: result.webhookId,
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
 * Get webhook analytics
 * GET /api/payments/management/webhooks/analytics
 */
router.get('/webhooks/analytics', validateTenantAccess, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required',
      });
    }

    const analytics = await paymentWebhookIntegration.getWebhookAnalytics(
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
 * Get payment failure analysis
 * GET /api/payments/management/failures/analysis
 */
router.get('/failures/analysis', validateTenantAccess, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required',
      });
    }

    // Get payment analytics to analyze failures
    const analytics = await paymentManager.generatePaymentReport(tenantId, {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
      includeFailures: true,
    });

    if (analytics.success && analytics.report) {
      const failureAnalysis = {
        totalFailures: analytics.report.byStatus?.failed || 0,
        failureRate: analytics.report.totalTransactions > 0 
          ? ((analytics.report.byStatus?.failed || 0) / analytics.report.totalTransactions) * 100 
          : 0,
        topFailureReasons: analytics.report.topFailureReasons || [],
        recommendations: generateFailureRecommendations(analytics.report.topFailureReasons || []),
      };

      res.json({
        success: true,
        analysis: failureAnalysis,
      });
    } else {
      res.status(400).json({
        success: false,
        error: analytics.error || 'Failed to analyze payment failures',
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
 * Retry failed payment with enhanced error handling
 * POST /api/payments/management/retry/:paymentId
 */
router.post('/retry/:paymentId', validateTenantAccess, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { paymentMethodId } = req.body;

    // Use payment manager's retry logic
    const result = await paymentManager.processPaymentWithRetry(async () => {
      // This would integrate with the Stripe integration to retry the payment
      // For now, we'll simulate the retry
      return {
        success: true,
        paymentIntent: {
          id: paymentId,
          status: 'succeeded',
        },
      };
    });

    if (result.success) {
      res.json({
        success: true,
        paymentIntent: result.result.paymentIntent,
        attempts: result.attempts,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error?.message || 'Payment retry failed',
        attempts: result.attempts,
        errorDetails: result.error,
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
 * Get payment health metrics
 * GET /api/payments/management/health
 */
router.get('/health', validateTenantAccess, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Last 30 days

    const analytics = await paymentManager.generatePaymentReport(tenantId, {
      startDate,
      endDate,
      includeRefunds: true,
      includeFailures: true,
    });

    if (analytics.success && analytics.report) {
      const healthMetrics = {
        overallHealth: calculateHealthScore(analytics.report),
        successRate: analytics.report.successRate,
        refundRate: analytics.report.refundRate,
        averageTransactionValue: analytics.report.averageTransactionValue,
        totalRevenue: analytics.report.totalRevenue,
        trends: analytics.report.trends,
        alerts: generateHealthAlerts(analytics.report),
      };

      res.json({
        success: true,
        health: healthMetrics,
      });
    } else {
      res.status(400).json({
        success: false,
        error: analytics.error || 'Failed to get payment health metrics',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Helper functions

function generateFailureRecommendations(failureReasons: any[]): string[] {
  const recommendations: string[] = [];

  failureReasons.forEach(reason => {
    switch (reason.reason) {
      case 'insufficient_funds':
        recommendations.push('Consider implementing payment retry logic with customer notification');
        recommendations.push('Offer alternative payment methods or payment plans');
        break;
      case 'expired_card':
        recommendations.push('Implement card expiry notifications and automatic card updater');
        break;
      case 'card_declined':
        recommendations.push('Provide clear error messages and suggest contacting the bank');
        break;
      case 'processing_error':
        recommendations.push('Review payment processing configuration and contact support if persistent');
        break;
    }
  });

  return recommendations;
}

function calculateHealthScore(report: any): number {
  let score = 100;

  // Deduct points for low success rate
  if (report.successRate < 95) score -= (95 - report.successRate) * 2;
  
  // Deduct points for high refund rate
  if (report.refundRate > 5) score -= (report.refundRate - 5) * 3;
  
  // Deduct points for low transaction volume (if applicable)
  if (report.totalTransactions < 10) score -= 10;

  return Math.max(0, Math.min(100, score));
}

function generateHealthAlerts(report: any): string[] {
  const alerts: string[] = [];

  if (report.successRate < 90) {
    alerts.push('Low payment success rate detected - investigate payment failures');
  }

  if (report.refundRate > 10) {
    alerts.push('High refund rate detected - review customer satisfaction and product quality');
  }

  if (report.totalTransactions === 0) {
    alerts.push('No transactions in the selected period - check payment integration');
  }

  return alerts;
}

export default router;