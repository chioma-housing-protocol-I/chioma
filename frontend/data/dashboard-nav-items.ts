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
    href: '/user',
    icon: LayoutDashboard,
  },
  {
    name: 'Agreements',
    href: '/user/documents',
    icon: FileText,
  },
  {
    name: 'Payments',
    href: '/user/payments',
    icon: Wallet,
  },
  {
    name: 'Notifications',
    href: '/user/notifications',
    icon: BellRing,
  },
  {
    name: 'Profile',
    href: '/user/profile',
    icon: User,
  },
  {
    name: 'Settings',
    href: '/user/settings',
    icon: Settings,
  },
];
