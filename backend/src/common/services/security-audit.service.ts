import { Injectable, Logger } from '@nestjs/common';

/**
 * Security Event Types
 */
export enum SecurityEventType {
  // Authentication events
  LOGIN_SUCCESS = 'AUTH_LOGIN_SUCCESS',
  LOGIN_FAILURE = 'AUTH_LOGIN_FAILURE',
  LOGIN_LOCKED = 'AUTH_LOGIN_LOCKED',
  LOGOUT = 'AUTH_LOGOUT',
  PASSWORD_CHANGE = 'AUTH_PASSWORD_CHANGE',
  PASSWORD_RESET_REQUEST = 'AUTH_PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_SUCCESS = 'AUTH_PASSWORD_RESET_SUCCESS',
  MFA_ENABLED = 'AUTH_MFA_ENABLED',
  MFA_DISABLED = 'AUTH_MFA_DISABLED',
  MFA_FAILURE = 'AUTH_MFA_FAILURE',
  SESSION_INVALIDATED = 'AUTH_SESSION_INVALIDATED',

  // Authorization events
  ACCESS_DENIED = 'AUTHZ_ACCESS_DENIED',
  ROLE_CHANGE = 'AUTHZ_ROLE_CHANGE',
  PERMISSION_DENIED = 'AUTHZ_PERMISSION_DENIED',

  // API events
  API_KEY_CREATED = 'API_KEY_CREATED',
  API_KEY_REVOKED = 'API_KEY_REVOKED',
  API_KEY_USED = 'API_KEY_USED',
  RATE_LIMIT_EXCEEDED = 'API_RATE_LIMIT_EXCEEDED',

  // Security threats
  SQL_INJECTION_ATTEMPT = 'THREAT_SQL_INJECTION',
  XSS_ATTEMPT = 'THREAT_XSS',
  CSRF_FAILURE = 'THREAT_CSRF_FAILURE',
  SUSPICIOUS_ACTIVITY = 'THREAT_SUSPICIOUS_ACTIVITY',
  BRUTE_FORCE_DETECTED = 'THREAT_BRUTE_FORCE',

  // Data events
  DATA_ACCESS = 'DATA_ACCESS',
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_DELETION = 'DATA_DELETION',
  SENSITIVE_DATA_ACCESS = 'DATA_SENSITIVE_ACCESS',

  // Account events
  ACCOUNT_CREATED = 'ACCOUNT_CREATED',
  ACCOUNT_UPDATED = 'ACCOUNT_UPDATED',
  ACCOUNT_DEACTIVATED = 'ACCOUNT_DEACTIVATED',
  ACCOUNT_DELETED = 'ACCOUNT_DELETED',

  // System events
  CONFIG_CHANGE = 'SYSTEM_CONFIG_CHANGE',
  ADMIN_ACTION = 'SYSTEM_ADMIN_ACTION',
}

/**
 * Security Event Severity
 */
export enum SecurityEventSeverity {
  INFO = 'INFO',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Security Event Interface
 */
export interface SecurityEvent {
  timestamp: Date;
  eventType: SecurityEventType;
  severity: SecurityEventSeverity;
  userId?: string;
  userEmail?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  resource?: string;
  action?: string;
  outcome: 'success' | 'failure';
  details?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Security Audit Service
 * Centralized security event logging and monitoring
 */
@Injectable()
export class SecurityAuditService {
  private readonly logger = new Logger('SecurityAudit');
  private readonly eventQueue: SecurityEvent[] = [];
  private readonly maxQueueSize = 1000;

  // Track failed attempts for intrusion detection
  private readonly failedAttempts = new Map<
    string,
    { count: number; firstAttempt: Date; lastAttempt: Date }
  >();
  private readonly FAILED_ATTEMPT_THRESHOLD = 10;
  private readonly FAILED_ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes

  /**
   * Log a security event
   */
  async logEvent(event: Partial<SecurityEvent>): Promise<void> {
    const fullEvent: SecurityEvent = {
      timestamp: new Date(),
      outcome: 'success',
      severity: this.getSeverityForEventType(event.eventType!),
      ...event,
    } as SecurityEvent;

    // Log to console in structured format
    this.logToConsole(fullEvent);

    // Add to queue for batch processing/external systems
    this.addToQueue(fullEvent);

    // Check for intrusion patterns
    if (fullEvent.outcome === 'failure' && fullEvent.ip) {
      await this.trackFailedAttempt(fullEvent);
    }

    // Send alerts for critical events
    if (fullEvent.severity === SecurityEventSeverity.CRITICAL) {
      this.sendAlert(fullEvent);
    }
  }

