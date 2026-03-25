import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContextData {
  requestId?: string;
  correlationId?: string;
  traceId?: string;
  userId?: string;
}

/**
 * AsyncLocalStorage-based request context for propagating IDs across
 * async boundaries without explicitly threading them through every call.
 */
export class RequestContext {
  private static readonly storage = new AsyncLocalStorage<RequestContextData>();

  /** Run a callback inside a new context. */
  static run<T>(data: RequestContextData, fn: () => T): T {
    return this.storage.run(data, fn);
  }

  /** Get the current context (or empty object). */
  static current(): RequestContextData {
    return this.storage.getStore() ?? {};
  }

  /** Update one or more fields in the current context. */
  static set(partial: Partial<RequestContextData>): void {
    const store = this.storage.getStore();
    if (store) {
      Object.assign(store, partial);
    }
  }

  static get requestId(): string | undefined {
    return this.current().requestId;
  }

  static get correlationId(): string | undefined {
    return this.current().correlationId;
  }

  static get traceId(): string | undefined {
    return this.current().traceId;
  }

  static get userId(): string | undefined {
    return this.current().userId;
  }
}
