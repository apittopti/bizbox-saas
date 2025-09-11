import crypto from 'crypto';
import { z } from 'zod';

// Role-based permissions for refund operations
export const REFUND_PERMISSIONS = {
  // Who can initiate different types of refunds
  CUSTOMER_INITIATED: ['customer', 'customer_support', 'admin', 'super_admin'],
  PARTIAL_REFUND: ['customer_support', 'admin', 'super_admin'],
  FULL_REFUND: ['customer', 'customer_support', 'admin', 'super_admin'],
  CHARGEBACK_REFUND: ['admin', 'super_admin'],
  BULK_REFUND: ['admin', 'super_admin'],
  
  // Who can approve refunds based on amount
  APPROVE_UNDER_100: ['customer_support', 'admin', 'super_admin'],
  APPROVE_UNDER_1000: ['admin', 'super_admin'],
  APPROVE_OVER_1000: ['super_admin'],
  
  // Who can access refund data
  VIEW_OWN_REFUNDS: ['customer'],
  VIEW_TENANT_REFUNDS: ['customer_support', 'admin', 'super_admin'],
  VIEW_ALL_REFUNDS: ['super_admin'],
  
  // Special permissions
  OVERRIDE_FRAUD_CHECK: ['admin', 'super_admin'],
  EXPEDITE_REFUND: ['admin', 'super_admin'],
  CANCEL_REFUND: ['admin', 'super_admin'],
} as const;

export interface RefundSecurityContext {
  tenantId: string;
  userId: string;
  userRole: string;
  customerId?: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  refundId?: string;
  paymentIntentId: string;
  fraudCheck: RefundFraudCheck;
  auditTrail: RefundAuditEntry[];
}

export interface RefundFraudCheck {
  score: number; // 0-100, higher is more suspicious
  flags: FraudFlag[];
  recommendation: 'approve' | 'review' | 'deny';
  requiresApproval: boolean;
  maxAllowedAmount?: number;
  cooling_period?: number; // minutes to wait before allowing
}

export interface FraudFlag {
  type: 'velocity' | 'amount' | 'pattern' | 'chargeback_risk' | 'account_age' | 'payment_method';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  score: number;
  evidence?: Record<string, any>;
}

export interface RefundAuditEntry {
  id: string;
  timestamp: number;
  event: RefundAuditEvent;
  tenantId: string;
  userId: string;
  userRole: string;
  customerId?: string;
  refundId?: string;
  paymentIntentId: string;
  amount?: number;
  currency?: string;
  reason?: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  fraudScore: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
  requiresNotification: boolean;
}

export type RefundAuditEvent = 
  | 'refund_requested'
  | 'refund_approved'
  | 'refund_denied'
  | 'refund_processed'
  | 'refund_failed'
  | 'refund_cancelled'
  | 'fraud_detected'
  | 'manual_review_required'
  | 'approval_requested'
  | 'approval_granted'
  | 'approval_denied'
  | 'chargeback_risk_detected';

// Validation schemas for refund operations
export const refundSecuritySchemas = {
  initiateRefund: z.object({
    paymentIntentId: z.string().startsWith('pi_'),
    amount: z.number().int().min(1).optional(),
    reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer', 'quality_issue', 'damaged_item']),
    description: z.string().max(1000).optional(),
    customerNote: z.string().max(500).optional(),
    metadata: z.record(z.string().max(500)).optional(),
  }),
  
  approveRefund: z.object({
    refundId: z.string(),
    approverNote: z.string().max(1000).optional(),
    overrideFraudCheck: z.boolean().optional(),
  }),
  
  bulkRefund: z.object({
    paymentIntentIds: z.array(z.string().startsWith('pi_')).min(1).max(100),
    reason: z.enum(['system_error', 'bulk_cancellation', 'merchant_error']),
    amount: z.number().int().min(1).optional(),
    description: z.string().max(1000),
  }),
};

export class RefundSecurityService {
  private auditTrail: RefundAuditEntry[] = [];
  private velocityTracking: Map<string, RefundVelocity> = new Map();
  private suspiciousPatterns: Map<string, number> = new Map();
  private pendingApprovals: Map<string, PendingRefundApproval> = new Map();
  private chargebackRiskCache: Map<string, ChargebackRiskData> = new Map();

