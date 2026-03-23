import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { LoggerContext } from '../interfaces/logger-context.interface';

@Injectable()
export class ClsService {
  private static readonly storage = new AsyncLocalStorage<LoggerContext>();

  run(context: LoggerContext, callback: () => void): void {
    ClsService.storage.run(context, callback);
  }

  get(): LoggerContext | undefined {
    return ClsService.storage.getStore();
  }

  set(key: keyof LoggerContext, value: any): void {
    const store = ClsService.storage.getStore();
    if (store) {
      store[key] = value;
    }
  }

  get requestId(): string | undefined {
    return this.get()?.requestId;
  }

  get correlationId(): string | undefined {
    return this.get()?.correlationId;
  }

  get userId(): string | undefined {
    return this.get()?.userId;
  }

  get traceId(): string | undefined {
    return this.get()?.traceId;
  }
}
