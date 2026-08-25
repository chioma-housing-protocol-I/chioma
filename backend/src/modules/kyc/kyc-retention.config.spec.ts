import {
  computeRetentionCutoff,
  DEFAULT_KYC_RETENTION_DAYS,
  resolveKycRetentionDays,
} from './kyc-retention.config';

describe('kyc-retention.config (pure)', () => {
  describe('resolveKycRetentionDays', () => {
    it('returns the default when no config is provided', () => {
      expect(resolveKycRetentionDays()).toBe(DEFAULT_KYC_RETENTION_DAYS);
    });

    it('returns the default when config has no value set', () => {
      expect(resolveKycRetentionDays({ get: () => undefined })).toBe(
        DEFAULT_KYC_RETENTION_DAYS,
      );
    });

    it('uses the configured value when valid', () => {
      expect(resolveKycRetentionDays({ get: () => '30' })).toBe(30);
    });

    it('falls back to the default for a non-numeric value', () => {
      expect(resolveKycRetentionDays({ get: () => 'soon' })).toBe(
        DEFAULT_KYC_RETENTION_DAYS,
      );
    });

    it('falls back to the default for a non-positive value', () => {
      expect(resolveKycRetentionDays({ get: () => '0' })).toBe(
        DEFAULT_KYC_RETENTION_DAYS,
      );
      expect(resolveKycRetentionDays({ get: () => '-5' })).toBe(
        DEFAULT_KYC_RETENTION_DAYS,
      );
    });
  });

  describe('computeRetentionCutoff', () => {
    it('subtracts the resolved retention window from now', () => {
      const now = new Date('2026-06-01T00:00:00.000Z');
      const cutoff = computeRetentionCutoff(now, { get: () => '10' });
      expect(cutoff.toISOString()).toBe('2026-05-22T00:00:00.000Z');
    });

    it('uses the default window when config is absent', () => {
      const now = new Date('2026-06-01T00:00:00.000Z');
      const cutoff = computeRetentionCutoff(now);
      const expected = new Date(now);
      expected.setDate(expected.getDate() - DEFAULT_KYC_RETENTION_DAYS);
      expect(cutoff.toISOString()).toBe(expected.toISOString());
    });
  });
});
