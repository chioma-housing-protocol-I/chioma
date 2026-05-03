'use client';

import Link from 'next/link';
import { Webhook } from 'lucide-react';
import { getAdminNavItems } from '@/components/admin-dashboard/navigation';
import { useAuth } from '@/store/authStore';
import { useRoleRedirect } from '@/hooks/useRoleRedirect';

export default function AdminHomePage() {
  // AUTH DISABLED - useRoleRedirect commented out for development
  // useRoleRedirect(['admin', 'support', 'auditor']);

  const { user, loading } = useAuth();
  const navItems = getAdminNavItems(user?.role);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-blue-200/80">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-blue-200/60 font-medium">
            Loading admin overview…
          </p>
        </div>
      </div>
    );
  }

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
          <Link
            href="/developer"
            className="rounded-3xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 hover:border-white/20 transition-all group"
          >
            <Webhook className="w-8 h-8 text-blue-300 group-hover:text-blue-200 transition-colors" />
            <h2 className="mt-4 text-lg font-semibold text-white">
              Developer Portal
            </h2>
            <p className="mt-1 text-sm text-blue-200/65">
              Open webhook management and integration tooling for outbound
              events.
            </p>
          </Link>

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
