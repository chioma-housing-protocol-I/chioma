/**
 * Mock implementation of NotificationsService for testing
 * Simulates notification delivery
 */

export const mockNotificationsService = {
  notify: jest.fn(async (params: any) => ({
    notificationId: `notif-${Date.now()}`,
    userId: params.userId,
    type: params.type,
    status: 'sent',
    timestamp: new Date(),
  })),

  sendEmail: jest.fn(async (params: any) => ({
    emailId: `email-${Date.now()}`,
    to: params.to,
    subject: params.subject,
    status: 'sent',
    timestamp: new Date(),
  })),

  sendSMS: jest.fn(async (params: any) => ({
    smsId: `sms-${Date.now()}`,
    to: params.to,
    message: params.message,
    status: 'sent',
    timestamp: new Date(),
  })),

  sendPushNotification: jest.fn(async (params: any) => ({
    pushId: `push-${Date.now()}`,
    userId: params.userId,
    title: params.title,
    body: params.body,
    status: 'sent',
    timestamp: new Date(),
  })),

  getNotificationStatus: jest.fn(async (notificationId: string) => ({
    notificationId,
    status: 'delivered',
    deliveredAt: new Date(),
  })),

  retryNotification: jest.fn(async (notificationId: string) => ({
    notificationId,
    status: 'sent',
    retryCount: 1,
    timestamp: new Date(),
  })),

  bulkNotify: jest.fn(async (params: any) => ({
    batchId: `batch-${Date.now()}`,
    totalCount: params.recipients.length,
    sentCount: params.recipients.length,
    failedCount: 0,
    status: 'completed',
  })),

  getNotificationHistory: jest.fn(async (userId: string) => ({
    userId,
    notifications: [
      {
        id: `notif-1`,
        type: 'payment',
        status: 'delivered',
        timestamp: new Date(),
      },
    ],
    total: 1,
  })),
};
