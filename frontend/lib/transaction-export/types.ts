import type { Transaction } from '@/lib/transactions-data';
import type { SupportedLocale } from '@/lib/i18n';

export type ExportRequest =
  | { kind: 'csv'; transactions: Transaction[] }
  | {
      kind: 'pdf';
      transactions: Transaction[];
      title: string;
      locale: SupportedLocale;
    };

export type ExportResponse =
  | { type: 'progress'; progress: number }
  | { type: 'done'; content: string }
  | { type: 'error'; message: string };

/** Rows are processed in batches so progress can be reported incrementally. */
export const EXPORT_CHUNK_SIZE = 200;
