import { describe, expect, it, beforeEach } from 'vitest';
import {
  formatDate,
  formatNumber,
  formatCurrency,
  formatCrypto,
} from '@/lib/utils/format';
import { useI18nStore } from '@/lib/i18n';

describe('Locale-aware formatting helpers', () => {
  beforeEach(() => {
    useI18nStore.getState().setLocale('en');
  });

  describe('formatDate', () => {
    it('formats dates using active locale by default', () => {
      const date = new Date('2026-03-27T12:00:00Z');
      const formattedEn = formatDate(date);
      expect(formattedEn).toBeTruthy();

      useI18nStore.getState().setLocale('es');
      const formattedEs = formatDate(date);
      expect(formattedEs).toBeTruthy();
    });

    it('accepts custom locale override', () => {
      const date = new Date('2026-03-27T12:00:00Z');
      const formattedFr = formatDate(date, 'fr');
      expect(formattedFr).toBeTruthy();
    });

    it('accepts options with active locale', () => {
      const date = new Date('2026-03-27T12:00:00Z');
      const formatted = formatDate(date, { month: 'short', year: 'numeric' });
      expect(formatted).toMatch(/Mar.*2026/);
    });

    it('handles null, undefined, empty, and invalid dates gracefully', () => {
      expect(formatDate(null)).toBe('');
      expect(formatDate(undefined)).toBe('');
      expect(formatDate('')).toBe('');
      expect(formatDate('invalid-date')).toBe('');
    });
  });

  describe('formatNumber', () => {
    it('formats numbers using active locale', () => {
      const num = 1234567.89;
      expect(formatNumber(num)).toContain('1,234,567.89');

      useI18nStore.getState().setLocale('fr');
      const formattedFr = formatNumber(num);
      expect(formattedFr).toContain('1');
      expect(formattedFr).toContain('234');
      expect(formattedFr).toContain('567');
      expect(formattedFr).toContain('89');
    });

    it('accepts custom locale override and options', () => {
      const num = 42.5;
      expect(formatNumber(num, 'es', { minimumFractionDigits: 2 })).toBe(
        '42,50',
      );
    });

    it('handles null, undefined, empty, and NaN gracefully', () => {
      expect(formatNumber(null)).toBe('');
      expect(formatNumber(undefined)).toBe('');
      expect(formatNumber('')).toBe('');
      expect(formatNumber('abc')).toBe('');
    });
  });

  describe('formatCurrency', () => {
    it('formats standard ISO currency with active locale', () => {
      const amount = 1500.5;
      expect(formatCurrency(amount, 'USD')).toContain('$1,500.50');

      useI18nStore.getState().setLocale('fr');
      const formattedFr = formatCurrency(amount, 'EUR');
      expect(formattedFr).toContain('1');
      expect(formattedFr).toContain('500');
    });

    it('handles crypto currencies like XLM and USDC gracefully', () => {
      const amount = 250.75;
      expect(formatCurrency(amount, 'XLM')).toContain('250.75');
      expect(formatCurrency(amount, 'XLM')).toContain('XLM');

      expect(formatCurrency(amount, 'USDC')).toContain('250.75');
      expect(formatCurrency(amount, 'USDC')).toContain('USDC');
    });

    it('handles null, undefined, empty, and NaN gracefully', () => {
      expect(formatCurrency(null)).toBe('');
      expect(formatCurrency(undefined)).toBe('');
      expect(formatCurrency('')).toBe('');
      expect(formatCurrency('abc')).toBe('');
    });
  });

  describe('formatCrypto', () => {
    it('formats crypto amounts up to 7 decimal places by default', () => {
      const amount = 12.34567891;
      expect(formatCrypto(amount, 'XLM')).toBe('12.3456789 XLM');
    });

    it('formats crypto amounts per active locale', () => {
      const amount = 1234.567;
      useI18nStore.getState().setLocale('es');
      expect(formatCrypto(amount, 'XLM')).toContain('1234,567 XLM');
    });

    it('supports locale as explicit parameter for backward compatibility', () => {
      const amount = 99.9;
      expect(formatCrypto(amount, 'fr', 'USDC')).toContain('99,9 USDC');
    });

    it('handles null, undefined, empty, and NaN gracefully', () => {
      expect(formatCrypto(null)).toBe('');
      expect(formatCrypto(undefined)).toBe('');
      expect(formatCrypto('')).toBe('');
      expect(formatCrypto('abc')).toBe('');
    });
  });
});
