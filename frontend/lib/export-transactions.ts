import type { Transaction } from '@/lib/transactions-data';
import { format } from 'date-fns';

export function exportTransactionsToCsv(transactions: Transaction[]): void {
  const headers = [
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
  const rows = transactions.map((t) => [
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
  ]);
  const csvContent = [
    headers.join(','),
    ...rows.map((r) =>
      r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','),
    ),
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chioma-transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportTransactionsToPdf(
  transactions: Transaction[],
  title: string,
): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow pop-ups to export PDF.');
    return;
  }
  const rows = transactions
    .map(
      (t) =>
        `<tr>
          <td>${format(new Date(t.date), 'yyyy-MM-dd HH:mm')}</td>
          <td>${t.type}</td>
          <td>${t.propertyName}</td>
          <td>${t.currency} ${t.amount.toFixed(2)}${t.amountUsd != null && t.currency !== 'USD' ? ` (≈ $${t.amountUsd.toFixed(2)})` : ''}</td>
          <td>${t.status}</td>
        </tr>`,
    )
    .join('');
  printWindow.document.write(`
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
        <p class="meta">Generated on ${format(new Date(), 'PPpp')} · ${transactions.length} transaction(s)</p>
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
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}
