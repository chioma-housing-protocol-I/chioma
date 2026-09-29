import { AlertSeverity } from './alert.types';
import { isActionableSeverity, resolveAlertSeverity } from './alert-rules';

describe('alert-rules (pure)', () => {
  describe('resolveAlertSeverity', () => {
    it('normalizes a known severity string', () => {
      expect(resolveAlertSeverity('critical')).toBe(AlertSeverity.CRITICAL);
    });

    it('normalizes case-insensitively', () => {
      expect(resolveAlertSeverity('CRITICAL')).toBe(AlertSeverity.CRITICAL);
      expect(resolveAlertSeverity('Warning')).toBe(AlertSeverity.WARNING);
    });

    it('defaults to INFO for undefined input', () => {
      expect(resolveAlertSeverity(undefined)).toBe(AlertSeverity.INFO);
    });

    it('defaults to INFO for an unrecognized value', () => {
      expect(resolveAlertSeverity('not-a-real-severity')).toBe(
        AlertSeverity.INFO,
      );
    });
  });

  describe('isActionableSeverity', () => {
    it.each([
      [AlertSeverity.CRITICAL, true],
      [AlertSeverity.HIGH, true],
      [AlertSeverity.WARNING, true],
      [AlertSeverity.MEDIUM, false],
      [AlertSeverity.INFO, false],
    ])('%s -> actionable=%s', (severity, expected) => {
      expect(isActionableSeverity(severity)).toBe(expected);
    });
  });
});
