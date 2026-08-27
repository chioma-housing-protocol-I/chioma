import { LockRetryOptions, LockService } from './lock.service';

export interface LockedOptions {
  key: string | ((...args: unknown[]) => string);
  ttlMs: number;
  retryOptions?: LockRetryOptions;
}

export function Locked(options: LockedOptions): MethodDecorator {
  return function (
    target: Object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: unknown[]) {
      const lockService: LockService = this.lockService;
      if (!lockService) {
        throw new Error(
          `@Locked requires 'lockService: LockService' to be injected on ${target.constructor.name}`,
        );
      }
      const resolvedKey =
        typeof options.key === 'function' ? options.key(...args) : options.key;
      return lockService.withLock(
        resolvedKey,
        options.ttlMs,
        () => originalMethod.apply(this, args),
        options.retryOptions,
      );
    };
    return descriptor;
  };
}
