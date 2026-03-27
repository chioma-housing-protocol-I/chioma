import { describe, expect, it } from 'vitest';
import {
  buildAnchorTransactionsCsv,
  deriveAnchorStatsFromTransactions,
  formatAnchorDuration,
  getAnchorProofReference,
  getAnchorTransactionExplorerUrl,
  getAnchorVerificationState,
} from '@/lib/anchor-transactions';
import type { AnchorTransaction } from '@/types';

const baseTransaction: AnchorTransaction = {
  id: 'anchor-1',
  anchorTransactionId: 'sep24-123',
  type: 'deposit',
  status: 'completed',
  amount: '1500.5',
  currency: 'USD',
  walletAddress: 'GABC12345',
  paymentMethod: 'bank_transfer',
  destination: 'Access Bank',
  stellarTransactionId: 'stellar-123',
  memo: 'unit test',
  metadata: {
    external_transaction_id: 'anchor-proof-9',
  },
  createdAt: '2026-03-27T10:00:00.000Z',
  updatedAt: '2026-03-27T10:03:00.000Z',
};

describe('anchor transaction helpers', () => {
  it('returns explorer URL when a stellar transaction exists', () => {
    expect(getAnchorTransactionExplorerUrl(baseTransaction)).toBe(
      'https://stellar.expert/explorer/public/tx/stellar-123',
    );
  });

  it('prefers the anchor transaction id as the proof reference', () => {
    expect(getAnchorProofReference(baseTransaction)).toBe('sep24-123');
  });

  it('classifies verification state correctly', () => {
    expect(getAnchorVerificationState(baseTransaction)).toBe('verified');
    expect(
      getAnchorVerificationState({
        ...baseTransaction,
        stellarTransactionId: null,
        status: 'processing',
      }),
    ).toBe('processing');
    expect(
      getAnchorVerificationState({
        ...baseTransaction,
        anchorTransactionId: null,
        stellarTransactionId: null,
        status: 'pending',
      }),
    ).toBe('pending');
    expect(
      getAnchorVerificationState({
        ...baseTransaction,
        stellarTransactionId: null,
        status: 'failed',
      }),
    ).toBe('failed');
  });

  it('derives stats and average duration from transaction rows', () => {
    const stats = deriveAnchorStatsFromTransactions([
      baseTransaction,
      {
        ...baseTransaction,
        id: 'anchor-2',
        status: 'processing',
        stellarTransactionId: null,
        createdAt: '2026-03-27T11:00:00.000Z',
        updatedAt: '2026-03-27T11:01:00.000Z',
      },
      {
        ...baseTransaction,
        id: 'anchor-3',
        status: 'failed',
        stellarTransactionId: null,
        createdAt: '2026-03-27T12:00:00.000Z',
        updatedAt: '2026-03-27T12:01:00.000Z',
      },
    ]);

    expect(stats).toEqual({
      total: 3,
      pending: 0,
      processing: 1,
      completed: 1,
      failed: 1,
      refunded: 0,
      verified: 1,
      averageTimeToAnchorSeconds: 120,
    });
  });

  it('builds CSV output with escaped values', () => {
    const csv = buildAnchorTransactionsCsv([
      {
        ...baseTransaction,
        memo: 'Memo "quoted"',
      },
    ]);

    expect(csv).toContain('"Memo ""quoted"""');
    expect(csv).toContain('"anchor-1"');
  });

  it('formats short and long durations', () => {
    expect(formatAnchorDuration(45)).toBe('45s');
    expect(formatAnchorDuration(125)).toBe('2m 5s');
    expect(formatAnchorDuration(3660)).toBe('1h 1m');
  });
});
