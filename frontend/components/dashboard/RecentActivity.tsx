'use client';

import React from 'react';
import { Wrench, FileCheck, CreditCard, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const RecentActivity = () => {
  const MOCK_NOW = new Date('2025-01-24T12:00:00');

  const activities = [
    {
      id: 1,
      type: 'maintenance',
      title: 'Maintenance Request - Unit 12',
      description: 'Leak reported in master bathroom',
      timestamp: new Date(MOCK_NOW.getTime() - 2 * 60 * 60 * 1000),
      status: 'pending',
      icon: Wrench,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
    },
    {
      id: 2,
      type: 'lease',
      title: 'Lease Signed - Apt 12',
      description: 'New tenant: Michael Johnson',
      timestamp: new Date(MOCK_NOW.getTime() - 5 * 60 * 60 * 1000),
      status: 'completed',
      icon: FileCheck,
      iconBg: 'bg-green-100',
      iconColor: 'text-brand-green',
      avatar: '/avatars/michael.jpg',
    },
    {
      id: 3,
      type: 'payment',
      title: 'Rent Payment - Unit 101',
      description: 'Received ₦2.5M via Stellar',
      timestamp: new Date(MOCK_NOW.getTime() - 24 * 60 * 60 * 1000),
      status: 'received',
      icon: CreditCard,
      iconBg: 'bg-blue-100',
      iconColor: 'text-brand-blue',
    },
  ];

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: {
        text: 'Pending',
        color: 'bg-orange-100 text-orange-600',
      },
      completed: {
        text: 'Completed',
        color: 'bg-green-100 text-brand-green',
      },
      received: {
        text: 'Received',
        color: 'bg-blue-100 text-brand-blue',
      },
    };

    return badges[status as keyof typeof badges] || badges.pending;
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/10 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white tracking-tight">
          Recent Activity
        </h2>
        <button className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors">
          View All
        </button>
      </div>

      {/* Activity List */}
      <div className="space-y-4">
        {activities.map((activity) => {
          const Icon = activity.icon;
          const badge = getStatusBadge(activity.status);

          return (
            <div
              key={activity.id}
              className="flex items-start space-x-4 p-4 rounded-2xl hover:bg-white/5 transition-all duration-200 cursor-pointer group border border-transparent hover:border-white/5"
            >
              <div
                className={`p-3 rounded-xl ${activity.iconBg} shrink-0 shadow-inner`}
              >
                <Icon className={activity.iconColor} size={20} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <h4 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
                    {activity.title}
                  </h4>
                  <span className="text-[10px] font-medium text-blue-300/40 shrink-0 ml-2 uppercase tracking-wider">
                    {formatDistanceToNow(activity.timestamp, {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <p className="text-xs text-blue-200/60 mb-3 line-clamp-1">
                  {activity.description}
                </p>
                <span
                  className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    activity.status === 'pending'
                      ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                      : activity.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  }`}
                >
                  {badge.text}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <button className="mt-6 w-full flex items-center justify-center space-x-2 py-3 text-sm font-semibold text-blue-200/60 hover:text-white hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-white/10 group">
        <span>View All Activity</span>
        <ChevronRight
          size={16}
          className="group-hover:translate-x-1 transition-transform"
        />
      </button>
    </div>
  );
};

export default RecentActivity;
