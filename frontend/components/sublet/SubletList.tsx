'use client';

import { Home } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import type { SubletRequest } from '@/lib/query/hooks/use-sublets';

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function StatusBadge({ status }: { status: SubletRequest['status'] }) {
  const styles: Record<SubletRequest['status'], string> = {
    approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    denied: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    revoked: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg border ${styles[status]}`}
    >
      {status}
    </span>
  );
}

export interface SubletListProps {
  requests: SubletRequest[];
  emptyActionHref?: string;
}

/**
 * Renders a tenant's sublet requests (#1553), matching the table pattern
 * used by `components/leases/LeaseList.tsx`.
 */
export function SubletList({ requests, emptyActionHref }: SubletListProps) {
  if (requests.length === 0) {
    return (
      <EmptyState
        icon={Home}
        title="No active sublets"
        description="You don't have any sublet requests yet."
        actionLabel={emptyActionHref ? 'Request a sublet' : undefined}
        onAction={
          emptyActionHref
            ? () => (window.location.href = emptyActionHref)
            : undefined
        }
        variant="dark"
      />
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-blue-200/50">
              Agreement
            </th>
            <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-blue-200/50">
              Dates
            </th>
            <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-blue-200/50">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr
              key={request.id}
              className="border-b border-white/5 last:border-0"
            >
              <td className="px-6 py-4 text-sm text-white">
                {request.agreementId.slice(0, 8)}
              </td>
              <td className="px-6 py-4 text-sm text-blue-200/70">
                {formatDate(request.requestedStartDate)} →{' '}
                {formatDate(request.requestedEndDate)}
              </td>
              <td className="px-6 py-4">
                <StatusBadge status={request.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default SubletList;
