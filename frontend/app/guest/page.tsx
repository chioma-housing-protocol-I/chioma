'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plane, Heart, Star, Search } from 'lucide-react';
import Link from 'next/link';

export default function GuestDashboardPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    router.push(query ? `/stays?city=${encodeURIComponent(query)}` : '/stays');
  };

  const quickLinks = [
    {
      label: 'Find a Stay',
      href: '/stays',
      icon: Search,
      color: 'from-blue-500 to-indigo-600',
    },
    {
      label: 'My Trips',
      href: '/guest/trips',
      icon: Plane,
      color: 'from-emerald-500 to-teal-600',
    },
    {
      label: 'Favorites',
      href: '/guest/favorites',
      icon: Heart,
      color: 'from-pink-500 to-rose-600',
    },
    {
      label: 'My Reviews',
      href: '/guest/reviews',
      icon: Star,
      color: 'from-amber-500 to-orange-600',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome back</h1>
        <p className="text-blue-300/60 mt-1">Where are you heading next?</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.label} href={link.href} className="block">
              <div className="backdrop-blur-xl bg-slate-800/50 border border-white/10 rounded-2xl p-6 hover:border-white/20 hover:shadow-xl transition-all text-center">
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${link.color} flex items-center justify-center mx-auto mb-3`}
                >
                  <Icon size={22} className="text-white" />
                </div>
                <p className="font-semibold text-sm">{link.label}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="backdrop-blur-xl bg-slate-800/50 border border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">Quick search</h2>
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Where do you want to go?"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all flex items-center gap-2"
          >
            <Search size={18} /> Search
          </button>
        </form>
      </div>
    </div>
  );
}
