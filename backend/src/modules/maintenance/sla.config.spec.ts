import {
  computeSlaDeadlines,
  DEFAULT_SLA_WINDOWS,
  resolveSlaWindow,
} from './sla.config';

describe('sla.config (pure)', () => {
  describe('resolveSlaWindow', () => {
    it('returns the default window for a known priority with no config', () => {
      expect(resolveSlaWindow('HIGH')).toEqual(DEFAULT_SLA_WINDOWS.HIGH);
    });

    it('is case-insensitive on priority', () => {
      expect(resolveSlaWindow('high')).toEqual(DEFAULT_SLA_WINDOWS.HIGH);
    });

    it('falls back to MEDIUM defaults for an unrecognized priority', () => {
      expect(resolveSlaWindow('NOT_A_PRIORITY')).toEqual(
        DEFAULT_SLA_WINDOWS.MEDIUM,
      );
    });

    it('falls back to MEDIUM defaults when priority is undefined', () => {
      expect(resolveSlaWindow(undefined)).toEqual(DEFAULT_SLA_WINDOWS.MEDIUM);
    });

    it('prefers configured hours over defaults when present', () => {
      const config = {
        get: (key: string) =>
          ({
            MAINTENANCE_SLA_URGENT_RESPONSE_HOURS: '1',
            MAINTENANCE_SLA_URGENT_RESOLUTION_HOURS: '8',
          })[key],
      };

      expect(resolveSlaWindow('URGENT', config)).toEqual({
        responseHours: 1,
        resolutionHours: 8,
      });
    });

    it('ignores invalid configured values and falls back to defaults', () => {
      const config = { get: () => 'not-a-number' };
      expect(resolveSlaWindow('URGENT', config)).toEqual(
        DEFAULT_SLA_WINDOWS.URGENT,
      );
    });

    it('ignores non-positive configured values and falls back to defaults', () => {
      const config = { get: () => '0' };
      expect(resolveSlaWindow('URGENT', config)).toEqual(
        DEFAULT_SLA_WINDOWS.URGENT,
      );
    });
  });

  describe('computeSlaDeadlines', () => {
    it('adds the resolved window hours to createdAt', () => {
      const createdAt = new Date('2026-01-01T00:00:00.000Z');
      const { responseDueAt, resolutionDueAt } = computeSlaDeadlines(
        createdAt,
        'HIGH',
      );

      expect(responseDueAt.toISOString()).toBe('2026-01-01T04:00:00.000Z');
      expect(resolutionDueAt.toISOString()).toBe('2026-01-03T00:00:00.000Z');
    });

    it('resolution deadline is always after the response deadline', () => {
      for (const priority of Object.keys(DEFAULT_SLA_WINDOWS)) {
        const { responseDueAt, resolutionDueAt } = computeSlaDeadlines(
          new Date(),
          priority,
        );
        expect(resolutionDueAt.getTime()).toBeGreaterThan(
          responseDueAt.getTime(),
        );
      }
    });
  });
});
