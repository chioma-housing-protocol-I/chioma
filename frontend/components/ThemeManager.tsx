'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/store/ui-store';

export default function ThemeManager() {
  const theme = useUIStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;
    const systemPreference = window.matchMedia(
      '(prefers-color-scheme: dark)',
    );
    const applyPreference = (systemPrefersDark = systemPreference.matches) => {
      const resolvedTheme =
        theme === 'system'
          ? systemPrefersDark
            ? 'dark'
            : 'light'
          : theme;

      root.classList.toggle('dark', resolvedTheme === 'dark');
      root.style.colorScheme = resolvedTheme;
      root.setAttribute('data-theme', theme);
    };

    applyPreference();

    if (theme !== 'system') return;

    const handlePreferenceChange = (event: MediaQueryListEvent) => {
      applyPreference(event.matches);
    };

    systemPreference.addEventListener('change', handlePreferenceChange);
    return () =>
      systemPreference.removeEventListener('change', handlePreferenceChange);
  }, [theme]);

  return null;
}