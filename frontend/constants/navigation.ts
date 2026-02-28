export type NavigationLink = {
  name: string;
  href: string;
};

export const NAV_LINKS: NavigationLink[] = [
  { name: 'Find a Home', href: '/properties' },
  { name: 'For Landlords', href: '/landlords' },
  { name: 'For Agents', href: '/agents' },
  { name: 'Resources', href: '/resources' },
];
