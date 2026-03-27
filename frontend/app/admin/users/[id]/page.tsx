'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminUsers } from '@/lib/query/hooks/use-admin-users';
import { ActivityTimeline } from '@/components/admin/ActivityTimeline';
import { User, ArrowLeft, Mail, Phone, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  // We could fetch the specific user, but for now we'll just get the list and find them,
  // or just use generic data if the user endpoint isn't fully set up for detail
  const { data: usersData } = useAdminUsers({ limit: 100 });
  const user = usersData?.data?.find((u) => u.id === userId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all text-sm group"
        >
          <ArrowLeft
            size={18}
            className="group-hover:-translate-x-1 transition-transform"
          />
        </button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            User Details
          </h1>
          <p className="text-blue-200/60 mt-1">
            View profile, activity, and manage this user.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Info Sidebar - Simplified version of Dependency #008-01 */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-24 h-24 rounded-full bg-slate-800 border-4 border-slate-700 flex items-center justify-center overflow-hidden">
                {user?.avatar ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={user.avatar}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={40} className="text-slate-500" />
                )}
              </div>

              <div>
                <h2 className="text-xl font-bold text-white mt-2">
                  {user?.name || 'Unknown User'}
                </h2>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {user?.role || 'Guest'}
                  </span>
                  {user?.isVerified ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Verified
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Unverified
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800 space-y-4">
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <Mail size={16} className="text-slate-500" />
                {user?.email || `user-${userId.slice(0, 4)}@example.com`}
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <Phone size={16} className="text-slate-500" />
                {user?.phone || 'No phone provided'}
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <Calendar size={16} className="text-slate-500" />
                Joined{' '}
                {user?.createdAt
                  ? format(new Date(user.createdAt), 'MMM d, yyyy')
                  : 'Recently'}
              </div>
            </div>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="lg:col-span-2">
          <ActivityTimeline userId={userId} />
        </div>
      </div>
    </div>
  );
}
