'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarItemProps {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  href: string;
}

export default function SidebarItem({ icon, label, href }: SidebarItemProps) {
  const pathname = usePathname();

  const isActive =
    href === '/landlords'
      ? pathname === href
      : pathname === `/landlords/${label.toLowerCase()}`;

  const IconComponent = icon;

  return (
    <Link
      href={href}
      className={`flex gap-3 items-center px-6 py-3 cursor-pointer transition-colors
        ${
          isActive
            ? 'bg-blue-100/70 font-bold text-[#1e40af] lg:border-l-4 lg:border-[#1e40af]'
            : 'hover:bg-gray-100 text-gray-500'
        }
        md:flex-col gap-3 md:py-4 lg:flex-row lg:items-center lg:px-6
      `}
    >
      <IconComponent className="w-5 h-5 md:w-6 md:h-6 mx-auto md:mx-0" />
      <span className="hidden lg:block">{label}</span>
    </Link>
  );
}
