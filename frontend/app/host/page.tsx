'use client';

import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  BookOpen,
  Star,
  Building2,
  TrendingUp,
  Users,
} from 'lucide-react';
import Link from 'next/link';

export default function HostDashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['host-stats'],
    queryFn: async () => {
      const res = await fetch('/api/properties?role=host');
      const data = await res.json();
      return { listings: (data.data ?? data)?.length ?? 0 };
    },
  });

  const { data: pendingBookings } = useQuery({
    queryKey: ['host-pending-bookings'],
    queryFn: async () => {
      const res = await fetch('/api/bookings?role=host&status=pending');
      if (!res.ok) throw new Error('Bookings unavailable');
      const data = await res.json();
      return ((data.data ?? data) as unknown[]).length;
    },
    retry: false,
  });

  const { data: avgRating } = useQuery({
    queryKey: ['host-avg-rating'],
    queryFn: async () => {
      const res = await fetch('/api/reviews?role=host');
      if (!res.ok) throw new Error('Reviews unavailable');
      const data = await res.json();
      const reviews = (data.data ?? data) as { rating?: number }[];
      if (!Array.isArray(reviews) || reviews.length === 0) return null;
      const sum = reviews.reduce((s, r) => s + (r.rating ?? 0), 0);
      return (sum / reviews.length).toFixed(1);
    },
    retry: false,
  });

  const kpis = [
    {
      label: 'Active Listings',
      value: stats?.listings ?? 0,
      icon: Building2,
      color: 'from-blue-500 to-indigo-600',
      href: '/host/listings',
    },
    {
      label: 'Pending Bookings',
      value: pendingBookings ?? '—',
      icon: BookOpen,
      color: 'from-amber-500 to-orange-600',
      href: '/host/bookings',
    },
    {
      label: 'This Month',
      value: '—', // Needs a host-earnings backend; /host/earnings is mock-only
      icon: DollarSign,
      color: 'from-emerald-500 to-teal-600',
      href: '/host/earnings',
    },
    {
      label: 'Avg Rating',
      value: avgRating ?? '—',
      icon: Star,
      color: 'from-purple-500 to-pink-600',
      href: '/host/reviews',
    },
  ];

  const quickLinks = [
    { label: 'Manage Calendar', href: '/host/calendar', icon: TrendingUp },
    { label: 'View Bookings', href: '/host/bookings', icon: BookOpen },
    { label: 'Guest Reviews', href: '/host/reviews', icon: Users },
    { label: 'Earnings', href: '/host/earnings', icon: DollarSign },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Host Dashboard</h1>
        <p className="text-blue-300/60 mt-1">
          Manage your listings and bookings
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link key={kpi.label} href={kpi.href} className="block">
              <div className="backdrop-blur-xl bg-slate-800/50 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center mb-3`}
                >
                  <Icon size={20} className="text-white" />
                </div>
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className="text-sm text-blue-300/60 mt-1">{kpi.label}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.label}
              href={link.href}
              className="flex items-center gap-3 p-4 backdrop-blur-xl bg-slate-800/50 border border-white/10 rounded-xl hover:border-white/20 hover:bg-slate-700/50 transition-all"
            >
              <Icon size={18} className="text-blue-400 shrink-0" />
              <span className="text-sm font-medium">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
