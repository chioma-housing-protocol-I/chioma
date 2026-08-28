import { describe, expect, it } from 'vitest';
import {
  buildPdfHtml,
  buildPdfRowsHtml,
  wrapPdfDocument,
} from '@/lib/transaction-export/build-pdf';
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

describe('buildPdfRowsHtml', () => {
  it('renders one <tr> per transaction with the USD conversion shown', () => {
    const html = buildPdfRowsHtml([TX]);
    expect(html).toContain('<tr>');
    expect(html).toContain('Sunset View Apartments');
    expect(html).toContain('≈ $480.00');
  });

  it('omits the USD conversion for USD-denominated transactions', () => {
    const usdTx: Transaction = { ...TX, currency: 'USD', amountUsd: undefined };
    const html = buildPdfRowsHtml([usdTx]);
    expect(html).not.toContain('≈');
  });
});

describe('wrapPdfDocument / buildPdfHtml', () => {
  it('embeds the title, transaction count, and row markup in the document', () => {
    const rowsHtml = buildPdfRowsHtml([TX, TX]);
    const doc = wrapPdfDocument(rowsHtml, 2, 'My Report');

    expect(doc).toContain('<title>My Report</title>');
    expect(doc).toContain('2 transaction(s)');
    expect(doc).toContain(rowsHtml);
  });

  it('buildPdfHtml composes rows and wrapper consistently', () => {
    const generatedAt = new Date(2025, 5, 1, 12, 0, 0);
    expect(buildPdfHtml([TX], 'Report', 'en', generatedAt)).toBe(
      wrapPdfDocument(buildPdfRowsHtml([TX]), 1, 'Report', 'en', generatedAt),
    );
  });

  it('formats the generated-at timestamp using the requested locale', () => {
    const generatedAt = new Date(2025, 5, 1, 12, 0, 0);
    const en = buildPdfHtml([TX], 'Report', 'en', generatedAt);
    const fr = buildPdfHtml([TX], 'Report', 'fr', generatedAt);
    expect(en).not.toBe(fr);
  });
});
