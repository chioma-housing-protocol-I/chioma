'use client';

import {
  Anchor,
  Award,
  BarChart3,
  Blocks,
  Gavel,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  UserCog,
} from 'lucide-react';
import { MdSecurity } from 'react-icons/md';
import type { ComponentType } from 'react';

export type AdminAppRole = 'admin';

export type AdminNavItem = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  href: string;
  visibleFor: AdminAppRole[];
};

const adminNavItems: AdminNavItem[] = [
  {
    icon: MdSecurity,
    label: 'Audit Logs',
    href: '/admin/audit-logs',
    visibleFor: ['admin'],
  },
  {
    icon: ShieldAlert,
    label: 'Security Dashboard',
    href: '/admin/security',
    visibleFor: ['admin'],
  },
  {
    icon: Anchor,
    label: 'Anchor Transactions',
    href: '/admin/anchor-transactions',
    visibleFor: ['admin'],
  },
  {
    icon: Blocks,
    label: 'Indexed Transactions',
    href: '/admin/indexed-transactions',
    visibleFor: ['admin'],
  },
  {
    icon: BarChart3,
    label: 'System Analytics',
    href: '/admin/analytics',
    visibleFor: ['admin'],
  },
  {
    icon: UserCog,
    label: 'Role Management',
    href: '/admin/roles',
    visibleFor: ['admin'],
  },
  {
    icon: ShieldCheck,
    label: 'Pending KYC',
    href: '/admin/kyc',
    visibleFor: ['admin'],
  },
  {
    icon: Gavel,
    label: 'Disputes Dashboard',
    href: '/admin/disputes',
    visibleFor: ['admin'],
  },
  {
    icon: Award,
    label: 'Arbiters Management',
    href: '/admin/arbiters',
    visibleFor: ['admin'],
  },
  {
    icon: ShieldX,
    label: 'Rejected KYC',
    href: '/admin/kyc/rejected',
    visibleFor: ['admin'],
  },
];

function findBestNavMatch(pathname: string) {
  return [...adminNavItems]
    .sort((left, right) => right.href.length - left.href.length)
    .find((item) => pathname.startsWith(item.href));
}

export function getAdminNavItems(
  role: string | null | undefined,
): AdminNavItem[] {
  // FORCED TO ALL FOR DEVELOPMENT - Bypass role filtering
  return adminNavItems;
  /* 
  if (!role) return [];
  return adminNavItems.filter((item) =>
    item.visibleFor.includes(role as AdminAppRole),
  );
  */
}

export function getAdminPageTitle(pathname: string): string {
  if (/^\/admin\/kyc\/[^/]+$/.test(pathname)) {
    return 'KYC Verification Detail';
  }

  const matched = findBestNavMatch(pathname);
  if (matched) return matched.label;
  return pathname === '/admin' ? 'Admin' : 'Admin Panel';
}

export function getAdminBreadcrumbItems(pathname: string): Array<{
  label: string;
  href?: string;
}> {
  if (pathname === '/admin') {
    return [{ label: 'Admin' }];
  }

  const matched = findBestNavMatch(pathname);
  if (matched) {
    return [{ label: 'Admin', href: '/admin' }, { label: matched.label }];
  }

  const segments = pathname
    .split('/')
    .filter(Boolean)
    .map((segment) =>
      segment.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
    );

  return segments.map((segment, index) => ({
    label: segment,
    href:
      index === segments.length - 1
        ? undefined
        : `/${pathname
            .split('/')
            .filter(Boolean)
            .slice(0, index + 1)
            .join('/')}`,
  }));
}
