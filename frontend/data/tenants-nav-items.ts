import { navItems } from '@/types/sidebar-items';
import {
  Construction,
  Contact,
  Home,
  HousePlus,
  Settings,
  Wallet,
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
    name: 'Wallet',
    href: '/#',
    icon: Wallet,
  },
  {
    name: 'Settings',
    href: '/#',
    icon: Settings,
  },
];
