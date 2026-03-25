/** Thrown when an external call times out. */
export class TimeoutError extends Error {
  constructor(message = 'Request timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

/** Thrown when a network-level failure occurs (e.g. ECONNRESET, ENOTFOUND). */
export class NetworkError extends Error {
  constructor(message = 'Network error') {
    super(message);
    this.name = 'NetworkError';
  }
}

/** Thrown when all retry attempts are exhausted. Wraps the last underlying error. */
export class MaxRetriesExceededError extends Error {
  constructor(
    public readonly attempts: number,
    public readonly cause: Error,
  ) {
    super(`Operation failed after ${attempts} attempt(s): ${cause.message}`);
    this.name = 'MaxRetriesExceededError';
  }
}
