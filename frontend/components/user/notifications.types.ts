'use client';

export type LandlordNotificationType =
  | 'payment'
  | 'maintenance'
  | 'tenant'
  | 'system';

export type NotificationReadFilter = 'all' | 'read' | 'unread';
export type NotificationSortOrder = 'newest' | 'oldest';
export type NotificationFrequency = 'realtime' | 'daily' | 'weekly';

export interface LandlordNotification {
  id: string;
  title: string;
  message: string;
  type: LandlordNotificationType;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationSettingsState {
  channels: {
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
  frequency: NotificationFrequency;
  mutedTypes: LandlordNotificationType[];
}

export const NOTIFICATION_TYPE_LABELS: Record<
  LandlordNotificationType,
  string
> = {
  payment: 'Payment',
  maintenance: 'Maintenance',
  tenant: 'Tenant',
  system: 'System',
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettingsState = {
  channels: {
    email: true,
    sms: false,
    inApp: true,
  },
  frequency: 'realtime',
  mutedTypes: [],
};
