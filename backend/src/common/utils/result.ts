/**
 * Small discriminated-union wrappers for operations that can fail. Used by
 * internal service helpers so a failure is an explicit value that callers
 * must handle, rather than an exception hidden inside a helper. Public
 * service and controller contracts are unchanged: the boundary still throws
 * or maps the failure into the existing response shape.
 */

export class Ok<T> {
  readonly ok = true as const;
  readonly error = undefined;

  constructor(readonly value: T) {}

  isOk(): boolean {
    return true;
  }

  isErr(): boolean {
    return false;
  }

  map<U>(fn: (value: T) => U): Result<U, never> {
    return ok(fn(this.value));
  }
}

export class Err<E> {
  readonly ok = false as const;
  readonly value = undefined;

  constructor(readonly error: E) {}

  isOk(): boolean {
    return false;
  }

  isErr(): boolean {
    return true;
  }
}

export type Result<T, E = Error> = Ok<T> | Err<E>;

/** Conventional Either alias: left is the error side, right is the value. */
export type Either<L, R> = Result<R, L>;

export function ok<T>(value: T): Ok<T> {
  return new Ok(value);
}

export function err<E>(error: E): Err<E> {
  return new Err(error);
}

export const right = ok;
export const left = err;

/** Unwraps a success or throws the stored error at the service boundary. */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) {
    return result.value;
  }
  throw result.error instanceof Error
    ? result.error
    : new Error(String(result.error));
}
