/**
 * Notification Types
 * Matches backend notification entity structure
 */

export interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  type: string;
  createdAt: string;
  user?: {
    id: string;
    name?: string;
  };
}

export type NotificationType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'payment'
  | 'maintenance'
  | 'agreement'
  | 'dispute'
  | 'message';

export interface CreateNotificationDto {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
}

export interface NotificationFilters {
  isRead?: boolean;
  type?: NotificationType;
  startDate?: string;
  endDate?: string;
}
