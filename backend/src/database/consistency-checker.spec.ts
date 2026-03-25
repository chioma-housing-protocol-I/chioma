/**
 * Unit tests for data consistency checker.
 * runConsistencyChecks returns a structured result; without a real DB it fails at init.
 */

import {
  runConsistencyChecks,
  type ConsistencyResult,
} from './consistency-checker';

describe('ConsistencyChecker', () => {
  it('returns a result with ok and checks array', async () => {
    const result: ConsistencyResult = await runConsistencyChecks();
    expect(result).toHaveProperty('ok');
    expect(typeof result.ok).toBe('boolean');
    expect(result).toHaveProperty('checks');
    expect(Array.isArray(result.checks)).toBe(true);
    result.checks.forEach((c) => {
      expect(c).toHaveProperty('name');
      expect(c).toHaveProperty('passed');
    });
  });

  it('returns error message when init fails', async () => {
    const result = await runConsistencyChecks();
    if (!result.ok && result.checks.length === 0) {
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    }
  });
});
