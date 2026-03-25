import { DateUtils } from '../date.utils';

describe('DateUtils', () => {
  const testDateStr = '2026-03-25T10:00:00Z';
  const testDate = new Date(testDateStr);

  describe('formatDate', () => {
    it('should format date correctly with default format', () => {
      const formatted = DateUtils.formatDate(testDate);
      expect(formatted).toBe('2026-03-25');
    });

    it('should format date with custom format', () => {
      const formatted = DateUtils.formatDate(testDate, 'YYYY/MM/DD HH:mm:ss');
      // Note: time depends on timezone of environment, but YMD should match
      expect(formatted).toContain('2026/03/25');
    });
  });

  describe('parseDate', () => {
    it('should parse valid date string', () => {
      const parsed = DateUtils.parseDate('2026-03-25');
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed.getFullYear()).toBe(2026);
    });

    it('should throw for invalid date string', () => {
      expect(() => DateUtils.parseDate('invalid')).toThrow(
        'Invalid date string',
      );
    });
  });

  describe('addDays', () => {
    it('should add days correctly', () => {
      const nextWeek = DateUtils.addDays(testDate, 7);
      expect(nextWeek.getDate()).toBe(1); // April 1st
      expect(nextWeek.getMonth()).toBe(3); // 0-indexed April
    });
  });

  describe('getDaysDifference', () => {
    it('should calculate difference correctly', () => {
      const d1 = new Date('2026-03-01');
      const d2 = new Date('2026-03-10');
      expect(DateUtils.getDaysDifference(d1, d2)).toBe(9);
    });
  });
});
