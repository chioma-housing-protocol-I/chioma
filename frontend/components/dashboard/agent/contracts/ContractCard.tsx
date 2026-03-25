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
    className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20',
  },
  PENDING: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-orange-500/20 text-orange-400 border-orange-500/20',
  },
  EXPIRED: {
    label: 'Expired',
    icon: XCircle,
    className: 'bg-white/5 text-blue-200/40 border-white/10',
  },
};

export function ContractCard({ contract, onViewDetails }: ContractCardProps) {
  const statusConfig = STATUS_CONFIG[contract.status];
  const StatusIcon = statusConfig.icon;

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 shadow-xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 overflow-hidden group">
      {/* Card Header */}
      <div className="p-6 pb-5 border-b border-white/5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-white tracking-tight group-hover:text-blue-300 transition-colors">
              {contract.propertyName}
            </h3>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-blue-200/60 font-medium">
              <MapPin size={13} className="shrink-0 text-blue-400/60" />
              <span className="truncate">{contract.propertyAddress}</span>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-lg border shrink-0 transition-all uppercase tracking-widest ${statusConfig.className}`}
          >
            <StatusIcon size={12} strokeWidth={2.5} />
            {statusConfig.label}
          </span>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-2 gap-4 text-sm mt-4">
          <div>
            <span className="block text-[10px] font-bold text-blue-300/40 uppercase tracking-widest mb-1.5">
              Landlord
            </span>
            <span className="font-bold text-blue-100 group-hover:text-white transition-colors">
              {contract.landlord.name}
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-bold text-blue-300/40 uppercase tracking-widest mb-1.5">
              Tenant
            </span>
            <span className="font-bold text-blue-100 group-hover:text-white transition-colors">
              {contract.tenant.name}
            </span>
          </div>
        </div>
      </div>
      Broadway, Financial:
      <div className="px-6 py-4 bg-white/10 border-b border-white/5 grid grid-cols-3 gap-4 text-sm shadow-inner">
        <div>
          <span className="block text-[10px] font-bold text-blue-300/40 uppercase tracking-widest mb-1">
            Rent/yr
          </span>
          <span className="font-bold text-blue-400 tracking-tight">
            {contract.rentAmount}
          </span>
        </div>
        <div>
          <span className="block text-[10px] font-bold text-blue-300/40 uppercase tracking-widest mb-1">
            Deposit
          </span>
          <span className="font-bold text-white/90">
            {contract.securityDeposit}
          </span>
        </div>
        <div>
          <span className="block text-[10px] font-bold text-blue-300/40 uppercase tracking-widest mb-1">
            Comm.
          </span>
          <span className="font-bold text-white/90">
            {contract.commissionRate}
          </span>
        </div>
      </div>
      {/* Timeline */}
      <div className="px-6 py-5">
        <ContractTimeline currentStage={contract.stage} compact />
      </div>
      <div className="px-6 py-4 border-t border-white/5 bg-white/20 flex items-center justify-between mt-auto">
        <div className="flex items-center gap-2 text-[10px] font-bold text-blue-300/40 uppercase tracking-widest">
          <Calendar size={13} className="text-blue-400/60" />
          <span>
            {new Date(contract.startDate).getFullYear()} &ndash;{' '}
            {new Date(contract.endDate).getFullYear()}
          </span>
        </div>

        <button
          onClick={() => onViewDetails(contract)}
          className="inline-flex items-center gap-2 px-4 py-2 text-[10px] font-bold text-white bg-blue-600/50 border border-blue-500/30 rounded-xl hover:bg-blue-600 hover:border-blue-400 transition-all uppercase tracking-widest shadow-lg"
        >
          <Eye size={14} strokeWidth={2.5} />
          Details
        </button>
      </div>
    </div>
  );
}
