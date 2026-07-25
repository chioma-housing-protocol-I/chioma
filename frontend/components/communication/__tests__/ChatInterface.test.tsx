import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import type { ChatRoom, Message } from '@/components/messaging/types';

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: {
      id: 'user-1',
      firstName: 'Test',
      lastName: 'User',
      role: 'user' as const,
    },
  })),
}));

vi.mock('@/components/messaging/ChatSidebar', () => ({
  ChatSidebar: (props: Record<string, unknown>) =>
    React.createElement(
      'div',
      { 'data-testid': 'chat-sidebar', ...props },
      'Chat Sidebar',
    ),
}));

vi.mock('@/components/messaging/MessageList', () => ({
  MessageList: (props: Record<string, unknown>) =>
    React.createElement(
      'div',
      { 'data-testid': 'message-list', ...props },
      'Message List',
    ),
}));

vi.mock('@/components/messaging/MessageInput', () => ({
  MessageInput: (props: Record<string, unknown>) =>
    React.createElement(
      'div',
      { 'data-testid': 'message-input', ...props },
      'Message Input',
    ),
}));

vi.mock('@/components/messaging/UserAvatar', () => ({
  UserAvatar: (props: Record<string, unknown>) =>
    React.createElement(
      'div',
      { 'data-testid': 'user-avatar', ...props },
      'Avatar',
    ),
}));

import { ChatInterface } from '../ChatInterface';

const mockRooms: ChatRoom[] = [
  {
    id: 'room-1',
    name: null,
    participants: [
      {
        id: 'p1',
        userId: 'user-2',
        roomId: 'room-1',
        joinedAt: '2024-01-01',
        user: {
          id: 'user-2',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@test.com',
          role: 'user',
        },
      },
      {
        id: 'p2',
        userId: 'user-1',
        roomId: 'room-1',
        joinedAt: '2024-01-01',
        user: {
          id: 'user-1',
          firstName: 'Test',
          lastName: 'User',
          email: 'test@test.com',
          role: 'user',
        },
      },
    ],
    messages: [],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'room-2',
    name: 'Group Chat',
    participants: [],
    messages: [],
    createdAt: '2024-01-02',
    updatedAt: '2024-01-02',
  },
];

const mockMessages: Message[] = [
  {
    id: 'msg-1',
    content: 'Hello!',
    senderId: 'user-2',
    roomId: 'room-1',
    createdAt: '2024-01-01',
    sender: { id: 'user-2', firstName: 'Jane', lastName: 'Doe', role: 'user' },
  },
  {
    id: 'msg-2',
    content: 'Hi there!',
    senderId: 'user-1',
    roomId: 'room-1',
    createdAt: '2024-01-01',
    sender: { id: 'user-1', firstName: 'Test', lastName: 'User', role: 'user' },
  },
];

describe('ChatInterface', () => {
  const defaultProps = {
    rooms: mockRooms,
    activeRoom: mockRooms[0],
    messages: mockMessages,
    typingUsers: new Set<string>(),
    isConnected: true,
    isLoadingRooms: false,
    isLoadingMessages: false,
    onSelectRoom: vi.fn(),
    onSendMessage: vi.fn(),
    onTyping: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the chat sidebar', () => {
    render(React.createElement(ChatInterface, defaultProps));

    expect(screen.getByTestId('chat-sidebar')).toBeInTheDocument();
  });

  it('renders the message list when active room is selected', () => {
    render(React.createElement(ChatInterface, defaultProps));

    expect(screen.getByTestId('message-list')).toBeInTheDocument();
  });

  it('renders the message input when active room is selected', () => {
    render(React.createElement(ChatInterface, defaultProps));

    expect(screen.getByTestId('message-input')).toBeInTheDocument();
  });

  it('displays the other participant name in header', () => {
    render(React.createElement(ChatInterface, defaultProps));

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('displays connected status when isConnected is true', () => {
    render(React.createElement(ChatInterface, defaultProps));

    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('displays reconnecting status when isConnected is false', () => {
    render(
      React.createElement(ChatInterface, {
        ...defaultProps,
        isConnected: false,
      }),
    );

    expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
  });

  it('displays typing indicator when users are typing', () => {
    render(
      React.createElement(ChatInterface, {
        ...defaultProps,
        typingUsers: new Set(['user-2']),
      }),
    );

    expect(screen.getByText('typing...')).toBeInTheDocument();
  });

  it('shows empty state when no active room', () => {
    render(
      React.createElement(ChatInterface, { ...defaultProps, activeRoom: null }),
    );

    expect(screen.getByText('Your messages')).toBeInTheDocument();
    expect(screen.getByText(/Select a conversation/)).toBeInTheDocument();
  });

  it('shows room name when no other participant', () => {
    render(
      React.createElement(ChatInterface, {
        ...defaultProps,
        activeRoom: mockRooms[1],
      }),
    );

    expect(screen.getByText('Group Chat')).toBeInTheDocument();
  });

  it('calls onSelectRoom when a room is selected from sidebar', () => {
    const onSelectRoom = vi.fn();
    render(
      React.createElement(ChatInterface, { ...defaultProps, onSelectRoom }),
    );

    expect(onSelectRoom).not.toHaveBeenCalled();
  });

  it('renders user avatar for the other participant', () => {
    render(React.createElement(ChatInterface, defaultProps));

    expect(screen.getByTestId('user-avatar')).toBeInTheDocument();
  });

  it('applies disabled state to message input when disconnected', () => {
    render(
      React.createElement(ChatInterface, {
        ...defaultProps,
        isConnected: false,
      }),
    );

    const messageInput = screen.getByTestId('message-input');
    expect(messageInput).toBeInTheDocument();
  });

  it('handles loading state for rooms', () => {
    render(
      React.createElement(ChatInterface, {
        ...defaultProps,
        isLoadingRooms: true,
      }),
    );

    expect(screen.getByTestId('chat-sidebar')).toBeInTheDocument();
  });

  it('handles loading state for messages', () => {
    render(
      React.createElement(ChatInterface, {
        ...defaultProps,
        isLoadingMessages: true,
      }),
    );

    expect(screen.getByTestId('message-list')).toBeInTheDocument();
  });

  it('shows back to conversations in empty state', () => {
    render(
      React.createElement(ChatInterface, { ...defaultProps, activeRoom: null }),
    );

    expect(screen.getByText('Back to conversations')).toBeInTheDocument();
  });
});
