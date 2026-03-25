'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarItemProps {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  href: string;
  isActive?: boolean;
}

export default function SidebarItem({
  icon,
  label,
  href,
  isActive: overrideIsActive,
}: SidebarItemProps) {
  const pathname = usePathname();

  const activeState =
    overrideIsActive !== undefined
      ? overrideIsActive
      : href === '/landlords'
        ? pathname === href
        : pathname === `/landlords/${label.toLowerCase()}`;

  const IconComponent = icon;

  return (
    <Link
      href={href}
      className={`flex gap-3 items-center px-6 py-3 cursor-pointer transition-all duration-200
        ${
          activeState
            ? 'bg-white/10 text-white lg:border-l-4 lg:border-blue-500 shadow-lg'
            : 'text-blue-200/60 hover:bg-white/5 hover:text-white'
        }
        md:flex-col gap-3 md:py-4 lg:flex-row lg:items-center lg:px-6
      `}
    >
      <IconComponent className="w-5 h-5 md:w-6 md:h-6 mx-auto md:mx-0" />
      <span className="hidden lg:block">{label}</span>
    </Link>
  );
}
