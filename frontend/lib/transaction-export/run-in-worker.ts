import type { ExportRequest, ExportResponse } from './types';

export function isWorkerSupported(): boolean {
  return typeof Worker !== 'undefined';
}

/**
 * Run a CSV/PDF export job in a dedicated worker so the DOM-building work
 * (formatting every row, escaping cells) never blocks the main thread.
 * Resolves with the finished content string. Callers are responsible for
 * turning that content into a download, since Blob/window APIs used for
 * that step aren't available inside a worker.
 */
export function runExportInWorker(
  request: ExportRequest,
  onProgress?: (progress: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (event: MessageEvent<ExportResponse>) => {
      const message = event.data;
      if (message.type === 'progress') {
        onProgress?.(message.progress);
      } else if (message.type === 'done') {
        onProgress?.(1);
        worker.terminate();
        resolve(message.content);
      } else {
        worker.terminate();
        reject(new Error(message.message));
      }
    };

    worker.onerror = (event: ErrorEvent) => {
      worker.terminate();
      reject(event.error ?? new Error(event.message || 'Export worker failed'));
    };

    worker.postMessage(request);
  });
}
