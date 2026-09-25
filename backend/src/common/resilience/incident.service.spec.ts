import { DegradationService } from './degradation.service';
import { IncidentService } from './incident.service';
import {
  DegradationLevel,
  IncidentSeverity,
  IncidentStatus,
} from './resilience.types';

describe('IncidentService', () => {
  let degradation: DegradationService;
  let service: IncidentService;

  beforeEach(() => {
    degradation = new DegradationService();
    service = new IncidentService(degradation);
  });

  describe('declare', () => {
    it('creates an incident with an INC-YYYY-NNN id and an opening timeline entry', () => {
      const incident = service.declare({
        title: 'API 503 errors',
        severity: IncidentSeverity.SEV2,
      });

      expect(incident.id).toMatch(/^INC-\d{4}-\d{3}$/);
      expect(incident.status).toBe(IncidentStatus.OPEN);
      expect(incident.timeline).toHaveLength(1);
      expect(incident.timeline[0].message).toContain('SEV2 declared');
    });

    it('issues sequential ids within the same year', () => {
      const a = service.declare({
        title: 'one',
        severity: IncidentSeverity.SEV3,
      });
      const b = service.declare({
        title: 'two',
        severity: IncidentSeverity.SEV3,
      });
      const year = new Date().getFullYear();
      expect(a.id).toBe(`INC-${year}-001`);
      expect(b.id).toBe(`INC-${year}-002`);
    });
  });

  describe('degradation linkage', () => {
    it('raises degradation to SEVERE for a SEV1 incident', () => {
      service.declare({
        title: 'total outage',
        severity: IncidentSeverity.SEV1,
      });
      expect(degradation.getLevel()).toBe(DegradationLevel.SEVERE);
    });

    it('raises degradation to PARTIAL for a SEV2 incident', () => {
      service.declare({ title: 'slow', severity: IncidentSeverity.SEV2 });
      expect(degradation.getLevel()).toBe(DegradationLevel.PARTIAL);
    });

    it('leaves the system NORMAL for a SEV3 incident', () => {
      service.declare({ title: 'minor', severity: IncidentSeverity.SEV3 });
      expect(degradation.getLevel()).toBe(DegradationLevel.NORMAL);
    });

    it('uses the highest open severity when several incidents overlap', () => {
      service.declare({ title: 'a', severity: IncidentSeverity.SEV2 });
      const sev1 = service.declare({
        title: 'b',
        severity: IncidentSeverity.SEV1,
      });
      expect(degradation.getLevel()).toBe(DegradationLevel.SEVERE);

      // Resolving the SEV1 drops back to the level implied by the SEV2.
      service.resolve(sev1.id);
      expect(degradation.getLevel()).toBe(DegradationLevel.PARTIAL);
    });

    it('returns to NORMAL once all incidents are resolved', () => {
      const inc = service.declare({
        title: 'outage',
        severity: IncidentSeverity.SEV1,
      });
      service.resolve(inc.id);
      expect(degradation.getLevel()).toBe(DegradationLevel.NORMAL);
      expect(service.listOpen()).toHaveLength(0);
    });
  });

  describe('lifecycle', () => {
    it('records mitigatedAt and resolvedAt as it transitions', () => {
      const inc = service.declare({
        title: 'x',
        severity: IncidentSeverity.SEV2,
      });
      service.mitigate(inc.id, 'rolled back');
      expect(service.get(inc.id)?.status).toBe(IncidentStatus.MITIGATING);
      expect(service.get(inc.id)?.mitigatedAt).toBeInstanceOf(Date);

      service.resolve(inc.id, 'fully restored');
      expect(service.get(inc.id)?.status).toBe(IncidentStatus.RESOLVED);
      expect(service.get(inc.id)?.resolvedAt).toBeInstanceOf(Date);
    });

    it('appends free-form timeline events', () => {
      const inc = service.declare({
        title: 'x',
        severity: IncidentSeverity.SEV3,
      });
      service.addEvent(inc.id, 'paged on-call');
      const timeline = service.get(inc.id)?.timeline ?? [];
      expect(timeline.map((e) => e.message)).toContain('paged on-call');
    });

    it('throws for an unknown incident id', () => {
      expect(() => service.addEvent('INC-9999-999', 'noop')).toThrow(
        /Unknown incident/,
      );
    });
  });

  describe('getMetrics', () => {
    it('computes mitigate/resolve durations relative to detection', () => {
      const started = new Date('2026-04-24T10:30:00Z');
      const detected = new Date('2026-04-24T10:30:02Z');

      jest.useFakeTimers().setSystemTime(detected);
      const inc = service.declare({
        title: 'x',
        severity: IncidentSeverity.SEV2,
        startedAt: started,
      });

      jest.setSystemTime(new Date('2026-04-24T10:55:02Z')); // +25m from detect
      service.mitigate(inc.id);
      jest.setSystemTime(new Date('2026-04-24T11:20:02Z')); // +50m from detect
      service.resolve(inc.id);
      jest.useRealTimers();

      const metrics = service.getMetrics(inc.id);
      expect(metrics.timeToDetectMs).toBe(2000);
      expect(metrics.timeToMitigateMs).toBe(25 * 60 * 1000);
      expect(metrics.timeToResolveMs).toBe(50 * 60 * 1000);
    });

    it('leaves mitigate/resolve metrics undefined before those milestones', () => {
      const inc = service.declare({
        title: 'open',
        severity: IncidentSeverity.SEV3,
      });
      const metrics = service.getMetrics(inc.id);
      expect(metrics.timeToMitigateMs).toBeUndefined();
      expect(metrics.timeToResolveMs).toBeUndefined();
    });
  });
});
