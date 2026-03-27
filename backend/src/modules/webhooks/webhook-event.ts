export const WEBHOOK_EVENTS = [
  'payment.received',
  'payment.failed',
  'deposit.received',
  'deposit.released',
  'agreement.activated',
  'agreement.expired',
  'dispute.created',
  'transaction.indexed',
  'screening.completed',
  'screening.failed',
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];
