import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { useUIStore } from '@/store/ui-store';
import ThemeManager from '../ThemeManager';

describe('ThemeManager', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    document.documentElement.classList.remove('dark');
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';
    vi.restoreAllMocks();
  });

  it('uses and tracks the system preference when the stored theme is system', () => {
    let systemPrefersDark = true;
    let handleChange: ((event: MediaQueryListEvent) => void) | undefined;
    window.matchMedia = vi.fn().mockImplementation(() => ({
      get matches() {
        return systemPrefersDark;
      },
      media: '(prefers-color-scheme: dark)',
      addEventListener: (_type: string, listener: typeof handleChange) => {
        handleChange = listener;
      },
      removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;
    useUIStore.getState().setTheme('system');

    const { unmount } = render(<ThemeManager />);

    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'system');
    expect(document.documentElement.style.colorScheme).toBe('dark');

    systemPrefersDark = false;
    handleChange?.({ matches: false } as MediaQueryListEvent);

    expect(document.documentElement).not.toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('light');

    unmount();
  });
});