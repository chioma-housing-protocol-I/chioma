'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { RecentActivityProps } from './types';

const RecentActivity = ({
  items,
  maxItems = 5,
  onItemClick,
  className = '',
}: RecentActivityProps) => {
  const displayItems = items.slice(0, maxItems);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'pending':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'failed':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  return (
    <div
      className={`bg-white/5 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/10 h-full ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white tracking-tight">
          Recent Activity
        </h2>
        <Link
          href="/user/activity"
          className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
        >
          View All
        </Link>
      </div>

      {/* Activity List */}
      <div className="space-y-4">
        {displayItems.length > 0 ? (
          displayItems.map((activity) => (
            <div
              key={activity.id}
              onClick={() => onItemClick?.(activity)}
              className="flex items-start space-x-4 p-4 rounded-2xl hover:bg-white/5 transition-all duration-200 cursor-pointer group border border-transparent hover:border-white/5"
            >
              {activity.icon && (
                <div className="p-3 rounded-xl bg-white/5 shrink-0 text-blue-400">
                  {activity.icon}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <h4 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
                    {activity.title}
                  </h4>
                  <span className="text-[10px] font-medium text-blue-300/40 shrink-0 ml-2 uppercase tracking-wider">
                    {formatDistanceToNow(new Date(activity.timestamp), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                {activity.description && (
                  <p className="text-xs text-blue-200/60 mb-3 line-clamp-1">
                    {activity.description}
                  </p>
                )}
                {activity.status && (
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(activity.status)}`}
                  >
                    {activity.status}
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-blue-200/60 text-sm">No recent activity</p>
          </div>
        )}
      </div>

      <Link
        href="/user/activity"
        className="mt-6 w-full flex items-center justify-center space-x-2 py-3 text-sm font-semibold text-blue-200/60 hover:text-white hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-white/10 group"
      >
        <span>View All Activity</span>
        <ChevronRight
          size={16}
          className="group-hover:translate-x-1 transition-transform"
        />
      </Link>
    </div>
  );
};

export default RecentActivity;
