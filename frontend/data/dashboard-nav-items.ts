import { navItems } from '@/types/sidebar-items';
import {
  LayoutDashboard,
  FileText,
  Wallet,
  Settings,
  BellRing,
  User,
} from 'lucide-react';

export const dashboardNavItems: navItems[] = [
  {
    name: 'Overview',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Agreements',
    href: '/dashboard/documents',
    icon: FileText,
  },
  {
    name: 'Payments',
    href: '/dashboard/payments',
    icon: Wallet,
  },
  {
    name: 'Notifications',
    href: '/dashboard/notifications',
    icon: BellRing,
  },
  {
    name: 'Profile',
    href: '/dashboard/profile',
    icon: User,
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
];
