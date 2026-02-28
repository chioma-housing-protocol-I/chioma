import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ThreatEvent,
  ThreatLevel,
  ThreatStatus,
  ThreatType,
} from './entities/threat-event.entity';
import { SecurityEvent } from './entities/security-event.entity';

export enum IncidentSeverity {
  P1 = 'P1', // Critical – immediate response
  P2 = 'P2', // High – response within 1 hour
  P3 = 'P3', // Medium – response within 24 hours
  P4 = 'P4', // Low – scheduled remediation
}

export interface SecurityIncident {
  id: string;
  severity: IncidentSeverity;
  title: string;
  description: string;
  affectedUsers: string[];
  threatEvents: ThreatEvent[];
  timeline: IncidentTimelineEntry[];
  status: 'open' | 'investigating' | 'contained' | 'resolved';
  createdAt: Date;
  resolvedAt?: Date;
  responseActions: string[];
}

export interface IncidentTimelineEntry {
  timestamp: Date;
  action: string;
  actor: 'system' | 'analyst';
  details?: string;
}

/**
 * Security Incident Response Service
 *
 * Automates detection-to-response pipeline:
 * - Triage incoming threats
 * - Execute automated playbooks (block IP, lock account, alert)
 * - Track incident lifecycle
 * - Generate post-incident reports
 */
@Injectable()
export class SecurityIncidentService {
  private readonly logger = new Logger(SecurityIncidentService.name);

  // In-memory incident store (production: use a dedicated table)
  private readonly incidents = new Map<string, SecurityIncident>();

  constructor(
    @InjectRepository(ThreatEvent)
    private threatRepository: Repository<ThreatEvent>,
    @InjectRepository(SecurityEvent)
    private securityEventRepository: Repository<SecurityEvent>,
  ) {}

  /**
   * Triage a threat event and create / update an incident.
   */
  async triageThreat(threat: ThreatEvent): Promise<SecurityIncident> {
    const severity = this.mapThreatToSeverity(threat.threatLevel);
    const incidentId = this.buildIncidentKey(threat);

    let incident = this.incidents.get(incidentId);
    if (!incident) {
      incident = {
        id: incidentId,
        severity,
        title: this.buildIncidentTitle(threat),
        description: threat.description ?? '',
        affectedUsers: threat.userId ? [threat.userId] : [],
        threatEvents: [],
        timeline: [],
        status: 'open',
        createdAt: new Date(),
        responseActions: [],
      };
      this.incidents.set(incidentId, incident);
      this.logger.warn(
        `[INCIDENT] ${severity} incident created: ${incident.title}`,
      );
    }

    incident.threatEvents.push(threat);
    if (threat.userId && !incident.affectedUsers.includes(threat.userId)) {
      incident.affectedUsers.push(threat.userId);
    }
    this.addTimeline(
      incident,
      'system',
      `Threat detected: ${threat.threatType}`,
    );

    // Execute automated playbook
    await this.executePlaybook(incident, threat);

    return incident;
  }

  /**
   * Get open incidents ordered by severity.
   */
  getOpenIncidents(): SecurityIncident[] {
    return Array.from(this.incidents.values())
      .filter((i) => i.status !== 'resolved')
      .sort((a, b) => {
        const order = {
          [IncidentSeverity.P1]: 0,
          [IncidentSeverity.P2]: 1,
          [IncidentSeverity.P3]: 2,
          [IncidentSeverity.P4]: 3,
        };
        return order[a.severity] - order[b.severity];
      });
  }

  /**
   * Resolve an incident and generate a summary.
   */
  resolveIncident(
    incidentId: string,
    resolution: string,
  ): SecurityIncident | null {
    const incident = this.incidents.get(incidentId);
    if (!incident) return null;

    incident.status = 'resolved';
    incident.resolvedAt = new Date();
    this.addTimeline(incident, 'analyst', `Incident resolved: ${resolution}`);
    this.logger.log(`[INCIDENT] Resolved: ${incidentId}`);
    return incident;
  }

  /**
   * Generate an incident summary report.
   */
  generateIncidentReport(incidentId: string): Record<string, any> | null {
    const incident = this.incidents.get(incidentId);
    if (!incident) return null;

    const durationMs = incident.resolvedAt
      ? incident.resolvedAt.getTime() - incident.createdAt.getTime()
      : Date.now() - incident.createdAt.getTime();

    return {
      incidentId,
      severity: incident.severity,
      title: incident.title,
      status: incident.status,
      affectedUsers: incident.affectedUsers.length,
      totalThreats: incident.threatEvents.length,
      threatTypes: [...new Set(incident.threatEvents.map((t) => t.threatType))],
      responseActions: incident.responseActions,
      timelineEntries: incident.timeline.length,
      durationMinutes: Math.round(durationMs / 60_000),
      meetsP1Target:
        incident.severity === IncidentSeverity.P1
          ? durationMs <= 5 * 60_000
          : true,
      createdAt: incident.createdAt.toISOString(),
      resolvedAt: incident.resolvedAt?.toISOString(),
    };
  }

