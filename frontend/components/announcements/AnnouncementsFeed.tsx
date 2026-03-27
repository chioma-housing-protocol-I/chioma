'use client';

import React, { useState, useEffect } from 'react';
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

// Mock data - in real app this would come from API
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
      'Please be aware of the updated gym hours and usage policies. Gym is now open 6 AM - 10 PM daily. All users must wipe down equipment after use.',
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

const typeStyles = {
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  maintenance: 'bg-rose-50 text-rose-700 border-rose-200',
  community: 'bg-purple-50 text-purple-700 border-purple-200',
};

const priorityStyles = {
  low: 'border-l-gray-300',
  medium: 'border-l-amber-400',
  high: 'border-l-red-500',
};

interface AnnouncementsFeedProps {
  className?: string;
}

const seedAnnouncements =
  process.env.NODE_ENV === 'production' ? [] : mockAnnouncements;

export default function AnnouncementsFeed({
  className = '',
}: AnnouncementsFeedProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | Announcement['type']>('all');

  useEffect(() => {
    // Simulate API call
    const loadAnnouncements = async () => {
      setLoading(true);
      // In real app: fetch from /api/announcements
      await new Promise((resolve) => setTimeout(resolve, 500));
      setAnnouncements(seedAnnouncements);
      setLoading(false);
    };

    loadAnnouncements();
  }, []);

  const filteredAnnouncements =
    filter === 'all'
      ? announcements
      : announcements.filter((a) => a.type === filter);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="h-8 bg-gray-200 rounded-lg animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-gray-200 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">
            Property Announcements
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Stay updated with important news and updates from your property
            management
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { value: 'all', label: 'All' },
            { value: 'info', label: 'Info' },
            { value: 'maintenance', label: 'Maintenance' },
            { value: 'community', label: 'Community' },
            { value: 'warning', label: 'Important' },
          ].map((filterOption) => (
            <button
              key={filterOption.value}
              onClick={() =>
                setFilter(filterOption.value as 'all' | Announcement['type'])
              }
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                filter === filterOption.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filterOption.label}
            </button>
          ))}
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {filteredAnnouncements.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-500">No announcements found</p>
            <p className="text-sm text-gray-400 mt-1">
              {filter !== 'all'
                ? 'Try selecting a different filter'
                : 'Check back later for updates'}
            </p>
          </div>
        ) : (
          filteredAnnouncements.map((announcement) => {
            const Icon = typeIcons[announcement.type];
            const isAnnouncementExpired = isExpired(announcement.expiresAt);

            return (
              <div
                key={announcement.id}
                className={`bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow border-l-4 ${priorityStyles[announcement.priority]} ${
                  isAnnouncementExpired ? 'opacity-60' : ''
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className={`p-2 rounded-lg ${typeStyles[announcement.type]}`}
                    >
                      <Icon size={20} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {announcement.title}
                        </h3>
                        {isAnnouncementExpired && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            Expired
                          </span>
                        )}
                      </div>

                      <p className="text-gray-600 text-sm leading-relaxed mb-3">
                        {announcement.message}
                      </p>

                      {/* Meta Info */}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          <span>{formatDate(announcement.createdAt)}</span>
                        </div>
                        {announcement.author && (
                          <span>By {announcement.author}</span>
                        )}
                        {announcement.propertyName && (
                          <div className="flex items-center gap-1">
                            <Building size={14} />
                            <span>{announcement.propertyName}</span>
                          </div>
                        )}
                        {announcement.expiresAt && !isAnnouncementExpired && (
                          <span className="text-amber-600">
                            Expires {formatDate(announcement.expiresAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Load More */}
      {filteredAnnouncements.length > 0 && (
        <div className="text-center pt-4">
          <button className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
            Load older announcements
          </button>
        </div>
      )}
    </div>
  );
}
