'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import {
  Bell,
  Calendar,
  Building,
  Info,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'maintenance' | 'community';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  author?: string;
  propertyName?: string;
  expiresAt?: string;
}

const mockAnnouncements: Announcement[] = [
  {
    id: '1',
    title: 'Water Shut Off Notice',
    message:
      'Water supply will be temporarily shut off tomorrow from 9 AM to 12 PM for maintenance work. Please store enough water for your needs.',
    type: 'maintenance',
    priority: 'high',
    createdAt: '2024-03-15T10:00:00Z',
    author: 'Property Management',
    propertyName: 'Sunset View Apartments',
    expiresAt: '2024-03-17T12:00:00Z',
  },
  {
    id: '2',
    title: 'New Community Gym Rules',
    message:
      'Please be aware of the updated gym hours and usage policies. Gym is now open 6 AM – 10 PM daily. All users must wipe down equipment after use.',
    type: 'community',
    priority: 'medium',
    createdAt: '2024-03-14T15:30:00Z',
    author: 'Community Manager',
  },
  {
    id: '3',
    title: 'Parking Lot Resurfacing',
    message:
      'The parking lot will be resurfaced this weekend. Please find alternative parking arrangements from Saturday 8 AM to Sunday 6 PM.',
    type: 'warning',
    priority: 'medium',
    createdAt: '2024-03-13T09:15:00Z',
    author: 'Property Management',
    propertyName: 'Pine Tree Townhouse',
  },
  {
    id: '4',
    title: 'Welcome New Tenants',
    message:
      "A warm welcome to our new residents in Building B! We're excited to have you join our community.",
    type: 'info',
    priority: 'low',
    createdAt: '2024-03-12T14:20:00Z',
    author: 'Property Management',
  },
  {
    id: '5',
    title: 'Rent Payment Reminder',
    message:
      'Friendly reminder that rent for April is due by April 1st. Please ensure timely payment to avoid late fees.',
    type: 'info',
    priority: 'medium',
    createdAt: '2024-03-10T11:00:00Z',
    author: 'Property Management',
  },
];

const typeIcons = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
  maintenance: Building,
  community: Bell,
};

const typeStyles: Record<Announcement['type'], string> = {
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  maintenance: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  community: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

const priorityBorder: Record<Announcement['priority'], string> = {
  low: 'border-l-white/10',
  medium: 'border-l-amber-500/50',
  high: 'border-l-red-500/70',
};

const seedAnnouncements =
  process.env.NODE_ENV === 'production' ? [] : mockAnnouncements;

export default function AnnouncementsFeed({
  className = '',
}: {
  className?: string;
}) {
  const { formatDate: formatLocaleDate } = useTranslation();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | Announcement['type']>('all');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await new Promise((r) => setTimeout(r, 400));
      setAnnouncements(seedAnnouncements);
      setLoading(false);
    };
    void load();
  }, []);

  const filtered =
    filter === 'all'
      ? announcements
      : announcements.filter((a) => a.type === filter);
  const isExpired = (exp?: string) => !!exp && new Date(exp) < new Date();

  const formatDate = (d: string) =>
    formatLocaleDate(d, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="h-7 bg-white/5 rounded-xl animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-5 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">
            Property Announcements
          </h2>
          <p className="text-sm text-blue-200/40 mt-0.5">
            Stay updated with important news from your property management.
          </p>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-wrap">
          {(
            ['all', 'info', 'maintenance', 'community', 'warning'] as const
          ).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/5 text-blue-200/50 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="mx-auto h-10 w-10 text-blue-300/20 mb-3" />
            <p className="text-blue-200/40">No announcements found.</p>
          </div>
        ) : (
          filtered.map((a) => {
            const Icon = typeIcons[a.type];
            const expired = isExpired(a.expiresAt);
            return (
              <div
                key={a.id}
                className={`bg-white/5 backdrop-blur-sm border border-white/10 border-l-4 ${priorityBorder[a.priority]} rounded-xl p-5 hover:bg-white/10 transition-all ${expired ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`p-2 rounded-xl border ${typeStyles[a.type]} shrink-0`}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <h3 className="font-semibold text-white truncate">
                        {a.title}
                      </h3>
                      {expired && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-blue-300/30 border border-white/10 shrink-0">
                          Expired
                        </span>
                      )}
                    </div>
                    <p className="text-blue-200/60 text-sm leading-relaxed mb-3">
                      {a.message}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-blue-200/30">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(a.createdAt)}
                      </div>
                      {a.author && <span>By {a.author}</span>}
                      {a.propertyName && (
                        <div className="flex items-center gap-1">
                          <Building size={12} />
                          {a.propertyName}
                        </div>
                      )}
                      {a.expiresAt && !expired && (
                        <span className="text-amber-400/70">
                          Expires {formatDate(a.expiresAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {filtered.length > 0 && (
        <div className="text-center">
          <button className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">
            Load older announcements
          </button>
        </div>
      )}
    </div>
  );
}
