import crypto from 'crypto';
import Stripe from 'stripe';
import { z } from 'zod';

// PCI DSS Compliance Configuration
const PCI_COMPLIANCE_CONFIG = {
  // Never store these fields (PCI DSS Requirement 3.2)
  PROHIBITED_FIELDS: [
    'pan', 'primary_account_number', 'card_number', 'cc_number',
    'cvv', 'cvv2', 'cvc', 'cvc2', 'security_code', 'verification_code',
    'pin', 'pin_block', 'magnetic_stripe', 'chip_data'
  ],
  // Encrypt these fields if they must be stored temporarily
  SENSITIVE_FIELDS: [
    'cardholder_name', 'expiry_month', 'expiry_year', 'billing_address'
  ],
  // Log these events for audit
  AUDIT_EVENTS: [
    'payment_attempted', 'payment_authorized', 'payment_captured',
    'payment_failed', 'refund_initiated', 'refund_processed',
    'subscription_created', 'subscription_cancelled',
    'payout_created', 'dispute_received'
  ]
};

export interface PaymentSecurityContext {
  tenantId: string;
  customerId?: string;
  sessionId: string;
  paymentIntentId?: string;
  stripeAccountId?: string;
  riskAssessment: PaymentRiskAssessment;
  auditLog: PaymentAuditLog;
}

export interface PaymentRiskAssessment {
  score: number; // 0-100, higher is riskier
  factors: RiskFactor[];
  recommendation: 'approve' | 'review' | 'decline';
  requiresAdditionalAuth: boolean;
}

export interface RiskFactor {
  type: 'velocity' | 'amount' | 'location' | 'device' | 'pattern' | 'blocklist';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  score: number;
}

export interface PaymentAuditLog {
  id: string;
  timestamp: number;
  event: string;
  tenantId: string;
  customerId?: string;
  paymentIntentId?: string;
  stripeAccountId?: string;
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  riskScore: number;
  metadata?: Record<string, any>;
}

// Validation schemas for payment operations
export const paymentSchemas = {
  createPaymentIntent: z.object({
    amount: z.number().int().min(50).max(99999999), // £0.50 to £999,999.99
    currency: z.enum(['gbp', 'eur', 'usd']),
    paymentMethodTypes: z.array(z.enum(['card', 'paypal', 'klarna'])).optional(),
    automaticPaymentMethods: z.boolean().optional(),
    captureMethod: z.enum(['automatic', 'manual']).optional(),
    confirmationMethod: z.enum(['automatic', 'manual']).optional(),
    description: z.string().max(1000).optional(),
    statementDescriptor: z.string().max(22).regex(/^[a-zA-Z0-9\s\-\.]+$/).optional(),
    metadata: z.record(z.string().max(500)).optional(),
  }),
  
  confirmPayment: z.object({
    paymentIntentId: z.string().startsWith('pi_'),
    paymentMethodId: z.string().startsWith('pm_'),
    returnUrl: z.string().url().optional(),
  }),

  createRefund: z.object({
    paymentIntentId: z.string().startsWith('pi_'),
    amount: z.number().int().min(1).optional(),
    reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']).optional(),
    metadata: z.record(z.string().max(500)).optional(),
  }),

  webhookPayload: z.object({
    id: z.string(),
    object: z.literal('event'),
    api_version: z.string(),
    created: z.number(),
    data: z.object({
      object: z.any(),
      previous_attributes: z.any().optional(),
    }),
    livemode: z.boolean(),
    pending_webhooks: z.number(),
    request: z.object({
      id: z.string().nullable(),
      idempotency_key: z.string().nullable(),
    }),
    type: z.string(),
  }),
};

export class PaymentSecurityService {
  private stripe: Stripe;
  private auditLogs: PaymentAuditLog[] = [];
  private velocityTracking: Map<string, PaymentVelocity> = new Map();
  private blockedIPs: Set<string> = new Set();
  private suspiciousPatterns: Map<string, number> = new Map();