  /**
   * Secure refund initiation with comprehensive fraud detection
   */
  async initiateSecureRefund(
    request: z.infer<typeof refundSecuritySchemas.initiateRefund>,
    context: Partial<RefundSecurityContext>
  ): Promise<{
    refund?: RefundRequestResult;
    security: RefundSecurityContext;
    error?: string;
  }> {
    const auditEntry = this.initializeAuditEntry('refund_requested', context);
    
    try {
      // 1. Validate input
      const validatedRequest = refundSecuritySchemas.initiateRefund.parse(request);
      
      // 2. Build security context
      const securityContext: RefundSecurityContext = {
        tenantId: context.tenantId || '',
        userId: context.userId || '',
        userRole: context.userRole || 'customer',
        customerId: context.customerId,
        sessionId: context.sessionId || this.generateSecureId(),
        ipAddress: context.ipAddress || 'unknown',
        userAgent: context.userAgent || 'unknown',
        paymentIntentId: validatedRequest.paymentIntentId,
        fraudCheck: { score: 0, flags: [], recommendation: 'approve', requiresApproval: false },
        auditTrail: [],
      };

      // 3. Check authorization
      const authResult = await this.checkRefundAuthorization(validatedRequest, securityContext);
      if (!authResult.authorized) {
        auditEntry.success = false;
        auditEntry.errorMessage = authResult.reason;
        auditEntry.fraudScore = 5;
        this.logAuditEntry(auditEntry);
        
        return {
          security: securityContext,
          error: authResult.reason,
        };
      }

      // 4. Perform fraud detection
      const fraudCheck = await this.performFraudDetection(validatedRequest, securityContext);
      securityContext.fraudCheck = fraudCheck;
      
      auditEntry.fraudScore = fraudCheck.score;
      auditEntry.paymentIntentId = validatedRequest.paymentIntentId;
      auditEntry.amount = validatedRequest.amount;
      auditEntry.reason = validatedRequest.reason;

      // 5. Handle based on fraud recommendation
      if (fraudCheck.recommendation === 'deny') {
        auditEntry.success = false;
        auditEntry.errorMessage = 'Refund denied due to fraud detection';
        this.logAuditEntry(auditEntry);
        
        // Log fraud detection event
        this.logFraudDetection(securityContext, fraudCheck);
        
        return {
          security: securityContext,
          error: 'Refund request cannot be processed due to security concerns',
        };
      }

      // 6. Create refund request
      const refundId = this.generateSecureId('refund');
      securityContext.refundId = refundId;
      auditEntry.refundId = refundId;

      const refundResult: RefundRequestResult = {
        id: refundId,
        status: fraudCheck.recommendation === 'review' ? 'pending_review' : 'pending_processing',
        amount: validatedRequest.amount,
        reason: validatedRequest.reason,
        description: validatedRequest.description,
        requiresApproval: fraudCheck.requiresApproval,
        estimatedProcessingTime: this.calculateProcessingTime(fraudCheck),
        securityFlags: fraudCheck.flags.map(flag => ({
          type: flag.type,
          severity: flag.severity,
          description: flag.description,
        })),
      };

      // 7. Handle approval requirements
      if (fraudCheck.requiresApproval) {
        await this.createApprovalRequest(securityContext, validatedRequest);
        this.logAuditEntry({
          ...auditEntry,
          event: 'approval_requested',
          success: true,
        });
      }

      auditEntry.success = true;
      this.logAuditEntry(auditEntry);

      return {
        refund: refundResult,
        security: securityContext,
      };

    } catch (error) {
      auditEntry.success = false;
      auditEntry.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      auditEntry.fraudScore = 8;
      this.logAuditEntry(auditEntry);

      return {
        security: {
          tenantId: context.tenantId || '',
          userId: context.userId || '',
          userRole: context.userRole || 'customer',
          customerId: context.customerId,
          sessionId: context.sessionId || '',
          ipAddress: context.ipAddress || '',
          userAgent: context.userAgent || '',
          paymentIntentId: request.paymentIntentId,
          fraudCheck: { score: 100, flags: [], recommendation: 'deny', requiresApproval: false },
          auditTrail: [],
        },
        error: 'Refund processing failed',
      };
    }
  }

