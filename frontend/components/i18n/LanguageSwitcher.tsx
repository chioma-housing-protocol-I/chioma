'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import {
  useTranslation,
  LOCALE_OPTIONS,
  type SupportedLocale,
} from '@/lib/i18n';
import { useAuthStore } from '@/store/authStore';

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className = '' }: LanguageSwitcherProps) {
  const { locale, setLocale, isHydrated } = useTranslation();
  const updatePreferences = useAuthStore((s) => s.updatePreferences);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current =
    LOCALE_OPTIONS.find((o) => o.code === locale) ?? LOCALE_OPTIONS[0];

  // Sync html[lang] whenever locale changes — inside an effect to satisfy the
  // react-hooks/immutability rule (no direct DOM mutation in event handlers).
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelect(code: SupportedLocale) {
    setLocale(code);
    setOpen(false);

    // Sync locale preference to the user's profile if authenticated.
    if (isAuthenticated) {
      updatePreferences({ locale: code });
    }
  }

  // Render a stable placeholder until the store has hydrated to avoid
  // any React hydration mismatch between server and client renders.
  if (!isHydrated) {
    return (
      <div className={`relative ${className}`}>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300">
          <Globe size={15} />
          <span className="w-14 h-4 bg-white/10 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select language"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/10 transition-colors"
      >
        <Globe size={15} />
        <span>{current.nativeLabel}</span>
        <ChevronDown
          size={13}
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Language options"
          className="absolute right-0 mt-1 w-40 bg-slate-800 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50"
        >
          {LOCALE_OPTIONS.map((option) => (
            <li
              key={option.code}
              role="option"
              aria-selected={locale === option.code}
            >
              <button
                onClick={() => handleSelect(option.code)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                  locale === option.code
                    ? 'bg-blue-600/20 text-blue-300'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <span>{option.nativeLabel}</span>
                {locale === option.code && <Check size={13} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
