'use client';

import { useState, useMemo } from 'react';
import { Search, Edit2, Trash2, RotateCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export interface ApiKey {
  id: string;
  name: string;
  description?: string;
  keyPrefix: string;
  permissions: string[];
  status: 'active' | 'revoked' | 'expired';
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
}

interface ApiKeysListProps {
  apiKeys: ApiKey[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onRevoke: (id: string) => void;
  onRotate: (id: string) => void;
}

export function ApiKeysList({
  apiKeys,
  selectedId,
  onSelect,
  onEdit,
  onRevoke,
  onRotate,
}: ApiKeysListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'revoked' | 'expired'>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return apiKeys.filter((k) => {
      const matchesSearch =
        q.length === 0 ||
        k.name.toLowerCase().includes(q) ||
        k.keyPrefix.toLowerCase().includes(q) ||
        k.permissions.some((p) => p.toLowerCase().includes(q));
      const matchesStatus = statusFilter === 'all' || k.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, apiKeys]);

  const statusIcon = (status: ApiKey['status']) => {
    if (status === 'active') return <CheckCircle size={14} className="text-emerald-400" />;
    if (status === 'expired') return <Clock size={14} className="text-amber-400" />;
    return <AlertCircle size={14} className="text-rose-400" />;
  };

  const statusBadge = (status: ApiKey['status']) => {
    const base = 'px-2 py-0.5 rounded-md text-xs font-medium';
    if (status === 'active') return `${base} bg-emerald-500/10 border border-emerald-500/30 text-emerald-400`;
    if (status === 'expired') return `${base} bg-amber-500/10 border border-amber-500/30 text-amber-400`;
    return `${base} bg-rose-500/10 border border-rose-500/30 text-rose-400`;
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 space-y-4">
      <h2 className="text-lg font-bold text-white">API Keys</h2>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300/40" size={16} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or scope..."
          className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-blue-200/40 focus:outline-none focus:bg-white/10 focus:border-blue-500 transition-all"
        />
      </div>

      <div className="flex gap-2">
        {(['all', 'active', 'revoked', 'expired'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all capitalize ${
              statusFilter === s
                ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                : 'bg-white/5 border border-white/10 text-blue-200/60 hover:border-white/20'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {apiKeys.length === 0 ? (
        <div className="text-center py-10 text-blue-200/60 text-sm">
          <p className="mb-1">No API keys yet</p>
          <p className="text-xs">Generate your first key to get started</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-blue-200/60 text-sm">No matching keys</div>
      ) : (
        <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
          {filtered.map((key) => {
            const isSelected = selectedId === key.id;
            return (
              <div
                key={key.id}
                onClick={() => onSelect(key.id)}
                className={`rounded-xl border p-3 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-500/10 border-cyan-500/40'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {statusIcon(key.status)}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white font-medium truncate">{key.name}</p>
                      <p className="text-xs text-blue-200/60 font-mono mt-0.5">
                        {key.keyPrefix}••••••••
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={statusBadge(key.status)}>{key.status}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-blue-200/40">
                    {key.permissions.length} scope{key.permissions.length !== 1 ? 's' : ''}
                  </p>
                  <div className="flex gap-1">
                    {key.status === 'active' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onRotate(key.id); }}
                        className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-blue-300 hover:bg-white/10 transition-all"
                        title="Rotate key"
                      >
                        <RotateCw size={13} />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(key.id); }}
                      className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-all"
                      title="Edit"
                    >
                      <Edit2 size={13} />
                    </button>
                    {key.status === 'active' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onRevoke(key.id); }}
                        className="p-1.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-all"
                        title="Revoke"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