  /**
   * Process refund approval with security checks
   */
  async processRefundApproval(
    request: z.infer<typeof refundSecuritySchemas.approveRefund>,
    context: Partial<RefundSecurityContext>
  ): Promise<{
    approved: boolean;
    security: RefundSecurityContext;
    error?: string;
  }> {
    const auditEntry = this.initializeAuditEntry('approval_granted', context);
    
    try {
      // 1. Validate approval request
      const validatedRequest = refundSecuritySchemas.approveRefund.parse(request);
      
      // 2. Get pending approval
      const pendingApproval = this.pendingApprovals.get(validatedRequest.refundId);
      if (!pendingApproval) {
        throw new Error('Refund approval not found or already processed');
      }

      const securityContext: RefundSecurityContext = {
        tenantId: context.tenantId || pendingApproval.tenantId,
        userId: context.userId || '',
        userRole: context.userRole || 'admin',
        sessionId: context.sessionId || this.generateSecureId(),
        ipAddress: context.ipAddress || 'unknown',
        userAgent: context.userAgent || 'unknown',
        refundId: validatedRequest.refundId,
        paymentIntentId: pendingApproval.paymentIntentId,
        fraudCheck: pendingApproval.fraudCheck,
        auditTrail: [],
      };

      auditEntry.refundId = validatedRequest.refundId;
      auditEntry.paymentIntentId = pendingApproval.paymentIntentId;
      auditEntry.amount = pendingApproval.amount;

      // 3. Check approver authorization
      const canApprove = this.checkApprovalAuthorization(
        securityContext.userRole,
        pendingApproval.amount
      );

      if (!canApprove) {
        auditEntry.success = false;
        auditEntry.errorMessage = 'Insufficient permissions to approve refund';
        auditEntry.event = 'approval_denied';
        this.logAuditEntry(auditEntry);

        return {
          approved: false,
          security: securityContext,
          error: 'Insufficient permissions to approve this refund',
        };
      }

      // 4. Re-evaluate fraud check if not overridden
      if (!validatedRequest.overrideFraudCheck) {
        const currentFraudCheck = await this.performFraudDetection(
          {
            paymentIntentId: pendingApproval.paymentIntentId,
            amount: pendingApproval.amount,
            reason: pendingApproval.reason as any,
          },
          securityContext
        );

        if (currentFraudCheck.recommendation === 'deny') {
          auditEntry.success = false;
          auditEntry.errorMessage = 'Refund denied due to updated fraud assessment';
          auditEntry.event = 'approval_denied';
          auditEntry.fraudScore = currentFraudCheck.score;
          this.logAuditEntry(auditEntry);

          return {
            approved: false,
            security: securityContext,
            error: 'Refund cannot be approved due to security concerns',
          };
        }
      } else {
        // Log fraud check override
        this.logAuditEntry({
          ...auditEntry,
          event: 'fraud_check_overridden',
          metadata: { approver_note: validatedRequest.approverNote },
        });
      }

      // 5. Approve the refund
      pendingApproval.status = 'approved';
      pendingApproval.approvedBy = securityContext.userId;
      pendingApproval.approvedAt = Date.now();
      pendingApproval.approverNote = validatedRequest.approverNote;

      auditEntry.success = true;
      auditEntry.fraudScore = securityContext.fraudCheck.score;
      auditEntry.metadata = { approver_note: validatedRequest.approverNote };
      this.logAuditEntry(auditEntry);

      return {
        approved: true,
        security: securityContext,
      };

    } catch (error) {
      auditEntry.success = false;
      auditEntry.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      auditEntry.event = 'approval_denied';
      this.logAuditEntry(auditEntry);

      return {
        approved: false,
        security: {
          tenantId: context.tenantId || '',
          userId: context.userId || '',
          userRole: context.userRole || '',
          sessionId: context.sessionId || '',
          ipAddress: context.ipAddress || '',
          userAgent: context.userAgent || '',
          refundId: request.refundId,
          paymentIntentId: '',
          fraudCheck: { score: 0, flags: [], recommendation: 'deny', requiresApproval: false },
          auditTrail: [],
        },
        error: 'Approval processing failed',
      };
    }
  }

