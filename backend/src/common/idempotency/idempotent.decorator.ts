import 'reflect-metadata';
import { IdempotencyService } from './idempotency.service';
import { IdempotencyKeyMissingError } from './idempotency.errors';

const IDEMPOTENCY_KEY_METADATA = 'idempotency:key_param_index';

export interface IdempotentOptions {
  ttlMs: number;
  key?: string | ((...args: unknown[]) => string | null | undefined);
  requireKey?: boolean;
}

export function IdempotencyKey(): ParameterDecorator {
  return (
    target: object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ) => {
    Reflect.defineMetadata(
      IDEMPOTENCY_KEY_METADATA,
      parameterIndex,
      target,
      propertyKey!,
    );
  };
}

export function Idempotent(options: IdempotentOptions): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: unknown[]) {
      const idempotencyService: IdempotencyService = this.idempotencyService;
      if (!idempotencyService) {
        throw new Error(
          `@Idempotent requires 'idempotencyService: IdempotencyService' to be injected on ${target.constructor.name}`,
        );
      }
      let key: string | null | undefined;

      if (options.key !== undefined) {
        key =
          typeof options.key === 'function'
            ? options.key(...args)
            : options.key;
      } else {
        const keyParamIndex: number | undefined = Reflect.getMetadata(
          IDEMPOTENCY_KEY_METADATA,
          target,
          propertyKey,
        );
        if (keyParamIndex === undefined) {
          throw new IdempotencyKeyMissingError(
            `@Idempotent on ${String(propertyKey)} requires a key option or a parameter decorated with @IdempotencyKey`,
          );
        }
        key = args[keyParamIndex] as string;
      }

      if (!key) {
        if (options.requireKey === false) {
          return originalMethod.apply(this, args);
        }
        throw new IdempotencyKeyMissingError(
          `@Idempotent on ${String(propertyKey)} requires a non-empty idempotency key`,
        );
      }

      return idempotencyService.process(key, options.ttlMs, () =>
        originalMethod.apply(this, args),
      );
    };
    return descriptor;
  };
}
