/**
 * Offline-queue-then-reconnect coverage for useMessaging (#1557).
 *
 * IndexedDB is unavailable in jsdom and fake-indexeddb isn't installed in
 * this repo, so `@/lib/offline/db` is mocked with an in-memory
 * implementation that mirrors its real contract (see
 * `lib/offline/db.ts`'s `addToSyncQueue`/`getSyncQueue`/`removeSyncQueueItem`).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import React from 'react';

// ── Socket.io mock ─────────────────────────────────────────────────────────
const { mockSocket, socketHandlers, simulateConnect } = vi.hoisted(() => {
  const handlers: Record<string, (...args: any[]) => void> = {};
  return {
    socketHandlers: handlers,
    mockSocket: {
      on: vi.fn((event: string, cb: (...args: any[]) => void) => {
        handlers[event] = cb;
      }),
      off: vi.fn(),
      emit: vi.fn(),
      disconnect: vi.fn(),
    },
    simulateConnect: () => handlers['connect']?.(),
  };
});
vi.mock('socket.io-client', () => ({ io: vi.fn(() => mockSocket) }));

// ── apiClient mock ─────────────────────────────────────────────────────────
const { mockGet, mockPatch } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPatch: vi.fn(),
}));
vi.mock('@/lib/api-client', () => ({
  apiClient: { get: mockGet, patch: mockPatch, post: vi.fn() },
}));

// ── Auth store mock ────────────────────────────────────────────────────────
const { mockAuthState } = vi.hoisted(() => ({
  mockAuthState: {
    user: { id: 'user-1', firstName: 'Alice', lastName: 'Doe', role: 'user' },
    accessToken: 'tok-123',
  },
}));
vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(() => mockAuthState),
}));

// ── In-memory offline sync queue (mirrors lib/offline/db.ts's contract) ────
const { queueStore, resetQueueStore } = vi.hoisted(() => {
  const store = new Map<string, any>();
  return {
    queueStore: store,
    resetQueueStore: () => store.clear(),
  };
});
vi.mock('@/lib/offline/db', () => ({
  addToSyncQueue: vi.fn(async (item: any) => {
    const id = `${item.entity}_${item.entityId}_${Date.now()}_${Math.random()}`;
    queueStore.set(id, { ...item, id, timestamp: Date.now(), retries: 0 });
    return id;
  }),
  getSyncQueue: vi.fn(async () => Array.from(queueStore.values())),
  removeSyncQueueItem: vi.fn(async (id: string) => {
    queueStore.delete(id);
  }),
}));

// ── useOnline mock — controllable online/offline state ─────────────────────
const { onlineState, setOnline } = vi.hoisted(() => {
  const state = { value: true };
  return {
    onlineState: state,
    setOnline: (value: boolean) => {
      state.value = value;
    },
  };
});
vi.mock('@/lib/offline/hooks', () => ({
  useOnline: () => onlineState.value,
}));

vi.mock('@/lib/errors/logger', () => ({
  logError: vi.fn(),
}));

// ── Next.js mocks (MessagingHub pulls these in transitively) ───────────────
vi.mock('next/navigation', () => ({ usePathname: vi.fn(() => '/messages') }));

// ── Component imports ──────────────────────────────────────────────────────
import { MessagingHub } from '@/components/messaging/MessagingHub';

const BOB_ROOM = {
  id: 'room-1',
  name: null,
  participants: [
    {
      id: 'p1',
      userId: 'user-1',
      roomId: 'room-1',
      joinedAt: '',
      user: {
        id: 'user-1',
        firstName: 'Alice',
        lastName: 'Doe',
        email: '',
        role: 'user' as const,
      },
    },
    {
      id: 'p2',
      userId: 'user-2',
      roomId: 'room-1',
      joinedAt: '',
      user: {
        id: 'user-2',
        firstName: 'Bob',
        lastName: 'Smith',
        email: '',
        role: 'user' as const,
      },
    },
  ],
  messages: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  unreadCount: 0,
};

describe('useMessaging offline queue → reconnect (#1557)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetQueueStore();
    setOnline(true);
    for (const key of Object.keys(socketHandlers)) delete socketHandlers[key];
    mockGet.mockResolvedValue({ data: [BOB_ROOM] });
    mockPatch.mockResolvedValue({ data: {} });
  });

  async function openBobRoom() {
    mockGet
      .mockResolvedValueOnce({ data: [BOB_ROOM] }) // rooms
      .mockResolvedValueOnce({ data: [] }); // messages

    render(<MessagingHub />);
    act(() => simulateConnect());
    await screen.findByText('Bob Smith');
    fireEvent.click(screen.getByText('Bob Smith'));
    await waitFor(() => screen.getByRole('textbox'));
  }

  it('allows composing a message while offline instead of blocking input', async () => {
    setOnline(false);
    await openBobRoom();

    expect(screen.getByRole('textbox')).not.toBeDisabled();
  });

  it('queues a message composed while offline instead of emitting over the socket', async () => {
    setOnline(false);
    await openBobRoom();

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Queued while offline' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(queueStore.size).toBe(1);
    });
    const [queued] = Array.from(queueStore.values());
    expect(queued.entity).toBe('chat-message');
    expect(queued.action).toBe('create');
    expect(queued.payload).toMatchObject({
      roomId: 'room-1',
      content: 'Queued while offline',
    });

    // Not emitted over the socket while offline.
    expect(mockSocket.emit).not.toHaveBeenCalledWith(
      'sendMessage',
      expect.anything(),
      expect.anything(),
    );

    // Shown with a "queued" indicator, not silently dropped.
    expect(screen.getByText('Queued while offline')).toBeInTheDocument();
    expect(
      screen.getByText('Queued — will send when online'),
    ).toBeInTheDocument();
  });

  it('flushes the queued message over the socket once reconnected', async () => {
    setOnline(false);
    await openBobRoom();

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Send me on reconnect' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => expect(queueStore.size).toBe(1));

    // Reconnect: both the browser coming back online and the socket firing
    // its own 'connect' event should trigger a flush.
    setOnline(true);
    act(() => simulateConnect());

    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'sendMessage',
        expect.objectContaining({
          roomId: 'room-1',
          content: 'Send me on reconnect',
        }),
        expect.any(Function),
      );
    });

    // The queue entry is cleared once the message has been re-dispatched.
    await waitFor(() => {
      expect(queueStore.size).toBe(0);
    });
  });

  it('surfaces a read-receipt sync failure instead of swallowing it', async () => {
    mockPatch.mockRejectedValueOnce(new Error('network error'));
    const { logError } = await import('@/lib/errors/logger');

    await openBobRoom();

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ action: 'markRoomAsRead' }),
      );
    });
  });
});
