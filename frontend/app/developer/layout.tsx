'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Code2, KeyRound, Webhook } from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/store/authStore';
import { isDeveloperPortalUser } from '@/lib/developer-webhooks';

const developerNavItems = [
  { href: '/developer', label: 'Overview', icon: Code2 },
  { href: '/developer/webhooks', label: 'Webhooks', icon: Webhook },
];

export default function DeveloperLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <header className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/30">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
                  <Webhook className="h-3.5 w-3.5" />
                  Developer Portal
                </div>
                <h1 className="mt-4 text-3xl font-bold tracking-tight">
                  Manage outbound integrations
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
                  Configure webhooks, inspect delivery activity, and validate payloads
                  for external systems connected to Chioma.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href="/developer/webhooks"
                  className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Open webhooks
                </Link>
                <a
                  href="/api/docs"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  <KeyRound className="h-4 w-4" />
                  API documentation
                </a>
              </div>
            </div>

            <nav className="mt-6 flex flex-wrap gap-3" aria-label="Developer portal">
              {developerNavItems.map((item) => {
                const active =
                  item.href === '/developer'
                    ? pathname === item.href
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
                      active
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-950/30'
                        : 'border border-white/10 bg-slate-950/35 text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </header>

          <main className="py-6">
            {loading ? (
              <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-200">
                Loading developer portal...
              </section>
            ) : !isDeveloperPortalUser(user) ? (
              <section className="rounded-3xl border border-amber-300/20 bg-amber-500/10 p-6 text-amber-50">
                <h2 className="text-2xl font-semibold">Developer access required</h2>
                <p className="mt-3 text-sm text-amber-100/80">
                  This portal is restricted to admin and developer integration accounts.
                </p>
              </section>
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
