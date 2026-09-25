/**
 * Hook tests for useMessagingUnreadCount.
 * Issue: #1255
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockUseQuery = vi.fn();
vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

const mockPathname = vi.fn(() => '/dashboard');
vi.mock('next/navigation', () => ({ usePathname: () => mockPathname() }));

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn() } }));
vi.mock('@/lib/query/keys', () => ({
  queryKeys: { notifications: { all: ['notifications'] } },
}));

import { useMessagingUnreadCount } from '@/components/messaging/useMessagingUnreadCount';

const wrapper = ({ children }: { children: React.ReactNode }) => children;

describe('useMessagingUnreadCount', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 0 when not on messages page and no rooms have unread', () => {
    mockPathname.mockReturnValue('/dashboard');
    mockUseQuery.mockReturnValue({ data: [{ id: 'r1', unreadCount: 0 }] });
    const { result } = renderHook(() => useMessagingUnreadCount(), { wrapper });
    expect(result.current).toBe(0);
  });

  it('sums unread counts across all rooms', () => {
    mockPathname.mockReturnValue('/dashboard');
    mockUseQuery.mockReturnValue({
      data: [
        { id: 'r1', unreadCount: 2 },
        { id: 'r2', unreadCount: 5 },
      ],
    });
    const { result } = renderHook(() => useMessagingUnreadCount(), { wrapper });
    expect(result.current).toBe(7);
  });

  it('returns 0 when viewing /messages regardless of unread count', () => {
    mockPathname.mockReturnValue('/messages');
    mockUseQuery.mockReturnValue({
      data: [{ id: 'r1', unreadCount: 10 }],
    });
    const { result } = renderHook(() => useMessagingUnreadCount(), { wrapper });
    expect(result.current).toBe(0);
  });

  it('returns 0 when data is undefined', () => {
    mockPathname.mockReturnValue('/dashboard');
    mockUseQuery.mockReturnValue({ data: undefined });
    const { result } = renderHook(() => useMessagingUnreadCount(), { wrapper });
    expect(result.current).toBe(0);
  });

  it('returns 0 when rooms have no unreadCount property', () => {
    mockPathname.mockReturnValue('/dashboard');
    mockUseQuery.mockReturnValue({ data: [{ id: 'r1' }, { id: 'r2' }] });
    const { result } = renderHook(() => useMessagingUnreadCount(), { wrapper });
    expect(result.current).toBe(0);
  });
});