  /**
   * Perform comprehensive fraud detection
   */
  private async performFraudDetection(
    request: z.infer<typeof refundSecuritySchemas.initiateRefund>,
    context: RefundSecurityContext
  ): Promise<RefundFraudCheck> {
    const flags: FraudFlag[] = [];
    let totalScore = 0;

    // 1. Velocity-based fraud detection
    const velocityFlags = await this.checkRefundVelocity(context);
    flags.push(...velocityFlags);
    totalScore += velocityFlags.reduce((sum, flag) => sum + flag.score, 0);

    // 2. Amount-based fraud detection
    if (request.amount) {
      const amountFlags = this.checkAmountPatterns(request.amount, context);
      flags.push(...amountFlags);
      totalScore += amountFlags.reduce((sum, flag) => sum + flag.score, 0);
    }

    // 3. Pattern-based fraud detection
    const patternFlags = await this.checkSuspiciousPatterns(context);
    flags.push(...patternFlags);
    totalScore += patternFlags.reduce((sum, flag) => sum + flag.score, 0);

    // 4. Chargeback risk assessment
    const chargebackFlags = await this.assessChargebackRisk(request.paymentIntentId, context);
    flags.push(...chargebackFlags);
    totalScore += chargebackFlags.reduce((sum, flag) => sum + flag.score, 0);

    // 5. Account age and history
    const accountFlags = this.checkAccountHistory(context);
    flags.push(...accountFlags);
    totalScore += accountFlags.reduce((sum, flag) => sum + flag.score, 0);

    // 6. Payment method risk
    const paymentMethodFlags = await this.checkPaymentMethodRisk(request.paymentIntentId);
    flags.push(...paymentMethodFlags);
    totalScore += paymentMethodFlags.reduce((sum, flag) => sum + flag.score, 0);

    // Determine recommendation and approval requirements
    let recommendation: 'approve' | 'review' | 'deny';
    let requiresApproval = false;
    let maxAllowedAmount: number | undefined;
    let cooling_period: number | undefined;

    if (totalScore >= 80) {
      recommendation = 'deny';
    } else if (totalScore >= 50) {
      recommendation = 'review';
      requiresApproval = true;
      maxAllowedAmount = request.amount ? Math.min(request.amount, 10000) : 10000; // Max £100
    } else if (totalScore >= 25) {
      recommendation = 'review';
      requiresApproval = context.userRole === 'customer'; // Customer refunds need approval
    } else {
      recommendation = 'approve';
    }

    // Add cooling period for high-velocity requests
    const highVelocityFlags = flags.filter(f => f.type === 'velocity' && f.severity === 'high');
    if (highVelocityFlags.length > 0) {
      cooling_period = 60; // 1 hour cooling period
    }

    return {
      score: Math.min(totalScore, 100),
      flags: flags.filter(flag => flag.score > 0), // Only return flags that contribute to score
      recommendation,
      requiresApproval,
      maxAllowedAmount,
      cooling_period,
    };
  }

