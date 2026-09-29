'use client';

import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

export interface BulkConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
  variant: 'danger' | 'warning';
}

/**
 * Shared confirmation dialog for bulk admin actions (#1558), extracted from
 * `BulkUserOperations.tsx`'s inline `ConfirmDialog` so disputes/arbiters/
 * refunds share the exact same confirm-before-applying step rather than
 * re-implementing it three times.
 */
export function BulkConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
  isLoading,
  variant,
}: BulkConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border flex-shrink-0 ${variant === 'danger' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}
          >
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <p className="text-blue-200/60 text-sm mt-1">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-5 py-2.5 text-sm font-bold text-blue-200/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 ${variant === 'danger' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-amber-500 hover:bg-amber-600'}`}
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export default BulkConfirmDialog;
