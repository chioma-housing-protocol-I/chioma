import type { Transaction } from '@/lib/transactions-data';
import { useI18nStore } from '@/lib/i18n';
import {
  buildCsvContent,
  buildCsvFilename,
} from './transaction-export/build-csv';
import { buildPdfHtml } from './transaction-export/build-pdf';
import {
  isWorkerSupported,
  runExportInWorker,
} from './transaction-export/run-in-worker';
import type { ExportRequest } from './transaction-export/types';

export interface ExportOptions {
  /** Called with a value between 0 and 1 as the export progresses. */
  onProgress?: (progress: number) => void;
}

async function getExportContent(
  request: ExportRequest,
  onProgress?: (progress: number) => void,
): Promise<string> {
  if (isWorkerSupported()) {
    return runExportInWorker(request, onProgress);
  }

  // Fall back to building on the main thread (e.g. very old browsers, or
  // environments without Worker support). Still reports progress so callers
  // don't need two code paths.
  onProgress?.(0);
  const content =
    request.kind === 'csv'
      ? buildCsvContent(request.transactions)
      : buildPdfHtml(request.transactions, request.title, request.locale);
  onProgress?.(1);
  return content;
}

function downloadCsv(content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = buildCsvFilename();
  a.click();
  URL.revokeObjectURL(url);
}

function openPdfPrintWindow(html: string, title: string): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow pop-ups to export PDF.');
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.document.title = title;
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

/**
 * Export transactions to a downloaded CSV file.
 *
 * Row formatting runs in a background worker (falling back to the main
 * thread only if Workers aren't available) so large histories don't freeze
 * the UI. Pass `onProgress` to surface progress to the user.
 */
export async function exportTransactionsToCsv(
  transactions: Transaction[],
  options?: ExportOptions,
): Promise<void> {
  const content = await getExportContent(
    { kind: 'csv', transactions },
    options?.onProgress,
  );
  downloadCsv(content);
}

/**
 * Export transactions to a printable PDF (via the browser's print dialog).
 *
 * Table-row HTML is built in a background worker (falling back to the main
 * thread only if Workers aren't available) so large histories don't freeze
 * the UI. Pass `onProgress` to surface progress to the user.
 */
export async function exportTransactionsToPdf(
  transactions: Transaction[],
  title: string,
  options?: ExportOptions,
): Promise<void> {
  const content = await getExportContent(
    {
      kind: 'pdf',
      transactions,
      title,
      locale: useI18nStore.getState().locale,
    },
    options?.onProgress,
  );
  openPdfPrintWindow(content, title);
}