  /**
   * Check refund velocity patterns
   */
  private async checkRefundVelocity(context: RefundSecurityContext): Promise<FraudFlag[]> {
    const flags: FraudFlag[] = [];
    const identifier = context.customerId || context.sessionId;
    const now = Date.now();

    // Get or create velocity tracking
    let velocity = this.velocityTracking.get(identifier) || {
      hourlyCount: 0,
      hourlyAmount: 0,
      dailyCount: 0,
      dailyAmount: 0,
      weeklyCount: 0,
      weeklyAmount: 0,
      lastHourReset: now,
      lastDayReset: now,
      lastWeekReset: now,
    };

    // Reset counters if time windows expired
    const hourWindow = 60 * 60 * 1000;
    const dayWindow = 24 * 60 * 60 * 1000;
    const weekWindow = 7 * 24 * 60 * 60 * 1000;

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

    if (now - velocity.lastWeekReset > weekWindow) {
      velocity.weeklyCount = 0;
      velocity.weeklyAmount = 0;
      velocity.lastWeekReset = now;
    }

    // Check velocity thresholds
    if (velocity.hourlyCount >= 5) {
      flags.push({
        type: 'velocity',
        severity: 'critical',
        description: `${velocity.hourlyCount} refunds requested in the last hour`,
        score: 40,
        evidence: { hourly_count: velocity.hourlyCount },
      });
    } else if (velocity.hourlyCount >= 3) {
      flags.push({
        type: 'velocity',
        severity: 'high',
        description: `${velocity.hourlyCount} refunds requested in the last hour`,
        score: 25,
        evidence: { hourly_count: velocity.hourlyCount },
      });
    }

    if (velocity.dailyCount >= 10) {
      flags.push({
        type: 'velocity',
        severity: 'high',
        description: `${velocity.dailyCount} refunds requested today`,
        score: 30,
        evidence: { daily_count: velocity.dailyCount },
      });
    } else if (velocity.dailyCount >= 5) {
      flags.push({
        type: 'velocity',
        severity: 'medium',
        description: `${velocity.dailyCount} refunds requested today`,
        score: 15,
        evidence: { daily_count: velocity.dailyCount },
      });
    }

    if (velocity.weeklyCount >= 20) {
      flags.push({
        type: 'velocity',
        severity: 'high',
        description: `${velocity.weeklyCount} refunds requested this week`,
        score: 25,
        evidence: { weekly_count: velocity.weeklyCount },
      });
    }

    // Update velocity tracking
    velocity.hourlyCount++;
    velocity.dailyCount++;
    velocity.weeklyCount++;
    this.velocityTracking.set(identifier, velocity);

    return flags;
  }

  /**
   * Check amount-based fraud patterns
   */
  private checkAmountPatterns(amount: number, context: RefundSecurityContext): FraudFlag[] {
    const flags: FraudFlag[] = [];

    // Check for unusual amounts
    if (amount >= 100000) { // £1,000+
      flags.push({
        type: 'amount',
        severity: 'high',
        description: 'High-value refund request',
        score: 30,
        evidence: { amount },
      });
    } else if (amount >= 50000) { // £500+
      flags.push({
        type: 'amount',
        severity: 'medium',
        description: 'Elevated refund amount',
        score: 15,
        evidence: { amount },
      });
    }

    // Check for round numbers (potentially suspicious)
    if (amount % 10000 === 0 && amount >= 50000) { // Round £500+
      flags.push({
        type: 'pattern',
        severity: 'low',
        description: 'Round amount refund request',
        score: 5,
        evidence: { amount, is_round: true },
      });
    }

    return flags;
  }

  /**
   * Check for suspicious patterns
   */
  private async checkSuspiciousPatterns(context: RefundSecurityContext): Promise<FraudFlag[]> {
    const flags: FraudFlag[] = [];

    // Check user agent patterns
    if (!context.userAgent || context.userAgent.length < 10) {
      flags.push({
        type: 'pattern',
        severity: 'medium',
        description: 'Suspicious or missing user agent',
        score: 10,
        evidence: { user_agent: context.userAgent },
      });
    }

    // Check for automated patterns
    if (/bot|crawler|spider|automated/i.test(context.userAgent)) {
      flags.push({
        type: 'pattern',
        severity: 'high',
        description: 'Automated user agent detected',
        score: 25,
        evidence: { user_agent: context.userAgent },
      });
    }

    // Check IP-based patterns
    const recentRefundsFromIP = this.auditTrail.filter(
      entry => entry.ipAddress === context.ipAddress &&
      entry.event === 'refund_requested' &&
      Date.now() - entry.timestamp < 24 * 60 * 60 * 1000 // Last 24 hours
    ).length;

    if (recentRefundsFromIP >= 10) {
      flags.push({
        type: 'pattern',
        severity: 'critical',
        description: 'Multiple refunds from same IP address',
        score: 35,
        evidence: { ip_refund_count: recentRefundsFromIP },
      });
    } else if (recentRefundsFromIP >= 5) {
      flags.push({
        type: 'pattern',
        severity: 'high',
        description: 'Several refunds from same IP address',
        score: 20,
        evidence: { ip_refund_count: recentRefundsFromIP },
      });
    }

    return flags;
  }

