'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaArrowRightFromBracket } from 'react-icons/fa6';
import Logo from '@/components/Logo';
import { useAuth } from '@/store/authStore';
import { getAdminNavItems } from './navigation';

export default function AdminSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const navItems = getAdminNavItems(user?.role);
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');

  return (
    <aside className="hidden h-screen border-r border-white/10 bg-slate-900/50 backdrop-blur-xl md:flex md:w-20 md:flex-col lg:w-56">
      <Logo
        size="lg"
        href="/"
        className="justify-center lg:justify-start"
        textClassName="hidden bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-2xl font-bold text-transparent lg:block lg:text-3xl"
      />

      <nav className="flex-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex cursor-pointer items-center gap-3 px-6 py-3 transition-all duration-200 md:flex-col md:py-4 lg:flex-row lg:items-center lg:px-6 ${
                isActive
                  ? 'bg-white/10 text-white shadow-lg lg:border-l-4 lg:border-blue-500'
                  : 'text-blue-200/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className="mx-auto h-5 w-5 md:mx-0 md:h-6 md:w-6" />
              <span className="hidden lg:block">{item.label}</span>
            </Link>
          );
        })}
        {navItems.length === 0 && (
          <p className="px-6 py-4 text-xs text-blue-200/60">
            No admin pages are available for your role.
          </p>
        )}
      </nav>

      <div className="hidden border-t border-white/10 p-4 lg:block">
        <button className="group flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-2.5 text-left transition-colors hover:bg-white/10">
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
            <span className="w-full truncate text-sm font-semibold text-white">
              {fullName || user?.email || 'Admin User'}
            </span>
            <span className="text-xs capitalize text-blue-300/60">
              {user?.role || 'admin'}
            </span>
          </div>

          <FaArrowRightFromBracket className="ml-auto h-5 w-5 text-blue-300/40 transition-colors group-hover:text-blue-300" />
        </button>
      </div>
    </aside>
  );
}
