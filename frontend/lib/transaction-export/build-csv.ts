import type { Transaction } from '@/lib/transactions-data';
import { format } from 'date-fns';

const CSV_HEADERS = [
  'Date',
  'Time',
  'Type',
  'Property',
  'Amount',
  'Currency',
  'Amount (USD)',
  'Status',
  'Transaction Hash',
  'Description',
];

function escapeCsvCell(value: unknown): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function buildCsvRow(t: Transaction): string[] {
  return [
    format(new Date(t.date), 'yyyy-MM-dd'),
    format(new Date(t.date), 'HH:mm'),
    t.type,
    t.propertyName,
    t.amount.toFixed(2),
    t.currency,
    (t.currency === 'USD' ? t.amount : (t.amountUsd ?? '')).toString(),
    t.status,
    t.txHash ?? '',
    t.description ?? '',
  ];
}

export function buildCsvHeaderLine(): string {
  return CSV_HEADERS.join(',');
}

/** Build the CSV lines for a batch of transactions (no header). */
export function buildCsvRowLines(transactions: Transaction[]): string[] {
  return transactions
    .map(buildCsvRow)
    .map((r) => r.map(escapeCsvCell).join(','));
}

/**
 * Build the full CSV content for a batch (or all) of the given transactions.
 * Pure and synchronous so it can run inside a worker or, as a fallback, on
 * the main thread.
 */
export function buildCsvContent(transactions: Transaction[]): string {
  return [buildCsvHeaderLine(), ...buildCsvRowLines(transactions)].join('\n');
}

export function buildCsvFilename(now: Date = new Date()): string {
  return `chioma-transactions-${format(now, 'yyyy-MM-dd')}.csv`;
}
