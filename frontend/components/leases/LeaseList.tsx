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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-100">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Active
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-100">
            <Clock className="w-3.5 h-3.5" />
            Pending Signature
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-500 text-xs font-bold rounded-full border border-gray-200">
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
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Property
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {currentUserRole === 'LANDLORD' ? 'Tenant' : 'Landlord'}
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leases.map((lease) => (
                <tr
                  key={lease.id}
                  className="hover:bg-gray-50/50 transition-colors group"
                >
                  <td className="px-6 py-5 align-middle">
                    <p className="font-bold text-gray-900 mb-1">
                      {lease.property}
                    </p>
                    <p className="font-semibold text-brand-blue text-sm">
                      {lease.rentAmount}/yr
                    </p>
                  </td>
                  <td className="px-6 py-5 align-middle font-medium text-gray-700">
                    {currentUserRole === 'LANDLORD'
                      ? lease.tenantName
                      : lease.landlordName}
                  </td>
                  <td className="px-6 py-5 align-middle text-sm text-gray-500">
                    <div>{new Date(lease.startDate).toLocaleDateString()}</div>
                    <div className="text-xs mt-1">
                      to {new Date(lease.endDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-5 align-middle">
                    {getStatusBadge(lease.status)}
                  </td>
                  <td className="px-6 py-5 align-middle text-right">
                    <button
                      onClick={() => setSelectedLease(lease)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-sm font-bold text-gray-700 rounded-xl hover:bg-brand-blue hover:text-white hover:border-brand-blue transition-colors shadow-xs"
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
