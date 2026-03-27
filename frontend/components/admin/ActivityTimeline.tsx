'use client';

import React, { useState } from 'react';
import { useUserActivities } from '@/lib/query/hooks/use-user-activities';
import type { ActivityType } from '@/types';
import {
  LogIn,
  Eye,
  Settings,
  UserCircle,
  ShieldCheck,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface ActivityTimelineProps {
  userId: string;
}

const ACTIVITY_ICONS: Record<ActivityType, React.ReactNode> = {
  login: <LogIn size={18} className="text-emerald-400" />,
  property_view: <Eye size={18} className="text-blue-400" />,
  system_event: <Settings size={18} className="text-slate-400" />,
  profile_update: <UserCircle size={18} className="text-amber-400" />,
  kyc_submission: <ShieldCheck size={18} className="text-purple-400" />,
};

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  login: 'bg-emerald-500/10 border-emerald-500/20',
  property_view: 'bg-blue-500/10 border-blue-500/20',
  system_event: 'bg-slate-500/10 border-slate-500/20',
  profile_update: 'bg-amber-500/10 border-amber-500/20',
  kyc_submission: 'bg-purple-500/10 border-purple-500/20',
};

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  login: 'Login',
  property_view: 'Property View',
  system_event: 'System Event',
  profile_update: 'Profile Update',
  kyc_submission: 'KYC Submission',
};

export function ActivityTimeline({ userId }: ActivityTimelineProps) {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<ActivityType | ''>('');

  const { data, isLoading, isError } = useUserActivities(userId, {
    page,
    limit: 10,
    type: typeFilter,
  });

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value as ActivityType | '');
    setPage(1); // Reset to first page
  };

  if (isError) {
    return (
      <div className="p-6 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20 text-center">
        Failed to load activity timeline.
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="text-blue-400" size={24} />
            User Activity Timeline
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Chronological history of user actions and system events.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-800/50 p-2 rounded-xl border border-slate-700 w-full sm:w-auto">
          <Filter size={18} className="text-slate-400 ml-2" />
          <select
            value={typeFilter}
            onChange={handleFilterChange}
            className="bg-transparent border-none text-sm text-slate-200 focus:ring-0 outline-none w-full cursor-pointer pr-4"
          >
            <option value="" className="bg-slate-800 text-white">
              All Activities
            </option>
            {Object.entries(ACTIVITY_LABELS).map(([key, label]) => (
              <option key={key} value={key} className="bg-slate-800 text-white">
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-800 hidden md:block" />

        <div className="space-y-6">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 animate-pulse ml-0 md:ml-12">
                <div className="w-12 h-12 rounded-xl bg-slate-800 hidden md:block flex-shrink-0" />
                <div className="flex-1 space-y-3 py-2">
                  <div className="h-4 bg-slate-800 rounded-md w-1/4" />
                  <div className="h-3 bg-slate-800 rounded-md w-1/2" />
                </div>
              </div>
            ))
          ) : data?.data && data.data.length > 0 ? (
            data.data.map((activity) => (
              <div
                key={activity.id}
                className="relative flex flex-col md:flex-row gap-4 md:items-start group transition-all"
              >
                {/* Timeline connector visual */}
                <span className="absolute top-6 left-[1.4rem] -translate-x-1/2 w-4 h-4 rounded-full bg-slate-900 border-2 border-slate-700 hidden md:block group-hover:border-blue-500 transition-colors z-10" />

                {/* Mobile time display - only visible on small screens above the card */}
                <div className="md:hidden text-xs text-slate-500 mb-1 pl-2">
                  {format(new Date(activity.createdAt), 'MMM d, yyyy h:mm a')}
                </div>

                <div className="flex-1 bg-slate-800/20 hover:bg-slate-800/40 border border-slate-800 hover:border-slate-700 transition-colors rounded-2xl p-4 md:ml-[3.5rem]">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${ACTIVITY_COLORS[activity.type]}`}
                      >
                        {ACTIVITY_ICONS[activity.type]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-slate-200 font-medium leading-none">
                            {activity.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1 font-medium px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
                            {ACTIVITY_LABELS[activity.type]}
                          </span>
                          {activity.ipAddress && (
                            <span className="hidden sm:inline">
                              IP: {activity.ipAddress}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Desktop time display */}
                    <div className="hidden md:flex flex-col items-end whitespace-nowrap">
                      <span className="text-sm font-medium text-slate-400">
                        {formatDistanceToNow(new Date(activity.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                      <span className="text-xs text-slate-500 mt-1">
                        {format(
                          new Date(activity.createdAt),
                          'MMM d, yyyy h:mm a',
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-700 bg-slate-800/10">
              <Clock className="mx-auto h-12 w-12 text-slate-600 mb-3" />
              <h3 className="text-lg font-medium text-slate-300">
                No activities found
              </h3>
              <p className="text-slate-500 mt-1 max-w-sm mx-auto">
                {typeFilter
                  ? `There are no recent activities of type "${ACTIVITY_LABELS[typeFilter]}".`
                  : "This user hasn't performed any activities yet."}
              </p>
              {typeFilter && (
                <button
                  onClick={() => setTypeFilter('')}
                  className="mt-4 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Clear filter
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-800">
          <p className="text-sm text-slate-400 hidden sm:block">
            Showing{' '}
            <span className="text-white font-medium">
              {(data.page - 1) * 10 + 1}
            </span>{' '}
            to{' '}
            <span className="text-white font-medium">
              {Math.min(data.page * 10, data.total)}
            </span>{' '}
            of <span className="text-white font-medium">{data.total}</span>{' '}
            entries
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-1">
              <span className="text-sm text-slate-300 sm:hidden">
                Page {page} of {data.totalPages}
              </span>
            </div>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages || isLoading}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
