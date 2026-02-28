/**
 * Notification Service
 * Handles all notification-related API calls
 */

import { apiClient } from '../api-client';
import type { Notification, NotificationFilters } from '@/types/notification';

class NotificationService {
  private readonly baseEndpoint = '/notifications';

  async getNotifications(
    filters?: NotificationFilters,
  ): Promise<Notification[]> {
    const queryParams = new URLSearchParams();

    if (filters?.isRead !== undefined) {
      queryParams.append('isRead', String(filters.isRead));
    }
    if (filters?.type) {
      queryParams.append('type', filters.type);
    }
    if (filters?.startDate) {
      queryParams.append('startDate', filters.startDate);
    }
    if (filters?.endDate) {
      queryParams.append('endDate', filters.endDate);
    }

    const query = queryParams.toString();
    const endpoint = query
      ? `${this.baseEndpoint}?${query}`
      : this.baseEndpoint;

    const response = await apiClient.get<Notification[]>(endpoint);
    return response.data;
  }

  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<{ count: number }>(
      `${this.baseEndpoint}/unread/count`,
    );
    return response.data.count;
  }

  async markAsRead(notificationId: string): Promise<void> {
    await apiClient.patch(`${this.baseEndpoint}/${notificationId}/read`);
  }

  async markAllAsRead(): Promise<void> {
    await apiClient.patch(`${this.baseEndpoint}/read-all`);
  }

  async deleteNotification(notificationId: string): Promise<void> {
    await apiClient.delete(`${this.baseEndpoint}/${notificationId}`);
  }

  async clearAll(): Promise<void> {
    await apiClient.delete(`${this.baseEndpoint}/clear-all`);
  }
}

export const notificationService = new NotificationService();

