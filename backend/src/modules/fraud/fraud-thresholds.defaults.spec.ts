import {
  DEFAULT_FRAUD_THRESHOLDS,
  isValidThresholdPair,
} from './fraud-thresholds.defaults';

describe('fraud-thresholds.defaults (pure)', () => {
  it('exposes sane, ordered defaults', () => {
    expect(DEFAULT_FRAUD_THRESHOLDS.thresholdReview).toBeLessThan(
      DEFAULT_FRAUD_THRESHOLDS.thresholdBlock,
    );
  });

  describe('isValidThresholdPair', () => {
    it('accepts a well-ordered pair within range', () => {
      expect(isValidThresholdPair(45, 75)).toBe(true);
    });

    it('accepts boundary values 0 and 100', () => {
      expect(isValidThresholdPair(0, 100)).toBe(true);
    });

    it('rejects review >= block', () => {
      expect(isValidThresholdPair(75, 75)).toBe(false);
      expect(isValidThresholdPair(80, 75)).toBe(false);
    });

    it('rejects out-of-range values', () => {
      expect(isValidThresholdPair(-1, 75)).toBe(false);
      expect(isValidThresholdPair(45, 101)).toBe(false);
    });

    it('rejects non-finite values', () => {
      expect(isValidThresholdPair(NaN, 75)).toBe(false);
      expect(isValidThresholdPair(45, Infinity)).toBe(false);
    });
  });
});
