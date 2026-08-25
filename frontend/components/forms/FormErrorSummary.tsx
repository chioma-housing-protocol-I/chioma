'use client';

import type { FieldErrors, FieldValues } from 'react-hook-form';

type FormErrorSummaryProps = {
  errors: FieldErrors<FieldValues>;
  /** react-hook-form's `formState.submitCount` — remounts the live region
   * on every failed submit so screen readers re-announce it even when the
   * same errors persist across attempts. */
  submitCount: number;
  className?: string;
};

// Errors nest arbitrarily (field arrays, refs, `type`/`types`), so walk the
// tree for `message` strings rather than assuming a flat shape.
function collectMessages(node: unknown, messages: string[] = []): string[] {
  if (!node || typeof node !== 'object') return messages;
  const obj = node as Record<string, unknown>;

  if (typeof obj.message === 'string' && obj.message) {
    messages.push(obj.message);
    return messages;
  }

  for (const [key, value] of Object.entries(obj)) {
    if (key === 'ref' || key === 'type' || key === 'types') continue;
    if (value && typeof value === 'object') collectMessages(value, messages);
  }

  return messages;
}

export function FormErrorSummary({
  errors,
  submitCount,
  className = '',
}: FormErrorSummaryProps) {
  const messages = Array.from(new Set(collectMessages(errors)));

  if (messages.length === 0) return null;

  return (
    <div
      key={submitCount}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={`mb-4 rounded-xl border border-red-400/30 bg-red-500/10 p-4 ${className}`}
    >
      <p className="text-sm font-semibold text-red-300">
        {messages.length === 1
          ? 'There is 1 error in this form'
          : `There are ${messages.length} errors in this form`}
      </p>
      <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-red-200">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}
