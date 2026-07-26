import { containsProhibitedLanguage } from '../review-moderation.util';

describe('review-moderation.util', () => {
  it('returns false for empty or clean text', () => {
    expect(containsProhibitedLanguage('')).toBe(false);
    expect(containsProhibitedLanguage('Great experience')).toBe(false);
  });

  it('detects prohibited words case-insensitively', () => {
    expect(containsProhibitedLanguage('This is SPAM content')).toBe(true);
    expect(containsProhibitedLanguage('Possible scam activity')).toBe(true);
    expect(containsProhibitedLanguage('Reported as fraud')).toBe(true);
    expect(containsProhibitedLanguage('Offensive language used')).toBe(true);
  });
});
