import { navItems } from '@/types/sidebar-items';
import {
  Home,
  HousePlus,
  MessageSquareQuote,
  Receipt,
  Settings,
  Wallet,
  PieChart,
  FileText,
  Users,
  Flag,
  MessageSquare,
} from 'lucide-react';

export const userNavItems: navItems[] = [
  {
    name: 'Overview',
    href: '/user',
    icon: Home,
  },
  {
    name: 'Wallet',
    href: '/user/wallet',
    icon: Wallet,
  },
  {
    name: 'Analytics',
    href: '/user/analytics',
    icon: PieChart,
  },
  {
    name: 'My Rentals',
    href: '/user/my-rentals',
    icon: HousePlus,
  },
  {
    name: 'My Bookings',
    href: '/user/tenants', // mapping to the old tenants folder temporarily
    icon: Users,
  },
  {
    name: 'Messages',
    href: '/user/messages',
    icon: MessageSquare,
  },
  {
    name: 'Contracts',
    href: '/user/contracts',
    icon: FileText,
  },
  {
    name: 'Payments',
    href: '/user/payments',
    icon: Receipt,
  },
  {
    name: 'Disputes',
    href: '/user/disputes',
    icon: Flag,
  },
  {
    name: 'Reviews',
    href: '/user/reviews',
    icon: MessageSquareQuote,
  },
  {
    name: 'Settings',
    href: '/user/settings',
    icon: Settings,
  },
];
