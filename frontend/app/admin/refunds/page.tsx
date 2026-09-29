'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/authStore';
import { RefundManagement } from '@/components/admin/refunds/RefundManagement';
import { loadAdminRefundRequests } from '@/lib/admin-refund-requests';
import type { AdminRefundRequestRow } from '@/lib/admin-refund-requests';
import { Loader2 } from 'lucide-react';

export default function AdminRefundsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<AdminRefundRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user?.role !== 'admin') {
      router.replace('/');
    }
  }, [authLoading, user?.role, router]);

  useEffect(() => {
    if (authLoading || user?.role !== 'admin') return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await loadAdminRefundRequests();
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) setError('Could not load refund requests.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.role]);

  // Separate from the mount-time load effect above (kept as an inline IIFE
  // to match the pre-existing pattern) because refactoring both to share one
  // named async function trips react-hooks/set-state-in-effect: the linter
  // only stays quiet when the effect's setState calls are textually inline.
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await loadAdminRefundRequests();
      setRows(data);
    } catch {
      setError('Could not load refund requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-blue-200/80">
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <RefundManagement
      rows={rows}
      loading={loading}
      error={error}
      onRefresh={refresh}
    />
  );
}
