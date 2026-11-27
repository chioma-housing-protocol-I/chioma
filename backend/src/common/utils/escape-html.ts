/**
 * Shared HTML escaping for request sanitization and error responses (#2190).
 *
 * Keeping one implementation means an error body cannot echo raw user input
 * even when the request never passed through SanitizePipe (the global pipe is
 * ValidationPipe).
 */

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
};

/** Escape the five characters that can break out of an HTML text context. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ENTITIES[char] ?? char);
}

/** Beyond this depth a payload is replaced with a safe placeholder. */
const MAX_DEPTH = 10;

/**
 * Recursively escape every string value while preserving the surrounding
 * structure. Object keys are left intact so clients can still map details to
 * field names. Cycles and overly deep payloads are neutralised so a hostile
 * error cannot overflow the stack inside the exception filter.
 */
export function sanitizeForResponse<T>(value: T): T {
  return escapeValue(value, new WeakSet<object>(), 0) as T;
}

function escapeValue(
  value: unknown,
  seen: WeakSet<object>,
  depth: number,
): unknown {
  if (typeof value === 'string') {
    return escapeHtml(value);
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (depth >= MAX_DEPTH) {
    return '[truncated]';
  }

  if (seen.has(value)) {
    return '[circular]';
  }

  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((item) => escapeValue(item, seen, depth + 1));
    }

    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      result[key] = escapeValue(item, seen, depth + 1);
    }
    return result;
  } finally {
    // Siblings may legitimately share a reference; only true cycles are
    // replaced, so remove the entry once this branch has been traversed.
    seen.delete(value);
  }
}
