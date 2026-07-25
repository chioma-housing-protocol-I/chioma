import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  UserNotificationPreference,
} from '../users/entities/user-notification-preference.entity';

describe('NotificationsService', () => {
  const notificationRepo = {
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
    count: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const preferenceRepo = {
    findOne: jest.fn(),
  };

  const realtimeService = {
    emitToUser: jest.fn(),
  };

  let service: NotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationsService(
      notificationRepo as any,
      preferenceRepo as any,
      realtimeService as any,
    );
  });

  it('emits realtime when preferences allow in-app notification', async () => {
    const created: Partial<Notification> = {
      userId: 'user-1',
      title: 'hello',
      message: 'world',
      type: 'PAYMENT_RECEIVED',
      isRead: false,
      createdAt: new Date(),
    };

    const saved = { id: 'n-1', ...created } as Notification;

    notificationRepo.create.mockReturnValue(created);
    notificationRepo.save.mockResolvedValue(saved);
    preferenceRepo.findOne.mockResolvedValue({
      userId: 'user-1',
      preferences: DEFAULT_NOTIFICATION_PREFERENCES,
    } as UserNotificationPreference);

    const result = await service.notify(
      'user-1',
      'Payment received',
      'Done',
      'PAYMENT_RECEIVED',
    );

    expect(result).toEqual(saved);
    expect(realtimeService.emitToUser).toHaveBeenCalledWith('user-1', saved);
  });

  it('does not emit realtime when in-app summary is disabled', async () => {
    const created: Partial<Notification> = {
      userId: 'user-1',
      title: 'hello',
      message: 'world',
      type: 'PAYMENT_RECEIVED',
      isRead: false,
      createdAt: new Date(),
    };

    const saved = { id: 'n-1', ...created } as Notification;

    notificationRepo.create.mockReturnValue(created);
    notificationRepo.save.mockResolvedValue(saved);
    preferenceRepo.findOne.mockResolvedValue({
      userId: 'user-1',
      preferences: {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        notifications: {
          ...DEFAULT_NOTIFICATION_PREFERENCES.notifications,
          inAppSummary: false,
        },
      },
    } as UserNotificationPreference);

    await service.notify(
      'user-1',
      'Payment received',
      'Done',
      'PAYMENT_RECEIVED',
    );

    expect(realtimeService.emitToUser).not.toHaveBeenCalled();
  });

  it('falls back to defaults when user preferences are missing', async () => {
    const created: Partial<Notification> = {
      userId: 'user-2',
      title: 'Maintenance',
      message: 'Update',
      type: 'MAINTENANCE_UPDATE',
      isRead: false,
      createdAt: new Date(),
    };
    const saved = { id: 'n-2', ...created } as Notification;
    notificationRepo.create.mockReturnValue(created);
    notificationRepo.save.mockResolvedValue(saved);
    preferenceRepo.findOne.mockResolvedValue(null);

    await service.notify(
      'user-2',
      'Maintenance',
      'Update',
      'MAINTENANCE_UPDATE',
    );

    expect(realtimeService.emitToUser).toHaveBeenCalledWith('user-2', saved);
  });

  it('blocks message realtime notifications when push.newMessages is disabled', async () => {
    const created: Partial<Notification> = {
      userId: 'user-3',
      title: 'New message',
      message: 'hello',
      type: 'NEW_MESSAGE',
      isRead: false,
      createdAt: new Date(),
    };
    const saved = { id: 'n-3', ...created } as Notification;
    notificationRepo.create.mockReturnValue(created);
    notificationRepo.save.mockResolvedValue(saved);
    preferenceRepo.findOne.mockResolvedValue({
      userId: 'user-3',
      preferences: {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        notifications: {
          ...DEFAULT_NOTIFICATION_PREFERENCES.notifications,
          push: {
            ...DEFAULT_NOTIFICATION_PREFERENCES.notifications.push,
            newMessages: false,
          },
        },
      },
    } as UserNotificationPreference);

    await service.notify('user-3', 'New message', 'hello', 'NEW_MESSAGE');
    expect(realtimeService.emitToUser).not.toHaveBeenCalled();
  });

  it('marks all unread notifications as read', async () => {
    await service.markAllAsRead('user-4');
    expect(notificationRepo.update).toHaveBeenCalledWith(
      { userId: 'user-4', isRead: false },
      { isRead: true },
    );
  });

  it('throws for missing notification on markAsRead', async () => {
    notificationRepo.findOne.mockResolvedValue(null);
    await expect(service.markAsRead('missing', 'user-5')).rejects.toThrow(
      'Notification not found',
    );
  });
});
