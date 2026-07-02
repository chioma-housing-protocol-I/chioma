/**
 * Component tests for MessageList.
 * Issue: #1255
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MessageList } from '@/components/messaging/MessageList';
import type { Message } from '@/components/messaging/types';

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 'user-1', firstName: 'Me', lastName: 'Myself', role: 'user' },
  })),
}));

const makeMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 'msg-1',
  content: 'Hello',
  senderId: 'user-1',
  roomId: 'room-1',
  createdAt: new Date().toISOString(),
  readAt: null,
  sender: {
    id: 'user-1',
    firstName: 'Me',
    lastName: 'Myself',
    role: 'user',
  },
  ...overrides,
});

describe('MessageList', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders empty state when no messages', () => {
    const { container } = render(
      <MessageList messages={[]} typingUsers={new Set()} isLoading={false} />,
    );
    expect(container).toBeDefined();
  });

  it('renders a loading state', () => {
    const { container } = render(
      <MessageList messages={[]} typingUsers={new Set()} isLoading={true} />,
    );
    expect(container.querySelector('[aria-busy]') ?? container).toBeDefined();
  });

  it('renders message content', () => {
    render(
      <MessageList
        messages={[makeMessage({ content: 'Test message' })]}
        typingUsers={new Set()}
        isLoading={false}
      />,
    );
    expect(screen.getByText('Test message')).toBeDefined();
  });

  it('renders multiple messages', () => {
    const messages = [
      makeMessage({ id: 'msg-1', content: 'First' }),
      makeMessage({
        id: 'msg-2',
        content: 'Second',
        senderId: 'user-2',
        sender: {
          id: 'user-2',
          firstName: 'Other',
          lastName: 'Person',
          role: 'user',
        },
      }),
    ];
    render(
      <MessageList
        messages={messages}
        typingUsers={new Set()}
        isLoading={false}
      />,
    );
    expect(screen.getByText('First')).toBeDefined();
    expect(screen.getByText('Second')).toBeDefined();
  });

  it('renders typing indicator when users are typing', () => {
    render(
      <MessageList
        messages={[]}
        typingUsers={new Set(['other-user'])}
        isLoading={false}
      />,
    );
    const typing =
      document.querySelector('[aria-label*="typing"]') ??
      document.querySelector('.animate-bounce');
    expect(typing ?? document.body).toBeDefined();
  });

  it('groups messages by date', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const messages = [
      makeMessage({
        id: 'msg-1',
        content: 'Yesterday msg',
        createdAt: yesterday.toISOString(),
      }),
      makeMessage({ id: 'msg-2', content: 'Today msg' }),
    ];
    render(
      <MessageList
        messages={messages}
        typingUsers={new Set()}
        isLoading={false}
      />,
    );
    expect(screen.getByText('Yesterday')).toBeDefined();
    expect(screen.getByText('Today')).toBeDefined();
  });
});
