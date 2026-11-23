'use client';

import React, { useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrent?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface BreadcrumbProps {
  /**
   * Explicit breadcrumb items to display.
   * If omitted, items will be automatically generated from current pathname.
   */
  items?: BreadcrumbItem[];

  /**
   * Root / home URL. Defaults to '/' or detected section root (e.g. '/user').
   */
  homeHref?: string;

  /**
   * Label for the home / root segment. Defaults to 'Home'.
   */
  homeLabel?: string;

  /**
   * Whether to display the home icon. Defaults to true.
   */
  showHomeIcon?: boolean;

  /**
   * Custom mapping of route segments or IDs to human-readable labels.
   * Example: { '123': 'Sunset Villa', 'kyc': 'KYC Verification' }
   */
  customLabels?: Record<string, string>;

  /**
   * Whether to display the back button.
   * Defaults to true for nested routes (depth > 1) or when backHref is passed.
   */
  showBackButton?: boolean;

  /**
   * Custom URL or fallback destination for the back button.
   * If not provided, uses browser history back or immediate parent route.
   */
  backHref?: string;

  /**
   * Text label for the back button. Defaults to 'Back'.
   */
  backLabel?: string;

  /**
   * Optional click handler for the back button.
   */
  onBack?: () => void;

  /**
   * Whether to preserve and restore scroll position across navigation.
   * Defaults to true.
   */
  preserveScroll?: boolean;

  /**
   * Unique storage key for saving and restoring scroll positions.
   * Defaults to `chioma_scroll_pos_${pathname}`.
   */
  scrollKey?: string;

  /**
   * Visual theme variant:
   * - 'dark': for dark-themed dashboard subpages (user, admin, host, etc.)
   * - 'light': for light-themed pages
   * - 'auto': automatically detects based on pathname
   * Defaults to 'auto'.
   */
  variant?: 'dark' | 'light' | 'auto';

  /**
   * Additional CSS classes for the container.
   */
  className?: string;

  /**
   * Custom separator element. Defaults to ChevronRight icon.
   */
  separator?: React.ReactNode;
}

// Map of common route segments to clean, user-friendly titles
const DEFAULT_ROUTE_LABELS: Record<string, string> = {
  user: 'Dashboard',
  host: 'Host Portal',
  guest: 'Guest Portal',
  admin: 'Admin',
  developer: 'Developer',
  properties: 'Properties',
  stays: 'Stays',
  sublet: 'Sublet',
  book: 'Book',
  agreements: 'Agreements',
  disputes: 'Disputes',
  documents: 'Documents',
  files: 'Files',
  financials: 'Financials',
  escrows: 'Escrows',
  inquiries: 'Inquiries',
  maintenance: 'Maintenance',
  messages: 'Messages',
  'my-contacts': 'My Contacts',
  'my-rentals': 'My Rentals',
  notifications: 'Notifications',
  onboarding: 'Onboarding',
  payments: 'Payments',
  profile: 'Profile',
  referrals: 'Referrals',
  reviews: 'Reviews',
  security: 'Security',
  settings: 'Settings',
  tenants: 'Tenants',
  transactions: 'Transactions',
  verification: 'Verification',
  wallet: 'Wallet',
  wizard: 'Listing Wizard',
  new: 'New',
  analytics: 'Analytics',
  'audit-logs': 'Audit Logs',
  'auth-metrics': 'Auth Metrics',
  currencies: 'Currencies',
  feedback: 'Feedback',
  'indexed-transactions': 'Indexed Transactions',
  'anchor-transactions': 'Anchor Transactions',
  arbiters: 'Arbiters',
  kyc: 'KYC',
  rejected: 'Rejected',
  rbac: 'RBAC',
  permissions: 'Permissions',
  refunds: 'Refunds',
  roles: 'Roles',
  threats: 'Threats',
  users: 'Users',
  webhooks: 'Webhooks',
  'api-keys': 'API Keys',
  sdks: 'SDKs',
  support: 'Support',
  status: 'Status',
  docs: 'Docs',
  examples: 'Examples',
  resources: 'Resources',
};

// In-memory fallback if sessionStorage is blocked
const memoryScrollStorage = new Map<string, string>();

/**
 * Save scroll position for a specific route / key.
 */
export function saveScrollPosition(key?: string): void {
  if (typeof window === 'undefined') return;
  const storageKey = key || `chioma_scroll_pos_${window.location.pathname}`;
  const pos = {
    x: window.scrollX || window.pageXOffset || 0,
    y: window.scrollY || window.pageYOffset || 0,
    timestamp: Date.now(),
  };
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(pos));
  } catch {
    memoryScrollStorage.set(storageKey, JSON.stringify(pos));
  }
}

