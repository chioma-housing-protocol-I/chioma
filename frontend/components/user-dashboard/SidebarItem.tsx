'use client';

import { usePathname } from 'next/navigation';
import type { NavItem } from './types';
import { PrefetchLink } from '@/components/navigation/PrefetchLink';

interface SidebarItemProps {
  item: NavItem;
  isCollapsed?: boolean;
}

/** Routes where default Next.js viewport prefetch is useful (top-level nav). */
const HOT_NAV_PREFETCH = new Set([
  '/user',
  '/user/properties',
  '/user/payments',
  '/user/agreements',
  '/dashboard',
  '/properties',
  '/stays',
]);

const SidebarItem = ({ item, isCollapsed = false }: SidebarItemProps) => {
  const pathname = usePathname();
  const isActive =
    pathname === item.href || pathname.startsWith(item.href + '/');

  const Icon = item.icon;
  const enableRoutePrefetch = HOT_NAV_PREFETCH.has(item.href);

  return (
    <PrefetchLink
      href={item.href}
      prefetch={enableRoutePrefetch}
      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group relative ${
        isActive
          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
          : 'text-blue-200/70 hover:bg-white/5 hover:text-blue-300 border border-transparent'
      }`}
    >
      <Icon size={20} className="shrink-0" />
      {!isCollapsed && (
        <>
          <span className="text-sm font-medium flex-1">{item.name}</span>
          {item.badge && (
            <span className="px-2 py-1 text-xs font-bold bg-blue-500/30 text-blue-300 rounded-full">
              {item.badge}
            </span>
          )}
        </>
      )}
      {isCollapsed && item.badge && (
        <span className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center text-xs font-bold bg-red-500 text-white rounded-full">
          {item.badge}
        </span>
      )}
    </PrefetchLink>
  );
};

export default SidebarItem;
