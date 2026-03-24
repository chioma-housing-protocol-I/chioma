'use client';

import React from 'react';
import {
  X,
  Database,
  Clock,
  ShieldCheck,
  User as UserIcon,
  Globe,
  Terminal,
} from 'lucide-react';
import { format } from 'date-fns';
import type { AuditLog } from '@/types';

interface ModalProps {
  log: AuditLog | null;
  onClose: () => void;
}

export const AuditLogDetailModal: React.FC<ModalProps> = ({ log, onClose }) => {
  if (!log) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-blue-400" size={24} />
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Audit Log Detail
              </h3>
              <p className="text-[10px] text-blue-300/40 uppercase tracking-widest font-bold">
                Log ID: {log.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-blue-300/40 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-8">
          {/* Top Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-blue-300/40 uppercase tracking-widest flex items-center gap-1.5">
                <Clock size={12} /> Timestamp
              </label>
              <p className="text-sm text-white font-medium">
                {format(new Date(log.createdAt), 'PPPP p')}
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-blue-300/40 uppercase tracking-widest flex items-center gap-1.5">
                <UserIcon size={12} /> Performed By
              </label>
              <p className="text-sm text-white font-medium">
                {log.user?.email || log.userId || 'System Action'}
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-blue-300/40 uppercase tracking-widest flex items-center gap-1.5">
                <Database size={12} /> Target Entity
              </label>
              <p className="text-sm text-white font-medium">
                {log.entity} ({log.entityId})
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-blue-300/40 uppercase tracking-widest flex items-center gap-1.5">
                <Globe size={12} /> Environment
              </label>
              <p
                className="text-xs text-blue-200/60 font-mono truncate"
                title={log.userAgent}
              >
                {log.ipAddress || 'Internal'} •{' '}
                {log.userAgent?.split(' ')[0] || 'Utility'}
              </p>
            </div>
          </div>

          {/* Changes Section */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-blue-300/40 uppercase tracking-widest flex items-center gap-1.5">
              <Terminal size={12} /> Change Log / Metadata
            </label>
            <div className="bg-black/40 rounded-2xl border border-white/5 p-4 overflow-hidden">
              <pre className="text-xs text-emerald-400 font-mono overflow-x-auto">
                {JSON.stringify(log.changes || {}, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white/5 border-t border-white/5 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white text-sm font-bold rounded-xl border border-white/10 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
