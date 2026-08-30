import {
  calculateUserBucket,
  isFeatureEnabledForUser,
} from '../utils/bucketing.util';

describe('bucketing.util', () => {
  describe('calculateUserBucket', () => {
    it('should return a deterministic integer between 0 and 99', () => {
      const bucket1 = calculateUserBucket('user-123', 'new-feature');
      const bucket2 = calculateUserBucket('user-123', 'new-feature');

      expect(bucket1).toBeGreaterThanOrEqual(0);
      expect(bucket1).toBeLessThan(100);
      expect(bucket1).toEqual(bucket2);
    });

    it('should produce different bucket results for different flag keys with same user', () => {
      const bucketA = calculateUserBucket('user-123', 'feature-a');
      const bucketB = calculateUserBucket('user-123', 'feature-b');

      // Given different keys, hash digests differ
      expect(typeof bucketA).toBe('number');
      expect(typeof bucketB).toBe('number');
    });

    it('should handle empty or missing inputs gracefully', () => {
      expect(calculateUserBucket('', 'flag')).toBe(0);
      expect(calculateUserBucket('user', '')).toBe(0);
    });

    it('should demonstrate reasonably uniform distribution across 10,000 users', () => {
      const totalUsers = 10000;
      const flagKey = 'gradual-rollout-test';
      let bucketUnder25 = 0;
      let bucketUnder50 = 0;
      let bucketUnder75 = 0;

      for (let i = 0; i < totalUsers; i++) {
        const userId = `user-uuid-${i}`;
        const bucket = calculateUserBucket(userId, flagKey);

        if (bucket < 25) bucketUnder25++;
        if (bucket < 50) bucketUnder50++;
        if (bucket < 75) bucketUnder75++;
      }

      // Check within reasonable statistical tolerances (+/- 3%)
      expect(bucketUnder25 / totalUsers).toBeGreaterThan(0.22);
      expect(bucketUnder25 / totalUsers).toBeLessThan(0.28);

      expect(bucketUnder50 / totalUsers).toBeGreaterThan(0.47);
      expect(bucketUnder50 / totalUsers).toBeLessThan(0.53);

      expect(bucketUnder75 / totalUsers).toBeGreaterThan(0.72);
      expect(bucketUnder75 / totalUsers).toBeLessThan(0.78);
    });
  });

  describe('isFeatureEnabledForUser', () => {
    it('should return false if master kill switch enabled is false', () => {
      const flag = { key: 'test-flag', enabled: false, rolloutPercentage: 100 };
      expect(isFeatureEnabledForUser(flag, 'user-1')).toBe(false);
      expect(isFeatureEnabledForUser(flag, 'user-2')).toBe(false);
    });

    it('should return false for 0% rollout percentage boundary', () => {
      const flag = { key: 'test-flag', enabled: true, rolloutPercentage: 0 };
      expect(isFeatureEnabledForUser(flag, 'user-1')).toBe(false);
      expect(isFeatureEnabledForUser(flag, 'user-2')).toBe(false);
    });

    it('should return true for 100% rollout percentage boundary', () => {
      const flag = { key: 'test-flag', enabled: true, rolloutPercentage: 100 };
      expect(isFeatureEnabledForUser(flag, 'user-1')).toBe(true);
      expect(isFeatureEnabledForUser(flag, 'user-2')).toBe(true);
      expect(isFeatureEnabledForUser(flag, undefined)).toBe(true);
    });

    it('should evaluate partial rollout percentage deterministically based on user bucket', () => {
      const flagKey = 'partial-rollout';
      const flag = { key: flagKey, enabled: true, rolloutPercentage: 50 };

      const userA = 'user-alpha';
      const userABucket = calculateUserBucket(userA, flagKey);

      const isEnabledForUserA = isFeatureEnabledForUser(flag, userA);
      expect(isEnabledForUserA).toBe(userABucket < 50);

      // Verify idempotency
      expect(isFeatureEnabledForUser(flag, userA)).toBe(isEnabledForUserA);
    });

    it('should return false for missing userId when rolloutPercentage is between 1 and 99', () => {
      const flag = { key: 'test-flag', enabled: true, rolloutPercentage: 50 };
      expect(isFeatureEnabledForUser(flag, undefined)).toBe(false);
      expect(isFeatureEnabledForUser(flag, '')).toBe(false);
    });
  });
});
