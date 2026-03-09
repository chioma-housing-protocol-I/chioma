/**
 * WebSocket connection manager built on top of socket.io-client.
 *
 * Provides a singleton connection that domain stores and React Query hooks
 * can subscribe to for real-time events. Handles reconnection, auth token
 * refresh, and graceful teardown.
 */

import { io, type Socket } from 'socket.io-client';

// ─── Types ───────────────────────────────────────────────────────────────────

type EventHandler = (...args: unknown[]) => void;

interface ConnectionOptions {
  url?: string;
  token: string;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

// ─── Singleton State ─────────────────────────────────────────────────────────

let socket: Socket | null = null;
let currentToken: string | null = null;
const listeners = new Map<string, Set<EventHandler>>();
const statusListeners = new Set<(status: ConnectionStatus) => void>();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function notifyStatus(status: ConnectionStatus) {
  statusListeners.forEach((fn) => fn(status));
}

function getSocketUrl(): string {
  return (
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
    'http://localhost:3001'
  );
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Establish the WebSocket connection. Safe to call multiple times — only
 * creates a new socket when the token changes or no socket exists.
 */
export function connect(options: ConnectionOptions): void {
  const url = options.url ?? getSocketUrl();

  if (socket?.connected && currentToken === options.token) return;

  disconnect();

  currentToken = options.token;
  notifyStatus('connecting');

  socket = io(url, {
    auth: { token: options.token },
    transports: ['websocket'],
    reconnectionAttempts: 10,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 30_000,
  });

  socket.on('connect', () => notifyStatus('connected'));
  socket.on('disconnect', () => notifyStatus('disconnected'));

  // Re-attach domain listeners that were registered before connection
  listeners.forEach((handlers, event) => {
    handlers.forEach((handler) => {
      socket?.on(event, handler);
    });
  });
}

/**
 * Tear down the current connection and clear all internal state.
 */
export function disconnect(): void {
  if (!socket) return;

  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
  currentToken = null;
  notifyStatus('disconnected');
}

/**
 * Subscribe to a server-sent event. The handler is persisted across
 * reconnections.
 *
 * @returns An unsubscribe function.
 */
export function on(event: string, handler: EventHandler): () => void {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event)!.add(handler);

  socket?.on(event, handler);

  return () => {
    listeners.get(event)?.delete(handler);
    socket?.off(event, handler);
  };
}

/**
 * Emit an event to the server.
 */
export function emit(event: string, ...args: unknown[]): void {
  socket?.emit(event, ...args);
}

/**
 * Subscribe to connection status changes.
 *
 * @returns An unsubscribe function.
 */
export function onStatusChange(
  callback: (status: ConnectionStatus) => void,
): () => void {
  statusListeners.add(callback);
  return () => {
    statusListeners.delete(callback);
  };
}

/**
 * Get the raw socket instance for advanced use cases (e.g. messaging).
 * Prefer the `on` / `emit` helpers for most domain logic.
 */
export function getSocket(): Socket | null {
  return socket;
}
