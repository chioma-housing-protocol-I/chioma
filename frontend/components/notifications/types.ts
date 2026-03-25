// ─── Notification Types ──────────────────────────────────────────────────────

export type NotificationType = 'message' | 'maintenance' | 'payment';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string; // ISO 8601
  link?: string; // optional deep-link
}
