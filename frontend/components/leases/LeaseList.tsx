'use client';

import { useState } from 'react';
import { Eye, FileText, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { LeaseDetailsModal, type Lease } from './LeaseDetailsModal';
import { EmptyState } from '@/components/ui/EmptyState';

interface LeaseListProps {
  leases: Lease[];
  currentUserRole: 'LANDLORD' | 'TENANT';
  onSignComplete?: (leaseId: string) => Promise<void>;
}

export function LeaseList({
  leases,
  currentUserRole,
  onSignComplete,
}: LeaseListProps) {
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Active
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-400 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            Pending Signature
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 text-blue-200/40 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-white/10">
            <XCircle className="w-3.5 h-3.5" />
            Expired
          </span>
        );
      default:
        return null;
    }
  };

  if (leases.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No Lease Agreements"
        description="There are currently no active or past lease agreements to display."
      />
    );
  }

  return (
    <>
      <div className="bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/5 text-blue-300/40">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">
                  Property
                </th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">
                  {currentUserRole === 'LANDLORD' ? 'Tenant' : 'Landlord'}
                </th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">
                  Duration
                </th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">
                  Status
                </th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {leases.map((lease) => (
                <tr
                  key={lease.id}
                  className="hover:bg-white/5 transition-all group"
                >
                  <td className="px-6 py-5 align-middle">
                    <p className="font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">
                      {lease.property}
                    </p>
                    <p className="font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent text-sm">
                      {lease.rentAmount}/yr
                    </p>
                  </td>
                  <td className="px-6 py-5 align-middle font-medium text-blue-200/60">
                    {currentUserRole === 'LANDLORD'
                      ? lease.tenantName
                      : lease.landlordName}
                  </td>
                  <td className="px-6 py-5 align-middle text-sm text-blue-200/40">
                    <div className="font-medium">
                      {new Date(lease.startDate).toLocaleDateString()}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-widest mt-1.5 opacity-60">
                      to {new Date(lease.endDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-5 align-middle">
                    {getStatusBadge(lease.status)}
                  </td>
                  <td className="px-6 py-5 align-middle text-right">
                    <button
                      onClick={() => setSelectedLease(lease)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600/20 border border-blue-500/30 text-[10px] font-bold uppercase tracking-widest text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-lg"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedLease && (
        <LeaseDetailsModal
          lease={selectedLease}
          onClose={() => setSelectedLease(null)}
          currentUserRole={currentUserRole}
          onSignComplete={onSignComplete}
        />
      )}
    </>
  );
}
