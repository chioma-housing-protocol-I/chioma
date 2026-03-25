import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Request } from 'express';
import {
  ThreatEvent,
  ThreatLevel,
  ThreatStatus,
  ThreatType,
} from './entities/threat-event.entity';
import {
  SecurityEventType,
  SecurityEventSeverity,
} from './entities/security-event.entity';
import { SecurityEventsService } from './security-events.service';

export interface ThreatContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestPath?: string;
  requestMethod?: string;
  payload?: any;
}

/**
 * Real-time threat detection engine.
 * Monitors request patterns and user behaviour for anomalies.
 */
@Injectable()
export class ThreatDetectionService {
  private readonly logger = new Logger(ThreatDetectionService.name);

  // In-memory rate counters keyed by IP:window
  private readonly requestCounters = new Map<
    string,
    { count: number; windowStart: number }
  >();
  // Blocked IPs with TTL
  private readonly blockedIps = new Map<string, number>();

  // Thresholds
  private readonly BRUTE_FORCE_THRESHOLD = 10; // failed logins per 15 min
  private readonly RATE_THRESHOLD = 200; // requests per minute per IP
  private readonly WINDOW_MS = 60_000;

  // Patterns for injection detection
  private readonly SQL_INJECTION_PATTERNS = [
    /(%27)|(')|(--)|(%23)|(#)/gi,
    /(union.+select|select.+from|insert.+into|drop.+table|delete.+from)/gi,
    /(exec|execute|xp_|sp_)/gi,
  ];
  private readonly XSS_PATTERNS = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
  ];
  private readonly PATH_TRAVERSAL_PATTERNS = [
    /\.\.\//g,
    /\.\.%2f/gi,
    /%2e%2e%2f/gi,
  ];

  constructor(
    @InjectRepository(ThreatEvent)
    private threatRepository: Repository<ThreatEvent>,
    private securityEventsService: SecurityEventsService,
  ) {}

  /**
   * Main analysis entry point – call from middleware for every request.
   */
  async analyzeRequest(
    req: Request,
    userId?: string,
  ): Promise<'allow' | 'block'> {
    const ipAddress = this.extractIp(req);
    const ctx: ThreatContext = {
      userId,
      ipAddress,
      userAgent: req.headers['user-agent'],
      requestPath: req.path,
      requestMethod: req.method,
      payload: req.body,
    };

    // 1. Check blocked IPs
    if (this.isIpBlocked(ipAddress)) {
      return 'block';
    }

    // 2. Rate-limit check
    if (this.isRateLimitBreached(ipAddress)) {
      await this.recordThreat({
        ...ctx,
        threatType: ThreatType.RATE_LIMIT_EXCEEDED,
        threatLevel: ThreatLevel.HIGH,
        description: `Rate limit breached: ${ipAddress}`,
        blocked: true,
        autoMitigated: true,
        mitigationAction: 'ip_temp_block',
      });
      this.blockIp(ipAddress, 10 * 60 * 1000); // 10-minute block
      return 'block';
    }

    // 3. Payload inspection
    const payloadStr =
      JSON.stringify(ctx.payload ?? '') + (ctx.requestPath ?? '');
    await this.inspectPayload(payloadStr, ctx);

    // 4. Bot detection heuristics
    await this.detectBotActivity(ctx);

    return 'allow';
  }

  /**
   * Check for brute-force attack based on stored security events.
   */
  async checkBruteForce(ipAddress: string, userId?: string): Promise<boolean> {
    const windowStart = new Date(Date.now() - 15 * 60 * 1000);

    const failedAttempts =
      await this.securityEventsService.getFailedLoginAttempts(
        ipAddress,
        0.25, // 15 minutes
      );

    if (failedAttempts >= this.BRUTE_FORCE_THRESHOLD) {
      await this.recordThreat({
        userId,
        ipAddress,
        threatType: ThreatType.BRUTE_FORCE,
        threatLevel: ThreatLevel.CRITICAL,
        description: `Brute force detected: ${failedAttempts} failed logins in 15 min`,
        evidence: { failedAttempts, windowStart },
        blocked: true,
        autoMitigated: true,
        mitigationAction: 'account_lock',
      });

      // Emit security event for downstream handlers
      await this.securityEventsService.createEvent({
        userId,
        eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecurityEventSeverity.CRITICAL,
        ipAddress,
        details: { threatType: ThreatType.BRUTE_FORCE, failedAttempts },
        success: false,
      });

      return true;
    }
    return false;
  }