  constructor(stripeSecretKey: string, options?: Stripe.StripeConfig) {
    if (!stripeSecretKey || !stripeSecretKey.startsWith('sk_')) {
      throw new Error('Invalid Stripe secret key');
    }

    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      typescript: true,
      ...options,
    });

    // Initialize security monitoring
    this.initializeSecurityMonitoring();
  }

  /**
   * Secure payment intent creation with risk assessment
   */
  async createSecurePaymentIntent(
    params: z.infer<typeof paymentSchemas.createPaymentIntent>,
    context: Partial<PaymentSecurityContext>
  ): Promise<{
    paymentIntent?: Stripe.PaymentIntent;
    security: PaymentSecurityContext;
    error?: string;
  }> {
    const auditLog = this.initializeAuditLog('payment_intent_created', context);

    try {
      // 1. Validate input parameters
      const validatedParams = paymentSchemas.createPaymentIntent.parse(params);
      
      // 2. Perform risk assessment
      const riskAssessment = await this.assessPaymentRisk(validatedParams, context);
      
      const security: PaymentSecurityContext = {
        tenantId: context.tenantId || '',
        customerId: context.customerId,
        sessionId: context.sessionId || this.generateSecureId(),
        stripeAccountId: context.stripeAccountId,
        riskAssessment,
        auditLog,
      };

      auditLog.riskScore = riskAssessment.score;

      // 3. Check if payment should be blocked
      if (riskAssessment.recommendation === 'decline') {
        auditLog.success = false;
        auditLog.errorMessage = 'Payment declined due to risk assessment';
        this.logAudit(auditLog);
        
        return {
          security,
          error: 'Payment cannot be processed at this time',
        };
      }

      // 4. Prepare Stripe parameters with security enhancements
      const stripeParams: Stripe.PaymentIntentCreateParams = {
        ...validatedParams,
        statement_descriptor: validatedParams.statementDescriptor,
        metadata: {
          ...validatedParams.metadata,
          tenant_id: security.tenantId,
          customer_id: security.customerId || '',
          session_id: security.sessionId,
          risk_score: riskAssessment.score.toString(),
        },
      };

      // Add additional authentication if required
      if (riskAssessment.requiresAdditionalAuth) {
        stripeParams.payment_method_options = {
          card: {
            request_three_d_secure: 'automatic',
          },
        };
      }

      // 5. Create payment intent with Stripe Connect if applicable
      const createOptions: Stripe.RequestOptions = {};
      if (security.stripeAccountId) {
        createOptions.stripeAccount = security.stripeAccountId;
      }

      const paymentIntent = await this.stripe.paymentIntents.create(stripeParams, createOptions);
      
      security.paymentIntentId = paymentIntent.id;
      auditLog.paymentIntentId = paymentIntent.id;
      auditLog.amount = validatedParams.amount;
      auditLog.currency = validatedParams.currency;
      auditLog.success = true;

      this.logAudit(auditLog);

      return {
        paymentIntent,
        security,
      };

    } catch (error) {
      auditLog.success = false;
      auditLog.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (error instanceof Stripe.errors.StripeError) {
        auditLog.errorCode = error.code;
        auditLog.riskScore = 5; // Moderate risk for Stripe errors
      } else {
        auditLog.riskScore = 8; // High risk for unknown errors
      }

      this.logAudit(auditLog);

      return {
        security: {
          tenantId: context.tenantId || '',
          customerId: context.customerId,
          sessionId: context.sessionId || '',
          stripeAccountId: context.stripeAccountId,
          riskAssessment: { score: 100, factors: [], recommendation: 'decline', requiresAdditionalAuth: false },
          auditLog,
        },
        error: 'Payment processing failed',
      };
    }
  }

  /**
   * Secure webhook signature verification
   */
  async verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    endpointSecret: string
  ): Promise<{
    event?: Stripe.Event;
    isValid: boolean;
    error?: string;
  }> {
    try {
      // Verify webhook signature to prevent replay attacks
      const event = this.stripe.webhooks.constructEvent(payload, signature, endpointSecret);
      
      // Additional security checks
      if (!this.isWebhookEventValid(event)) {
        return {
          isValid: false,
          error: 'Invalid webhook event',
        };
      }

      // Log webhook reception
      this.logWebhookAudit(event, true);

      return {
        event,
        isValid: true,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Webhook verification failed';
      
      // Log failed webhook verification
      this.logWebhookAudit(null, false, errorMessage);

      return {
        isValid: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Secure refund processing with fraud detection
   */
  async processSecureRefund(
    params: z.infer<typeof paymentSchemas.createRefund>,
    context: Partial<PaymentSecurityContext>
  ): Promise<{
    refund?: Stripe.Refund;
    security: PaymentSecurityContext;
    error?: string;
  }> {
    const auditLog = this.initializeAuditLog('refund_initiated', context);

    try {
      // 1. Validate refund parameters
      const validatedParams = paymentSchemas.createRefund.parse(params);

      // 2. Retrieve original payment intent
      const paymentIntent = await this.stripe.paymentIntents.retrieve(
        validatedParams.paymentIntentId
      );

      if (!paymentIntent || paymentIntent.status !== 'succeeded') {
        throw new Error('Invalid payment intent for refund');
      }

      // 3. Perform refund risk assessment
      const riskAssessment = await this.assessRefundRisk(validatedParams, paymentIntent, context);
      
      const security: PaymentSecurityContext = {
        tenantId: context.tenantId || '',
        customerId: context.customerId,
        sessionId: context.sessionId || '',
        paymentIntentId: validatedParams.paymentIntentId,
        stripeAccountId: context.stripeAccountId,
        riskAssessment,
        auditLog,
      };

      auditLog.paymentIntentId = validatedParams.paymentIntentId;
      auditLog.amount = validatedParams.amount || paymentIntent.amount;
      auditLog.currency = paymentIntent.currency;
      auditLog.riskScore = riskAssessment.score;

      // 4. Check if refund should be blocked
      if (riskAssessment.recommendation === 'decline') {
        auditLog.success = false;
        auditLog.errorMessage = 'Refund declined due to risk assessment';
        this.logAudit(auditLog);
        
        return {
          security,
          error: 'Refund cannot be processed at this time',
        };
      }

      // 5. Create refund with metadata
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: validatedParams.paymentIntentId,
        amount: validatedParams.amount,
        reason: validatedParams.reason,
        metadata: {
          ...validatedParams.metadata,
          tenant_id: security.tenantId,
          customer_id: security.customerId || '',
          session_id: security.sessionId,
          risk_score: riskAssessment.score.toString(),
          refund_timestamp: Date.now().toString(),
        },
      };

      const createOptions: Stripe.RequestOptions = {};
      if (security.stripeAccountId) {
        createOptions.stripeAccount = security.stripeAccountId;
      }

      const refund = await this.stripe.refunds.create(refundParams, createOptions);
      
      auditLog.success = true;
      auditLog.metadata = { refund_id: refund.id };
      this.logAudit(auditLog);

      return {
        refund,
        security,
      };

    } catch (error) {
      auditLog.success = false;
      auditLog.errorMessage = error instanceof Error ? error.message : 'Refund failed';
      auditLog.riskScore = 8;
      this.logAudit(auditLog);

      return {
        security: {
          tenantId: context.tenantId || '',
          customerId: context.customerId,
          sessionId: context.sessionId || '',
          paymentIntentId: params.paymentIntentId,
          stripeAccountId: context.stripeAccountId,
          riskAssessment: { score: 100, factors: [], recommendation: 'decline', requiresAdditionalAuth: false },
          auditLog,
        },
        error: 'Refund processing failed',
      };
    }
  }

  /**
   * Assess payment risk based on various factors
   */
  private async assessPaymentRisk(
    params: z.infer<typeof paymentSchemas.createPaymentIntent>,
    context: Partial<PaymentSecurityContext>
  ): Promise<PaymentRiskAssessment> {
    const factors: RiskFactor[] = [];
    let totalScore = 0;

    // 1. Amount-based risk
    if (params.amount > 10000000) { // > £100,000
      factors.push({
        type: 'amount',
        severity: 'critical',
        description: 'Extremely high payment amount',
        score: 40,
      });
      totalScore += 40;
    } else if (params.amount > 1000000) { // > £10,000
      factors.push({
        type: 'amount',
        severity: 'high',
        description: 'High payment amount',
        score: 20,
      });
      totalScore += 20;
    } else if (params.amount > 100000) { // > £1,000
      factors.push({
        type: 'amount',
        severity: 'medium',
        description: 'Elevated payment amount',
        score: 10,
      });
      totalScore += 10;
    }

    // 2. Velocity-based risk
    const velocityRisk = await this.assessVelocityRisk(context);
    if (velocityRisk.score > 0) {
      factors.push(velocityRisk);
      totalScore += velocityRisk.score;
    }

    // 3. IP-based risk
    if (context.auditLog?.ipAddress) {
      const ipRisk = await this.assessIPRisk(context.auditLog.ipAddress);
      if (ipRisk.score > 0) {
        factors.push(ipRisk);
        totalScore += ipRisk.score;
      }
    }

    // 4. Pattern-based risk
    const patternRisk = await this.assessPatternRisk(context);
    if (patternRisk.score > 0) {
      factors.push(patternRisk);
      totalScore += patternRisk.score;
    }

    // Determine recommendation
    let recommendation: 'approve' | 'review' | 'decline';
    let requiresAdditionalAuth = false;

    if (totalScore >= 70) {
      recommendation = 'decline';
    } else if (totalScore >= 40) {
      recommendation = 'review';
      requiresAdditionalAuth = true;
    } else if (totalScore >= 20) {
      recommendation = 'approve';
      requiresAdditionalAuth = true;
    } else {
      recommendation = 'approve';
    }

    return {
      score: Math.min(totalScore, 100),
      factors,
      recommendation,
      requiresAdditionalAuth,
    };
  }

  /**
   * Assess refund risk
   */
  private async assessRefundRisk(
    params: z.infer<typeof paymentSchemas.createRefund>,
    paymentIntent: Stripe.PaymentIntent,
    context: Partial<PaymentSecurityContext>
  ): Promise<PaymentRiskAssessment> {
    const factors: RiskFactor[] = [];
    let totalScore = 0;

    // 1. Time-based risk (refunds shortly after payment)
    const paymentAge = Date.now() - (paymentIntent.created * 1000);
    const hoursAge = paymentAge / (1000 * 60 * 60);

    if (hoursAge < 1) {
      factors.push({
        type: 'velocity',
        severity: 'high',
        description: 'Refund requested very shortly after payment',
        score: 25,
      });
      totalScore += 25;
    } else if (hoursAge < 24) {
      factors.push({
        type: 'velocity',
        severity: 'medium',
        description: 'Refund requested within 24 hours',
        score: 10,
      });
      totalScore += 10;
    }

    // 2. Amount-based risk
    const refundAmount = params.amount || paymentIntent.amount;
    if (refundAmount === paymentIntent.amount) {
      // Full refund - lower risk
      totalScore += 0;
    } else {
      // Partial refund - slightly higher risk
      factors.push({
        type: 'amount',
        severity: 'low',
        description: 'Partial refund requested',
        score: 5,
      });
      totalScore += 5;
    }

    // 3. Frequency-based risk
    const recentRefunds = this.auditLogs.filter(
      log => log.event === 'refund_initiated' && 
      log.tenantId === context.tenantId &&
      Date.now() - log.timestamp < 24 * 60 * 60 * 1000 // Last 24 hours
    ).length;

    if (recentRefunds >= 5) {
      factors.push({
        type: 'velocity',
        severity: 'critical',
        description: 'Multiple recent refunds',
        score: 35,
      });
      totalScore += 35;
    } else if (recentRefunds >= 3) {
      factors.push({
        type: 'velocity',
        severity: 'high',
        description: 'Several recent refunds',
        score: 20,
      });
      totalScore += 20;
    }

    // Determine recommendation
    let recommendation: 'approve' | 'review' | 'decline';

    if (totalScore >= 60) {
      recommendation = 'decline';
    } else if (totalScore >= 30) {
      recommendation = 'review';
    } else {
      recommendation = 'approve';
    }

    return {
      score: Math.min(totalScore, 100),
      factors,
      recommendation,
      requiresAdditionalAuth: false,
    };
  }

  /**
   * Assess velocity-based risk
   */
  private async assessVelocityRisk(context: Partial<PaymentSecurityContext>): Promise<RiskFactor> {
    const identifier = context.customerId || context.sessionId || 'anonymous';
    const now = Date.now();
    const hourWindow = 60 * 60 * 1000; // 1 hour
    const dayWindow = 24 * 60 * 60 * 1000; // 24 hours

    let velocity = this.velocityTracking.get(identifier) || {
      hourlyCount: 0,
      hourlyAmount: 0,
      dailyCount: 0,
      dailyAmount: 0,
      lastHourReset: now,
      lastDayReset: now,
    };

    // Reset counters if windows expired
    if (now - velocity.lastHourReset > hourWindow) {
      velocity.hourlyCount = 0;
      velocity.hourlyAmount = 0;
      velocity.lastHourReset = now;
    }

    if (now - velocity.lastDayReset > dayWindow) {
      velocity.dailyCount = 0;
      velocity.dailyAmount = 0;
      velocity.lastDayReset = now;
    }

    // Check velocity limits
    if (velocity.hourlyCount >= 10 || velocity.dailyCount >= 50) {
      return {
        type: 'velocity',
        severity: 'critical',
        description: 'Excessive payment velocity',
        score: 40,
      };
    }

    if (velocity.hourlyCount >= 5 || velocity.dailyCount >= 20) {
      return {
        type: 'velocity',
        severity: 'high',
        description: 'High payment velocity',
        score: 20,
      };
    }

    if (velocity.hourlyCount >= 3 || velocity.dailyCount >= 10) {
      return {
        type: 'velocity',
        severity: 'medium',
        description: 'Elevated payment velocity',
        score: 10,
      };
    }

    return {
      type: 'velocity',
      severity: 'low',
      description: 'Normal payment velocity',
      score: 0,
    };
  }

  /**
   * Assess IP-based risk
   */
  private async assessIPRisk(ipAddress: string): Promise<RiskFactor> {
    if (this.blockedIPs.has(ipAddress)) {
      return {
        type: 'blocklist',
        severity: 'critical',
        description: 'IP address is blocked',
        score: 100,
      };
    }

    // Check for suspicious IP patterns (simplified)
    const recentAttempts = this.auditLogs.filter(
      log => log.ipAddress === ipAddress && 
      Date.now() - log.timestamp < 60 * 60 * 1000 // Last hour
    ).length;

    if (recentAttempts >= 20) {
      return {
        type: 'velocity',
        severity: 'high',
        description: 'High activity from IP address',
        score: 25,
      };
    }

    if (recentAttempts >= 10) {
      return {
        type: 'velocity',
        severity: 'medium',
        description: 'Elevated activity from IP address',
        score: 10,
      };
    }

    return {
      type: 'location',
      severity: 'low',
      description: 'Normal IP activity',
      score: 0,
    };
  }

  /**
   * Assess pattern-based risk
   */
  private async assessPatternRisk(context: Partial<PaymentSecurityContext>): Promise<RiskFactor> {
    // Check for suspicious patterns in user agent, timing, etc.
    const userAgent = context.auditLog?.userAgent || '';
    
    if (!userAgent || userAgent.length < 10) {
      return {
        type: 'pattern',
        severity: 'medium',
        description: 'Suspicious or missing user agent',
        score: 15,
      };
    }

    // Check for bot-like patterns
    if (/bot|crawler|spider|scraper/i.test(userAgent)) {
      return {
        type: 'pattern',
        severity: 'high',
        description: 'Bot-like user agent detected',
        score: 30,
      };
    }

    return {
      type: 'pattern',
      severity: 'low',
      description: 'Normal user agent pattern',
      score: 0,
    };
  }

  /**
   * Validate webhook event
   */
  private isWebhookEventValid(event: Stripe.Event): boolean {
    // Check event age (reject events older than 5 minutes)
    const eventAge = Date.now() - (event.created * 1000);
    if (eventAge > 5 * 60 * 1000) {
      return false;
    }

    // Validate event structure
    if (!event.id || !event.type || !event.data) {
      return false;
    }

    return true;
  }

  /**
   * Initialize audit log
   */
  private initializeAuditLog(event: string, context: Partial<PaymentSecurityContext>): PaymentAuditLog {
    return {
      id: this.generateSecureId('audit'),
      timestamp: Date.now(),
      event,
      tenantId: context.tenantId || '',
      customerId: context.customerId,
      paymentIntentId: context.paymentIntentId,
      stripeAccountId: context.stripeAccountId,
      ipAddress: context.auditLog?.ipAddress || 'unknown',
      userAgent: context.auditLog?.userAgent || 'unknown',
      success: false,
      riskScore: 0,
    };
  }

  /**
   * Log audit event
   */
  private logAudit(auditLog: PaymentAuditLog): void {
    this.auditLogs.push(auditLog);
    
    // Keep only last 10000 logs in memory
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(-10000);
    }

    // In production, send to secure logging service
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify({
        ...auditLog,
        type: 'payment_security_audit',
      }));
    }
  }

  /**
   * Log webhook audit
   */
  private logWebhookAudit(event: Stripe.Event | null, success: boolean, error?: string): void {
    const auditLog: PaymentAuditLog = {
      id: this.generateSecureId('webhook_audit'),
      timestamp: Date.now(),
      event: 'webhook_received',
      tenantId: '',
      ipAddress: 'stripe_webhook',
      userAgent: 'stripe_webhook',
      success,
      riskScore: success ? 0 : 5,
      errorMessage: error,
      metadata: event ? {
        webhook_id: event.id,
        webhook_type: event.type,
        livemode: event.livemode,
      } : undefined,
    };

    this.logAudit(auditLog);
  }

  /**
   * Initialize security monitoring
   */
  private initializeSecurityMonitoring(): void {
    // Clean up old data every hour
    setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000);
  }

  /**
   * Clean up old tracking data
   */
  private cleanupOldData(): void {
    const now = Date.now();
    const dayWindow = 24 * 60 * 60 * 1000;

    // Clean up velocity tracking
    for (const [identifier, velocity] of this.velocityTracking.entries()) {
      if (now - velocity.lastDayReset > dayWindow) {
        this.velocityTracking.delete(identifier);
      }
    }

    // Clean up suspicious patterns
    this.suspiciousPatterns.clear();

    // Keep only recent audit logs
    const weekWindow = 7 * 24 * 60 * 60 * 1000;
    this.auditLogs = this.auditLogs.filter(log => now - log.timestamp < weekWindow);
  }

  /**
   * Generate secure ID
   */
  private generateSecureId(prefix: string = 'pay'): string {
    const timestamp = Date.now().toString(36);
    const randomBytes = crypto.randomBytes(12).toString('hex');
    return `${prefix}_${timestamp}_${randomBytes}`;
  }

  /**
   * Get audit logs for analysis
   */
  getAuditLogs(filters?: {
    tenantId?: string;
    customerId?: string;
    event?: string;
    startTime?: number;
    endTime?: number;
  }): PaymentAuditLog[] {
    return this.auditLogs.filter(log => {
      if (filters?.tenantId && log.tenantId !== filters.tenantId) return false;
      if (filters?.customerId && log.customerId !== filters.customerId) return false;
      if (filters?.event && log.event !== filters.event) return false;
      if (filters?.startTime && log.timestamp < filters.startTime) return false;
      if (filters?.endTime && log.timestamp > filters.endTime) return false;
      return true;
    });
  }

  /**
   * Block IP address
   */
  blockIP(ipAddress: string): void {
    this.blockedIPs.add(ipAddress);
  }

  /**
   * Unblock IP address
   */
  unblockIP(ipAddress: string): void {
    this.blockedIPs.delete(ipAddress);
  }

  /**
   * Get security metrics
   */
  getSecurityMetrics(): {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    averageRiskScore: number;
    blockedIPs: number;
    recentHighRiskTransactions: number;
  } {
    const now = Date.now();
    const dayWindow = 24 * 60 * 60 * 1000;
    const recentLogs = this.auditLogs.filter(log => now - log.timestamp < dayWindow);

    const totalTransactions = recentLogs.length;
    const successfulTransactions = recentLogs.filter(log => log.success).length;
    const failedTransactions = totalTransactions - successfulTransactions;
    
    const averageRiskScore = recentLogs.length > 0 
      ? recentLogs.reduce((sum, log) => sum + log.riskScore, 0) / recentLogs.length 
      : 0;

    const recentHighRiskTransactions = recentLogs.filter(log => log.riskScore >= 70).length;

    return {
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      averageRiskScore,
      blockedIPs: this.blockedIPs.size,
      recentHighRiskTransactions,
    };
  }
}

interface PaymentVelocity {
  hourlyCount: number;
  hourlyAmount: number;
  dailyCount: number;
  dailyAmount: number;
  lastHourReset: number;
  lastDayReset: number;
}

export const createPaymentSecurityService = (stripeSecretKey: string) => {
  return new PaymentSecurityService(stripeSecretKey);
};