'use client';

import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { getConfiguredNetwork } from '@/lib/stellar-network';

export type BlockchainStatusVariant =
  | 'network'
  | 'connected'
  | 'disconnected'
  | 'pending'
  | 'success'
  | 'error';

const VARIANT_STYLES: Record<BlockchainStatusVariant, string> = {
  network: 'bg-slate-800/80 text-slate-200 border-slate-600/50',
  connected: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  disconnected: 'bg-slate-800/80 text-slate-400 border-slate-600/50',
  pending: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
  success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  error: 'bg-red-500/15 text-red-300 border-red-500/30',
};

const ICONS: Partial<Record<BlockchainStatusVariant, React.ReactNode>> = {
  connected: <Wifi size={14} className="shrink-0" />,
  disconnected: <WifiOff size={14} className="shrink-0" />,
  pending: (
    <Loader2 size={14} className="shrink-0 animate-spin text-amber-300" />
  ),
  success: <CheckCircle2 size={14} className="shrink-0" />,
  error: <AlertCircle size={14} className="shrink-0" />,
};

export interface BlockchainStatusBadgeProps {
  variant: BlockchainStatusVariant;
  /** Overrides automatic network label when variant is `network` */
  label?: string;
  className?: string;
}

export function BlockchainStatusBadge({
  variant,
  label,
  className = '',
}: BlockchainStatusBadgeProps) {
  const networkLabel =
    variant === 'network'
      ? (label ?? `Stellar ${getConfiguredNetwork()}`)
      : label;

  const text =
    variant === 'network'
      ? networkLabel
      : (label ??
        (variant === 'connected'
          ? 'Wallet connected'
          : variant === 'disconnected'
            ? 'Wallet disconnected'
            : variant === 'pending'
              ? 'Awaiting signature'
              : variant === 'success'
                ? 'Confirmed on-chain'
                : 'Transaction failed'));

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${VARIANT_STYLES[variant]} ${className}`}
    >
      {ICONS[variant]}
      {text}
    </span>
  );
}