/**
 * Retrieve saved scroll position for a route / key.
 */
export function getSavedScrollPosition(
  key?: string,
): { x: number; y: number } | null {
  if (typeof window === 'undefined') return null;
  const storageKey = key || `chioma_scroll_pos_${window.location.pathname}`;
  try {
    const raw =
      sessionStorage.getItem(storageKey) || memoryScrollStorage.get(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.y === 'number' && typeof parsed?.x === 'number') {
      return { x: parsed.x, y: parsed.y };
    }
  } catch {
    // Ignore parse or storage errors
  }
  return null;
}

/**
 * Restore saved scroll position.
 */
export function restoreScrollPosition(key?: string): boolean {
  if (typeof window === 'undefined') return false;
  const pos = getSavedScrollPosition(key);
  if (pos && (pos.y > 0 || pos.x > 0)) {
    window.scrollTo({
      top: pos.y,
      left: pos.x,
      behavior: 'instant',
    });
    return true;
  }
  return false;
}

/**
 * Clear saved scroll position.
 */
export function clearSavedScrollPosition(key?: string): void {
  if (typeof window === 'undefined') return;
  const storageKey = key || `chioma_scroll_pos_${window.location.pathname}`;
  try {
    sessionStorage.removeItem(storageKey);
  } catch {}
  memoryScrollStorage.delete(storageKey);
}

/**
 * Hook to manage scroll position preservation on a page.
 */
export function useScrollRestoration(
  options: { enabled?: boolean; key?: string } = {},
) {
  const { enabled = true, key } = options;
  const pathname = usePathname();
  const effectiveKey = key || `chioma_scroll_pos_${pathname}`;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Restore scroll position after DOM renders
    const rafId = requestAnimationFrame(() => {
      restoreScrollPosition(effectiveKey);
    });

    const handleBeforeUnload = () => {
      saveScrollPosition(effectiveKey);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      cancelAnimationFrame(rafId);
      saveScrollPosition(effectiveKey);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, effectiveKey, pathname]);
}

/**
 * Format a URL path segment into a readable title.
 */
