'use client';

import { Copy, RotateCw, Trash2, Calendar, Clock, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import type { ApiKey } from './ApiKeysList';

interface ApiKeyDetailsProps {
  apiKey: ApiKey;
  onRevoke: (id: string) => void;
  onRotate: (id: string) => void;
}

export function ApiKeyDetails({ apiKey, onRevoke, onRotate }: ApiKeyDetailsProps) {
  const copyPrefix = () => {
    navigator.clipboard.writeText(apiKey.keyPrefix);
    toast.success('Key prefix copied');
  };

  const statusColor = {
    active: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    revoked: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    expired: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  }[apiKey.status];

  const fmt = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—';

  const fmtFull = (iso?: string) =>
    iso ? new Date(iso).toLocaleString() : 'Never';

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">{apiKey.name}</h2>
          {apiKey.description && (
            <p className="text-blue-200/60 mt-1 text-sm">{apiKey.description}</p>
          )}
        </div>
        <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${statusColor} capitalize`}>
          {apiKey.status}
        </span>
      </div>

      {/* Key preview */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <p className="text-xs text-blue-200/60 uppercase tracking-wide mb-2">API Key</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs text-white font-mono">
            {apiKey.keyPrefix}••••••••••••••••••••••••••••••••
          </code>
          <button
            onClick={copyPrefix}
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all"
            title="Copy prefix"
          >
            <Copy size={14} />
          </button>
        </div>
        <p className="text-xs text-blue-200/40 mt-2">
          Only the prefix is shown. The full key was displayed once at creation.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-1.5 mb-1">
            <Calendar size={13} className="text-blue-200/60" />
            <p className="text-xs text-blue-200/60 uppercase tracking-wide">Created</p>
          </div>
          <p className="text-sm font-semibold text-white">{fmt(apiKey.createdAt)}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity size={13} className="text-blue-200/60" />
            <p className="text-xs text-blue-200/60 uppercase tracking-wide">Last Used</p>
          </div>
          <p className="text-sm font-semibold text-white">{fmtFull(apiKey.lastUsedAt)}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock size={13} className="text-blue-200/60" />
            <p className="text-xs text-blue-200/60 uppercase tracking-wide">Expires</p>
          </div>
          <p className="text-sm font-semibold text-white">
            {apiKey.expiresAt ? fmt(apiKey.expiresAt) : 'Never'}
          </p>
        </div>
      </div>

      {/* Permissions */}
      <div className="border-t border-white/10 pt-5">
        <h3 className="font-semibold text-white mb-3 text-sm">Permissions / Scopes</h3>
        <div className="flex flex-wrap gap-2">
          {apiKey.permissions.map((perm) => (
            <span
              key={perm}
              className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-medium"
            >
              {perm}
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      {apiKey.status === 'active' && (
        <div className="pt-4 border-t border-white/10 flex gap-3">
          <button
            onClick={() => onRotate(apiKey.id)}
            className="flex-1 px-4 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
          >
            <RotateCw size={15} />
            Rotate Key
          </button>
          <button
            onClick={() => onRevoke(apiKey.id)}
            className="flex-1 px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
          >
            <Trash2 size={15} />
            Revoke Key
          </button>
        </div>
      )}
    </div>
  );
}
