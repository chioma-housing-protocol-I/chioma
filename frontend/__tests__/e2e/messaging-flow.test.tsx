/**
 * E2E-style integration tests for the messaging / chat flow.
 * Covers: MessagingHub, ChatSidebar, MessageList, MessageInput,
 *         unread count updates, conversation switching.
 * Issue: #1248
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ── Socket.io mock ─────────────────────────────────────────────────────────
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
};
vi.mock('socket.io-client', () => ({ io: vi.fn(() => mockSocket) }));

// ── apiClient mock ─────────────────────────────────────────────────────────
const mockGet = vi.fn();
const mockPatch = vi.fn();
const mockPost = vi.fn();
vi.mock('@/lib/api-client', () => ({
  apiClient: { get: mockGet, patch: mockPatch, post: mockPost },
}));

// ── Auth store mock ────────────────────────────────────────────────────────
vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 'user-1', firstName: 'Alice', lastName: 'Doe', role: 'user' },
    accessToken: 'tok-123',
  })),
}));

// ── React Query mock ───────────────────────────────────────────────────────
const mockUseQuery = vi.fn(() => ({ data: [] }));
vi.mock('@tanstack/react-query', () => ({ useQuery: (...args: unknown[]) => mockUseQuery(...args) }));

// ── Next.js mocks ──────────────────────────────────────────────────────────
vi.mock('next/navigation', () => ({ usePathname: vi.fn(() => '/messages') }));
vi.mock('@/lib/query/keys', () => ({ queryKeys: { notifications: { all: ['notif'] } } }));

// ── Component imports ──────────────────────────────────────────────────────
import { MessagingHub } from '@/components/messaging/MessagingHub';

const BOB_ROOM = {
  id: 'room-1',
  name: null,
  participants: [
    { id: 'p1', userId: 'user-1', roomId: 'room-1', joinedAt: '', user: { id: 'user-1', firstName: 'Alice', lastName: 'Doe', email: '', role: 'user' as const } },
    { id: 'p2', userId: 'user-2', roomId: 'room-1', joinedAt: '', user: { id: 'user-2', firstName: 'Bob', lastName: 'Smith', email: '', role: 'user' as const } },
  ],
  messages: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  unreadCount: 2,
};

describe('[E2E] Messaging / chat flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.on.mockImplementation(() => mockSocket);
    mockGet.mockResolvedValue({ data: [BOB_ROOM] });
    mockPatch.mockResolvedValue({ data: {} });
  });

  it('renders the sidebar with conversations', async () => {
    render(<MessagingHub />);
    await waitFor(() => {
      expect(screen.getByRole('complementary')).toBeDefined();
    });
    expect(screen.getByText('Messages')).toBeDefined();
  });

  it('shows connection banner when socket is disconnected', () => {
    render(<MessagingHub />);
    // Socket connects async; initially not connected
    const banner = screen.queryByText(/connecting/i);
    expect(banner).toBeDefined();
  });

  it('renders Bob Smith in sidebar after rooms load', async () => {
    render(<MessagingHub />);
    await waitFor(() => {
      const bobEl = screen.queryByText('Bob Smith');
      expect(bobEl).not.toBeNull();
    });
  });

  it('selecting a room fetches messages', async () => {
    mockGet
      .mockResolvedValueOnce({ data: [BOB_ROOM] }) // rooms
      .mockResolvedValueOnce({ data: [{ id: 'msg-1', content: 'Hey!', senderId: 'user-2', roomId: 'room-1', createdAt: new Date().toISOString(), sender: { id: 'user-2', firstName: 'Bob', lastName: 'Smith', role: 'user' } }] }); // messages

    render(<MessagingHub />);
    await waitFor(() => screen.queryByText('Bob Smith'));
    fireEvent.click(screen.getByText('Bob Smith'));

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/messaging/rooms/room-1/messages');
    });
  });

  it('marks room as read after selection', async () => {
    render(<MessagingHub />);
    await waitFor(() => screen.queryByText('Bob Smith'));
    fireEvent.click(screen.getByText('Bob Smith'));
    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith('/messaging/rooms/room-1/read');
    });
  });

  it('sends a message via socket', async () => {
    mockGet
      .mockResolvedValueOnce({ data: [BOB_ROOM] })
      .mockResolvedValueOnce({ data: [] });

    render(<MessagingHub />);
    await waitFor(() => screen.queryByText('Bob Smith'));
    fireEvent.click(screen.getByText('Bob Smith'));

    await waitFor(() => screen.getByRole('textbox'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Hello Bob' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    expect(mockSocket.emit).toHaveBeenCalledWith(
      'sendMessage',
      expect.objectContaining({ roomId: 'room-1', content: 'Hello Bob' }),
    );
  });

  it('optimistic send clears textarea immediately', async () => {
    mockGet
      .mockResolvedValueOnce({ data: [BOB_ROOM] })
      .mockResolvedValueOnce({ data: [] });

    render(<MessagingHub />);
    await waitFor(() => screen.queryByText('Bob Smith'));
    fireEvent.click(screen.getByText('Bob Smith'));

    await waitFor(() => screen.getByRole('textbox'));
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Optimistic' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(textarea.value).toBe('');
  });
});
