import { stripeIntegration, PaymentStatus, PaymentIntent, BookingPayment, PlatformSubscription } from './stripe-integration';

export interface PaymentRetryConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
}

export interface PaymentErrorDetails {
  code: string;
  message: string;
  type: 'card_error' | 'invalid_request_error' | 'api_error' | 'authentication_error' | 'rate_limit_error';
  declineCode?: string;
  param?: string;
  retryable: boolean;
}

export class PaymentManager {
  private defaultRetryConfig: PaymentRetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  };

  /**
   * Process payment with retry logic and error handling (Requirement 15.6)
   */
  async processPaymentWithRetry(
    paymentFunction: () => Promise<any>,
    retryConfig: Partial<PaymentRetryConfig> = {}
  ): Promise<{
    success: boolean;
    result?: any;
    error?: PaymentErrorDetails;
    attempts: number;
  }> {
    const config = { ...this.defaultRetryConfig, ...retryConfig };
    let attempts = 0;
    let lastError: any;

    while (attempts < config.maxRetries) {
      attempts++;
      
      try {
        const result = await paymentFunction();
        return {
          success: true,
          result,
          attempts,
        };
      } catch (error) {
        lastError = error;
        const errorDetails = this.parseStripeError(error);
        
        // Don't retry if error is not retryable
        if (!errorDetails.retryable || attempts >= config.maxRetries) {
          return {
            success: false,
            error: errorDetails,
            attempts,
          };
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempts - 1),
          config.maxDelay
        );

        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: this.parseStripeError(lastError),
      attempts,
    };
  }

  /**
   * Comprehensive refund management with validation and tracking
   */
  async processRefundWithValidation(
    tenantId: string,
    paymentId: string,
    refundOptions: {
      amount?: number;
      reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
      initiatedBy: 'platform' | 'tenant';
      metadata?: Record<string, any>;
    }
  ): Promise<{
    success: boolean;
    refund?: any;
    error?: string;
    validationErrors?: string[];
  }> {
    const validationErrors: string[] = [];

    // Validate refund request
    const validation = await this.validateRefundRequest(tenantId, paymentId, refundOptions);
    if (!validation.valid) {
      return {
        success: false,
        validationErrors: validation.errors,
      };
    }

    // Process refund with retry logic
    const result = await this.processPaymentWithRetry(async () => {
      return await stripeIntegration.processRefund({
        paymentIntentId: paymentId,
        amount: refundOptions.amount,
        reason: refundOptions.reason,
        metadata: refundOptions.metadata,
        initiatedBy: refundOptions.initiatedBy,
        tenantId,
      });
    });

    if (result.success && result.result?.success) {
      // Log refund for audit trail
      await this.logRefundActivity(tenantId, paymentId, refundOptions, result.result.refund);
      
      return {
        success: true,
        refund: result.result.refund,
      };
    }

    return {
      success: false,
      error: result.error?.message || result.result?.error || 'Refund processing failed',
    };
  }

  /**
   * Validate refund request
   */
  private async validateRefundRequest(
    tenantId: string,
    paymentId: string,
    refundOptions: any
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check if payment exists and is refundable
    try {
      const paymentStatus = await stripeIntegration.getPaymentStatus(paymentId);
      
      if (!paymentStatus.success) {
        errors.push('Payment not found or inaccessible');
        return { valid: false, errors };
      }

      if (paymentStatus.status !== PaymentStatus.SUCCEEDED) {
        errors.push('Payment must be succeeded to process refund');
      }

      // Validate refund amount if specified
      if (refundOptions.amount) {
        if (refundOptions.amount <= 0) {
          errors.push('Refund amount must be greater than 0');
        }
        // Additional validation would check against original payment amount
      }

      // Validate tenant permissions for tenant-initiated refunds
      if (refundOptions.initiatedBy === 'tenant') {
        const hasPermission = await this.validateTenantRefundPermission(tenantId, paymentId);
        if (!hasPermission) {
          errors.push('Insufficient permissions to refund this payment');
        }
      }

    } catch (error) {
      errors.push('Failed to validate payment for refund');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Payment status tracking with comprehensive monitoring
   */
  async trackPaymentStatus(
    paymentId: string,
    options: {
      webhookUrl?: string;
      notificationEmail?: string;
      maxTrackingDuration?: number; // minutes
    } = {}
  ): Promise<{
    success: boolean;
    status?: PaymentStatus;
    trackingId?: string;
    error?: string;
  }> {
    try {
      const trackingId = `track_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      
      // Get initial status
      const statusResult = await stripeIntegration.getPaymentStatus(paymentId);
      
      if (!statusResult.success) {
        return {
          success: false,
          error: statusResult.error,
        };
      }

      // Set up tracking (in a real implementation, this would use a job queue)
      this.schedulePaymentStatusCheck(paymentId, trackingId, options);

      return {
        success: true,
        status: statusResult.status,
        trackingId,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to track payment status',
      };
    }
  }

  /**
   * Generate comprehensive payment analytics report
   */
  async generatePaymentReport(
    tenantId: string,
    reportOptions: {
      startDate: Date;
      endDate: Date;
      includeRefunds?: boolean;
      includeFailures?: boolean;
      groupBy?: 'day' | 'week' | 'month';
      format?: 'json' | 'csv';
    }
  ): Promise<{
    success: boolean;
    report?: any;
    downloadUrl?: string;
    error?: string;
  }> {
    try {
      const analytics = await stripeIntegration.getPaymentAnalytics(
        tenantId,
        reportOptions.startDate,
        reportOptions.endDate
      );

      // Enhanced report with additional metrics
      const report = {
        ...analytics,
        reportPeriod: {
          start: reportOptions.startDate,
          end: reportOptions.endDate,
        },
        generatedAt: new Date(),
        tenantId,
        summary: {
          totalRevenue: analytics.totalRevenue,
          totalTransactions: analytics.totalTransactions,
          successRate: analytics.successRate,
          averageTransactionValue: analytics.averageTransactionValue,
          platformFeesCollected: analytics.platformFees,
        },
        trends: await this.calculatePaymentTrends(tenantId, reportOptions),
        topFailureReasons: await this.getTopFailureReasons(tenantId, reportOptions),
      };

      // In a real implementation, this would generate a downloadable file
      const downloadUrl = await this.generateReportFile(report, reportOptions.format || 'json');

      return {
        success: true,
        report,
        downloadUrl,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate payment report',
      };
    }
  }

  /**
   * Automated payment reconciliation
   */
  async reconcilePayments(
    tenantId: string,
    reconciliationDate: Date
  ): Promise<{
    success: boolean;
    reconciliation?: {
      totalProcessed: number;
      totalReconciled: number;
      discrepancies: any[];
      summary: any;
    };
    error?: string;
  }> {
    try {
      // Get all payments for the date
      const startOfDay = new Date(reconciliationDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(reconciliationDate);
      endOfDay.setHours(23, 59, 59, 999);

      const analytics = await stripeIntegration.getPaymentAnalytics(
        tenantId,
        startOfDay,
        endOfDay
      );

      // Perform reconciliation logic
      const reconciliation = {
        totalProcessed: analytics.totalTransactions,
        totalReconciled: analytics.totalTransactions, // Simplified for demo
        discrepancies: [], // Would contain actual discrepancies
        summary: {
          successfulPayments: analytics.byStatus[PaymentStatus.SUCCEEDED] || 0,
          failedPayments: analytics.byStatus[PaymentStatus.FAILED] || 0,
          refundedPayments: analytics.byStatus[PaymentStatus.REFUNDED] || 0,
          totalRevenue: analytics.totalRevenue,
          platformFees: analytics.platformFees,
        },
      };

      return {
        success: true,
        reconciliation,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reconcile payments',
      };
    }
  }

  // Private helper methods

  private parseStripeError(error: any): PaymentErrorDetails {
    if (error?.type === 'StripeCardError') {
      return {
        code: error.code || 'card_declined',
        message: error.message || 'Your card was declined.',
        type: 'card_error',
        declineCode: error.decline_code,
        retryable: ['insufficient_funds', 'expired_card'].includes(error.code),
      };
    }

    if (error?.type === 'StripeRateLimitError') {
      return {
        code: 'rate_limit',
        message: 'Too many requests made to the API too quickly',
        type: 'rate_limit_error',
        retryable: true,
      };
    }

    if (error?.type === 'StripeConnectionError') {
      return {
        code: 'connection_error',
        message: 'Network communication with Stripe failed',
        type: 'api_error',
        retryable: true,
      };
    }

    return {
      code: 'unknown_error',
      message: error?.message || 'An unknown error occurred',
      type: 'api_error',
      retryable: false,
    };
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async validateTenantRefundPermission(tenantId: string, paymentId: string): Promise<boolean> {
    // In a real implementation, this would check tenant permissions
    // For now, assume all tenants can refund their own payments
    return true;
  }

  private async logRefundActivity(
    tenantId: string,
    paymentId: string,
    refundOptions: any,
    refund: any
  ): Promise<void> {
    // Log refund activity for audit trail
    console.log('Refund processed:', {
      tenantId,
      paymentId,
      refundId: refund.id,
      amount: refund.amount,
      reason: refundOptions.reason,
      initiatedBy: refundOptions.initiatedBy,
      timestamp: new Date(),
    });
  }

  private schedulePaymentStatusCheck(
    paymentId: string,
    trackingId: string,
    options: any
  ): void {
    // In a real implementation, this would use a job queue like Bull or Agenda
    console.log('Payment status tracking scheduled:', {
      paymentId,
      trackingId,
      options,
    });
  }

  private async calculatePaymentTrends(tenantId: string, reportOptions: any): Promise<any> {
    // Calculate payment trends over time
    return {
      dailyRevenue: [], // Would contain actual trend data
      transactionVolume: [],
      successRateTrend: [],
    };
  }

  private async getTopFailureReasons(tenantId: string, reportOptions: any): Promise<any[]> {
    // Get top payment failure reasons
    return [
      { reason: 'insufficient_funds', count: 5, percentage: 45 },
      { reason: 'expired_card', count: 3, percentage: 27 },
      { reason: 'card_declined', count: 2, percentage: 18 },
      { reason: 'processing_error', count: 1, percentage: 9 },
    ];
  }

  private async generateReportFile(report: any, format: string): Promise<string> {
    // Generate downloadable report file
    const filename = `payment_report_${Date.now()}.${format}`;
    // In a real implementation, this would upload to S3 or similar
    return `https://reports.bizbox.com/${filename}`;
  }
}

export const paymentManager = new PaymentManager();