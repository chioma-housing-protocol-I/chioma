'use client';

import { useEffect, useState } from 'react';
import {
  AVAILABLE_WEBHOOK_EVENTS,
  buildPayloadExample,
  type DeveloperWebhook,
} from '@/lib/developer-webhooks';

type WebhookTestProps = {
  webhook: DeveloperWebhook;
  loading?: boolean;
  onSendTest: (event: string, payload: string) => Promise<void> | void;
};

export function WebhookTest({
  webhook,
  loading = false,
  onSendTest,
}: WebhookTestProps) {
  const [eventName, setEventName] = useState(
    webhook.events[0] ?? AVAILABLE_WEBHOOK_EVENTS[0],
  );
  const [payload, setPayload] = useState(buildPayloadExample(eventName));

  useEffect(() => {
    const nextEvent = webhook.events[0] ?? AVAILABLE_WEBHOOK_EVENTS[0];
    setEventName(nextEvent);
    setPayload(buildPayloadExample(nextEvent));
  }, [webhook.id, webhook.events]);

  useEffect(() => {
    setPayload(buildPayloadExample(eventName));
  }, [eventName]);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Test delivery</h2>
          <p className="mt-1 text-sm text-slate-300">
            Send a sample event, verify your receiver, and inspect payload examples.
          </p>
        </div>
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-xs text-cyan-100">
          Signing key: <span className="font-mono">{webhook.signingSecret}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-white">
                Event
              </label>
              <select
                value={eventName}
                onChange={(event) => setEventName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/45 px-4 py-2.5 text-sm text-white outline-none transition focus:border-blue-400"
              >
                {[...new Set([...webhook.events, ...AVAILABLE_WEBHOOK_EVENTS])].map(
                  (event) => (
                    <option key={event} value={event}>
                      {event}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-white">
                Endpoint
              </label>
              <div className="mt-2 rounded-xl border border-white/10 bg-slate-950/45 px-4 py-2.5 text-sm text-slate-200">
                {webhook.method} {webhook.url}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-semibold text-white">
              Payload example
            </label>
            <textarea
              value={payload}
              onChange={(event) => setPayload(event.target.value)}
              rows={12}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 font-mono text-xs text-slate-100 outline-none transition focus:border-blue-400"
            />
          </div>

          <button
            type="button"
            onClick={() => onSendTest(eventName, payload)}
            disabled={loading}
            className="mt-4 inline-flex items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
          >
            {loading ? 'Sending test...' : 'Send test webhook'}
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
            <h3 className="text-sm font-semibold text-white">Available events</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {AVAILABLE_WEBHOOK_EVENTS.map((event) => (
                <span
                  key={event}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200"
                >
                  {event}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
            <h3 className="text-sm font-semibold text-white">cURL example</h3>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950/70 p-3 text-xs text-slate-200">
{`curl -X ${webhook.method} '${webhook.url}' \\
  -H 'Content-Type: application/json' \\
  -H 'X-Chioma-Signature: ${webhook.signingSecret}' \\
  -d '${payload.replace(/\n/g, '')}'`}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