  /**
   * MTTD / MTTR metrics for the security dashboard.
   */
  getResponseMetrics(): {
    openIncidents: number;
    p1Count: number;
    p2Count: number;
    avgResolutionMinutes: number;
    slaCompliance: number;
  } {
    const all = Array.from(this.incidents.values());
    const resolved = all.filter((i) => i.resolvedAt);

    const avgResMs =
      resolved.length === 0
        ? 0
        : resolved.reduce(
            (sum, i) => sum + (i.resolvedAt!.getTime() - i.createdAt.getTime()),
            0,
          ) / resolved.length;

    // P1 SLA = 5 min, P2 SLA = 60 min
    const slaCompliant = resolved.filter((i) => {
      const mins = (i.resolvedAt!.getTime() - i.createdAt.getTime()) / 60_000;
      if (i.severity === IncidentSeverity.P1) return mins <= 5;
      if (i.severity === IncidentSeverity.P2) return mins <= 60;
      return true;
    }).length;

    return {
      openIncidents: all.filter((i) => i.status !== 'resolved').length,
      p1Count: all.filter((i) => i.severity === IncidentSeverity.P1).length,
      p2Count: all.filter((i) => i.severity === IncidentSeverity.P2).length,
      avgResolutionMinutes: Math.round(avgResMs / 60_000),
      slaCompliance:
        resolved.length === 0
          ? 100
          : Math.round((slaCompliant / resolved.length) * 100),
    };
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private async executePlaybook(
    incident: SecurityIncident,
    threat: ThreatEvent,
  ): Promise<void> {
    const actions: string[] = [];

    switch (threat.threatType) {
      case ThreatType.BRUTE_FORCE:
      case ThreatType.CREDENTIAL_STUFFING:
        actions.push('lock_account', 'alert_user', 'log_security_event');
        break;
      case ThreatType.SQL_INJECTION:
      case ThreatType.XSS_ATTEMPT:
        actions.push('block_ip', 'alert_security_team', 'increase_monitoring');
        break;
      case ThreatType.PRIVILEGE_ESCALATION:
        actions.push(
          'deny_request',
          'alert_security_team',
          'audit_user_sessions',
        );
        break;
      case ThreatType.DATA_EXFILTRATION:
        actions.push('throttle_user', 'alert_security_team', 'flag_for_review');
        break;
      case ThreatType.ACCOUNT_TAKEOVER:
        actions.push(
          'force_logout',
          'lock_account',
          'alert_user',
          'alert_security_team',
        );
        break;
      default:
        actions.push('log_security_event');
    }

    for (const action of actions) {
      this.logger.log(
        `[PLAYBOOK] Executing: ${action} for incident ${incident.id}`,
      );
      this.addTimeline(incident, 'system', `Playbook action: ${action}`);
      incident.responseActions.push(action);
    }

    // Update threat status
    await this.threatRepository.update(threat.id, {
      status: ThreatStatus.INVESTIGATING,
    });
    incident.status = 'investigating';
  }

  private mapThreatToSeverity(level: ThreatLevel): IncidentSeverity {
    switch (level) {
      case ThreatLevel.CRITICAL:
        return IncidentSeverity.P1;
      case ThreatLevel.HIGH:
        return IncidentSeverity.P2;
      case ThreatLevel.MEDIUM:
        return IncidentSeverity.P3;
      default:
        return IncidentSeverity.P4;
    }
  }

  private buildIncidentKey(threat: ThreatEvent): string {
    // Group related threats (same IP + same type within 1 hour) into one incident
    const hourWindow = Math.floor(threat.createdAt.getTime() / 3_600_000);
    return `${threat.threatType}:${threat.ipAddress ?? 'unknown'}:${hourWindow}`;
  }

  private buildIncidentTitle(threat: ThreatEvent): string {
    return `${threat.threatLevel.toUpperCase()} ${threat.threatType.replace(/_/g, ' ')} from ${threat.ipAddress ?? 'unknown IP'}`;
  }

  private addTimeline(
    incident: SecurityIncident,
    actor: 'system' | 'analyst',
    action: string,
    details?: string,
  ): void {
    incident.timeline.push({ timestamp: new Date(), action, actor, details });
  }
}
