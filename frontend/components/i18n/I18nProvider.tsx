'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { I18N_STORAGE_KEY, useI18nStore, useTranslation } from '@/lib/i18n';
import { HtmlAttributesSync } from './HtmlAttributesSync';

type I18nContextValue = ReturnType<typeof useTranslation>;

const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * App-wide internationalisation provider.
 *
 * - Exposes the active locale, `t()` and locale-aware formatters through
 *   React context (`useI18n`).
 * - The selected locale is persisted to localStorage (`chioma-locale`) by
 *   the underlying zustand store, so the choice survives reloads.
 * - Re-hydrates when another tab changes the locale, keeping every open tab
 *   on the same language.
 * - Keeps `<html lang>` / `<html dir>` in sync (RTL support for `ar`).
 *
 * Mounted once in `RootLayoutClient`.
 */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const value = useTranslation();

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === I18N_STORAGE_KEY) {
        void useI18nStore.persist.rehydrate();
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <I18nContext.Provider value={value}>
      <HtmlAttributesSync />
      {children}
    </I18nContext.Provider>
  );
}

/**
 * Read translations from the nearest `I18nProvider`. Falls back to the
 * store-backed hook when rendered outside the provider (e.g. isolated
 * component tests or Storybook), so components never crash.
 */
export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  const fallback = useTranslation();
  return context ?? fallback;
}
