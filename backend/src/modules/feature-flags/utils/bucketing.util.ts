import * as crypto from 'crypto';

export interface FlagEvaluationTarget {
  key: string;
  enabled: boolean;
  rolloutPercentage: number;
}

/**
 * Calculates a deterministic bucket (0 to 99 inclusive) for a user and flag key combination.
 * Uses SHA-256 to ensure consistent user experience across requests and sessions.
 *
 * @param userId - Unique identifier for the user
 * @param flagKey - Unique feature flag key string
 * @returns An integer between 0 and 99
 */
export function calculateUserBucket(userId: string, flagKey: string): number {
  if (!userId || !flagKey) {
    return 0;
  }
  const hash = crypto
    .createHash('sha256')
    .update(`${userId.trim()}:${flagKey.trim()}`)
    .digest('hex');

  // Use the first 8 hex characters (32-bit unsigned integer)
  const hexPart = hash.slice(0, 8);
  const integerVal = parseInt(hexPart, 16);
  return integerVal % 100;
}

/**
 * Evaluates whether a feature flag is enabled for a given user context.
 *
 * Rules:
 * 1. If `enabled` is false -> returns false (Master Kill Switch)
 * 2. If `rolloutPercentage` <= 0 -> returns false (0% Rollout)
 * 3. If `rolloutPercentage` >= 100 -> returns true (100% Rollout)
 * 4. If `userId` is missing/empty -> returns false for partial percentage rollouts
 * 5. Otherwise, returns true if calculateUserBucket(userId, flagKey) < rolloutPercentage
 */
export function isFeatureEnabledForUser(
  flag: FlagEvaluationTarget,
  userId?: string,
): boolean {
  if (!flag || !flag.enabled) {
    return false;
  }

  if (flag.rolloutPercentage <= 0) {
    return false;
  }

  if (flag.rolloutPercentage >= 100) {
    return true;
  }

  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    return false;
  }

  const userBucket = calculateUserBucket(userId, flag.key);
  return userBucket < flag.rolloutPercentage;
}
