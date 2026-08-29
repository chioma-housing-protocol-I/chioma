// backend/src/types/notification.types.ts

import { UUID, ISO8601DateTime } from './common.types';

export type NotificationType =
  | 'rent_due_reminder'
  | 'rent_payment_received'
  | 'rent_payment_late'
  | 'deposit_received'
  | 'deposit_released'
  | 'agreement_signed'
  | 'agreement_expiring'
  | 'maintenance_request'
  | 'dispute_opened'
  | 'dispute_resolved'
  | 'message_received'
  | 'low_balance_warning'
  | 'transaction_failed'
  | 'saved_search_match';

export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Notification {
  id: UUID;
  userId: UUID;

  // Notification details
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;

  // Delivery
  channels: NotificationChannel[];
  sentVia: NotificationChannel[];

  // Status
  read: boolean;
  readAt?: ISO8601DateTime;

  // References
  relatedEntityType?:
    | 'property'
    | 'agreement'
    | 'payment'
    | 'dispute'
    | 'transaction';
  relatedEntityId?: UUID;

  // Actions
  actionUrl?: string;
  actionLabel?: string;

  // Metadata
  metadata: Record<string, any>;

  createdAt: ISO8601DateTime;
  expiresAt?: ISO8601DateTime;
}
