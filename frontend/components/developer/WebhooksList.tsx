'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Activity, Archive, Pencil, Play, RefreshCw, Trash2 } from 'lucide-react';
import type { DeveloperWebhook, WebhookStatus } from '@/lib/developer-webhooks';

type WebhooksListProps = {
  webhooks: DeveloperWebhook[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit: (webhook: DeveloperWebhook) => void;
  onDelete: (webhook: DeveloperWebhook) => void;
  onToggle: (webhook: DeveloperWebhook) => void;
  onArchive: (webhook: DeveloperWebhook) => void;
  onTest: (webhook: DeveloperWebhook) => void;
  onRetry: (webhook: DeveloperWebhook) => void;
};

const PAGE_SIZE = 5;

export function WebhooksList({
  webhooks,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
  onToggle,
  onArchive,
  onTest,
  onRetry,
}: WebhooksListProps) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | WebhookStatus>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'recent'>('newest');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return [...webhooks]
      .filter((webhook) => !webhook.archived)
      .filter((webhook) => {
        if (statusFilter === 'all') return true;
        return webhook.status === statusFilter;
      })
      .filter((webhook) => {
        if (!normalized) return true;
        return (
          webhook.label.toLowerCase().includes(normalized) ||
          webhook.url.toLowerCase().includes(normalized) ||
          webhook.events.some((event) => event.toLowerCase().includes(normalized))
        );
      })
      .sort((left, right) => {
        if (sortBy === 'oldest') {
          return (
            new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
          );
        }

        if (sortBy === 'recent') {
          return (
            new Date(right.lastTriggeredAt ?? right.createdAt).getTime() -
            new Date(left.lastTriggeredAt ?? left.createdAt).getTime()
          );
        }

        return (
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
        );
      });
  }, [query, sortBy, statusFilter, webhooks]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [query, sortBy, statusFilter]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Configured webhooks</h2>
          <p className="mt-1 text-sm text-slate-300">
            Search, filter, and manage webhook endpoints for external integrations.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3 xl:min-w-[620px]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by URL, name, or event"
            className="rounded-xl border border-white/10 bg-slate-950/45 px-4 py-2.5 text-sm text-white outline-none transition focus:border-blue-400"
          />
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as 'all' | WebhookStatus)
            }
            className="rounded-xl border border-white/10 bg-slate-950/45 px-4 py-2.5 text-sm text-white outline-none transition focus:border-blue-400"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={sortBy}
            onChange={(event) =>
              setSortBy(event.target.value as 'newest' | 'oldest' | 'recent')
            }
            className="rounded-xl border border-white/10 bg-slate-950/45 px-4 py-2.5 text-sm text-white outline-none transition focus:border-blue-400"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="recent">Recently triggered</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-white/15 bg-slate-950/30 p-10 text-center">
          <h3 className="text-lg font-semibold text-white">No webhooks found</h3>
          <p className="mt-2 text-sm text-slate-300">
            Create a webhook or adjust the filters to see matching integrations.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {paginated.map((webhook) => {
            const statusTone =
              webhook.status === 'active'
                ? 'bg-emerald-500/15 text-emerald-200'
                : webhook.status === 'failed'
                  ? 'bg-rose-500/15 text-rose-200'
                  : 'bg-amber-500/15 text-amber-100';

            return (
              <article
                key={webhook.id}
                className={`rounded-2xl border p-4 transition ${
                  selectedId === webhook.id
                    ? 'border-blue-400/60 bg-blue-500/10'
                    : 'border-white/10 bg-slate-950/35 hover:border-white/20'
                }`}
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <button
                    type="button"
                    onClick={() => onSelect(webhook.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold text-white">
                        {webhook.label}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${statusTone}`}>
                        {webhook.enabled ? webhook.status : 'disabled'}
                      </span>
                    </div>
                    <p className="mt-2 truncate text-sm text-slate-200">
                      {webhook.method} {webhook.url}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      {webhook.events.join(', ')}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
                      <span>Created {new Date(webhook.createdAt).toLocaleString()}</span>
                      <span>
                        Last triggered{' '}
                        {webhook.lastTriggeredAt
                          ? new Date(webhook.lastTriggeredAt).toLocaleString()
                          : 'Never'}
                      </span>
                      <span>{webhook.stats.successRate}% success rate</span>
                    </div>
                  </button>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/developer/webhooks/${webhook.id}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/5"
                    >
                      <Activity className="h-4 w-4" />
                      Details
                    </Link>
                    <button
                      type="button"
                      onClick={() => onTest(webhook)}
                      className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/5"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRetry(webhook)}
                      className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/5"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggle(webhook)}
                      className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/5"
                    >
                      {webhook.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(webhook)}
                      className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/5"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onArchive(webhook)}
                      className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/5"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(webhook)}
                      className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-100 transition hover:bg-rose-500/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {filtered.length > PAGE_SIZE ? (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={page === 1}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={page === totalPages}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
