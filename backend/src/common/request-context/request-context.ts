import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContextValue {
  requestId?: string;
  correlationId?: string;
  userId?: string;
  useReplica?: boolean;
}

class RequestContextStore {
  private readonly storage = new AsyncLocalStorage<RequestContextValue>();

  run<T>(context: RequestContextValue, callback: () => T): T {
    return this.storage.run({ ...context }, callback);
  }

  get(): RequestContextValue | undefined {
    return this.storage.getStore();
  }

  set(patch: Partial<RequestContextValue>): void {
    const current = this.storage.getStore();
    if (!current) {
      return;
    }

    Object.assign(current, patch);
  }
}

export const requestContext = new RequestContextStore();
