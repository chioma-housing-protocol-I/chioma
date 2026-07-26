'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Clock3,
  Eye,
  Gavel,
  MessageSquareMore,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '@/store/authStore';
import {
  useAdminDisputes,
  useUpdateAdminDisputeStatus,
  type AdminDisputeRecord,
  type AdminDisputeStatus,
} from '@/lib/query/hooks/use-admin-disputes';

const STATUS_OPTIONS: Array<AdminDisputeStatus | 'ALL'> = [
  'ALL',
  'OPEN',
  'UNDER_REVIEW',
  'RESOLVED',
  'REJECTED',
  'WITHDRAWN',
];

export default function AdminDisputesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AdminDisputeStatus | 'ALL'>('ALL');
  const [selected, setSelected] = useState<AdminDisputeRecord | null>(null);

  useEffect(() => {
    if (!authLoading && user?.role !== 'admin') {
      router.replace('/');
    }
  }, [authLoading, user?.role, router]);

  const disputesQuery = useAdminDisputes({ search, status });
  const updateStatus = useUpdateAdminDisputeStatus();

  const disputes = useMemo(
    () => disputesQuery.data ?? [],
    [disputesQuery.data],
  );

  const metrics = useMemo(() => {
    return disputes.reduce(
      (acc, dispute) => {
        acc.total += 1;
        if (dispute.status === 'OPEN') acc.open += 1;
        if (dispute.status === 'UNDER_REVIEW') acc.underReview += 1;
        if (dispute.status === 'RESOLVED') acc.resolved += 1;
        return acc;
      },
      { total: 0, open: 0, underReview: 0, resolved: 0 },
    );
  }, [disputes]);

  const handleQuickAction = async (
    disputeId: string,
    nextStatus: AdminDisputeStatus,
  ) => {
    try {
      const result = await updateStatus.mutateAsync({
        disputeId,
        status: nextStatus,
        resolution:
          nextStatus === 'RESOLVED'
            ? 'Resolved from admin dashboard.'
            : undefined,
      });

      toast.success(
        result.localOnly
          ? `Updated locally to ${formatLabel(nextStatus)}`
          : `Moved to ${formatLabel(nextStatus)}`,
      );
    } catch (error) {
      console.error(`Failed to update dispute ${disputeId}:`, error);
      toast.error('Could not update dispute status');
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-blue-200/80">
        Loading...
      </div>
    );
  }

  if (user?.role !== 'admin') return null;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-amber-300">
            <Gavel className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">
              Disputes Dashboard
            </h1>
            <p className="text-sm text-blue-200/60">
              Review and resolve disputes efficiently.
            </p>
          </div>
        </div>

        <button
          onClick={() => void disputesQuery.refetch()}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white hover:bg-white/10"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </header>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard label="Total" value={metrics.total} icon={<Gavel />} />
        <MetricCard label="Open" value={metrics.open} icon={<Clock3 />} />
        <MetricCard
          label="Review"
          value={metrics.underReview}
          icon={<MessageSquareMore />}
        />
        <MetricCard
          label="Resolved"
          value={metrics.resolved}
          icon={<CheckCircle2 />}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-xl bg-slate-900 px-3 py-2 text-white"
        />
        <select
          value={status}
          onChange={(e) =>
            setStatus(e.target.value as AdminDisputeStatus | 'ALL')
          }
          className="rounded-xl bg-slate-900 px-3 py-2 text-white"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <tbody>
            {disputes.map((d) => (
              <tr key={d.id}>
                <td className="p-3 text-white">{d.disputeId}</td>
                <td className="p-3">{formatLabel(d.status)}</td>
                <td className="p-3">
                  <button onClick={() => setSelected(d)}>
                    <Eye />
                  </button>
                </td>
                <td className="p-3">
                  <button onClick={() => handleQuickAction(d.id, 'RESOLVED')}>
                    Resolve
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail */}
      {selected && (
        <div className="p-4 border rounded-xl">
          <h2 className="text-white">{selected.disputeId}</h2>
          <p>{selected.description}</p>
        </div>
      )}
    </section>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
      {icon}
      <p>{label}</p>
      <h3>{value}</h3>
    </div>
  );
}

function formatLabel(value: string) {
  return value.replace(/_/g, ' ');
}
