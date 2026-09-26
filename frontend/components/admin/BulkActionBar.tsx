'use client';

import React from 'react';
import { CheckSquare, X } from 'lucide-react';

export interface BulkActionBarAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  tone?: 'default' | 'danger' | 'success';
}

interface BulkActionBarProps {
  selectedCount: number;
  itemLabel: string;
  actions: BulkActionBarAction[];
  onClear: () => void;
}

const TONE_CLASSES: Record<NonNullable<BulkActionBarAction['tone']>, string> = {
  default:
    'text-blue-300 hover:text-white bg-white/5 hover:bg-white/10 border-white/10',
  danger:
    'text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20',
  success:
    'text-emerald-300 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20',
};

/**
 * Shared bulk-selection action bar (#1558), extracted from the pattern
 * `BulkUserOperations.tsx` established for the admin users view so
 * disputes/arbiters/refunds don't each re-implement the same bar.
 */
export function BulkActionBar({
  selectedCount,
  itemLabel,
  actions,
  onClear,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl px-5 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <CheckSquare size={18} className="text-blue-400" />
        <span className="text-sm font-bold text-white">
          {selectedCount} {itemLabel}
          {selectedCount !== 1 ? 's' : ''} selected
        </span>
      </div>
      <div className="flex items-center gap-3">
        {actions.map((action) => (
          <button
            key={action.key}
            onClick={action.onClick}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-xl border transition-all ${
              TONE_CLASSES[action.tone ?? 'default']
            }`}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
        <button
          onClick={onClear}
          className="p-1.5 text-blue-300/60 hover:text-white hover:bg-white/5 rounded-lg transition-all"
          aria-label="Clear selection"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export default BulkActionBar;
