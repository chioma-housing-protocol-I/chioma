'use client';

import {
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
  MapPin,
} from 'lucide-react';
import type { Contract, ContractStatus } from '@/types/contracts';
import { ContractTimeline } from './ContractTimeline';

interface ContractCardProps {
  contract: Contract;
  onViewDetails: (contract: Contract) => void;
}

const STATUS_CONFIG: Record<
  ContractStatus,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  ACTIVE: {
    label: 'Active',
    icon: CheckCircle2,
    className: 'bg-green-50 text-green-700 border-green-100',
  },
  PENDING: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-amber-50 text-amber-700 border-amber-100',
  },
  EXPIRED: {
    label: 'Expired',
    icon: XCircle,
    className: 'bg-neutral-100 text-neutral-500 border-neutral-200',
  },
};

export function ContractCard({ contract, onViewDetails }: ContractCardProps) {
  const statusConfig = STATUS_CONFIG[contract.status];
  const StatusIcon = statusConfig.icon;

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden group">
      {/* Card Header */}
      <div className="p-5 pb-4 border-b border-neutral-50">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-neutral-900 truncate">
              {contract.propertyName}
            </h3>
            <div className="flex items-center gap-1.5 mt-1 text-sm text-neutral-500">
              <MapPin size={13} className="shrink-0" />
              <span className="truncate">{contract.propertyAddress}</span>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full border shrink-0 ${statusConfig.className}`}
          >
            <StatusIcon size={13} />
            {statusConfig.label}
          </span>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-0.5">
              Landlord
            </span>
            <span className="font-medium text-neutral-700">
              {contract.landlord.name}
            </span>
          </div>
          <div>
            <span className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-0.5">
              Tenant
            </span>
            <span className="font-medium text-neutral-700">
              {contract.tenant.name}
            </span>
          </div>
        </div>
      </div>

      {/* Financial Details */}
      <div className="px-5 py-3 bg-neutral-50/50 grid grid-cols-3 gap-3 text-sm">
        <div>
          <span className="block text-xs text-neutral-400 font-medium">
            Rent/yr
          </span>
          <span className="font-bold text-brand-blue">
            {contract.rentAmount}
          </span>
        </div>
        <div>
          <span className="block text-xs text-neutral-400 font-medium">
            Deposit
          </span>
          <span className="font-bold text-neutral-700">
            {contract.securityDeposit}
          </span>
        </div>
        <div>
          <span className="block text-xs text-neutral-400 font-medium">
            Commission
          </span>
          <span className="font-bold text-neutral-700">
            {contract.commissionRate}
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="px-5 py-4">
        <ContractTimeline currentStage={contract.stage} compact />
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-neutral-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-neutral-400">
          <Calendar size={13} />
          <span>
            {new Date(contract.startDate).toLocaleDateString('en-NG', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}{' '}
            &mdash;{' '}
            {new Date(contract.endDate).toLocaleDateString('en-NG', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>

        <button
          onClick={() => onViewDetails(contract)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-neutral-600 bg-white border border-neutral-200 rounded-lg hover:bg-brand-blue hover:text-white hover:border-brand-blue transition-colors"
        >
          <Eye size={14} />
          View
        </button>
      </div>
    </div>
  );
}
