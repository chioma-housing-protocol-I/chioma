'use client';

import SidebarItem from '../landlord-dashboard/SidebarItem';
import Image from 'next/image';
import { FaArrowRightFromBracket } from 'react-icons/fa6';
import { usePathname } from 'next/navigation';
import Logo from '@/components/Logo';
import { MdSecurity } from 'react-icons/md';

/** Nav entries for routes that exist under `/app/admin` today. */
const adminNavItems = [
  { icon: MdSecurity, label: 'Audit Logs', href: '/admin/audit-logs' },
];

export function getAdminNavItems() {
  return adminNavItems;
}

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:flex-col md:w-20 lg:w-56 h-screen backdrop-blur-xl bg-slate-900/50 border-r border-white/10">
      <Logo
        size="lg"
        href="/"
        className="justify-center lg:justify-start"
        textClassName="hidden lg:block text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent"
      />

      <nav className="flex-1">
        {adminNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href);

          return (
            <SidebarItem
              key={item.href}
              icon={item.icon}
              label={item.label}
              href={item.href}
              isActive={isActive}
            />
          );
        })}
      </nav>

      <div className="hidden lg:block p-4 border-t border-white/10">
        <button className="group flex items-center gap-3 rounded-xl px-4 py-2.5 hover:bg-white/10 transition-colors cursor-pointer w-full text-left">
          <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/20">
            <Image
              src="/avatar.png"
              alt="User Avatar"
              width={100}
              height={100}
              sizes="40px"
              className="rounded-full"
            />
          </div>

          <div className="flex flex-col items-start overflow-hidden">
            <span className="text-sm font-semibold text-white truncate w-full">
              Admin
            </span>
            <span className="text-xs text-blue-300/60">Administrator</span>
          </div>

          <FaArrowRightFromBracket className="h-5 w-5 text-blue-300/40 group-hover:text-blue-300 transition-colors ml-auto" />
        </button>
      </div>
    </aside>
  );
}
