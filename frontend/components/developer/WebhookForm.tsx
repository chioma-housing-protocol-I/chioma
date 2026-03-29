'use client';

import { useEffect, useState } from 'react';
import { BaseModal } from '@/components/modals/BaseModal';
import {
  AVAILABLE_WEBHOOK_EVENTS,
  type AuthType,
  type DeveloperWebhook,
  type DeveloperWebhookFormValues,
  type RetryPolicy,
  type WebhookMethod,
} from '@/lib/developer-webhooks';

type WebhookFormProps = {
  isOpen: boolean;
  webhook?: DeveloperWebhook | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (values: DeveloperWebhookFormValues) => Promise<void> | void;
};

function headersToText(headers: Record<string, string>) {
  return Object.entries(headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
}

function parseHeaders(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((accumulator, line) => {
      const separatorIndex = line.indexOf(':');
      if (separatorIndex <= 0) return accumulator;
      const key = line.slice(0, separatorIndex).trim();
      const headerValue = line.slice(separatorIndex + 1).trim();
      if (key && headerValue) accumulator[key] = headerValue;
      return accumulator;
    }, {});
}

export function WebhookForm({
  isOpen,
  webhook,
  loading = false,
  onClose,
  onSubmit,
}: WebhookFormProps) {
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState<WebhookMethod>('POST');
  const [events, setEvents] = useState<string[]>([]);
  const [headersText, setHeadersText] = useState('');
  const [retryPolicy, setRetryPolicy] = useState<RetryPolicy>('standard');
  const [timeoutMs, setTimeoutMs] = useState(10000);
  const [authentication, setAuthentication] = useState<AuthType>('none');
  const [authValue, setAuthValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!webhook) {
      setLabel('');
      setUrl('');
      setMethod('POST');
      setEvents([]);
      setHeadersText('');
      setRetryPolicy('standard');
      setTimeoutMs(10000);
      setAuthentication('none');
      setAuthValue('');
      setError(null);
      return;
    }

    setLabel(webhook.label);
    setUrl(webhook.url);
    setMethod(webhook.method);
    setEvents(webhook.events);
    setHeadersText(headersToText(webhook.headers));
    setRetryPolicy(webhook.retryPolicy);
    setTimeoutMs(webhook.timeoutMs);
    setAuthentication(webhook.authentication);
    setAuthValue(webhook.authValue ?? '');
    setError(null);
  }, [webhook, isOpen]);

  const toggleEvent = (event: string) => {
    setEvents((current) =>
      current.includes(event)
        ? current.filter((item) => item !== event)
        : [...current, event],
    );
  };

  const handleSave = async () => {
    if (!label.trim()) {
      setError('Webhook name is required.');
      return;
    }

    if (!/^https?:\/\/.+/.test(url.trim())) {
      setError('Webhook URL must start with http:// or https://.');
      return;
    }

    if (events.length === 0) {
      setError('Select at least one event subscription.');
      return;
    }

    setError(null);
    await onSubmit({
      label: label.trim(),
      url: url.trim(),
      events,
      method,
      headers: parseHeaders(headersText),
      retryPolicy,
      timeoutMs,
      authentication,
      authValue: authValue.trim() || undefined,
    });
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={webhook ? 'Edit webhook' : 'Create webhook'}
      subtitle="Configure delivery settings, subscribed events, and authentication."
      size="lg"
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? 'Saving...' : webhook ? 'Save changes' : 'Create webhook'}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-neutral-900">
              Webhook name
            </label>
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Payments collector"
              className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-neutral-900">
              HTTP method
            </label>
            <select
              value={method}
              onChange={(event) => setMethod(event.target.value as WebhookMethod)}
              className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-blue-500"
            >
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-neutral-900">
            Endpoint URL
          </label>
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com/webhooks/chioma"
            className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-neutral-900">
            Events
          </label>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {AVAILABLE_WEBHOOK_EVENTS.map((event) => (
              <label
                key={event}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-sm transition ${
                  events.includes(event)
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={events.includes(event)}
                  onChange={() => toggleEvent(event)}
                  className="accent-blue-600"
                />
                <span>{event}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-semibold text-neutral-900">
              Retry policy
            </label>
            <select
              value={retryPolicy}
              onChange={(event) =>
                setRetryPolicy(event.target.value as RetryPolicy)
              }
              className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-blue-500"
            >
              <option value="standard">Standard</option>
              <option value="aggressive">Aggressive</option>
              <option value="minimal">Minimal</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-neutral-900">
              Timeout
            </label>
            <input
              type="number"
              min={1000}
              step={1000}
              value={timeoutMs}
              onChange={(event) => setTimeoutMs(Number(event.target.value))}
              className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-neutral-900">
              Authentication
            </label>
            <select
              value={authentication}
              onChange={(event) =>
                setAuthentication(event.target.value as AuthType)
              }
              className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-blue-500"
            >
              <option value="none">None</option>
              <option value="api_key">API key</option>
              <option value="oauth">OAuth token</option>
            </select>
          </div>
        </div>

        {authentication !== 'none' ? (
          <div>
            <label className="block text-sm font-semibold text-neutral-900">
              Authentication value
            </label>
            <input
              value={authValue}
              onChange={(event) => setAuthValue(event.target.value)}
              placeholder={
                authentication === 'api_key'
                  ? 'sk_live_123'
                  : 'Bearer access_token'
              }
              className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-blue-500"
            />
          </div>
        ) : null}

        <div>
          <label className="block text-sm font-semibold text-neutral-900">
            Custom headers
          </label>
          <textarea
            value={headersText}
            onChange={(event) => setHeadersText(event.target.value)}
            rows={4}
            placeholder={'X-Webhook-Source: chioma\nX-Client: developer-portal'}
            className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-2.5 font-mono text-sm text-neutral-900 outline-none transition focus:border-blue-500"
          />
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
      </div>
    </BaseModal>
  );
}
