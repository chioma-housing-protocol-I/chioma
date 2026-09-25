import { DegradationService } from './degradation.service';
import { DegradationLevel, FeaturePriority } from './resilience.types';
import { FeatureDisabledError } from './resilience.errors';

describe('DegradationService', () => {
  let service: DegradationService;

  beforeEach(() => {
    service = new DegradationService();
  });

  it('starts in the NORMAL level', () => {
    expect(service.getLevel()).toBe(DegradationLevel.NORMAL);
    expect(service.isDegraded()).toBe(false);
  });

  describe('feature gating', () => {
    beforeEach(() => {
      service.registerFeature('payments', FeaturePriority.ESSENTIAL);
      service.registerFeature('search', FeaturePriority.STANDARD);
      service.registerFeature('recommendations', FeaturePriority.OPTIONAL);
    });

    it('enables every feature when NORMAL', () => {
      expect(service.isFeatureEnabled('payments')).toBe(true);
      expect(service.isFeatureEnabled('search')).toBe(true);
      expect(service.isFeatureEnabled('recommendations')).toBe(true);
    });

    it('sheds only OPTIONAL features when PARTIAL', () => {
      service.setLevel(DegradationLevel.PARTIAL, 'high latency');
      expect(service.isFeatureEnabled('payments')).toBe(true);
      expect(service.isFeatureEnabled('search')).toBe(true);
      expect(service.isFeatureEnabled('recommendations')).toBe(false);
    });

    it('keeps only ESSENTIAL features when SEVERE', () => {
      service.setLevel(DegradationLevel.SEVERE, 'db outage');
      expect(service.isFeatureEnabled('payments')).toBe(true);
      expect(service.isFeatureEnabled('search')).toBe(false);
      expect(service.isFeatureEnabled('recommendations')).toBe(false);
    });

    it('treats unregistered features as STANDARD priority', () => {
      expect(service.isFeatureEnabled('unknown')).toBe(true);
      service.setLevel(DegradationLevel.SEVERE);
      expect(service.isFeatureEnabled('unknown')).toBe(false);
    });

    it('assertFeatureEnabled throws FeatureDisabledError when shed', () => {
      service.setLevel(DegradationLevel.PARTIAL);
      expect(() => service.assertFeatureEnabled('payments')).not.toThrow();
      expect(() => service.assertFeatureEnabled('recommendations')).toThrow(
        FeatureDisabledError,
      );
    });
  });

  describe('setLevel', () => {
    it('updates the level, reason, and since timestamp on change', () => {
      const before = service.getStatus().since;
      service.setLevel(DegradationLevel.PARTIAL, 'queue backlog');

      const status = service.getStatus();
      expect(status.level).toBe(DegradationLevel.PARTIAL);
      expect(status.reason).toBe('queue backlog');
      expect(status.since.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('is a no-op when the level is unchanged', () => {
      service.setLevel(DegradationLevel.PARTIAL, 'first');
      const since = service.getStatus().since;
      service.setLevel(DegradationLevel.PARTIAL, 'second');
      // since must not be reset when the level does not actually change
      expect(service.getStatus().since).toBe(since);
    });
  });

  describe('getStatus', () => {
    it('reports each registered feature with its computed enabled flag', () => {
      service.registerFeature('payments', FeaturePriority.ESSENTIAL);
      service.registerFeature('recommendations', FeaturePriority.OPTIONAL);
      service.setLevel(DegradationLevel.PARTIAL);

      const status = service.getStatus();
      const byName = Object.fromEntries(
        status.features.map((f) => [f.name, f.enabled]),
      );
      expect(byName).toEqual({ payments: true, recommendations: false });
    });
  });
});
