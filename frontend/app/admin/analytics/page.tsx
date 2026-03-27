'use client';

import { SystemAnalytics } from '@/components/admin/SystemAnalytics';
import { useAuth } from '@/store/authStore';

export default function AdminAnalyticsPage() {
  const { user } = useAuth();
  const canAccessAnalytics = ['admin', 'auditor', 'support'].includes(
    user?.role ?? '',
  );

  if (!canAccessAnalytics) {
    return (
      <div className="rounded-3xl border border-amber-300/20 bg-amber-500/10 p-6 text-amber-100">
        Your role does not currently have access to system analytics.
      </div>
    );
  }

  return <SystemAnalytics />;
}
