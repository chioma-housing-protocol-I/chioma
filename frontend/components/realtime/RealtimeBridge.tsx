'use client';

import { useRealtime } from '@/lib/websocket/use-realtime';

/**
 * RealtimeBridge — mounts the WebSocket ↔ store/React Query bridge.
 *
 * Lives in its own module so the root layout can load it with
 * `next/dynamic` after hydration. That keeps `socket.io-client` (pulled in
 * through `lib/websocket/manager`) out of the shared first-load bundle that
 * every route pays for.
 */
export default function RealtimeBridge() {
  useRealtime();
  return null;
}
