import { FraudModelService } from './fraud-model.service';

describe('FraudModelService', () => {
  const thresholdsService = { getThresholds: jest.fn() };

  let service: FraudModelService;

  beforeEach(() => {
    jest.clearAllMocks();
    thresholdsService.getThresholds.mockReturnValue({
      thresholdReview: 45,
      thresholdBlock: 75,
    });
    service = new FraudModelService(thresholdsService as never);
  });

  it('scores neutral (empty) features at the model midpoint, which is "review" under the default thresholds', () => {
    // raw = 0 -> normalizedScore = round(50 + 0 * 10) = 50, and the real
    // default thresholds (fraud-thresholds.defaults.ts) have
    // thresholdReview = 45, so 50 >= 45 -> 'review'. This is pre-existing,
    // unchanged scoring-model behavior (same formula and defaults as before
    // thresholds became runtime-configurable in #1738) - not a regression.
    const result = service.score({});
    expect(result.score).toBe(50);
    expect(result.decision).toBe('review');
  });

  it('scores neutral features as allow once thresholdReview is above the model midpoint', () => {
    thresholdsService.getThresholds.mockReturnValue({
      thresholdReview: 60,
      thresholdBlock: 90,
    });
    const result = service.score({});
    expect(result.decision).toBe('allow');
  });

  it('reads thresholds from FraudThresholdsService on every score call (runtime-configurable)', () => {
    // Features that land at a moderate score (63), which is "review" under
    // the default 45/75 thresholds but "block" once an operator tightens
    // thresholdBlock below that score - with no redeploy or reconstruction.
    const moderateRiskFeatures = { paymentAmountAnomaly: 0.5 };

    thresholdsService.getThresholds.mockReturnValue({
      thresholdReview: 45,
      thresholdBlock: 75,
    });
    const before = service.score(moderateRiskFeatures);
    expect(before.score).toBe(63);
    expect(before.decision).toBe('review');

    // Tighten the thresholds at runtime and confirm the very next score()
    // call reflects the new configuration immediately.
    thresholdsService.getThresholds.mockReturnValue({
      thresholdReview: 20,
      thresholdBlock: 60,
    });
    const after = service.score(moderateRiskFeatures);

    expect(thresholdsService.getThresholds).toHaveBeenCalledTimes(2);
    expect(after.score).toBe(before.score); // same raw score...
    expect(after.decision).toBe('block'); // ...but decision reacts to new thresholds
  });

  it('classifies decisions using the configured review/block boundaries', () => {
    thresholdsService.getThresholds.mockReturnValue({
      thresholdReview: 10,
      thresholdBlock: 20,
    });

    // score() clamps to [0,100] and starts from a baseline of 50, so with no
    // features raw=0 -> score=50, which is >= thresholdBlock(20) here.
    const result = service.score({});
    expect(result.score).toBe(50);
    expect(result.decision).toBe('block');
  });

  it('falls back to no_high_risk_signals when nothing crosses the reason threshold', () => {
    const result = service.score({ accountAgeDays: 0.1 });
    expect(result.reasons).toEqual(['no_high_risk_signals']);
  });
});