  /**
   * Log authentication success
   */
  async logLoginSuccess(
    userId: string,
    email: string,
    ip?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logEvent({
      eventType: SecurityEventType.LOGIN_SUCCESS,
      userId,
      userEmail: email,
      ip,
      userAgent,
      outcome: 'success',
    });

    // Clear failed attempts on successful login
    if (ip) {
      this.failedAttempts.delete(ip);
    }
  }

  /**
   * Log authentication failure
   */
  async logLoginFailure(
    email: string,
    reason: string,
    ip?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logEvent({
      eventType: SecurityEventType.LOGIN_FAILURE,
      userEmail: email,
      ip,
      userAgent,
      outcome: 'failure',
      details: { reason },
    });
  }

  /**
   * Log account lockout
   */
  async logAccountLocked(
    userId: string,
    email: string,
    ip?: string,
  ): Promise<void> {
    await this.logEvent({
      eventType: SecurityEventType.LOGIN_LOCKED,
      severity: SecurityEventSeverity.HIGH,
      userId,
      userEmail: email,
      ip,
      outcome: 'failure',
      details: { reason: 'Account locked due to excessive failed attempts' },
    });
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(
    description: string,
    details: Record<string, any>,
    ip?: string,
    userId?: string,
  ): Promise<void> {
    await this.logEvent({
      eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
      severity: SecurityEventSeverity.HIGH,
      userId,
      ip,
      outcome: 'failure',
      details: { description, ...details },
    });
  }

  /**
   * Log security threat detection
   */
  async logThreat(
    type: 'sql_injection' | 'xss' | 'csrf',
    input: string,
    ip?: string,
    requestId?: string,
  ): Promise<void> {
    const eventTypes: Record<string, SecurityEventType> = {
      sql_injection: SecurityEventType.SQL_INJECTION_ATTEMPT,
      xss: SecurityEventType.XSS_ATTEMPT,
      csrf: SecurityEventType.CSRF_FAILURE,
    };

    await this.logEvent({
      eventType: eventTypes[type],
      severity: SecurityEventSeverity.HIGH,
      ip,
      requestId,
      outcome: 'failure',
      details: { blockedInput: input.substring(0, 200) },
    });
  }

  /**
   * Log rate limit exceeded
   */
  async logRateLimitExceeded(
    ip: string,
    endpoint: string,
    limit: number,
  ): Promise<void> {
    await this.logEvent({
      eventType: SecurityEventType.RATE_LIMIT_EXCEEDED,
      severity: SecurityEventSeverity.MEDIUM,
      ip,
      resource: endpoint,
      outcome: 'failure',
      details: { limit },
    });
  }

  /**
   * Log access denied
   */
  async logAccessDenied(
    userId: string,
    resource: string,
    action: string,
    ip?: string,
  ): Promise<void> {
    await this.logEvent({
      eventType: SecurityEventType.ACCESS_DENIED,
      severity: SecurityEventSeverity.MEDIUM,
      userId,
      ip,
      resource,
      action,
      outcome: 'failure',
    });
  }

  /**
   * Log data access (for audit trail)
   */
  async logDataAccess(
    userId: string,
    resource: string,
    action: string,
    recordId?: string,
  ): Promise<void> {
    await this.logEvent({
      eventType: SecurityEventType.DATA_ACCESS,
      severity: SecurityEventSeverity.INFO,
      userId,
      resource,
      action,
      outcome: 'success',
      details: { recordId },
    });
  }

  /**
   * Get recent security events (for admin dashboard)
   */
  getRecentEvents(
    limit: number = 100,
    severity?: SecurityEventSeverity,
  ): SecurityEvent[] {
    let events = [...this.eventQueue].reverse();

    if (severity) {
      events = events.filter((e) => e.severity === severity);
    }

    return events.slice(0, limit);
  }

  /**
   * Get security metrics
   */
  getSecurityMetrics(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    suspiciousIps: string[];
  } {
    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};

    for (const event of this.eventQueue) {
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
      eventsBySeverity[event.severity] =
        (eventsBySeverity[event.severity] || 0) + 1;
    }

    const suspiciousIps = Array.from(this.failedAttempts.entries())
      .filter(([, data]) => data.count >= this.FAILED_ATTEMPT_THRESHOLD)
      .map(([ip]) => ip);

    return {
      totalEvents: this.eventQueue.length,
      eventsByType,
      eventsBySeverity,
      suspiciousIps,
    };
  }

