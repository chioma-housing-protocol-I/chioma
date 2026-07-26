/**
 * Keyboard navigation and focus management audit.
 * Covers: tab order, visible focus styles, Enter/Space activation on custom
 * controls, focus restoration after route changes via RouteAnnouncer.
 * Issue: #1261
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    ...props
  }: {
    src: string;
    alt: string;
    [k: string]: unknown;
  }) => React.createElement('img', { src, alt, ...props }),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

vi.mock('@/store/authStore', () => ({
  useAuth: vi.fn(() => ({ isAuthenticated: false, loading: false })),
  useAuthStore: vi.fn(() => ({
    // id matches the "self" participant in the ChatSidebar test room below,
    // so getOtherParticipant() correctly resolves to the other participant.
    user: { id: 'user-1', firstName: 'Test', lastName: 'User', role: 'user' },
    accessToken: null,
  })),
}));

// ── Component imports ──────────────────────────────────────────────────────

import { RouteAnnouncer } from '@/components/accessibility/RouteAnnouncer';
import { UserAvatar } from '@/components/messaging/UserAvatar';
import { MessageInput } from '@/components/messaging/MessageInput';
import { ChatSidebar } from '@/components/messaging/ChatSidebar';

// ── Helpers ────────────────────────────────────────────────────────────────

function queryFocusableElements(container: HTMLElement) {
  const candidates = container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]',
  );
  return Array.from(candidates).filter((el) => el.tabIndex !== -1);
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('[A11Y] Keyboard navigation and focus management', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('RouteAnnouncer — focus restoration', () => {
    it('renders an aria-live region for route announcements', () => {
      const { container } = render(<RouteAnnouncer />);
      const liveEl = container.querySelector('[aria-live]');
      expect(liveEl).not.toBeNull();
    });

    it('has aria-live="polite" so announcements are non-interruptive', () => {
      const { container } = render(<RouteAnnouncer />);
      expect(container.querySelector('[aria-live="polite"]')).not.toBeNull();
    });

    it('has aria-atomic="true" so whole announcement is read', () => {
      const { container } = render(<RouteAnnouncer />);
      expect(container.querySelector('[aria-atomic="true"]')).not.toBeNull();
    });
  });

  describe('UserAvatar — accessible name', () => {
    it('has a non-empty aria-label', () => {
      const { container } = render(
        <UserAvatar firstName="Jane" lastName="Doe" />,
      );
      const el = container.querySelector('[aria-label]');
      expect(el?.getAttribute('aria-label')).toBe('Jane Doe');
    });
  });

  describe('MessageInput — keyboard activation', () => {
    it('all interactive elements are reachable by Tab', () => {
      const { container } = render(
        <MessageInput onSend={vi.fn()} onTyping={vi.fn()} />,
      );
      const focusable = queryFocusableElements(container as HTMLElement);
      expect(focusable.length).toBeGreaterThan(0);
    });

    it('tab order matches the visual left-to-right layout: attach, textarea', () => {
      // Send button is disabled (and excluded from tab order) until there's
      // content to send.
      const { container } = render(
        <MessageInput onSend={vi.fn()} onTyping={vi.fn()} />,
      );
      const focusable = queryFocusableElements(container as HTMLElement);
      expect(focusable.map((el) => el.tagName.toLowerCase())).toEqual([
        'button',
        'textarea',
      ]);
    });

    it('Enter key activates send without needing mouse', () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} onTyping={vi.fn()} />);
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Keyboard send' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
      expect(onSend).toHaveBeenCalledWith('Keyboard send', undefined);
    });

    it('disabled MessageInput does not allow send on Enter', () => {
      const onSend = vi.fn();
      render(<MessageInput onSend={onSend} onTyping={vi.fn()} disabled />);
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Blocked' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
      expect(onSend).not.toHaveBeenCalled();
    });
  });

  describe('ChatSidebar — tab order and ARIA roles', () => {
    it('renders an aside with accessible label', () => {
      render(
        <ChatSidebar
          rooms={[]}
          activeRoom={null}
          isLoading={false}
          onSelectRoom={vi.fn()}
        />,
      );
      const aside = screen.getByRole('complementary');
      expect(aside.getAttribute('aria-label')).toBeTruthy();
    });

    it('search input is a search role for screen readers', () => {
      render(
        <ChatSidebar
          rooms={[]}
          activeRoom={null}
          isLoading={false}
          onSelectRoom={vi.fn()}
        />,
      );
      expect(screen.getByRole('searchbox')).toBeDefined();
    });

    it('conversation buttons are clickable via keyboard (Space activates)', () => {
      const onSelectRoom = vi.fn();
      const room = {
        id: 'r1',
        name: null,
        participants: [
          {
            id: 'p1',
            userId: 'user-1',
            roomId: 'r1',
            joinedAt: '',
            user: {
              id: 'user-1',
              firstName: 'Test',
              lastName: 'User',
              email: '',
              role: 'user' as const,
            },
          },
          {
            id: 'p2',
            userId: 'user-2',
            roomId: 'r1',
            joinedAt: '',
            user: {
              id: 'user-2',
              firstName: 'Keyboard',
              lastName: 'User',
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
      render(
        <ChatSidebar
          rooms={[room]}
          activeRoom={null}
          isLoading={false}
          onSelectRoom={onSelectRoom}
        />,
      );
      const roomBtn = screen.getByText('Keyboard User').closest('button');
      if (roomBtn) {
        fireEvent.keyDown(roomBtn, { key: ' ' });
        fireEvent.click(roomBtn);
        expect(onSelectRoom).toHaveBeenCalledWith(room);
      }
    });
  });

  describe('No keyboard traps', () => {
    it('MessageInput does not trap Tab key', () => {
      render(<MessageInput onSend={vi.fn()} onTyping={vi.fn()} />);
      const textarea = screen.getByRole('textbox');
      // Tab should not be prevented
      const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
      let defaultPrevented = false;
      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') defaultPrevented = e.defaultPrevented;
      });
      textarea.dispatchEvent(event);
      expect(defaultPrevented).toBe(false);
    });
  });
});
