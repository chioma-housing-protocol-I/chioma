import type { Transaction } from '@/lib/transactions-data';
import type { SupportedLocale } from '@/lib/i18n';
import { getDateFnsLocale } from '@/lib/utils/date-fns-locale';
import { format } from 'date-fns';

function buildPdfRow(t: Transaction): string {
  return `<tr>
          <td>${format(new Date(t.date), 'yyyy-MM-dd HH:mm')}</td>
          <td>${t.type}</td>
          <td>${t.propertyName}</td>
          <td>${t.currency} ${t.amount.toFixed(2)}${t.amountUsd != null && t.currency !== 'USD' ? ` (≈ $${t.amountUsd.toFixed(2)})` : ''}</td>
          <td>${t.status}</td>
        </tr>`;
}

/** Build the HTML table rows for a batch of transactions. */
export function buildPdfRowsHtml(transactions: Transaction[]): string {
  return transactions.map(buildPdfRow).join('');
}

/** Wrap already-built row HTML into the full printable document. */
export function wrapPdfDocument(
  rowsHtml: string,
  transactionCount: number,
  title: string,
  locale: SupportedLocale = 'en',
  generatedAt: Date = new Date(),
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 24px; color: #111; }
          h1 { font-size: 1.5rem; margin-bottom: 8px; }
          .meta { color: #666; font-size: 0.875rem; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
          th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
          th { background: #f8fafc; font-weight: 600; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p class="meta">Generated on ${format(generatedAt, 'PPpp', { locale: getDateFnsLocale(locale) })} · ${transactionCount} transaction(s)</p>
        <table>
          <thead>
            <tr>
              <th>Date & time</th>
              <th>Type</th>
              <th>Property</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body>
    </html>
  `;
}

/**
 * Build the full printable HTML document for a batch (or all) of the given
 * transactions. Pure and synchronous so it can run inside a worker or, as a
 * fallback, on the main thread.
 */
export function buildPdfHtml(
  transactions: Transaction[],
  title: string,
  locale: SupportedLocale = 'en',
  generatedAt: Date = new Date(),
): string {
  return wrapPdfDocument(
    buildPdfRowsHtml(transactions),
    transactions.length,
    title,
    locale,
    generatedAt,
  );
}
