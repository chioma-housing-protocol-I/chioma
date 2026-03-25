import { navItems } from '@/types/sidebar-items';
import {
  Construction,
  Contact,
  Flag,
  Home,
  HousePlus,
  MessageSquareQuote,
  Receipt,
  Settings,
} from 'lucide-react';

export const tenantNavItems: navItems[] = [
  {
    name: 'Overview',
    href: '/tenant',
    icon: Home,
  },
  {
    name: 'My Rentals',
    href: '/tenant/my-rentals',
    icon: HousePlus,
  },
  {
    name: ' My Contacts',
    href: '/tenant/my-contacts',
    icon: Contact,
  },
  {
    name: 'Updates & Maintenance',
    href: '/tenant/updates',
    icon: Construction,
  },
  {
    name: 'Payments',
    href: '/tenant/payments',
    icon: Receipt,
  },
  {
    name: 'Disputes',
    href: '/tenant/disputes',
    icon: Flag,
  },
  {
    name: 'Reviews',
    href: '/tenant/reviews',
    icon: MessageSquareQuote,
  },
  {
    name: 'Settings',
    href: '/#',
    icon: Settings,
  },
];
