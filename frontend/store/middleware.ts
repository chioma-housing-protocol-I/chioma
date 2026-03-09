/**
 * Shared Zustand middleware composition for domain stores.
 *
 * Provides a consistent pipeline:  devtools → immer → (optional persist)
 * so every store gets immutable updates and Redux DevTools visibility
 * out of the box.
 */

import { type StateCreator } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// ─── Types ───────────────────────────────────────────────────────────────────

type ImmerStateCreator<T> = StateCreator<T, [['zustand/immer', never]]>;

// ─── Middleware Composers ────────────────────────────────────────────────────

/**
 * Wraps a store creator with `devtools` + `immer` middleware.
 * Use this for stores that do NOT need localStorage persistence.
 *
 * @example
 * const useMyStore = create<MyState>()(
 *   withMiddleware((set) => ({ ... }), 'my-store')
 * );
 */
export function withMiddleware<T>(
  creator: ImmerStateCreator<T>,
  storeName: string,
): StateCreator<
  T,
  [],
  [['zustand/devtools', never], ['zustand/immer', never]]
> {
  return devtools(immer(creator), {
    name: `chioma/${storeName}`,
    enabled: process.env.NODE_ENV !== 'production',
  });
}
