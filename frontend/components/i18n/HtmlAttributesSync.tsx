'use client';

import { useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';

/**
 * Keeps <html lang> and <html dir> in sync with the active locale, app-wide.
 * Mounted once in RootLayoutClient so RTL locales (Arabic, Hebrew, …) flip
 * the document direction regardless of which page is active. Flexbox, grid
 * and Tailwind's logical utilities (`ms-*`, `ps-*`, `start-*`, `text-start`,
 * `rtl:*`) all follow `dir`, so layouts mirror automatically.
 */
export function HtmlAttributesSync() {
  const { locale, dir, isHydrated } = useTranslation();

  useEffect(() => {
    if (!isHydrated) return;
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir, isHydrated]);

  return null;
}
