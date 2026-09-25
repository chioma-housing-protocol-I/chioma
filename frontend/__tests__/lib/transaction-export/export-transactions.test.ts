import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  exportTransactionsToCsv,
  exportTransactionsToPdf,
} from '@/lib/export-transactions';
import type { Transaction } from '@/lib/transactions-data';
import type {
  ExportRequest,
  ExportResponse,
} from '@/lib/transaction-export/types';

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

describe('exportTransactionsToCsv / exportTransactionsToPdf', () => {
  const originalWorker = (globalThis as { Worker?: unknown }).Worker;

  beforeEach(() => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    if (originalWorker === undefined) {
      delete (globalThis as { Worker?: unknown }).Worker;
    } else {
      (globalThis as { Worker?: unknown }).Worker = originalWorker;
    }
  });

  describe('without Worker support (main-thread fallback)', () => {
    beforeEach(() => {
      delete (globalThis as { Worker?: unknown }).Worker;
    });

    it('reports progress and triggers a CSV download', async () => {
      const clickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => {});
      const onProgress = vi.fn();

      await exportTransactionsToCsv([TX], { onProgress });

      expect(onProgress).toHaveBeenCalledWith(0);
      expect(onProgress).toHaveBeenCalledWith(1);
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('opens a print window with the generated PDF HTML', async () => {
      vi.useFakeTimers();
      const fakeWindow = {
        document: { write: vi.fn(), close: vi.fn(), title: '' },
        focus: vi.fn(),
        print: vi.fn(),
        close: vi.fn(),
      };
      vi.spyOn(window, 'open').mockReturnValue(fakeWindow as unknown as Window);

      await exportTransactionsToPdf([TX], 'My Report');
      await vi.runAllTimersAsync();

      expect(fakeWindow.document.write).toHaveBeenCalledTimes(1);
      expect(fakeWindow.document.write.mock.calls[0][0]).toContain(
        'Sunset View Apartments',
      );
      expect(fakeWindow.print).toHaveBeenCalledTimes(1);
      expect(fakeWindow.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('with Worker support', () => {
    class FakeExportWorker {
      onmessage: ((event: MessageEvent<ExportResponse>) => void) | null = null;
      onerror: ((event: ErrorEvent) => void) | null = null;

      postMessage(request: ExportRequest) {
        const emit = (data: ExportResponse) =>
          this.onmessage?.({ data } as MessageEvent<ExportResponse>);

        emit({ type: 'progress', progress: 0.5 });
        if (request.kind === 'csv') {
          emit({ type: 'done', content: 'header\nrow' });
        } else {
          emit({ type: 'done', content: '<html>pdf</html>' });
        }
      }

      terminate() {}
    }

    beforeEach(() => {
      (globalThis as { Worker?: unknown }).Worker =
        FakeExportWorker as unknown as typeof Worker;
    });

    it('delegates row-building to the worker and reports its progress', async () => {
      const clickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => {});
      const onProgress = vi.fn();

      await exportTransactionsToCsv([TX], { onProgress });

      expect(onProgress).toHaveBeenCalledWith(0.5);
      expect(onProgress).toHaveBeenCalledWith(1);
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    it('downloads the content produced by the worker for PDF export', async () => {
      vi.useFakeTimers();
      const fakeWindow = {
        document: { write: vi.fn(), close: vi.fn(), title: '' },
        focus: vi.fn(),
        print: vi.fn(),
        close: vi.fn(),
      };
      vi.spyOn(window, 'open').mockReturnValue(fakeWindow as unknown as Window);

      await exportTransactionsToPdf([TX], 'My Report');
      await vi.runAllTimersAsync();

      expect(fakeWindow.document.write).toHaveBeenCalledWith(
        '<html>pdf</html>',
      );
    });
  });
});
