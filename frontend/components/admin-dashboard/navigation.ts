'use client';

import {
  Anchor,
  BarChart3,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  UserCog,
} from 'lucide-react';
import { MdSecurity } from 'react-icons/md';
import type { ComponentType } from 'react';

export type AdminAppRole =
  | 'admin'
  | 'support'
  | 'auditor'
  | 'tenant'
  | 'landlord'
  | 'agent';

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
    visibleFor: ['admin', 'auditor'],
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
    icon: BarChart3,
    label: 'System Analytics',
    href: '/admin/analytics',
    visibleFor: ['admin', 'auditor', 'support'],
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
    visibleFor: ['admin', 'support'],
  },
  {
    icon: ShieldX,
    label: 'Rejected KYC',
    href: '/admin/kyc/rejected',
    visibleFor: ['admin', 'support'],
  },
];

export function getAdminNavItems(
  role: string | null | undefined,
): AdminNavItem[] {
  if (!role) return [];
  return adminNavItems.filter((item) =>
    item.visibleFor.includes(role as AdminAppRole),
  );
}

export function getAdminPageTitle(pathname: string): string {
  const matched = adminNavItems.find((item) => pathname.startsWith(item.href));
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

  const matched = adminNavItems.find((item) => pathname.startsWith(item.href));
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
