/**
 * Utility functions for debouncing and throttling function calls,
 * and a tracker for API rate limit metrics based on standard headers.
 */

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  waitMs: number,
): {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => void;
} {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const debounced = (...args: Parameters<T>) => {
    lastArgs = args;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
      lastArgs = null;
      timeoutId = null;
    }, waitMs);
  };

  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastArgs = null;
  };

  debounced.flush = () => {
    if (timeoutId !== null && lastArgs !== null) {
      clearTimeout(timeoutId);
      func(...lastArgs);
      lastArgs = null;
      timeoutId = null;
    }
  };

  return debounced;
}

export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limitMs: number,
): {
  (...args: Parameters<T>): void;
  cancel: () => void;
} {
  let inThrottle = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const throttled = (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      timeoutId = setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          throttled(...lastArgs);
          lastArgs = null;
        }
      }, limitMs);
    } else {
      lastArgs = args;
    }
  };

  throttled.cancel = () => {
    inThrottle = false;
    lastArgs = null;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return throttled;
}

type RateLimitState = {
  remaining: number | null;
  resetTimeMs: number | null;
  limit: number | null;
};

type RateLimitListener = (state: RateLimitState, retryAfterMs?: number) => void;

/**
 * Tracks rate limit state based on standard rate limit HTTP headers.
 */
class RateLimitTracker {
  private state: RateLimitState = {
    remaining: null,
    resetTimeMs: null,
    limit: null,
  };
  private listeners: Set<RateLimitListener> = new Set();

  /**
   * Subscribe to rate limit violations or updates.
   */
  subscribe(listener: RateLimitListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(retryAfterMs?: number) {
    this.listeners.forEach((listener) =>
      listener({ ...this.state }, retryAfterMs),
    );
  }

  /**
   * Check if requests are currently blocked by a known rate limit.
   * Returns the number of milliseconds to wait if blocked, or 0 if allowed.
   */
  getWaitTimeMs(): number {
    if (
      this.state.remaining !== null &&
      this.state.remaining <= 0 &&
      this.state.resetTimeMs !== null
    ) {
      const now = Date.now();
      if (now < this.state.resetTimeMs) {
        return this.state.resetTimeMs - now;
      } else {
        // Reset time has passed, allow request
        this.state.remaining = null;
        this.state.resetTimeMs = null;
      }
    }
    return 0;
  }

  /**
   * Update tracker state based on HTTP headers from a response.
   */
  updateFromHeaders(headers: Headers, status: number) {
    const remainingStr =
      headers.get('RateLimit-Remaining') ||
      headers.get('X-RateLimit-Remaining');
    const resetStr =
      headers.get('RateLimit-Reset') || headers.get('X-RateLimit-Reset');
    const limitStr =
      headers.get('RateLimit-Limit') || headers.get('X-RateLimit-Limit');
    const retryAfterStr = headers.get('Retry-After');

    let updated = false;
    let retryAfterMs: number | undefined = undefined;

    if (limitStr) {
      this.state.limit = parseInt(limitStr, 10) || this.state.limit;
    }

    if (remainingStr) {
      this.state.remaining = parseInt(remainingStr, 10);
      updated = true;
    } else if (status === 429) {
      // If we got a 429 but no remaining header, force remaining to 0
      this.state.remaining = 0;
      updated = true;
    }

    // Standard RateLimit-Reset is typically epoch seconds
    if (resetStr) {
      const resetVal = parseInt(resetStr, 10);
      if (!isNaN(resetVal)) {
        // Assume if it's small, it's seconds to wait, otherwise epoch seconds
        if (resetVal < 1000000000) {
          this.state.resetTimeMs = Date.now() + resetVal * 1000;
        } else {
          this.state.resetTimeMs = resetVal * 1000;
        }
        updated = true;
      }
    }

    // Retry-After can be seconds or an HTTP date
    if (retryAfterStr) {
      const retryVal = parseInt(retryAfterStr, 10);
      if (!isNaN(retryVal)) {
        retryAfterMs = retryVal * 1000;
      } else {
        const dateStr = Date.parse(retryAfterStr);
        if (!isNaN(dateStr)) {
          retryAfterMs = Math.max(0, dateStr - Date.now());
        }
      }

      if (retryAfterMs !== undefined) {
        this.state.remaining = 0; // definitely blocked
        this.state.resetTimeMs = Date.now() + retryAfterMs;
        updated = true;
      }
    }

    if (updated && status === 429) {
      this.notifyListeners(retryAfterMs);
    }
  }

  /**
   * For testing or manual reset
   */
  reset() {
    this.state = {
      remaining: null,
      resetTimeMs: null,
      limit: null,
    };
  }
}

export const globalRateLimitTracker = new RateLimitTracker();
