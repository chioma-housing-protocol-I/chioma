'use client';

import Link from 'next/link';
import { getAdminNavItems } from '@/components/admin-dashboard/navigation';
import { useAuth } from '@/store/authStore';

export default function AdminHomePage() {
  const { user } = useAuth();
  const navItems = getAdminNavItems(user?.role);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Admin Overview
        </h1>
        <p className="mt-2 text-blue-200/70">
          Choose a module below to manage platform operations.
        </p>
      </header>

      {navItems.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-blue-200/75">
          No admin modules are currently available for your role.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-3xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 hover:border-white/20 transition-all group"
            >
              <item.icon className="w-8 h-8 text-blue-300 group-hover:text-blue-200 transition-colors" />
              <h2 className="mt-4 text-lg font-semibold text-white">
                {item.label}
              </h2>
              <p className="mt-1 text-sm text-blue-200/65">
                Open {item.label.toLowerCase()} and continue administration
                tasks.
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
