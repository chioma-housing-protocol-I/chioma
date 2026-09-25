import { Injectable, Logger } from '@nestjs/common';
import { DegradationService } from './degradation.service';
import {
  DeclareIncidentInput,
  DegradationLevel,
  Incident,
  IncidentMetrics,
  IncidentSeverity,
  IncidentStatus,
} from './resilience.types';

const OPEN_STATUSES = new Set<IncidentStatus>([
  IncidentStatus.OPEN,
  IncidentStatus.INVESTIGATING,
  IncidentStatus.MITIGATING,
  IncidentStatus.MONITORING,
]);

/**
 * Degradation level implied by an open incident of a given severity.
 * SEV3/SEV4 do not change the system posture on their own.
 */
const SEVERITY_TO_LEVEL: Record<IncidentSeverity, DegradationLevel> = {
  [IncidentSeverity.SEV1]: DegradationLevel.SEVERE,
  [IncidentSeverity.SEV2]: DegradationLevel.PARTIAL,
  [IncidentSeverity.SEV3]: DegradationLevel.NORMAL,
  [IncidentSeverity.SEV4]: DegradationLevel.NORMAL,
};

const LEVEL_ORDER: Record<DegradationLevel, number> = {
  [DegradationLevel.NORMAL]: 0,
  [DegradationLevel.PARTIAL]: 1,
  [DegradationLevel.SEVERE]: 2,
};

/**
 * Incident response procedures, in code.
 *
 * Operationalises docs/INCIDENT_RESPONSE.md: declaring incidents, maintaining
 * a timeline, transitioning through the documented lifecycle, and computing
 * the response metrics (MTTM/MTTR). Declaring or resolving an incident also
 * drives the {@link DegradationService} so the system automatically sheds
 * non-essential features for the duration of a SEV1/SEV2 incident.
 *
 * State is held in memory; it is intended for in-process coordination and for
 * surfacing current incident status, not as the system of record.
 */
@Injectable()
export class IncidentService {
  private readonly logger = new Logger(IncidentService.name);

  private readonly incidents = new Map<string, Incident>();
  /** Per-year monotonic counter used to build INC-YYYY-NNN identifiers. */
  private readonly yearCounters = new Map<number, number>();

  constructor(private readonly degradation: DegradationService) {}

  /** Declare a new incident. Returns the created record. */
  declare(input: DeclareIncidentInput): Incident {
    const now = new Date();
    const startedAt = input.startedAt ?? now;
    const incident: Incident = {
      id: this.nextId(now),
      title: input.title,
      severity: input.severity,
      status: IncidentStatus.OPEN,
      description: input.description,
      category: input.category,
      reportedBy: input.reportedBy,
      affectedServices: input.affectedServices ?? [],
      startedAt,
      detectedAt: now,
      updatedAt: now,
      timeline: [
        { at: now, message: `${input.severity} declared: ${input.title}` },
      ],
    };

    this.incidents.set(incident.id, incident);
    this.logger.warn(
      `Incident declared: ${incident.id} (${incident.severity})`,
    );
    this.applyDegradation();
    return incident;
  }

  /** Append a free-form entry to an incident timeline. */
  addEvent(id: string, message: string): Incident {
    const incident = this.require(id);
    const at = new Date();
    incident.timeline.push({ at, message });
    incident.updatedAt = at;
    return incident;
  }

  /** Transition an incident to a new status, recording it on the timeline. */
  updateStatus(id: string, status: IncidentStatus, note?: string): Incident {
    const incident = this.require(id);
    const at = new Date();

    incident.status = status;
    incident.updatedAt = at;
    if (status === IncidentStatus.MITIGATING && !incident.mitigatedAt) {
      incident.mitigatedAt = at;
    }
    if (
      (status === IncidentStatus.RESOLVED ||
        status === IncidentStatus.CLOSED) &&
      !incident.resolvedAt
    ) {
      incident.resolvedAt = at;
    }
    incident.timeline.push({
      at,
      message: note ? `Status -> ${status}: ${note}` : `Status -> ${status}`,
    });

    this.applyDegradation();
    return incident;
  }

  /** Convenience transition: mark mitigation applied. */
  mitigate(id: string, note?: string): Incident {
    return this.updateStatus(id, IncidentStatus.MITIGATING, note);
  }

  /** Convenience transition: mark the incident resolved. */
  resolve(id: string, note?: string): Incident {
    return this.updateStatus(id, IncidentStatus.RESOLVED, note);
  }

  get(id: string): Incident | undefined {
    return this.incidents.get(id);
  }

  /** Incidents that are not yet resolved or closed. */
  listOpen(): Incident[] {
    return Array.from(this.incidents.values()).filter((i) =>
      OPEN_STATUSES.has(i.status),
    );
  }

  listAll(): Incident[] {
    return Array.from(this.incidents.values());
  }

  /**
   * Response metrics for a single incident (milliseconds). `timeToMitigateMs`
   * and `timeToResolveMs` are only present once the milestone is reached.
   */
  getMetrics(id: string): IncidentMetrics {
    const incident = this.require(id);
    return {
      id,
      timeToDetectMs:
        incident.detectedAt.getTime() - incident.startedAt.getTime(),
      timeToMitigateMs: incident.mitigatedAt
        ? incident.mitigatedAt.getTime() - incident.detectedAt.getTime()
        : undefined,
      timeToResolveMs: incident.resolvedAt
        ? incident.resolvedAt.getTime() - incident.detectedAt.getTime()
        : undefined,
    };
  }

  /**
   * Recompute the degradation level from the highest-severity open incident.
   * Falls back to NORMAL when nothing is open.
   */
  private applyDegradation(): void {
    const open = this.listOpen();
    let target = DegradationLevel.NORMAL;
    let driver: Incident | undefined;

    for (const incident of open) {
      const level = SEVERITY_TO_LEVEL[incident.severity];
      if (LEVEL_ORDER[level] > LEVEL_ORDER[target]) {
        target = level;
        driver = incident;
      }
    }

    const reason = driver
      ? `${driver.id} (${driver.severity}): ${driver.title}`
      : 'all incidents resolved';
    this.degradation.setLevel(target, reason);
  }

  private nextId(now: Date): string {
    const year = now.getFullYear();
    const next = (this.yearCounters.get(year) ?? 0) + 1;
    this.yearCounters.set(year, next);
    return `INC-${year}-${String(next).padStart(3, '0')}`;
  }

  private require(id: string): Incident {
    const incident = this.incidents.get(id);
    if (!incident) {
      throw new Error(`Unknown incident: ${id}`);
    }
    return incident;
  }
}
