'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  Edit2,
  Trash2,
  Power,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface Webhook {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  status: 'active' | 'inactive' | 'failed';
  createdAt: string;
  lastTriggered?: string;
  successRate: number;
  failureCount: number;
}

interface WebhookListProps {
  webhooks: Webhook[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function WebhookList({
  webhooks,
  selectedId,
  onSelect,
  onToggle,
  onEdit,
  onDelete,
}: WebhookListProps) {
  const [search, setSearch] = useState('');

  const filteredWebhooks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return webhooks.filter(
      (webhook) =>
        normalizedSearch.length === 0 ||
        webhook.url.toLowerCase().includes(normalizedSearch) ||
        webhook.events.some((e) => e.toLowerCase().includes(normalizedSearch)),
    );
  }, [search, webhooks]);

  const getStatusIcon = (status: string, enabled: boolean) => {
    if (!enabled) {
      return <AlertCircle size={16} className="text-amber-400" />;
    }
    if (status === 'active') {
      return <CheckCircle size={16} className="text-emerald-400" />;
    }
    return <AlertCircle size={16} className="text-rose-400" />;
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 space-y-4">
      <h2 className="text-lg font-bold text-white">Webhooks</h2>

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300/40"
          size={16}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search webhooks..."
          className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-blue-200/40 focus:outline-none focus:bg-white/10 focus:border-blue-500 transition-all"
        />
      </div>

      {webhooks.length === 0 ? (
        <div className="text-center py-8 text-blue-200/60 text-sm">
          No webhooks yet
        </div>
      ) : filteredWebhooks.length === 0 ? (
        <div className="text-center py-8 text-blue-200/60 text-sm">
          No matching webhooks
        </div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {filteredWebhooks.map((webhook) => {
            const isSelected = selectedId === webhook.id;

            return (
              <div
                key={webhook.id}
                onClick={() => onSelect(webhook.id)}
                className={`rounded-xl border p-3 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-500/10 border-cyan-500/40'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getStatusIcon(webhook.status, webhook.enabled)}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-white font-medium truncate">
                        {webhook.url.length > 40
                          ? webhook.url.substring(0, 40) + '...'
                          : webhook.url}
                      </p>
                      <p className="text-xs text-blue-200/60 mt-1">
                        {webhook.events.length} event
                        {webhook.events.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggle(webhook.id);
                      }}
                      className={`p-1.5 rounded-lg transition-all ${
                        webhook.enabled
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                          : 'bg-white/5 border border-white/10 text-blue-200/60'
                      }`}
                      title={webhook.enabled ? 'Disable' : 'Enable'}
                    >
                      <Power size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(webhook.id);
                      }}
                      className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-all"
                      title="Edit"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(webhook.id);
                      }}
                      className="p-1.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-all"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
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