  /**
   * Detect privilege escalation attempts.
   */
  async detectPrivilegeEscalation(
    userId: string,
    requestedRole: string,
    currentRole: string,
  ): Promise<void> {
    const escalationMap: Record<string, number> = {
      user: 0,
      tenant: 1,
      landlord: 2,
      support: 3,
      auditor: 4,
      admin: 5,
      super_admin: 6,
    };

    const currentLevel = escalationMap[currentRole] ?? 0;
    const requestedLevel = escalationMap[requestedRole] ?? 0;

    if (requestedLevel > currentLevel + 1) {
      await this.recordThreat({
        userId,
        threatType: ThreatType.PRIVILEGE_ESCALATION,
        threatLevel: ThreatLevel.CRITICAL,
        description: `Privilege escalation attempt: ${currentRole} → ${requestedRole}`,
        evidence: { currentRole, requestedRole },
        blocked: true,
        autoMitigated: true,
        mitigationAction: 'request_denied',
      });
    }
  }

  /**
   * Detect data exfiltration patterns (large data downloads in short periods).
   */
  async detectDataExfiltration(
    userId: string,
    recordsAccessed: number,
    windowMinutes: number = 5,
  ): Promise<void> {
    const threshold = 1000;
    if (recordsAccessed >= threshold) {
      await this.recordThreat({
        userId,
        threatType: ThreatType.DATA_EXFILTRATION,
        threatLevel: ThreatLevel.HIGH,
        description: `Anomalous data access: ${recordsAccessed} records in ${windowMinutes} min`,
        evidence: { recordsAccessed, windowMinutes, threshold },
        autoMitigated: false,
      });

      await this.securityEventsService.createEvent({
        userId,
        eventType: SecurityEventType.DATA_EXPORTED,
        severity: SecurityEventSeverity.HIGH,
        details: { recordsAccessed, windowMinutes },
      });
    }
  }

  /**
   * Get threat statistics for the security dashboard.
   */
  async getThreatStats(hours: number = 24): Promise<{
    total: number;
    byCritical: number;
    byHigh: number;
    byType: Record<string, number>;
    blocked: number;
    autoMitigated: number;
  }> {
    const since = new Date(Date.now() - hours * 3600 * 1000);
    const threats = await this.threatRepository.find({
      where: { createdAt: MoreThan(since) },
    });

    const byType: Record<string, number> = {};
    for (const t of threats) {
      byType[t.threatType] = (byType[t.threatType] ?? 0) + 1;
    }

    return {
      total: threats.length,
      byCritical: threats.filter((t) => t.threatLevel === ThreatLevel.CRITICAL)
        .length,
      byHigh: threats.filter((t) => t.threatLevel === ThreatLevel.HIGH).length,
      byType,
      blocked: threats.filter((t) => t.blocked).length,
      autoMitigated: threats.filter((t) => t.autoMitigated).length,
    };
  }

