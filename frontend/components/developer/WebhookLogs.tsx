'use client';

import { useMemo, useState } from 'react';
import type { DeveloperWebhookLog } from '@/lib/developer-webhooks';

type WebhookLogsProps = {
  logs: DeveloperWebhookLog[];
};

const PAGE_SIZE = 5;

export function WebhookLogs({ logs }: WebhookLogsProps) {
  const [page, setPage] = useState(1);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return logs.slice(start, start + PAGE_SIZE);
  }, [logs, page]);

  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE));

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Delivery logs</h2>
          <p className="mt-1 text-sm text-slate-300">
            Recent attempts, response codes, and payload samples for this webhook.
          </p>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
          {logs.length} entries
        </span>
      </div>

      {logs.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-slate-950/30 p-6 text-sm text-slate-300">
          No delivery history yet.
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {paginated.map((log) => (
            <article
              key={log.id}
              className="rounded-2xl border border-white/10 bg-slate-950/35 p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-white">
                      {log.event}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                        log.status === 'success'
                          ? 'bg-emerald-500/15 text-emerald-200'
                          : log.status === 'failed'
                            ? 'bg-rose-500/15 text-rose-200'
                            : 'bg-amber-500/15 text-amber-100'
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    {new Date(log.attemptedAt).toLocaleString()} • {log.durationMs}
                    ms • HTTP {log.responseCode}
                  </p>
                </div>

                <pre className="w-full overflow-x-auto rounded-xl bg-slate-950/70 p-3 text-xs text-slate-200 lg:max-w-md">
                  {log.payload}
                </pre>
              </div>
            </article>
          ))}
        </div>
      )}

      {logs.length > PAGE_SIZE ? (
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
              onClick={() =>
                setPage((value) => Math.min(totalPages, value + 1))
              }
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
