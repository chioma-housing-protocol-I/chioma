import type { TranslationPath } from '@/lib/i18n';

export type NavigationLink = {
  /** English label, also used as a stable React key. */
  name: string;
  /** Translation key rendered via `t()` — see `lib/i18n/translations`. */
  labelKey: TranslationPath;
  href: string;
};

export const NAV_LINKS: NavigationLink[] = [
  { name: 'Find a Home', labelKey: 'navbar.findHome', href: '/properties' },
  { name: 'Resources', labelKey: 'navbar.resources', href: '/resources' },
];
