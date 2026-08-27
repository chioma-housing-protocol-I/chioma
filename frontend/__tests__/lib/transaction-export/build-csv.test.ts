import { describe, expect, it } from 'vitest';
import {
  buildCsvContent,
  buildCsvFilename,
  buildCsvHeaderLine,
  buildCsvRowLines,
} from '@/lib/transaction-export/build-csv';
import type { Transaction } from '@/lib/transactions-data';

const TX: Transaction = {
  id: 'tx-1',
  date: '2025-02-20T14:32:00Z',
  type: 'Rent',
  amount: 2400,
  currency: 'XLM',
  amountUsd: 480,
  status: 'Completed',
  propertyId: 'prop-1',
  propertyName: 'Sunset View Apartments',
  txHash: 'abc123',
  description: 'February rent',
};

describe('buildCsvContent', () => {
  it('includes the header row followed by one row per transaction', () => {
    const content = buildCsvContent([TX]);
    const lines = content.split('\n');

    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(buildCsvHeaderLine());
    expect(lines[1]).toContain('Sunset View Apartments');
    expect(lines[1]).toContain('480');
  });

  it('escapes quotes and commas in cell values', () => {
    const withComma: Transaction = {
      ...TX,
      propertyName: 'Property, "The Nice One"',
    };
    const content = buildCsvContent([withComma]);
    expect(content).toContain('"Property, ""The Nice One"""');
  });

  it('uses the raw USD amount for USD transactions and falls back to amountUsd otherwise', () => {
    const usdTx: Transaction = { ...TX, currency: 'USD', amount: 100 };
    const usdRow = buildCsvRowLines([usdTx])[0];
    expect(usdRow).toContain('100');

    const xlmRow = buildCsvRowLines([TX])[0];
    expect(xlmRow).toContain('480');
  });

  it('builds header and row lines independently for chunked processing', () => {
    const header = buildCsvHeaderLine();
    const rows = buildCsvRowLines([TX, TX]);

    expect(rows).toHaveLength(2);
    expect([header, ...rows].join('\n')).toBe(buildCsvContent([TX, TX]));
  });

  it('handles an empty transaction list', () => {
    expect(buildCsvContent([])).toBe(buildCsvHeaderLine());
  });
});

describe('buildCsvFilename', () => {
  it('embeds the given date', () => {
    expect(buildCsvFilename(new Date(2025, 5, 1))).toBe(
      'chioma-transactions-2025-06-01.csv',
    );
  });
});
