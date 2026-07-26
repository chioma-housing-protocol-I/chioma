import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  readDepositDeductions,
  useDeposits,
  useDepositStatus,
  useDepositDeductions,
} from '@/lib/query/hooks/use-payments';
import { apiClient } from '@/lib/api-client';

// Mock the React Query hooks wrapper or apiClient directly
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('Deposit calculations and helpers', () => {
  describe('readDepositDeductions', () => {
    it('returns empty array when deductions is missing or not an array', () => {
      expect(readDepositDeductions({ metadata: {} } as any)).toEqual([]);
      expect(
        readDepositDeductions({ metadata: { deductions: 'not-array' } } as any),
      ).toEqual([]);
    });

    it('correctly maps and filters valid deductions', () => {
      const mockPayment = {
        id: 'pay-1',
        metadata: {
          deductions: [
            {
              id: 'd-1',
              label: 'Cleaning',
              amount: 150,
              reason: 'Dirty kitchen',
              createdAt: '2025-05-01',
            },
            { label: 'Repairs', amount: 250 }, // missing ID (will be auto-generated)
            { label: 'Free', amount: 0 }, // invalid amount (<= 0)
            { label: 'Invalid', amount: 'abc' }, // invalid amount (not a number)
            null, // null entry
          ],
        },
      } as any;

      const results = readDepositDeductions(mockPayment);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        id: 'd-1',
        label: 'Cleaning',
        amount: 150,
        reason: 'Dirty kitchen',
        createdAt: '2025-05-01',
      });
      expect(results[1]).toEqual({
        id: 'pay-1-deduction-1',
        label: 'Repairs',
        amount: 250,
        reason: undefined,
        createdAt: undefined,
      });
    });
  });
});
