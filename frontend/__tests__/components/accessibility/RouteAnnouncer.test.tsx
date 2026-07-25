import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { RouteAnnouncer } from '@/components/accessibility/RouteAnnouncer';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockPathname = vi.fn(() => '/');

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('RouteAnnouncer', () => {
  beforeEach(() => {
    mockPathname.mockReturnValue('/');
    vi.useFakeTimers();
    Object.defineProperty(document, 'title', {
      value: 'Home Page',
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a visually hidden paragraph', () => {
    render(<RouteAnnouncer />);
    const el = document.querySelector('.sr-only');
    expect(el).not.toBeNull();
    expect(el?.tagName).toBe('P');
  });

  it('has aria-live="polite" for non-interrupting announcements', () => {
    render(<RouteAnnouncer />);
    const el = document.querySelector('[aria-live="polite"]');
    expect(el).not.toBeNull();
  });

  it('has aria-atomic="true"', () => {
    render(<RouteAnnouncer />);
    const el = document.querySelector('[aria-atomic="true"]');
    expect(el).not.toBeNull();
  });

  it('starts with empty announcement text', () => {
    render(<RouteAnnouncer />);
    const el = document.querySelector('.sr-only');
    expect(el?.textContent).toBe('');
  });

  it('announces route change after 60ms delay', async () => {
    document.title = 'Dashboard';
    render(<RouteAnnouncer />);
    await act(async () => {
      vi.advanceTimersByTime(60);
    });
    const el = document.querySelector('.sr-only');
    expect(el?.textContent).toBe('Navigated to Dashboard');
  });

  it('uses document.title in the announcement', async () => {
    document.title = 'Property Search';
    render(<RouteAnnouncer />);
    await act(async () => {
      vi.advanceTimersByTime(60);
    });
    expect(document.querySelector('.sr-only')?.textContent).toBe(
      'Navigated to Property Search',
    );
  });

  it('falls back to "Page loaded" when document.title is empty', async () => {
    document.title = '';
    render(<RouteAnnouncer />);
    await act(async () => {
      vi.advanceTimersByTime(60);
    });
    expect(document.querySelector('.sr-only')?.textContent).toBe(
      'Navigated to Page loaded',
    );
  });

  it('does not announce before the 60ms timeout fires', async () => {
    render(<RouteAnnouncer />);
    await act(async () => {
      vi.advanceTimersByTime(59);
    });
    expect(document.querySelector('.sr-only')?.textContent).toBe('');
  });
});
