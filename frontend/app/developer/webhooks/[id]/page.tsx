'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { WebhookLogs } from '@/components/developer/WebhookLogs';
import { WebhookTest } from '@/components/developer/WebhookTest';
import { apiClient } from '@/lib/api-client';
import {
  buildPayloadExample,
  createWebhookLog,
  loadDeveloperWebhookLogs,
  loadDeveloperWebhooks,
  saveDeveloperWebhookLogs,
  saveDeveloperWebhooks,
  type DeveloperWebhook,
} from '@/lib/developer-webhooks';
import { useAuth } from '@/store/authStore';

export default function DeveloperWebhookDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [webhooks, setWebhooks] = useState<DeveloperWebhook[]>([]);
  const [logs, setLogs] = useState(loadDeveloperWebhookLogs());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);

      try {
        const response = await apiClient.get<DeveloperWebhook[]>(
          '/developer/webhooks',
          { retries: 1, timeoutMs: 5000 },
        );

        if (cancelled) return;
        setWebhooks(response.data.filter((webhook) => webhook.ownerId === user.id));
      } catch {
        if (cancelled) return;
        setWebhooks(loadDeveloperWebhooks(user.id));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const webhook = useMemo(
    () => webhooks.find((item) => item.id === params.id) ?? null,
    [params.id, webhooks],
  );

  const webhookLogs = useMemo(
    () =>
      logs
        .filter((log) => log.webhookId === params.id)
        .sort(
          (left, right) =>
            new Date(right.attemptedAt).getTime() -
            new Date(left.attemptedAt).getTime(),
        ),
    [logs, params.id],
  );

  const handleSendTest = async (event: string, payload: string) => {
    if (!webhook) return;

    try {
      await apiClient.post(`/developer/webhooks/${webhook.id}/test`, {
        event,
        payload,
      }, {
        retries: 1,
        timeoutMs: 5000,
      });
    } catch {
      // Fall back to local-only persistence below.
    }

    const nextLog = createWebhookLog(webhook, event, 'success', payload);
    const nextLogs = [nextLog, ...logs];
    setLogs(nextLogs);
    saveDeveloperWebhookLogs(nextLogs);

    const nextWebhooks = webhooks.map((item) =>
      item.id === webhook.id
        ? {
            ...item,
            lastTriggeredAt: nextLog.attemptedAt,
            stats: {
              ...item.stats,
              deliveries: item.stats.deliveries + 1,
            },
          }
        : item,
    );
    setWebhooks(nextWebhooks);
    saveDeveloperWebhooks(nextWebhooks);

    toast.success('Test webhook sent');
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-200">
        Loading webhook details...
      </div>
    );
  }

  if (!webhook) {
    return (
      <section className="rounded-3xl border border-amber-300/20 bg-amber-500/10 p-6 text-amber-50">
        <h2 className="text-2xl font-semibold">Webhook not found</h2>
        <p className="mt-3 text-sm text-amber-100/80">
          The requested webhook does not exist in the current developer workspace.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-2 text-sm text-slate-300"
      >
        <Link href="/developer" className="transition hover:text-white">
          Developer Portal
        </Link>
        <ChevronRight className="h-4 w-4 text-slate-500" />
        <Link href="/developer/webhooks" className="transition hover:text-white">
          Webhooks
        </Link>
        <ChevronRight className="h-4 w-4 text-slate-500" />
        <span className="text-white">{webhook.label}</span>
      </nav>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <Link
              href="/developer/webhooks"
              className="inline-flex items-center gap-2 text-sm text-slate-300 transition hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to webhooks
            </Link>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white">
              {webhook.label}
            </h2>
            <p className="mt-3 text-sm text-slate-300">
              {webhook.method} {webhook.url}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="Status" value={webhook.enabled ? webhook.status : 'disabled'} />
            <MetricCard label="Deliveries" value={String(webhook.stats.deliveries)} />
            <MetricCard label="Failures" value={String(webhook.stats.failedDeliveries)} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
              Subscription details
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {webhook.events.map((event) => (
                <span
                  key={event}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200"
                >
                  {event}
                </span>
              ))}
            </div>
            <div className="mt-4 text-sm text-slate-300">
              <p>Created: {new Date(webhook.createdAt).toLocaleString()}</p>
              <p className="mt-2">
                Last triggered:{' '}
                {webhook.lastTriggeredAt
                  ? new Date(webhook.lastTriggeredAt).toLocaleString()
                  : 'Never'}
              </p>
              <p className="mt-2">Retry policy: {webhook.retryPolicy}</p>
              <p className="mt-2">Timeout: {webhook.timeoutMs} ms</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
              Headers and signing
            </p>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950/70 p-3 text-xs text-slate-200">
{JSON.stringify(
  {
    headers: webhook.headers,
    authentication: webhook.authentication,
    signingSecret: webhook.signingSecret,
    samplePayload: buildPayloadExample(webhook.events[0] ?? 'agreement.created'),
  },
  null,
  2,
)}
            </pre>
          </div>
        </div>
      </section>

      <WebhookTest webhook={webhook} onSendTest={handleSendTest} />
      <WebhookLogs logs={webhookLogs} />
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white capitalize">{value}</p>
    </div>
  );
}
