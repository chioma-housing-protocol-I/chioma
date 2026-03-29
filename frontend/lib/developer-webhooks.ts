'use client';

import type { User } from '@/store/authStore';

export type WebhookStatus = 'active' | 'inactive' | 'failed';
export type WebhookMethod = 'POST' | 'PUT' | 'PATCH';
export type RetryPolicy = 'standard' | 'aggressive' | 'minimal';
export type AuthType = 'none' | 'api_key' | 'oauth';

export type DeveloperWebhook = {
  id: string;
  ownerId: string;
  label: string;
  url: string;
  events: string[];
  method: WebhookMethod;
  enabled: boolean;
  status: WebhookStatus;
  createdAt: string;
  updatedAt: string;
  lastTriggeredAt?: string;
  timeoutMs: number;
  retryPolicy: RetryPolicy;
  authentication: AuthType;
  authValue?: string;
  signingSecret: string;
  archived: boolean;
  headers: Record<string, string>;
  stats: {
    deliveries: number;
    failedDeliveries: number;
    successRate: number;
  };
};

export type DeveloperWebhookLog = {
  id: string;
  webhookId: string;
  event: string;
  status: 'success' | 'failed' | 'pending';
  attemptedAt: string;
  responseCode: number;
  durationMs: number;
  payload: string;
};

export type DeveloperWebhookFormValues = {
  label: string;
  url: string;
  events: string[];
  method: WebhookMethod;
  headers: Record<string, string>;
  retryPolicy: RetryPolicy;
  timeoutMs: number;
  authentication: AuthType;
  authValue?: string;
};

const WEBHOOKS_STORAGE_KEY = 'chioma_developer_webhooks';
const LOGS_STORAGE_KEY = 'chioma_developer_webhook_logs';

export const AVAILABLE_WEBHOOK_EVENTS = [
  'agreement.created',
  'agreement.signed',
  'agreement.terminated',
  'payment.received',
  'payment.failed',
  'maintenance.created',
  'maintenance.updated',
  'dispute.created',
  'dispute.resolved',
  'property.published',
  'property.updated',
] as const;

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function createSigningSecret() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `whsec_${crypto.randomUUID().replace(/-/g, '')}`;
  }

  return `whsec_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function createMockWebhook(ownerId: string, index: number): DeveloperWebhook {
  const createdAt = new Date(Date.now() - index * 86_400_000).toISOString();
  const lastTriggeredAt =
    index === 2
      ? undefined
      : new Date(Date.now() - index * 14_400_000).toISOString();

  const statuses: WebhookStatus[] = ['active', 'failed', 'inactive'];
  const methods: WebhookMethod[] = ['POST', 'PUT', 'PATCH'];
  const labels = [
    'Payments Collector',
    'Maintenance Sync',
    'Compliance Feed',
  ];
  const urls = [
    'https://integrations.example.com/payments/webhook',
    'https://ops.example.com/maintenance/hooks',
    'https://risk.example.com/compliance/events',
  ];
  const events = [
    ['payment.received', 'payment.failed'],
    ['maintenance.created', 'maintenance.updated'],
    ['agreement.created', 'dispute.created', 'dispute.resolved'],
  ];

  return {
    id: `wh_${ownerId}_${index + 1}`,
    ownerId,
    label: labels[index] ?? `Webhook ${index + 1}`,
    url: urls[index] ?? `https://example.com/webhooks/${index + 1}`,
    events: events[index] ?? ['agreement.created'],
    method: methods[index] ?? 'POST',
    enabled: index !== 2,
    status: statuses[index] ?? 'active',
    createdAt,
    updatedAt: createdAt,
    lastTriggeredAt,
    timeoutMs: 8000 + index * 2000,
    retryPolicy: index === 1 ? 'aggressive' : 'standard',
    authentication: index === 0 ? 'api_key' : 'none',
    authValue: index === 0 ? 'api_key_live_demo' : undefined,
    signingSecret: createSigningSecret(),
    archived: false,
    headers: {
      'X-Chioma-Source': 'developer-portal',
      'X-Webhook-Index': String(index + 1),
    },
    stats: {
      deliveries: 12 + index * 7,
      failedDeliveries: index === 1 ? 3 : index,
      successRate: index === 1 ? 82 : 97 - index * 4,
    },
  };
}

