'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Plus, Webhook } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { WebhookForm } from '@/components/developer/WebhookForm';
import { WebhookLogs } from '@/components/developer/WebhookLogs';
import { WebhookTest } from '@/components/developer/WebhookTest';
import { WebhooksList } from '@/components/developer/WebhooksList';
import { apiClient } from '@/lib/api-client';
import {
  buildPayloadExample,
  createWebhookLog,
  createWebhookRecord,
  loadDeveloperWebhookLogs,
  loadDeveloperWebhooks,
  saveDeveloperWebhookLogs,
  saveDeveloperWebhooks,
  type DeveloperWebhook,
  type DeveloperWebhookFormValues,
} from '@/lib/developer-webhooks';
import { useAuth } from '@/store/authStore';

type PendingAction =
  | { type: 'delete'; webhook: DeveloperWebhook }
  | { type: 'archive'; webhook: DeveloperWebhook }
  | null;

export default function DeveloperWebhooksPage() {
  const { user } = useAuth();
  const [webhooks, setWebhooks] = useState<DeveloperWebhook[]>([]);
  const [logs, setLogs] = useState(loadDeveloperWebhookLogs());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<DeveloperWebhook | null>(
    null,
  );
  const [testWebhook, setTestWebhook] = useState<DeveloperWebhook | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [usingFallback, setUsingFallback] = useState(false);

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
        setUsingFallback(false);
      } catch {
        if (cancelled) return;
        const fallback = loadDeveloperWebhooks(user.id);
        setWebhooks(fallback);
        setUsingFallback(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!selectedId && webhooks.length > 0) {
      setSelectedId(webhooks[0].id);
    }

    if (selectedId && !webhooks.some((webhook) => webhook.id === selectedId)) {
      setSelectedId(webhooks[0]?.id ?? null);
    }
  }, [selectedId, webhooks]);

  useEffect(() => {
    setTestWebhook((current) =>
      current && current.id === selectedId ? current : null,
    );
  }, [selectedId]);

  const selectedWebhook = useMemo(
    () => webhooks.find((webhook) => webhook.id === selectedId) ?? null,
    [selectedId, webhooks],
  );

  const selectedLogs = useMemo(
    () =>
      selectedWebhook
        ? logs
            .filter((log) => log.webhookId === selectedWebhook.id)
            .sort(
              (left, right) =>
                new Date(right.attemptedAt).getTime() -
                new Date(left.attemptedAt).getTime(),
            )
        : [],
    [logs, selectedWebhook],
  );

  const persistWebhooks = (nextWebhooks: DeveloperWebhook[]) => {
    setWebhooks(nextWebhooks);
    saveDeveloperWebhooks(nextWebhooks);
  };

  const persistLogs = (nextLogs: typeof logs) => {
    setLogs(nextLogs);
    saveDeveloperWebhookLogs(nextLogs);
  };

  const handleSaveWebhook = async (values: DeveloperWebhookFormValues) => {
    if (!user) return;

    setSubmitting(true);

    try {
      if (editingWebhook) {
        const nextWebhook: DeveloperWebhook = {
          ...editingWebhook,
          ...values,
          updatedAt: new Date().toISOString(),
        };

        try {
          await apiClient.put(`/developer/webhooks/${editingWebhook.id}`, nextWebhook, {
            retries: 1,
            timeoutMs: 5000,
          });
          setUsingFallback(false);
        } catch {
          setUsingFallback(true);
        }

        const updated = webhooks.map((webhook) =>
          webhook.id === editingWebhook.id ? nextWebhook : webhook,
        );
        persistWebhooks(updated);
        toast.success('Webhook updated');
      } else {
        const nextWebhook = createWebhookRecord(user.id, values);

        try {
          await apiClient.post('/developer/webhooks', nextWebhook, {
            retries: 1,
            timeoutMs: 5000,
          });
          setUsingFallback(false);
        } catch {
          setUsingFallback(true);
        }

        persistWebhooks([nextWebhook, ...webhooks]);
        setSelectedId(nextWebhook.id);
        toast.success('Webhook created');
      }

      setFormOpen(false);
      setEditingWebhook(null);
      setTestWebhook(null);
    } catch {
      toast.error('Unable to save webhook');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (webhook: DeveloperWebhook) => {
    const nextWebhook = {
      ...webhook,
      enabled: !webhook.enabled,
      status: webhook.enabled ? 'inactive' : 'active',
      updatedAt: new Date().toISOString(),
    } satisfies DeveloperWebhook;

    try {
      await apiClient.put(`/developer/webhooks/${webhook.id}`, nextWebhook, {
        retries: 1,
        timeoutMs: 4000,
      });
      setUsingFallback(false);
    } catch {
      setUsingFallback(true);
    }

    persistWebhooks(
      webhooks.map((item) => (item.id === webhook.id ? nextWebhook : item)),
    );
    toast.success(nextWebhook.enabled ? 'Webhook enabled' : 'Webhook disabled');
  };

  const handleDeleteConfirmed = async () => {
    if (!pendingAction || pendingAction.type !== 'delete') return;

    const { webhook } = pendingAction;

    try {
      await apiClient.delete(`/developer/webhooks/${webhook.id}`, {
        retries: 1,
        timeoutMs: 4000,
      });
      setUsingFallback(false);
    } catch {
      setUsingFallback(true);
    }

    persistWebhooks(webhooks.filter((item) => item.id !== webhook.id));
    persistLogs(logs.filter((log) => log.webhookId !== webhook.id));
    setPendingAction(null);
    toast.success('Webhook deleted');
  };

  const handleArchiveConfirmed = async () => {
    if (!pendingAction || pendingAction.type !== 'archive') return;

    const { webhook } = pendingAction;
    const nextWebhook = {
      ...webhook,
      archived: true,
      updatedAt: new Date().toISOString(),
    } satisfies DeveloperWebhook;

    persistWebhooks(
      webhooks.map((item) => (item.id === webhook.id ? nextWebhook : item)),
    );
    setPendingAction(null);
    toast.success('Webhook archived');
  };

  const handleTest = async (webhook: DeveloperWebhook, event?: string, payload?: string) => {
    const eventName = event ?? webhook.events[0] ?? 'agreement.created';
    const payloadBody = payload ?? buildPayloadExample(eventName);
    const log = createWebhookLog(webhook, eventName, 'success', payloadBody);

    try {
      await apiClient.post(`/developer/webhooks/${webhook.id}/test`, {
        event: eventName,
        payload: payloadBody,
      }, {
        retries: 1,
        timeoutMs: 5000,
      });
      setUsingFallback(false);
    } catch {
      setUsingFallback(true);
    }

    persistLogs([log, ...logs]);
    persistWebhooks(
      webhooks.map((item) =>
        item.id === webhook.id
          ? {
              ...item,
              lastTriggeredAt: log.attemptedAt,
              stats: {
                ...item.stats,
                deliveries: item.stats.deliveries + 1,
              },
            }
          : item,
      ),
    );

    toast.success('Test webhook sent');
  };

  const handleRetry = async (webhook: DeveloperWebhook) => {
    const failedLog = logs.find(
      (log) => log.webhookId === webhook.id && log.status === 'failed',
    );

    const payload = failedLog?.payload ?? buildPayloadExample(webhook.events[0] ?? 'agreement.created');
    const event = failedLog?.event ?? webhook.events[0] ?? 'agreement.created';

    try {
      await apiClient.post(`/developer/webhooks/${webhook.id}/retry`, {
        event,
        payload,
      }, {
        retries: 1,
        timeoutMs: 5000,
      });
      setUsingFallback(false);
    } catch {
      setUsingFallback(true);
    }

    persistLogs([createWebhookLog(webhook, event, 'success', payload), ...logs]);
    toast.success('Retry queued');
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-200">
        Loading developer webhooks...
      </div>
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
        <span className="text-white">Webhooks</span>
      </nav>

      <header className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
              <Webhook className="h-3.5 w-3.5" />
              Webhook Management
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white">
              Deliver Chioma events to your systems
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
              Create endpoints, inspect delivery history, retry failed events, and
              validate payload examples before production rollout.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                setEditingWebhook(null);
                setFormOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" />
              New webhook
            </button>
            <Link
              href="/api/docs"
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              View docs
            </Link>
          </div>
        </div>

        {usingFallback ? (
          <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Backend webhook endpoints are unavailable in this environment. The page is
            using local persisted demo data so create, edit, delete, archive, test,
            and retry flows remain usable.
          </div>
        ) : null}
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <WebhooksList
          webhooks={webhooks}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            setTestWebhook(null);
          }}
          onEdit={(webhook) => {
            setEditingWebhook(webhook);
            setFormOpen(true);
          }}
          onDelete={(webhook) => setPendingAction({ type: 'delete', webhook })}
          onToggle={handleToggle}
          onArchive={(webhook) => setPendingAction({ type: 'archive', webhook })}
          onTest={(webhook) => {
            setSelectedId(webhook.id);
            setTestWebhook(webhook);
          }}
          onRetry={handleRetry}
        />

        <div className="space-y-6">
          {selectedWebhook ? (
            <>
              <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="flex flex-col gap-4">
                  <div>
                    <h3 className="text-2xl font-semibold text-white">
                      {selectedWebhook.label}
                    </h3>
                    <p className="mt-2 text-sm text-slate-300">
                      {selectedWebhook.method} {selectedWebhook.url}
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <MetricCard label="Deliveries" value={String(selectedWebhook.stats.deliveries)} />
                    <MetricCard label="Failures" value={String(selectedWebhook.stats.failedDeliveries)} />
                    <MetricCard label="Success rate" value={`${selectedWebhook.stats.successRate}%`} />
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                      Subscribed events
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedWebhook.events.map((event) => (
                        <span
                          key={event}
                          className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200"
                        >
                          {event}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Link
                    href={`/developer/webhooks/${selectedWebhook.id}`}
                    className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Open full detail page
                  </Link>
                </div>
              </section>

              <WebhookLogs logs={selectedLogs} />
            </>
          ) : (
            <section className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-8 text-sm text-slate-300">
              Select a webhook to inspect stats, logs, and payload behavior.
            </section>
          )}
        </div>
      </div>

      {selectedWebhook ? (
        <WebhookTest
          webhook={testWebhook ?? selectedWebhook}
          onSendTest={(event, payload) =>
            handleTest(testWebhook ?? selectedWebhook, event, payload)
          }
        />
      ) : null}

      <WebhookForm
        isOpen={formOpen}
        webhook={editingWebhook}
        loading={submitting}
        onClose={() => {
          setFormOpen(false);
          setEditingWebhook(null);
        }}
        onSubmit={handleSaveWebhook}
      />

      <ConfirmDialog
        isOpen={pendingAction?.type === 'delete'}
        title="Delete webhook"
        description="This removes the webhook configuration and its local delivery history from the portal."
        tone="danger"
        confirmLabel="Delete"
        onCancel={() => setPendingAction(null)}
        onConfirm={handleDeleteConfirmed}
      />

      <ConfirmDialog
        isOpen={pendingAction?.type === 'archive'}
        title="Archive webhook"
        description="Archived webhooks are hidden from the active list but kept in local developer storage."
        confirmLabel="Archive"
        onCancel={() => setPendingAction(null)}
        onConfirm={handleArchiveConfirmed}
      />
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
