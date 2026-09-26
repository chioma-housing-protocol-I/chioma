'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/authStore';
import {
  loadAdminFeedback,
  updateAdminFeedbackStatus,
} from '@/lib/admin-feedback';
import type { AdminFeedbackPage, FeedbackStatus } from '@/lib/admin-feedback';
import { Loader2 } from 'lucide-react';

const STATUSES: FeedbackStatus[] = ['new', 'reviewed', 'actioned'];

export default function AdminFeedbackPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [result, setResult] = useState<AdminFeedbackPage | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<FeedbackStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

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
        const data = await loadAdminFeedback({
          page,
          status: status || undefined,
        });
        if (!cancelled) setResult(data);
      } catch {
        if (!cancelled) setError('Could not load feedback.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.role, page, status, reloadKey]);

  const triage = async (id: string, next: FeedbackStatus) => {
    try {
      await updateAdminFeedbackStatus(id, next);
      setReloadKey((k) => k + 1);
    } catch {
      setError('Could not update feedback status.');
    }
  };

  if (authLoading || user?.role !== 'admin') {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Feedback Inbox</h1>
        <select
          aria-label="Filter by status"
          className="rounded-md border px-3 py-2 text-sm"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as FeedbackStatus | '');
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !result?.data.length ? (
        <p className="text-sm text-gray-500">No feedback found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full divide-y text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-2">Submitted</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">From</th>
                <th className="px-4 py-2">Message</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {result.data.map((f) => (
                <tr key={f.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-2">
                    {new Date(f.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 capitalize">{f.type}</td>
                  <td className="px-4 py-2">
                    {f.email ?? (f.userId ? 'Registered user' : 'Anonymous')}
                  </td>
                  <td className="max-w-md whitespace-pre-wrap px-4 py-2">
                    {f.message}
                  </td>
                  <td className="px-4 py-2">
                    <select
                      aria-label="Update status"
                      className="rounded-md border px-2 py-1"
                      value={f.status}
                      onChange={(e) =>
                        triage(f.id, e.target.value as FeedbackStatus)
                      }
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result && result.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <button
            className="rounded-md border px-3 py-1 disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span>
            Page {result.page} of {result.totalPages}
          </span>
          <button
            className="rounded-md border px-3 py-1 disabled:opacity-50"
            disabled={page >= result.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
