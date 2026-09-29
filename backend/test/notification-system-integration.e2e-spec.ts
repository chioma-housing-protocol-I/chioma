import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { Notification } from '../src/modules/notifications/entities/notification.entity';
import {
  UserNotificationPreference,
  DEFAULT_NOTIFICATION_PREFERENCES,
  UserPreferences,
} from '../src/modules/users/entities/user-notification-preference.entity';
import { NotificationsRealtimeService } from '../src/modules/notifications/notifications-realtime.service';

describe('Notification System Integration (e2e)', () => {
  let service: NotificationsService;

  const mockNotificationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockPreferenceRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockRealtimeService: Partial<NotificationsRealtimeService> = {
    emitToUser: jest.fn(),
  };

  const userId = 'user-uuid-1';

  const baseNotification: Notification = {
    id: 'notif-uuid-1',
    userId,
    title: 'Rent Due',
    message: 'Your rent payment is due in 3 days.',
    type: 'PAYMENT_REMINDER',
    isRead: false,
    createdAt: new Date(),
    user: null as any,
  };

  const defaultPreference: UserNotificationPreference = {
    id: 'pref-uuid-1',
    userId,
    preferences: DEFAULT_NOTIFICATION_PREFERENCES,
  } as UserNotificationPreference;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepository,
        },
        {
          provide: getRepositoryToken(UserNotificationPreference),
          useValue: mockPreferenceRepository,
        },
        {
          provide: NotificationsRealtimeService,
          useValue: mockRealtimeService,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  describe('Notification Creation and Queuing', () => {
    it('creates and saves a notification for a user', async () => {
      mockNotificationRepository.create.mockReturnValue(baseNotification);
      mockNotificationRepository.save.mockResolvedValue(baseNotification);
      mockPreferenceRepository.findOne.mockResolvedValue(defaultPreference);

      const result = await service.notify(
        userId,
        'Rent Due',
        'Payment due soon',
        'PAYMENT_REMINDER',
      );

      expect(mockNotificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId, title: 'Rent Due' }),
      );
      expect(mockNotificationRepository.save).toHaveBeenCalledTimes(1);
      expect(result.id).toBe(baseNotification.id);
    });

    it('emits realtime notification when inAppSummary is enabled', async () => {
      mockNotificationRepository.create.mockReturnValue(baseNotification);
      mockNotificationRepository.save.mockResolvedValue(baseNotification);
      mockPreferenceRepository.findOne.mockResolvedValue(defaultPreference);

      await service.notify(
        userId,
        'Rent Due',
        'Payment due soon',
        'PAYMENT_REMINDER',
      );

      expect(mockRealtimeService.emitToUser).toHaveBeenCalledWith(
        userId,
        baseNotification,
      );
    });

    it('does not emit realtime when inAppSummary is disabled', async () => {
      const disabledPrefs: UserPreferences = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        notifications: {
          ...DEFAULT_NOTIFICATION_PREFERENCES.notifications,
          inAppSummary: false,
        },
      };

      mockNotificationRepository.create.mockReturnValue(baseNotification);
      mockNotificationRepository.save.mockResolvedValue(baseNotification);
      mockPreferenceRepository.findOne.mockResolvedValue({
        ...defaultPreference,
        preferences: disabledPrefs,
      });

      await service.notify(
        userId,
        'Rent Due',
        'Payment due soon',
        'PAYMENT_REMINDER',
      );

      expect(mockRealtimeService.emitToUser).not.toHaveBeenCalled();
    });

    it('falls back to default preferences when user has no saved preferences', async () => {
      mockNotificationRepository.create.mockReturnValue(baseNotification);
      mockNotificationRepository.save.mockResolvedValue(baseNotification);
      mockPreferenceRepository.findOne.mockResolvedValue(null);

      await service.notify(
        userId,
        'Alert',
        'Critical alert',
        'PAYMENT_RECEIVED',
      );

      expect(mockRealtimeService.emitToUser).toHaveBeenCalledWith(
        userId,
        baseNotification,
      );
    });
  });

  describe('In-App Notification Storage and Retrieval', () => {
    it('retrieves all notifications for a user in descending order', async () => {
      const notifications = [
        { ...baseNotification, id: 'n-2', createdAt: new Date() },
        {
          ...baseNotification,
          id: 'n-1',
          createdAt: new Date(Date.now() - 1000),
        },
      ];

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(notifications),
      };
      mockNotificationRepository.createQueryBuilder.mockReturnValue(
        queryBuilder,
      );

      const result = await service.getUserNotifications(userId);

      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'notification.createdAt',
        'DESC',
      );
      expect(result).toHaveLength(2);
    });

    it('filters notifications by read status', async () => {
      const unread = [{ ...baseNotification, isRead: false }];

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(unread),
      };
      mockNotificationRepository.createQueryBuilder.mockReturnValue(
        queryBuilder,
      );

      const result = await service.getUserNotifications(userId, {
        isRead: false,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'notification.isRead = :isRead',
        { isRead: false },
      );
      expect(result).toHaveLength(1);
      expect(result[0].isRead).toBe(false);
    });

    it('filters notifications by type', async () => {
      const paymentNotifs = [baseNotification];

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(paymentNotifs),
      };
      mockNotificationRepository.createQueryBuilder.mockReturnValue(
        queryBuilder,
      );

      const result = await service.getUserNotifications(userId, {
        type: 'PAYMENT_REMINDER',
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'notification.type = :type',
        { type: 'PAYMENT_REMINDER' },
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('Unread Count and Mark as Read', () => {
    it('returns correct unread notification count', async () => {
      mockNotificationRepository.count.mockResolvedValue(5);

      const count = await service.getUnreadCount(userId);

      expect(mockNotificationRepository.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId, isRead: false }),
        }),
      );
      expect(count).toBe(5);
    });

    it('marks a notification as read', async () => {
      const read = { ...baseNotification, isRead: true };
      mockNotificationRepository.findOne.mockResolvedValue(read);

      const result = await service.markAsRead(baseNotification.id, userId);

      expect(result).toBeDefined();
    });

    it('marks all notifications as read for a user', async () => {
      mockNotificationRepository.update.mockResolvedValue({ affected: 3 });

      await service.markAllAsRead(userId);

      expect(mockNotificationRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ userId }),
        expect.objectContaining({ isRead: true }),
      );
    });
  });

  describe('Notification Preferences and Opt-Out', () => {
    it('respects per-type opt-out from preferences', async () => {
      const noEmailPrefs: UserPreferences = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        notifications: {
          ...DEFAULT_NOTIFICATION_PREFERENCES.notifications,
          inAppSummary: false,
        },
      };

      mockNotificationRepository.create.mockReturnValue(baseNotification);
      mockNotificationRepository.save.mockResolvedValue(baseNotification);
      mockPreferenceRepository.findOne.mockResolvedValue({
        ...defaultPreference,
        preferences: noEmailPrefs,
      });

      await service.notify(
        userId,
        'Match',
        'New property match',
        'PAYMENT_REMINDER',
      );

      expect(mockRealtimeService.emitToUser).not.toHaveBeenCalled();
    });

    it('always saves the notification record regardless of realtime delivery', async () => {
      const disabledPrefs: UserPreferences = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        notifications: {
          ...DEFAULT_NOTIFICATION_PREFERENCES.notifications,
          inAppSummary: false,
        },
      };

      mockNotificationRepository.create.mockReturnValue(baseNotification);
      mockNotificationRepository.save.mockResolvedValue(baseNotification);
      mockPreferenceRepository.findOne.mockResolvedValue({
        ...defaultPreference,
        preferences: disabledPrefs,
      });

      await service.notify(userId, 'Test', 'Test message', 'PAYMENT_REMINDER');

      expect(mockNotificationRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('Notification Deletion', () => {
    it('deletes a specific notification for a user', async () => {
      mockNotificationRepository.delete.mockResolvedValue({ affected: 1 });

      await service.deleteNotification(baseNotification.id, userId);

      expect(mockNotificationRepository.delete).toHaveBeenCalledWith(
        expect.objectContaining({ id: baseNotification.id, userId }),
      );
    });
  });
});