function createMockLogs(webhooks: DeveloperWebhook[]): DeveloperWebhookLog[] {
  return webhooks.flatMap((webhook, webhookIndex) =>
    webhook.events.slice(0, 3).map((event, eventIndex) => ({
      id: `log_${webhook.id}_${eventIndex + 1}`,
      webhookId: webhook.id,
      event,
      status:
        webhookIndex === 1 && eventIndex === 0
          ? 'failed'
          : eventIndex === 2
            ? 'pending'
            : 'success',
      attemptedAt: new Date(
        Date.now() - (webhookIndex * 3 + eventIndex + 1) * 3_600_000,
      ).toISOString(),
      responseCode:
        webhookIndex === 1 && eventIndex === 0
          ? 500
          : eventIndex === 2
            ? 102
            : 200,
      durationMs: 210 + webhookIndex * 110 + eventIndex * 40,
      payload: JSON.stringify(
        {
          event,
          webhookId: webhook.id,
          resourceId: `resource_${eventIndex + 1}`,
          emittedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    })),
  );
}

export function isDeveloperPortalUser(user: User | null | undefined) {
  if (!user) return false;
  if (user.role === 'admin') return true;

  const email = user.email.toLowerCase();
  return email.includes('developer') || email.includes('dev') || email.includes('integration');
}

export function loadDeveloperWebhooks(ownerId: string) {
  const stored = readStorage<DeveloperWebhook[]>(WEBHOOKS_STORAGE_KEY, []);
  const ownerWebhooks = stored.filter((webhook) => webhook.ownerId === ownerId);

  if (ownerWebhooks.length > 0) {
    return ownerWebhooks;
  }

  const seeded = [0, 1, 2].map((index) => createMockWebhook(ownerId, index));
  const merged = [...stored, ...seeded];
  writeStorage(WEBHOOKS_STORAGE_KEY, merged);

  const storedLogs = readStorage<DeveloperWebhookLog[]>(LOGS_STORAGE_KEY, []);
  if (!storedLogs.some((log) => log.webhookId.startsWith(`wh_${ownerId}_`))) {
    writeStorage(LOGS_STORAGE_KEY, [...storedLogs, ...createMockLogs(seeded)]);
  }

  return seeded;
}

export function saveDeveloperWebhooks(webhooks: DeveloperWebhook[]) {
  const stored = readStorage<DeveloperWebhook[]>(WEBHOOKS_STORAGE_KEY, []);
  const ownerIds = new Set(webhooks.map((webhook) => webhook.ownerId));
  const preserved = stored.filter((webhook) => !ownerIds.has(webhook.ownerId));
  writeStorage(WEBHOOKS_STORAGE_KEY, [...preserved, ...webhooks]);
}

export function loadDeveloperWebhookLogs() {
  return readStorage<DeveloperWebhookLog[]>(LOGS_STORAGE_KEY, []);
}

export function saveDeveloperWebhookLogs(logs: DeveloperWebhookLog[]) {
  writeStorage(LOGS_STORAGE_KEY, logs);
}

export function createWebhookRecord(
  ownerId: string,
  values: DeveloperWebhookFormValues,
): DeveloperWebhook {
  const now = new Date().toISOString();

  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? `wh_${crypto.randomUUID()}`
        : `wh_${Date.now()}`,
    ownerId,
    label: values.label,
    url: values.url,
    events: values.events,
    method: values.method,
    enabled: true,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    timeoutMs: values.timeoutMs,
    retryPolicy: values.retryPolicy,
    authentication: values.authentication,
    authValue: values.authValue,
    signingSecret: createSigningSecret(),
    archived: false,
    headers: values.headers,
    stats: {
      deliveries: 0,
      failedDeliveries: 0,
      successRate: 100,
    },
  };
}

export function createWebhookLog(
  webhook: DeveloperWebhook,
  event: string,
  status: DeveloperWebhookLog['status'],
  payload: string,
): DeveloperWebhookLog {
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? `log_${crypto.randomUUID()}`
        : `log_${Date.now()}`,
    webhookId: webhook.id,
    event,
    status,
    attemptedAt: new Date().toISOString(),
    responseCode: status === 'failed' ? 500 : status === 'pending' ? 102 : 200,
    durationMs: status === 'failed' ? 840 : 180,
    payload,
  };
}

export function buildPayloadExample(event: string) {
  return JSON.stringify(
    {
      event,
      id: `evt_${event.replace(/\W+/g, '_')}`,
      data: {
        resourceId: 'sample_resource_123',
        status: 'updated',
        occurredAt: new Date().toISOString(),
      },
    },
    null,
    2,
  );
}
