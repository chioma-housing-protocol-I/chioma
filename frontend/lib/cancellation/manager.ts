import { AppError } from '@/lib/errors/types';
import { classifyUnknownError } from '@/lib/errors/classify';

export type CancellationReason = 'user' | 'timeout' | 'navigation' | 'stale';

interface CancellationEntry {
  controller: AbortController;
  key: string;
  reason?: CancellationReason;
  createdAt: number;
}

export function isCancellationError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.code === 'REQUEST_CANCELLED';
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }
  return false;
}

class CancellationManager {
  private entries = new Map<string, CancellationEntry>();
  private cancellationCount = 0;
  private totalTimeSavedMs = 0;

  createSignal(
    key: string,
    reason?: CancellationReason,
  ): { signal: AbortSignal; key: string } {
    this.cancel(key);
    const controller = new AbortController();
    this.entries.set(key, {
      controller,
      key,
      reason,
      createdAt: Date.now(),
    });
    return { signal: controller.signal, key };
  }

  cancel(key: string, reason: CancellationReason = 'user'): boolean {
    const entry = this.entries.get(key);
    if (!entry || entry.controller.signal.aborted) return false;

    entry.controller.abort();
    entry.reason = reason;
    this.trackCancellation(entry);
    this.entries.delete(key);
    return true;
  }

  cancelAll(reason: CancellationReason = 'navigation'): number {
    let count = 0;
    for (const [key] of this.entries) {
      if (this.cancel(key, reason)) count++;
    }
    return count;
  }

  isActive(key: string): boolean {
    const entry = this.entries.get(key);
    return !!entry && !entry.controller.signal.aborted;
  }

  activeKeys(): string[] {
    const keys: string[] = [];
    for (const [key, entry] of this.entries) {
      if (!entry.controller.signal.aborted) keys.push(key);
    }
    return keys;
  }

  activeCount(): number {
    return this.activeKeys().length;
  }

  getMetrics() {
    return {
      totalCancelled: this.cancellationCount,
      totalTimeSavedMs: this.totalTimeSavedMs,
      activeRequests: this.activeCount(),
    };
  }

  resetMetrics() {
    this.cancellationCount = 0;
    this.totalTimeSavedMs = 0;
  }

  private trackCancellation(entry: CancellationEntry) {
    const timeSaved = Date.now() - entry.createdAt;
    this.cancellationCount++;
    this.totalTimeSavedMs += timeSaved;
  }

  classifyCancellationError(error: unknown, source: string): AppError {
    return classifyUnknownError(error, {
      source,
      action: 'cancel:user',
      metadata: { cancellationReason: 'user' },
    });
  }
}

export const cancellationManager = new CancellationManager();