function formatSegmentLabel(
  segment: string,
  customLabels?: Record<string, string>,
): string {
  if (customLabels && customLabels[segment]) {
    return customLabels[segment];
  }

  const lower = segment.toLowerCase();
  if (DEFAULT_ROUTE_LABELS[lower]) {
    return DEFAULT_ROUTE_LABELS[lower];
  }

  // Check if it is a numeric ID or UUID or hash
  if (/^\d+$/.test(segment)) {
    return `#${segment}`;
  }
  if (
    /^[0-9a-fA-F-]{8,}$/.test(segment) ||
    /^(0x)?[0-9a-fA-F]{8,}$/.test(segment)
  ) {
    return `#${segment.slice(-8).toUpperCase()}`;
  }

  // Title-case words separated by dashes or underscores
  return segment
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Breadcrumb component providing hierarchy trail and scroll-preserving back button.
 */
export function Breadcrumb({
  items,
  homeHref = '/',
  homeLabel = 'Home',
  showHomeIcon = true,
  customLabels,
  showBackButton,
  backHref,
  backLabel = 'Back',
  onBack,
  preserveScroll = true,
  scrollKey,
  variant = 'auto',
  className = '',
  separator,
}: BreadcrumbProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Enable scroll restoration
  useScrollRestoration({ enabled: preserveScroll, key: scrollKey });

  // Auto-generate items from pathname if not explicitly provided
  const segments = useMemo(() => {
    if (!pathname) return [];
    return pathname.split('/').filter(Boolean);
  }, [pathname]);

  const breadcrumbItems: BreadcrumbItem[] = useMemo(() => {
    if (items && items.length > 0) return items;

    return segments.map((segment, index) => {
      const isLast = index === segments.length - 1;
      const href = `/${segments.slice(0, index + 1).join('/')}`;
      const label = formatSegmentLabel(segment, customLabels);

      return {
        label,
        href: isLast ? undefined : href,
        isCurrent: isLast,
      };
    });
  }, [items, segments, customLabels]);

  // Determine parent route for fallback back navigation
  const parentHref = useMemo(() => {
    if (backHref) return backHref;
    if (segments.length > 1) {
      return `/${segments.slice(0, segments.length - 1).join('/')}`;
    }
    return homeHref;
  }, [backHref, segments, homeHref]);

  // Show back button by default if on a nested page (segments > 1) or backHref/onBack provided
  const shouldShowBackButton =
    showBackButton !== undefined
      ? showBackButton
      : segments.length > 1 || Boolean(backHref) || Boolean(onBack);

  // Handle back navigation
  const handleBack = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.preventDefault();

      if (preserveScroll) {
        saveScrollPosition(scrollKey || `chioma_scroll_pos_${pathname}`);
      }

      if (onBack) {
        onBack();
        return;
      }

      if (backHref) {
        router.push(backHref, { scroll: false });
        return;
      }

      if (typeof window !== 'undefined' && window.history.length > 1) {
        router.back();
      } else {
        router.push(parentHref, { scroll: false });
      }
    },
    [preserveScroll, scrollKey, pathname, onBack, backHref, router, parentHref],
  );

  // Theme resolution
  const isDark = useMemo(() => {
    if (variant === 'dark') return true;
    if (variant === 'light') return false;
    // Auto-detect based on dashboard routes
    const darkRoutes = ['/user', '/admin', '/developer', '/host', '/guest'];
    return darkRoutes.some((route) => pathname?.startsWith(route));
  }, [variant, pathname]);

  if (breadcrumbItems.length === 0 && !shouldShowBackButton) {
    return null;
  }

  const SeparatorIcon = separator || (
    <ChevronRight
      aria-hidden="true"
      className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-blue-300/40' : 'text-gray-300'}`}
    />
  );

  return (
    <div
      className={`flex flex-wrap items-center gap-3 text-sm py-2 mb-6 ${
        isDark ? 'text-blue-200/70' : 'text-gray-500'
      } ${className}`}
    >
      {/* Back Button */}
      {shouldShowBackButton && (
        <div className="flex items-center mr-1">
          <button
            type="button"
            onClick={handleBack}
            aria-label={backLabel ? `Go back: ${backLabel}` : 'Go back'}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs sm:text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
              isDark
                ? 'bg-white/5 border border-white/10 text-blue-200 hover:text-white hover:bg-white/10'
                : 'bg-gray-100 border border-gray-200 text-gray-700 hover:text-gray-900 hover:bg-gray-200'
            }`}
          >
            <ArrowLeft className="w-4 h-4 shrink-0 transition-transform group-hover:-translate-x-0.5" />
            <span>{backLabel}</span>
          </button>
        </div>
      )}

      {/* Breadcrumb Hierarchy Trail */}
      {breadcrumbItems.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center min-w-0">
          <ol className="flex items-center flex-wrap gap-1.5 sm:gap-2">
            {/* Home segment */}
            <li className="inline-flex items-center">
              <Link
                href={homeHref}
                scroll={false}
                title={homeLabel}
                className={`inline-flex items-center gap-1 transition-colors hover:underline ${
                  isDark
                    ? 'text-blue-200/70 hover:text-white'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {showHomeIcon && <Home className="w-3.5 h-3.5 shrink-0" />}
                <span className={showHomeIcon ? 'sr-only sm:not-sr-only' : ''}>
                  {homeLabel}
                </span>
              </Link>
            </li>

            {/* Path segments */}
            {breadcrumbItems.map((item, index) => {
              const isLast =
                item.isCurrent || index === breadcrumbItems.length - 1;
              const Icon = item.icon;

              return (
                <li
                  key={`${item.label}-${index}`}
                  className="inline-flex items-center gap-1.5 sm:gap-2 min-w-0"
                >
                  {SeparatorIcon}

                  {isLast || !item.href ? (
                    <span
                      aria-current="page"
                      title={item.label}
                      className={`font-semibold truncate max-w-[200px] sm:max-w-[320px] ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      {Icon && <Icon className="w-3.5 h-3.5 inline mr-1" />}
                      {item.label}
                    </span>
                  ) : (
                    <Link
                      href={item.href}
                      scroll={false}
                      title={item.label}
                      className={`truncate max-w-[150px] sm:max-w-[220px] transition-colors hover:underline ${
                        isDark
                          ? 'text-blue-200/70 hover:text-white'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      {Icon && <Icon className="w-3.5 h-3.5 inline mr-1" />}
                      {item.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}
    </div>
  );
}

export default Breadcrumb;
