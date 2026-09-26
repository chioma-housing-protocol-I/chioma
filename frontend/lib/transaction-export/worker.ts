import { buildCsvHeaderLine, buildCsvRowLines } from './build-csv';
import { buildPdfRowsHtml, wrapPdfDocument } from './build-pdf';
import {
  EXPORT_CHUNK_SIZE,
  type ExportRequest,
  type ExportResponse,
} from './types';

// `self` is typed as `Window` under the project's DOM lib, but at runtime
// this module only ever executes inside a dedicated worker scope, where the
// `Worker`-shaped surface (postMessage/onmessage) lines up with what we use.
const ctx = self as unknown as Worker;

function post(message: ExportResponse) {
  ctx.postMessage(message);
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks.length > 0 ? chunks : [[]];
}

/** Yield to the event loop so progress messages flush between batches. */
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function handleCsv(transactions: ExportRequest & { kind: 'csv' }) {
  const batches = chunk(transactions.transactions, EXPORT_CHUNK_SIZE);
  const lines: string[] = [buildCsvHeaderLine()];

  for (let i = 0; i < batches.length; i++) {
    lines.push(...buildCsvRowLines(batches[i]));
    post({ type: 'progress', progress: (i + 1) / batches.length });
    await tick();
  }

  post({ type: 'done', content: lines.join('\n') });
}

async function handlePdf(request: ExportRequest & { kind: 'pdf' }) {
  const batches = chunk(request.transactions, EXPORT_CHUNK_SIZE);
  const rowsHtml: string[] = [];

  for (let i = 0; i < batches.length; i++) {
    rowsHtml.push(buildPdfRowsHtml(batches[i]));
    post({ type: 'progress', progress: (i + 1) / batches.length });
    await tick();
  }

  post({
    type: 'done',
    content: wrapPdfDocument(
      rowsHtml.join(''),
      request.transactions.length,
      request.title,
      request.locale,
    ),
  });
}

ctx.onmessage = (event: MessageEvent<ExportRequest>) => {
  const request = event.data;

  const run = request.kind === 'csv' ? handleCsv(request) : handlePdf(request);

  run.catch((error: unknown) => {
    post({
      type: 'error',
      message: error instanceof Error ? error.message : 'Export failed',
    });
  });
};
