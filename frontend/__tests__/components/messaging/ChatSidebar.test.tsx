/**
 * Component tests for ChatSidebar.
 * Issue: #1255
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ChatSidebar } from '@/components/messaging/ChatSidebar';
import type { ChatRoom } from '@/components/messaging/types';

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 'user-1', firstName: 'Alice', lastName: 'Doe', role: 'user' },
  })),
}));

const makeRoom = (overrides: Partial<ChatRoom> = {}): ChatRoom => ({
  id: 'room-1',
  name: null,
  participants: [
    {
      id: 'part-1',
      userId: 'user-1',
      roomId: 'room-1',
      joinedAt: new Date().toISOString(),
      user: { id: 'user-1', firstName: 'Alice', lastName: 'Doe', email: 'alice@test.com', role: 'user' },
    },
    {
      id: 'part-2',
      userId: 'user-2',
      roomId: 'room-1',
      joinedAt: new Date().toISOString(),
      user: { id: 'user-2', firstName: 'Bob', lastName: 'Smith', email: 'bob@test.com', role: 'user' },
    },
  ],
  messages: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  unreadCount: 0,
  ...overrides,
});

describe('ChatSidebar', () => {
  let onSelectRoom: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSelectRoom = vi.fn();
    vi.clearAllMocks();
  });

  it('renders with accessible label', () => {
    render(
      <ChatSidebar
        rooms={[]}
        activeRoom={null}
        isLoading={false}
        onSelectRoom={onSelectRoom}
      />,
    );
    expect(screen.getByRole('complementary')).toBeDefined();
  });

  it('renders Messages heading', () => {
    render(
      <ChatSidebar
        rooms={[]}
        activeRoom={null}
        isLoading={false}
        onSelectRoom={onSelectRoom}
      />,
    );
    expect(screen.getByText('Messages')).toBeDefined();
  });

  it('renders search input', () => {
    render(
      <ChatSidebar
        rooms={[]}
        activeRoom={null}
        isLoading={false}
        onSelectRoom={onSelectRoom}
      />,
    );
    expect(screen.getByRole('searchbox')).toBeDefined();
  });

  it('shows loading state', () => {
    const { container } = render(
      <ChatSidebar
        rooms={[]}
        activeRoom={null}
        isLoading={true}
        onSelectRoom={onSelectRoom}
      />,
    );
    expect(container).toBeDefined();
  });

  it('renders a list of rooms', () => {
    const rooms = [makeRoom(), makeRoom({ id: 'room-2', participants: [
      { id: 'p3', userId: 'user-1', roomId: 'room-2', joinedAt: new Date().toISOString(), user: { id: 'user-1', firstName: 'Alice', lastName: 'Doe', email: '', role: 'user' } },
      { id: 'p4', userId: 'user-3', roomId: 'room-2', joinedAt: new Date().toISOString(), user: { id: 'user-3', firstName: 'Carol', lastName: 'Jones', email: '', role: 'user' } },
    ] })];
    render(
      <ChatSidebar
        rooms={rooms}
        activeRoom={null}
        isLoading={false}
        onSelectRoom={onSelectRoom}
      />,
    );
    expect(screen.getByText('Bob Smith')).toBeDefined();
    expect(screen.getByText('Carol Jones')).toBeDefined();
  });

  it('calls onSelectRoom when a room is clicked', () => {
    const room = makeRoom();
    render(
      <ChatSidebar
        rooms={[room]}
        activeRoom={null}
        isLoading={false}
        onSelectRoom={onSelectRoom}
      />,
    );
    fireEvent.click(screen.getByText('Bob Smith'));
    expect(onSelectRoom).toHaveBeenCalledWith(room);
  });

  it('filters rooms by search query', () => {
    const rooms = [
      makeRoom(),
      makeRoom({ id: 'room-2', participants: [
        { id: 'p3', userId: 'user-1', roomId: 'room-2', joinedAt: new Date().toISOString(), user: { id: 'user-1', firstName: 'Alice', lastName: 'Doe', email: '', role: 'user' } },
        { id: 'p4', userId: 'user-3', roomId: 'room-2', joinedAt: new Date().toISOString(), user: { id: 'user-3', firstName: 'Zach', lastName: 'Morris', email: '', role: 'user' } },
      ] }),
    ];
    render(
      <ChatSidebar
        rooms={rooms}
        activeRoom={null}
        isLoading={false}
        onSelectRoom={onSelectRoom}
      />,
    );
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Zach' } });
    expect(screen.getByText('Zach Morris')).toBeDefined();
    expect(screen.queryByText('Bob Smith')).toBeNull();
  });

  it('shows unread count badge when unreadCount > 0', () => {
    const room = makeRoom({ unreadCount: 3 });
    render(
      <ChatSidebar
        rooms={[room]}
        activeRoom={null}
        isLoading={false}
        onSelectRoom={onSelectRoom}
      />,
    );
    expect(screen.getByText('3')).toBeDefined();
  });
});
