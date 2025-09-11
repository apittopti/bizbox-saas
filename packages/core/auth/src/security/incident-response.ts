import { auditLogger } from '@bizbox/core-database';
import { withTenantContext } from '@bizbox/core-database';

export interface SecurityIncident {
  id: string;
  type: SecurityIncidentType;
  severity: SecuritySeverity;
  description: string;
  source: {
    ip?: string;
    userAgent?: string;
    userId?: string;
    tenantId?: string;
  };
  metadata: Record<string, any>;
  timestamp: Date;
  status: IncidentStatus;
  response?: IncidentResponse;
}

export enum SecurityIncidentType {
  BRUTE_FORCE_ATTACK = 'brute_force_attack',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
  XSS_ATTEMPT = 'xss_attempt',
  CSRF_ATTACK = 'csrf_attack',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  DATA_BREACH_ATTEMPT = 'data_breach_attempt',
  MALWARE_UPLOAD = 'malware_upload',
  RATE_LIMIT_VIOLATION = 'rate_limit_violation',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
}

export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum IncidentStatus {
  DETECTED = 'detected',
  INVESTIGATING = 'investigating',
  CONTAINED = 'contained',
  RESOLVED = 'resolved',
  FALSE_POSITIVE = 'false_positive',
}

export interface IncidentResponse {
  actions: ResponseAction[];
  notifications: NotificationSent[];
  blockedIps?: string[];
  suspendedUsers?: string[];
  timestamp: Date;
}

export interface ResponseAction {
  type: string;
  description: string;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export interface NotificationSent {
  type: 'email' | 'sms' | 'webhook' | 'slack';
  recipient: string;
  timestamp: Date;
  success: boolean;
}

export class IncidentResponseSystem {
  private static instance: IncidentResponseSystem;
  private incidents: Map<string, SecurityIncident> = new Map();
  private blockedIps: Set<string> = new Set();
  private suspendedUsers: Set<string> = new Set();

  static getInstance(): IncidentResponseSystem {
    if (!IncidentResponseSystem.instance) {
      IncidentResponseSystem.instance = new IncidentResponseSystem();
    }
    return IncidentResponseSystem.instance;
  }

  /**
   * Report a security incident
   */
  async reportIncident(
    type: SecurityIncidentType,
    severity: SecuritySeverity,
    description: string,
    source: SecurityIncident['source'],
    metadata: Record<string, any> = {}
  ): Promise<string> {
    const incidentId = this.generateIncidentId();
    
    const incident: SecurityIncident = {
      id: incidentId,
      type,
      severity,
      description,
      source,
      metadata,
      timestamp: new Date(),
      status: IncidentStatus.DETECTED,
    };

    this.incidents.set(incidentId, incident);

    // Log to audit system
    if (source.tenantId) {
      await withTenantContext({ tenantId: source.tenantId }, async () => {
        await auditLogger.logSystemEvent(
          'SECURITY_INCIDENT',
          'security',
          incidentId,
          {
            type,
            severity,
            description,
            source,
            metadata,
          }
        );
      });
    }

    // Trigger automated response
    await this.triggerAutomatedResponse(incident);

    console.error(`Security incident reported: ${type} (${severity}) - ${description}`);
    
    return incidentId;
  }

