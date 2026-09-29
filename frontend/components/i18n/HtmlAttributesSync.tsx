'use client';

import { useEffect } from 'react';
import { useTranslation, LOCALE_OPTIONS } from '@/lib/i18n';

/**
 * Keeps <html lang> and <html dir> in sync with the active locale, app-wide.
 * Mounted once in RootLayoutClient so RTL locales (see translations/ar.ts)
 * flip the document direction regardless of which page is active.
 */
export function HtmlAttributesSync() {
  const { locale, isHydrated } = useTranslation();

  useEffect(() => {
    if (!isHydrated) return;
    const option = LOCALE_OPTIONS.find((o) => o.code === locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = option?.dir ?? 'ltr';
  }, [locale, isHydrated]);

  return null;
}
