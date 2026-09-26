'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  CheckSquare,
  Clock3,
  Eye,
  Gavel,
  MessageSquareMore,
  RefreshCw,
  Square,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '@/store/authStore';
import { BulkActionBar } from '@/components/admin/BulkActionBar';
import { BulkConfirmDialog } from '@/components/admin/BulkConfirmDialog';
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

type BulkAction = 'resolve' | 'reject';

export default function AdminDisputesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AdminDisputeStatus | 'ALL'>('ALL');
  const [selected, setSelected] = useState<AdminDisputeRecord | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<BulkAction | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

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

  const allSelected =
    disputes.length > 0 && disputes.every((d) => selectedIds.has(d.id));

  const toggleAll = () => {
    setSelectedIds(
      allSelected ? new Set() : new Set(disputes.map((d) => d.id)),
    );
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleQuickAction = async (
    disputeId: string,
    nextStatus: AdminDisputeStatus,
  ) => {
    try {
      await updateStatus.mutateAsync({
        disputeId,
        status: nextStatus,
        resolution:
          nextStatus === 'RESOLVED'
            ? 'Resolved from admin dashboard.'
            : undefined,
      });
      toast.success(`Moved to ${formatLabel(nextStatus)}`);
    } catch (error) {
      console.error(`Failed to update dispute ${disputeId}:`, error);
      toast.error('Could not update dispute status');
    }
  };

  // Bulk actions (#1558): resolve or reject every selected dispute. Uses
  // Promise.allSettled, matching BulkUserOperations.tsx's convention — this
  // only produces an accurate failure count now that
  // useUpdateAdminDisputeStatus actually throws on a failed request instead
  // of swallowing it.
  const runBulkAction = async (action: BulkAction) => {
    const ids = Array.from(selectedIds);
    const nextStatus: AdminDisputeStatus =
      action === 'resolve' ? 'RESOLVED' : 'REJECTED';

    setBulkLoading(true);
    try {
      const results = await Promise.allSettled(
        ids.map((id) =>
          updateStatus.mutateAsync({
            disputeId: id,
            status: nextStatus,
            resolution:
              action === 'resolve'
                ? 'Resolved from admin dashboard (bulk action).'
                : undefined,
          }),
        ),
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      const succeeded = ids.length - failed;

      if (failed === 0) {
        toast.success(
          `${action === 'resolve' ? 'Resolved' : 'Rejected'} ${ids.length} dispute${ids.length !== 1 ? 's' : ''}`,
        );
      } else if (succeeded === 0) {
        toast.error(
          `Failed to ${action} ${failed} dispute${failed !== 1 ? 's' : ''}`,
        );
      } else {
        toast.error(`${succeeded} succeeded, ${failed} failed to ${action}`);
      }
      setSelectedIds(new Set());
    } finally {
      setBulkLoading(false);
      setConfirmAction(null);
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

  const selectedCount = selectedIds.size;

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

      {/* Bulk action bar (#1558) */}
      <BulkActionBar
        selectedCount={selectedCount}
        itemLabel="dispute"
        onClear={() => setSelectedIds(new Set())}
        actions={[
          {
            key: 'resolve',
            label: 'Resolve',
            icon: <CheckCircle2 size={14} />,
            tone: 'success',
            onClick: () => setConfirmAction('resolve'),
          },
          {
            key: 'reject',
            label: 'Reject',
            icon: <XCircle size={14} />,
            tone: 'danger',
            onClick: () => setConfirmAction('reject'),
          },
        ]}
      />

      {/* Table */}
      <div className="rounded-2xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-blue-300/40">
            <tr>
              <th className="p-3 text-left">
                <button
                  onClick={toggleAll}
                  className="text-blue-300/40 hover:text-blue-400 transition-colors"
                  title={allSelected ? 'Deselect all' : 'Select all'}
                >
                  {allSelected ? (
                    <CheckSquare size={18} className="text-blue-400" />
                  ) : (
                    <Square size={18} />
                  )}
                </button>
              </th>
              <th className="p-3 text-left font-bold uppercase tracking-widest text-[10px]">
                Dispute
              </th>
              <th className="p-3 text-left font-bold uppercase tracking-widest text-[10px]">
                Status
              </th>
              <th className="p-3 text-left font-bold uppercase tracking-widest text-[10px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {disputes.map((d) => (
              <tr
                key={d.id}
                className={selectedIds.has(d.id) ? 'bg-blue-500/5' : ''}
              >
                <td className="p-3">
                  <button
                    onClick={() => toggleOne(d.id)}
                    className="text-blue-300/40 hover:text-blue-400 transition-colors"
                  >
                    {selectedIds.has(d.id) ? (
                      <CheckSquare size={18} className="text-blue-400" />
                    ) : (
                      <Square size={18} />
                    )}
                  </button>
                </td>
                <td className="p-3 text-white">{d.disputeId}</td>
                <td className="p-3">{formatLabel(d.status)}</td>
                <td className="p-3 flex items-center gap-3">
                  <button onClick={() => setSelected(d)}>
                    <Eye />
                  </button>
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

      {/* Bulk confirmation dialogs (#1558) */}
      {confirmAction === 'resolve' && (
        <BulkConfirmDialog
          title={`Resolve ${selectedCount} dispute${selectedCount !== 1 ? 's' : ''}?`}
          message="Each selected dispute will be marked resolved and logged to the audit trail."
          onConfirm={() => runBulkAction('resolve')}
          onCancel={() => setConfirmAction(null)}
          isLoading={bulkLoading}
          variant="warning"
        />
      )}
      {confirmAction === 'reject' && (
        <BulkConfirmDialog
          title={`Reject ${selectedCount} dispute${selectedCount !== 1 ? 's' : ''}?`}
          message="Each selected dispute will be marked rejected and logged to the audit trail. This cannot be undone from this view."
          onConfirm={() => runBulkAction('reject')}
          onCancel={() => setConfirmAction(null)}
          isLoading={bulkLoading}
          variant="danger"
        />
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