  // Private methods

  private getSeverityForEventType(
    type: SecurityEventType,
  ): SecurityEventSeverity {
    const severityMap: Partial<
      Record<SecurityEventType, SecurityEventSeverity>
    > = {
      [SecurityEventType.SQL_INJECTION_ATTEMPT]: SecurityEventSeverity.CRITICAL,
      [SecurityEventType.XSS_ATTEMPT]: SecurityEventSeverity.HIGH,
      [SecurityEventType.BRUTE_FORCE_DETECTED]: SecurityEventSeverity.CRITICAL,
      [SecurityEventType.LOGIN_LOCKED]: SecurityEventSeverity.HIGH,
      [SecurityEventType.SUSPICIOUS_ACTIVITY]: SecurityEventSeverity.HIGH,
      [SecurityEventType.ACCESS_DENIED]: SecurityEventSeverity.MEDIUM,
      [SecurityEventType.RATE_LIMIT_EXCEEDED]: SecurityEventSeverity.MEDIUM,
      [SecurityEventType.LOGIN_SUCCESS]: SecurityEventSeverity.INFO,
      [SecurityEventType.LOGOUT]: SecurityEventSeverity.INFO,
    };

    return severityMap[type] || SecurityEventSeverity.LOW;
  }

  private logToConsole(event: SecurityEvent): void {
    const logLevel =
      event.severity === SecurityEventSeverity.CRITICAL ||
      event.severity === SecurityEventSeverity.HIGH
        ? 'warn'
        : 'log';

    const logMessage = {
      type: 'SECURITY_AUDIT',
      ...event,
      timestamp: event.timestamp.toISOString(),
    };

    if (process.env.NODE_ENV === 'production') {
      console[logLevel](JSON.stringify(logMessage));
    } else {
      this.logger[logLevel](
        `[${event.severity}] ${event.eventType} - ${event.outcome}`,
        event.details,
      );
    }
  }

  private addToQueue(event: SecurityEvent): void {
    this.eventQueue.push(event);

    // Trim queue if too large
    if (this.eventQueue.length > this.maxQueueSize) {
      this.eventQueue.shift();
    }
  }

  private async trackFailedAttempt(event: SecurityEvent): Promise<void> {
    const ip = event.ip!;
    const now = new Date();

    const existing = this.failedAttempts.get(ip);

    if (existing) {
      // Check if within time window
      if (
        now.getTime() - existing.firstAttempt.getTime() >
        this.FAILED_ATTEMPT_WINDOW
      ) {
        // Reset if outside window
        this.failedAttempts.set(ip, {
          count: 1,
          firstAttempt: now,
          lastAttempt: now,
        });
      } else {
        // Increment count
        existing.count++;
        existing.lastAttempt = now;

        // Check for brute force
        if (existing.count >= this.FAILED_ATTEMPT_THRESHOLD) {
          await this.logEvent({
            eventType: SecurityEventType.BRUTE_FORCE_DETECTED,
            severity: SecurityEventSeverity.CRITICAL,
            ip,
            outcome: 'failure',
            details: {
              attemptCount: existing.count,
              windowMinutes: this.FAILED_ATTEMPT_WINDOW / 60000,
            },
          });
        }
      }
    } else {
      this.failedAttempts.set(ip, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now,
      });
    }
  }

  private sendAlert(event: SecurityEvent): void {
    // In production, integrate with alerting systems:
    // - PagerDuty
    // - Slack
    // - Email
    // - SMS

    this.logger.error(
      `[CRITICAL SECURITY ALERT] ${event.eventType}`,
      JSON.stringify(event),
    );

    // Example: Send to Slack webhook
    // if (process.env.SLACK_SECURITY_WEBHOOK) {
    //   await fetch(process.env.SLACK_SECURITY_WEBHOOK, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({
    //       text: `🚨 *Security Alert*\n*Type:* ${event.eventType}\n*IP:* ${event.ip || 'N/A'}\n*Details:* ${JSON.stringify(event.details)}`,
    //     }),
    //   });
    // }
  }
}