  /**
   * Assess chargeback risk
   */
  private async assessChargebackRisk(
    paymentIntentId: string,
    context: RefundSecurityContext
  ): Promise<FraudFlag[]> {
    const flags: FraudFlag[] = [];

    // Check cached chargeback risk data
    const riskData = this.chargebackRiskCache.get(paymentIntentId);
    if (riskData) {
      if (riskData.riskScore >= 70) {
        flags.push({
          type: 'chargeback_risk',
          severity: 'critical',
          description: 'High chargeback risk payment',
          score: 40,
          evidence: { chargeback_risk_score: riskData.riskScore },
        });
      } else if (riskData.riskScore >= 40) {
        flags.push({
          type: 'chargeback_risk',
          severity: 'medium',
          description: 'Moderate chargeback risk payment',
          score: 20,
          evidence: { chargeback_risk_score: riskData.riskScore },
        });
      }
    }

    // Check for recent chargebacks from same customer
    const recentChargebacks = this.auditTrail.filter(
      entry => entry.customerId === context.customerId &&
      entry.event === 'chargeback_risk_detected' &&
      Date.now() - entry.timestamp < 30 * 24 * 60 * 60 * 1000 // Last 30 days
    ).length;

    if (recentChargebacks >= 3) {
      flags.push({
        type: 'chargeback_risk',
        severity: 'critical',
        description: 'Customer with multiple recent chargebacks',
        score: 45,
        evidence: { recent_chargebacks: recentChargebacks },
      });
    } else if (recentChargebacks >= 1) {
      flags.push({
        type: 'chargeback_risk',
        severity: 'high',
        description: 'Customer with recent chargeback history',
        score: 25,
        evidence: { recent_chargebacks: recentChargebacks },
      });
    }

    return flags;
  }

  /**
   * Check account history and age
   */
  private checkAccountHistory(context: RefundSecurityContext): FraudFlag[] {
    const flags: FraudFlag[] = [];

    // Check for new accounts (if customer ID provided)
    if (context.customerId) {
      const customerRefunds = this.auditTrail.filter(
        entry => entry.customerId === context.customerId
      );

      const firstRefund = customerRefunds.sort((a, b) => a.timestamp - b.timestamp)[0];
      if (firstRefund) {
        const accountAge = Date.now() - firstRefund.timestamp;
        const hoursAge = accountAge / (1000 * 60 * 60);

        if (hoursAge < 24) {
          flags.push({
            type: 'account_age',
            severity: 'medium',
            description: 'New customer account requesting refund',
            score: 15,
            evidence: { account_age_hours: hoursAge },
          });
        }
      }

      // Check refund-to-payment ratio
      const customerPayments = this.auditTrail.filter(
        entry => entry.customerId === context.customerId &&
        entry.event.includes('payment')
      ).length;

      if (customerRefunds.length > 0 && customerPayments > 0) {
        const refundRatio = customerRefunds.length / customerPayments;
        if (refundRatio > 0.5) { // More than 50% refund ratio
          flags.push({
            type: 'pattern',
            severity: 'high',
            description: 'High refund-to-payment ratio',
            score: 30,
            evidence: { refund_ratio: refundRatio },
          });
        }
      }
    }

    return flags;
  }

  /**
   * Check payment method risk factors
   */
  private async checkPaymentMethodRisk(paymentIntentId: string): Promise<FraudFlag[]> {
    const flags: FraudFlag[] = [];

    // This would typically integrate with payment processor API
    // For now, we'll check against known high-risk patterns
    
    // Check for prepaid cards, virtual cards, etc.
    // This would require integration with card BIN database
    
    return flags;
  }

  /**
   * Check refund authorization
   */
  private async checkRefundAuthorization(
    request: z.infer<typeof refundSecuritySchemas.initiateRefund>,
    context: RefundSecurityContext
  ): Promise<{ authorized: boolean; reason?: string }> {
    
    // Check basic permissions
    if (!REFUND_PERMISSIONS.CUSTOMER_INITIATED.includes(context.userRole)) {
      return { authorized: false, reason: 'Insufficient permissions to initiate refunds' };
    }

    // Check partial refund permissions
    if (request.amount !== undefined) {
      if (!REFUND_PERMISSIONS.PARTIAL_REFUND.includes(context.userRole)) {
        return { authorized: false, reason: 'Insufficient permissions for partial refunds' };
      }
    }

    // Additional authorization checks based on context
    if (context.userRole === 'customer' && context.customerId !== context.customerId) {
      return { authorized: false, reason: 'Cannot initiate refund for other customers' };
    }

    return { authorized: true };
  }

