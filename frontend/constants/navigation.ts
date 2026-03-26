export type NavigationLink = {
  name: string;
  href: string;
};

export const NAV_LINKS: NavigationLink[] = [
  { name: 'Home', href: '/' },
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Documents', href: '/dashboard/documents' },
  { name: 'Maintenance', href: '/dashboard/maintenance' },
  { name: 'Notifications', href: '/dashboard/notifications' },
  { name: 'Properties', href: '/properties' },
];