  /**
   * Get recent threats for admin review.
   */
  async getRecentThreats(limit: number = 50): Promise<ThreatEvent[]> {
    return this.threatRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Mark a threat as false positive.
   */
  async markFalsePositive(threatId: string): Promise<void> {
    await this.threatRepository.update(threatId, {
      status: ThreatStatus.FALSE_POSITIVE,
    });
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async inspectPayload(
    payload: string,
    ctx: ThreatContext,
  ): Promise<void> {
    for (const pattern of this.SQL_INJECTION_PATTERNS) {
      if (pattern.test(payload)) {
        await this.recordThreat({
          ...ctx,
          threatType: ThreatType.SQL_INJECTION,
          threatLevel: ThreatLevel.CRITICAL,
          description: 'SQL injection pattern detected in request',
          evidence: { pattern: pattern.toString() },
          blocked: false,
          autoMitigated: false,
        });
        return;
      }
    }
    for (const pattern of this.XSS_PATTERNS) {
      if (pattern.test(payload)) {
        await this.recordThreat({
          ...ctx,
          threatType: ThreatType.XSS_ATTEMPT,
          threatLevel: ThreatLevel.HIGH,
          description: 'XSS pattern detected in request',
          evidence: { pattern: pattern.toString() },
          blocked: false,
          autoMitigated: false,
        });
        return;
      }
    }
    for (const pattern of this.PATH_TRAVERSAL_PATTERNS) {
      if (pattern.test(payload)) {
        await this.recordThreat({
          ...ctx,
          threatType: ThreatType.PATH_TRAVERSAL,
          threatLevel: ThreatLevel.HIGH,
          description: 'Path traversal pattern detected',
          blocked: false,
          autoMitigated: false,
        });
        return;
      }
    }
  }

  private async detectBotActivity(ctx: ThreatContext): Promise<void> {
    const ua = ctx.userAgent ?? '';
    const botSignatures = [
      /curl\//i,
      /python-requests/i,
      /go-http-client/i,
      /wget/i,
      /scrapy/i,
      /masscan/i,
      /nmap/i,
      /zgrab/i,
    ];

    if (botSignatures.some((s) => s.test(ua))) {
      await this.recordThreat({
        ...ctx,
        threatType: ThreatType.BOT_ACTIVITY,
        threatLevel: ThreatLevel.MEDIUM,
        description: `Bot-like user-agent detected: ${ua.slice(0, 100)}`,
        evidence: { userAgent: ua },
        blocked: false,
        autoMitigated: false,
      });
    }
  }

  private isRateLimitBreached(ipAddress: string | undefined): boolean {
    if (!ipAddress) return false;
    const key = ipAddress;
    const now = Date.now();
    const entry = this.requestCounters.get(key);

    if (!entry || now - entry.windowStart > this.WINDOW_MS) {
      this.requestCounters.set(key, { count: 1, windowStart: now });
      return false;
    }

    entry.count++;
    return entry.count > this.RATE_THRESHOLD;
  }

  private isIpBlocked(ipAddress: string | undefined): boolean {
    if (!ipAddress) return false;
    const unblockAt = this.blockedIps.get(ipAddress);
    if (!unblockAt) return false;
    if (Date.now() > unblockAt) {
      this.blockedIps.delete(ipAddress);
      return false;
    }
    return true;
  }

  private blockIp(ipAddress: string | undefined, durationMs: number): void {
    if (!ipAddress) return;
    this.blockedIps.set(ipAddress, Date.now() + durationMs);
    this.logger.warn(
      `IP temporarily blocked: ${ipAddress} for ${durationMs / 1000}s`,
    );
  }

  private extractIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  private async recordThreat(
    data: Partial<ThreatEvent> & { threatType: ThreatType },
  ): Promise<void> {
    try {
      const threat = this.threatRepository.create({
        userId: data.userId ?? null,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        requestPath: data.requestPath ?? null,
        requestMethod: data.requestMethod ?? null,
        threatType: data.threatType,
        threatLevel: data.threatLevel ?? ThreatLevel.MEDIUM,
        status: ThreatStatus.DETECTED,
        description: data.description ?? null,
        evidence: data.evidence ?? null,
        blocked: data.blocked ?? false,
        autoMitigated: data.autoMitigated ?? false,
        mitigationAction: data.mitigationAction ?? null,
      });
      await this.threatRepository.save(threat);
      this.logger.warn(
        `THREAT DETECTED [${data.threatLevel ?? ThreatLevel.MEDIUM}]: ${data.threatType} - ${data.description}`,
      );
    } catch (err) {
      this.logger.error('Failed to record threat event', err);
    }
  }
}