  /**
   * Check approval authorization based on role and amount
   */
  private checkApprovalAuthorization(userRole: string, amount?: number): boolean {
    if (!amount) return true;

    if (amount <= 10000 && REFUND_PERMISSIONS.APPROVE_UNDER_100.includes(userRole)) {
      return true;
    }

    if (amount <= 100000 && REFUND_PERMISSIONS.APPROVE_UNDER_1000.includes(userRole)) {
      return true;
    }

    if (amount > 100000 && REFUND_PERMISSIONS.APPROVE_OVER_1000.includes(userRole)) {
      return true;
    }

    return false;
  }

  /**
   * Create approval request
   */
  private async createApprovalRequest(
    context: RefundSecurityContext,
    request: z.infer<typeof refundSecuritySchemas.initiateRefund>
  ): Promise<void> {
    const approval: PendingRefundApproval = {
      id: context.refundId!,
      tenantId: context.tenantId,
      paymentIntentId: request.paymentIntentId,
      amount: request.amount,
      reason: request.reason,
      requestedBy: context.userId,
      requestedAt: Date.now(),
      status: 'pending',
      fraudCheck: context.fraudCheck,
    };

    this.pendingApprovals.set(context.refundId!, approval);
  }

  /**
   * Calculate estimated processing time
   */
  private calculateProcessingTime(fraudCheck: RefundFraudCheck): number {
    if (fraudCheck.recommendation === 'deny') return 0;
    if (fraudCheck.requiresApproval) return 24; // 24 hours for manual review
    if (fraudCheck.score > 25) return 4; // 4 hours for elevated risk
    return 1; // 1 hour for normal processing
  }

  /**
   * Initialize audit entry
   */
  private initializeAuditEntry(
    event: RefundAuditEvent,
    context: Partial<RefundSecurityContext>
  ): RefundAuditEntry {
    return {
      id: this.generateSecureId('audit'),
      timestamp: Date.now(),
      event,
      tenantId: context.tenantId || '',
      userId: context.userId || '',
      userRole: context.userRole || '',
      customerId: context.customerId,
      refundId: context.refundId,
      paymentIntentId: context.paymentIntentId || '',
      ipAddress: context.ipAddress || 'unknown',
      userAgent: context.userAgent || 'unknown',
      success: false,
      fraudScore: 0,
      requiresNotification: false,
    };
  }

