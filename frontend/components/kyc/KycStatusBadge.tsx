'use client';

import {
  CheckCircle2,
  Clock,
  HelpCircle,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import type { KycStatus } from '@/types';

interface KycStatusBadgeProps {
  /** `null` / `undefined` means the user has not submitted KYC yet. */
  status?: KycStatus | null;
  className?: string;
}

const STYLES: Record<
  KycStatus | 'NONE',
  { label: string; className: string; Icon: typeof Clock }
> = {
  NONE: {
    label: 'Not verified',
    className: 'bg-white/5 text-blue-200/70 border-white/10',
    Icon: ShieldAlert,
  },
  PENDING: {
    label: 'Pending review',
    className: 'bg-amber-500/10 text-amber-300 border-amber-400/20',
    Icon: Clock,
  },
  APPROVED: {
    label: 'Verified',
    className: 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20',
    Icon: CheckCircle2,
  },
  REJECTED: {
    label: 'Rejected',
    className: 'bg-red-500/10 text-red-300 border-red-400/20',
    Icon: XCircle,
  },
  NEEDS_INFO: {
    label: 'More info needed',
    className: 'bg-orange-500/10 text-orange-300 border-orange-400/20',
    Icon: HelpCircle,
  },
};

export function KycStatusBadge({
  status,
  className = '',
}: KycStatusBadgeProps) {
  const { label, className: tone, Icon } = STYLES[status ?? 'NONE'];
  return (
    <span
      data-testid="kyc-status-badge"
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${tone} ${className}`}
    >
      <Icon size={14} aria-hidden="true" />
      {label}
    </span>
  );
}

export default KycStatusBadge;
