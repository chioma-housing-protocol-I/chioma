// backend/src/types/webhook.types.ts

import { UUID, ISO8601DateTime } from './common.types';

export type WebhookEvent =
  | 'payment.received'
  | 'payment.failed'
  | 'deposit.received'
  | 'deposit.released'
  | 'agreement.activated'
  | 'agreement.expired'
  | 'dispute.created'
  | 'transaction.indexed'
  | 'screening.completed'
  | 'screening.failed';

export interface WebhookEndpoint {
  id: UUID;
  userId: UUID;
  url: string;
  events: WebhookEvent[];
  secret: string;
  active: boolean;
  createdAt: ISO8601DateTime;
  updatedAt: ISO8601DateTime;
}

export interface WebhookDelivery {
  id: UUID;
  endpointId: UUID;
  event: WebhookEvent;
  payload: Record<string, any>;
  responseStatus?: number;
  responseBody?: string;
  successful: boolean;
  attemptCount: number;
  nextRetryAt?: ISO8601DateTime;
  createdAt: ISO8601DateTime;
  deliveredAt?: ISO8601DateTime;
}