  /**
   * Log audit entry
   */
  private logAuditEntry(entry: RefundAuditEntry): void {
    this.auditTrail.push(entry);
    
    // Keep only last 50000 entries in memory
    if (this.auditTrail.length > 50000) {
      this.auditTrail = this.auditTrail.slice(-50000);
    }

    // Determine if notification is required
    entry.requiresNotification = this.shouldNotify(entry);

    // In production, send to secure logging service
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify({
        ...entry,
        type: 'refund_security_audit',
      }));
    }
  }

  /**
   * Log fraud detection event
   */
  private logFraudDetection(context: RefundSecurityContext, fraudCheck: RefundFraudCheck): void {
    const auditEntry: RefundAuditEntry = {
      id: this.generateSecureId('fraud_audit'),
      timestamp: Date.now(),
      event: 'fraud_detected',
      tenantId: context.tenantId,
      userId: context.userId,
      userRole: context.userRole,
      customerId: context.customerId,
      refundId: context.refundId,
      paymentIntentId: context.paymentIntentId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      success: true,
      fraudScore: fraudCheck.score,
      requiresNotification: true,
      metadata: {
        flags: fraudCheck.flags,
        recommendation: fraudCheck.recommendation,
      },
    };

    this.logAuditEntry(auditEntry);
  }

  /**
   * Determine if entry requires notification
   */
  private shouldNotify(entry: RefundAuditEntry): boolean {
    // Notify on high-risk events
    if (entry.fraudScore >= 70) return true;
    if (entry.event === 'fraud_detected') return true;
    if (entry.event === 'approval_requested' && entry.amount && entry.amount > 100000) return true;
    if (!entry.success && entry.fraudScore > 0) return true;
    
    return false;
  }

  /**
   * Generate secure ID
   */
  private generateSecureId(prefix: string = 'ref'): string {
    const timestamp = Date.now().toString(36);
    const randomBytes = crypto.randomBytes(12).toString('hex');
    return `${prefix}_${timestamp}_${randomBytes}`;
  }

  /**
   * Get audit trail for analysis
   */
  getAuditTrail(filters?: {
    tenantId?: string;
    userId?: string;
    customerId?: string;
    event?: RefundAuditEvent;
    startTime?: number;
    endTime?: number;
    minFraudScore?: number;
  }): RefundAuditEntry[] {
    return this.auditTrail.filter(entry => {
      if (filters?.tenantId && entry.tenantId !== filters.tenantId) return false;
      if (filters?.userId && entry.userId !== filters.userId) return false;
      if (filters?.customerId && entry.customerId !== filters.customerId) return false;
      if (filters?.event && entry.event !== filters.event) return false;
      if (filters?.startTime && entry.timestamp < filters.startTime) return false;
      if (filters?.endTime && entry.timestamp > filters.endTime) return false;
      if (filters?.minFraudScore && entry.fraudScore < filters.minFraudScore) return false;
      return true;
    });
  }

  /**
   * Get security metrics
   */
  getSecurityMetrics(tenantId?: string): RefundSecurityMetrics {
    const now = Date.now();
    const dayWindow = 24 * 60 * 60 * 1000;
    const recentEntries = this.auditTrail.filter(entry => {
      const isRecent = now - entry.timestamp < dayWindow;
      const matchesTenant = !tenantId || entry.tenantId === tenantId;
      return isRecent && matchesTenant;
    });

    const totalRequests = recentEntries.filter(e => e.event === 'refund_requested').length;
    const approvedRefunds = recentEntries.filter(e => e.event === 'approval_granted').length;
    const deniedRefunds = recentEntries.filter(e => e.event === 'approval_denied').length;
    const fraudDetections = recentEntries.filter(e => e.event === 'fraud_detected').length;
    
    const averageFraudScore = recentEntries.length > 0
      ? recentEntries.reduce((sum, e) => sum + e.fraudScore, 0) / recentEntries.length
      : 0;

    const highRiskRequests = recentEntries.filter(e => e.fraudScore >= 70).length;

    return {
      totalRequests,
      approvedRefunds,
      deniedRefunds,
      fraudDetections,
      averageFraudScore,
      highRiskRequests,
      pendingApprovals: this.pendingApprovals.size,
    };
  }
}

interface RefundRequestResult {
  id: string;
  status: 'pending_review' | 'pending_processing' | 'approved' | 'denied';
  amount?: number;
  reason: string;
  description?: string;
  requiresApproval: boolean;
  estimatedProcessingTime: number;
  securityFlags: Array<{
    type: string;
    severity: string;
    description: string;
  }>;
}

interface RefundVelocity {
  hourlyCount: number;
  hourlyAmount: number;
  dailyCount: number;
  dailyAmount: number;
  weeklyCount: number;
  weeklyAmount: number;
  lastHourReset: number;
  lastDayReset: number;
  lastWeekReset: number;
}

interface PendingRefundApproval {
  id: string;
  tenantId: string;
  paymentIntentId: string;
  amount?: number;
  reason: string;
  requestedBy: string;
  requestedAt: number;
  status: 'pending' | 'approved' | 'denied';
  approvedBy?: string;
  approvedAt?: number;
  approverNote?: string;
  fraudCheck: RefundFraudCheck;
}

interface ChargebackRiskData {
  paymentIntentId: string;
  riskScore: number;
  factors: string[];
  lastUpdated: number;
}

interface RefundSecurityMetrics {
  totalRequests: number;
  approvedRefunds: number;
  deniedRefunds: number;
  fraudDetections: number;
  averageFraudScore: number;
  highRiskRequests: number;
  pendingApprovals: number;
}

export const createRefundSecurityService = () => {
  return new RefundSecurityService();
};