  /**
   * Trigger automated response based on incident type and severity
   */
  private async triggerAutomatedResponse(incident: SecurityIncident): Promise<void> {
    const actions: ResponseAction[] = [];
    const notifications: NotificationSent[] = [];

    try {
      // Automated blocking for high-severity incidents
      if (incident.severity === SecuritySeverity.HIGH || incident.severity === SecuritySeverity.CRITICAL) {
        if (incident.source.ip) {
          await this.blockIp(incident.source.ip);
          actions.push({
            type: 'IP_BLOCK',
            description: `Blocked IP ${incident.source.ip}`,
            timestamp: new Date(),
            success: true,
          });
        }

        if (incident.source.userId && incident.type === SecurityIncidentType.PRIVILEGE_ESCALATION) {
          await this.suspendUser(incident.source.userId);
          actions.push({
            type: 'USER_SUSPEND',
            description: `Suspended user ${incident.source.userId}`,
            timestamp: new Date(),
            success: true,
          });
        }
      }

      // Send notifications for medium+ severity incidents
      if (incident.severity !== SecuritySeverity.LOW) {
        const notificationSent = await this.sendSecurityAlert(incident);
        notifications.push(notificationSent);
      }

      // Update incident with response
      incident.response = {
        actions,
        notifications,
        blockedIps: Array.from(this.blockedIps),
        suspendedUsers: Array.from(this.suspendedUsers),
        timestamp: new Date(),
      };

      incident.status = IncidentStatus.CONTAINED;
      
    } catch (error) {
      console.error('Error in automated incident response:', error);
      
      actions.push({
        type: 'ERROR',
        description: `Automated response failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Block an IP address
   */
  async blockIp(ip: string): Promise<void> {
    this.blockedIps.add(ip);
    
    // In a real implementation, this would update firewall rules
    console.log(`IP ${ip} has been blocked`);
    
    // Log the action
    await auditLogger.logSystemEvent(
      'IP_BLOCKED',
      'security',
      ip,
      { ip, timestamp: new Date().toISOString() }
    );
  }

  /**
   * Suspend a user account
   */
  async suspendUser(userId: string): Promise<void> {
    this.suspendedUsers.add(userId);
    
    // In a real implementation, this would update the user's status in the database
    console.log(`User ${userId} has been suspended`);
    
    // Log the action
    await auditLogger.logSystemEvent(
      'USER_SUSPENDED',
      'security',
      userId,
      { userId, timestamp: new Date().toISOString() }
    );
  }

  /**
   * Send security alert notification
   */
  private async sendSecurityAlert(incident: SecurityIncident): Promise<NotificationSent> {
    // In a real implementation, this would send actual notifications
    const notification: NotificationSent = {
      type: 'email',
      recipient: 'security@bizbox.com',
      timestamp: new Date(),
      success: true,
    };

    console.log(`Security alert sent for incident ${incident.id}`);
    
    return notification;
  }

  /**
   * Check if an IP is blocked
   */
  isIpBlocked(ip: string): boolean {
    return this.blockedIps.has(ip);
  }

  /**
   * Check if a user is suspended
   */
  isUserSuspended(userId: string): boolean {
    return this.suspendedUsers.has(userId);
  }

  /**
   * Get incident by ID
   */
  getIncident(incidentId: string): SecurityIncident | undefined {
    return this.incidents.get(incidentId);
  }

  /**
   * Get all incidents
   */
  getAllIncidents(): SecurityIncident[] {
    return Array.from(this.incidents.values());
  }

  /**
   * Update incident status
   */
  updateIncidentStatus(incidentId: string, status: IncidentStatus): boolean {
    const incident = this.incidents.get(incidentId);
    if (incident) {
      incident.status = status;
      return true;
    }
    return false;
  }

  /**
   * Generate unique incident ID
   */
  private generateIncidentId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `INC-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Create middleware to check for blocked IPs and suspended users
   */
  createSecurityCheckMiddleware() {
    return (req: any, res: any, next: any) => {
      const clientIp = req.ip || req.connection?.remoteAddress;
      
      // Check if IP is blocked
      if (clientIp && this.isIpBlocked(clientIp)) {
        return res.status(403).json({
          error: {
            code: 'IP_BLOCKED',
            message: 'Access denied: IP address is blocked due to security concerns',
          },
        });
      }

      // Check if user is suspended (if authenticated)
      if (req.user && this.isUserSuspended(req.user.id)) {
        return res.status(403).json({
          error: {
            code: 'USER_SUSPENDED',
            message: 'Access denied: User account is suspended due to security concerns',
          },
        });
      }

      next();
    };
  }
}

// Convenience functions for reporting common incidents
export class SecurityMonitor {
  private static incidentSystem = IncidentResponseSystem.getInstance();

  static async reportBruteForceAttack(
    ip: string,
    userAgent: string,
    attemptCount: number,
    tenantId?: string
  ): Promise<string> {
    return await this.incidentSystem.reportIncident(
      SecurityIncidentType.BRUTE_FORCE_ATTACK,
      attemptCount > 10 ? SecuritySeverity.HIGH : SecuritySeverity.MEDIUM,
      `Brute force attack detected: ${attemptCount} failed login attempts`,
      { ip, userAgent, tenantId },
      { attemptCount }
    );
  }

  static async reportSqlInjectionAttempt(
    ip: string,
    userAgent: string,
    query: string,
    userId?: string,
    tenantId?: string
  ): Promise<string> {
    return await this.incidentSystem.reportIncident(
      SecurityIncidentType.SQL_INJECTION_ATTEMPT,
      SecuritySeverity.HIGH,
      'SQL injection attempt detected',
      { ip, userAgent, userId, tenantId },
      { suspiciousQuery: query }
    );
  }

  static async reportXssAttempt(
    ip: string,
    userAgent: string,
    payload: string,
    userId?: string,
    tenantId?: string
  ): Promise<string> {
    return await this.incidentSystem.reportIncident(
      SecurityIncidentType.XSS_ATTEMPT,
      SecuritySeverity.MEDIUM,
      'XSS attempt detected',
      { ip, userAgent, userId, tenantId },
      { suspiciousPayload: payload }
    );
  }

  static async reportUnauthorizedAccess(
    ip: string,
    userAgent: string,
    resource: string,
    userId?: string,
    tenantId?: string
  ): Promise<string> {
    return await this.incidentSystem.reportIncident(
      SecurityIncidentType.UNAUTHORIZED_ACCESS,
      SecuritySeverity.MEDIUM,
      `Unauthorized access attempt to ${resource}`,
      { ip, userAgent, userId, tenantId },
      { resource }
    );
  }

  static async reportMalwareUpload(
    ip: string,
    userAgent: string,
    filename: string,
    userId?: string,
    tenantId?: string
  ): Promise<string> {
    return await this.incidentSystem.reportIncident(
      SecurityIncidentType.MALWARE_UPLOAD,
      SecuritySeverity.CRITICAL,
      `Malware upload attempt detected: ${filename}`,
      { ip, userAgent, userId, tenantId },
      { filename }
    );
  }
}

// Export singleton instance
export const incidentResponseSystem = IncidentResponseSystem.getInstance();
export const securityCheckMiddleware = incidentResponseSystem.createSecurityCheckMiddleware();