import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  UserNotificationPreference,
} from '../users/entities/user-notification-preference.entity';
import { MaxRetriesExceededError } from '../../common/errors/retry-errors';
import { AuditAction } from '../audit/entities/audit-log.entity';

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

  const userRepo = {
    findOne: jest.fn(),
  };

  const preferenceRepo = {
    findOne: jest.fn(),
  };

  const emailService = {
    sendNotificationEmail: jest.fn().mockResolvedValue(undefined),
  };

  const i18nService = {
    resolveLanguage: jest.fn().mockReturnValue('en'),
  };

  const realtimeService = {
    emitToUser: jest.fn(),
  };

  const errorNotificationService = {
    notifyAlert: jest.fn().mockResolvedValue(undefined),
  };

  // Executes fn immediately (no real delay/backoff) so tests stay fast,
  // while still exercising the retry-then-give-up contract: retries on
  // failure up to maxAttempts, then throws MaxRetriesExceededError.
  const retryService = {
    execute: jest.fn(async (fn: () => Promise<unknown>, options: any) => {
      const maxAttempts = options?.maxAttempts ?? 1;
      let lastError: Error = new Error('Unknown error');
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await fn();
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
        }
      }
      throw new MaxRetriesExceededError(maxAttempts, lastError);
    }),
  };

  const auditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  let service: NotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationsService(
      notificationRepo as any,
      userRepo as any,
      preferenceRepo as any,
      emailService as any,
      i18nService as any,
      realtimeService as any,
      errorNotificationService as any,
      retryService as any,
      auditService as any,
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

  it('retries the persist channel on failure using its configured policy', async () => {
    const saved = { id: 'n-7', userId: 'user-7' } as Notification;
    notificationRepo.create.mockReturnValue({});
    notificationRepo.save
      .mockRejectedValueOnce(new Error('transient db error'))
      .mockResolvedValueOnce(saved);
    preferenceRepo.findOne.mockResolvedValue(null);

    const result = await service.notify(
      'user-7',
      'Payment received',
      'Done',
      'PAYMENT_RECEIVED',
    );

    expect(result).toEqual(saved);
    expect(notificationRepo.save).toHaveBeenCalledTimes(2);
    expect(retryService.execute).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ maxAttempts: 3 }),
      'NotificationsService:persist',
    );
  });

  it('exhausts retries, dead-letters the payload, alerts, and rethrows when persisting fails', async () => {
    notificationRepo.create.mockReturnValue({});
    notificationRepo.save.mockRejectedValue(new Error('db down'));

    await expect(
      service.notify('user-6', 'Payment received', 'Done', 'PAYMENT_RECEIVED'),
    ).rejects.toThrow('db down');

    // Exhausted the persist channel's configured 3 attempts.
    expect(notificationRepo.save).toHaveBeenCalledTimes(3);

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.NOTIFICATION_DELIVERY_FAILED,
        entityType: 'Notification',
        entityId: 'user-6',
        metadata: expect.objectContaining({
          channel: 'persist',
          attempts: 3,
          payload: expect.objectContaining({ userId: 'user-6' }),
        }),
      }),
    );

    expect(errorNotificationService.notifyAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        labels: expect.objectContaining({
          alertname: 'NotificationDeliveryFailed',
        }),
      }),
      expect.anything(),
    );
  });

  it('dead-letters an exhausted realtime emit without failing the overall notify() call', async () => {
    const saved = { id: 'n-8', userId: 'user-8' } as Notification;
    notificationRepo.create.mockReturnValue({});
    notificationRepo.save.mockResolvedValue(saved);
    preferenceRepo.findOne.mockResolvedValue({
      userId: 'user-8',
      preferences: DEFAULT_NOTIFICATION_PREFERENCES,
    } as UserNotificationPreference);
    realtimeService.emitToUser.mockImplementation(() => {
      throw new Error('socket server unavailable');
    });

    const result = await service.notify(
      'user-8',
      'Payment received',
      'Done',
      'PAYMENT_RECEIVED',
    );

    // The overall notification succeeds — it already persisted — even
    // though the best-effort realtime channel exhausted its retries.
    expect(result).toEqual(saved);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.NOTIFICATION_DELIVERY_FAILED,
        metadata: expect.objectContaining({ channel: 'realtime' }),
      }),
    );
    expect(retryService.execute).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ maxAttempts: 2 }),
      'NotificationsService:realtime',
    );
    // The realtime failure is swallowed, not escalated via the same
    // "delivery failed" alert used for the persist channel.
    expect(errorNotificationService.notifyAlert).not.toHaveBeenCalled();
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

  describe('sendEmailNotification', () => {
    it("localizes the email to the user's stored preferredLanguage", async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'user-9',
        email: 'user9@example.com',
        preferredLanguage: 'fr',
      });
      i18nService.resolveLanguage.mockReturnValue('fr');

      await service.sendEmailNotification('user-9', 'Sujet', 'tmpl', {
        message: 'Bonjour',
      });

      // No per-request lang exists here, so the stored preference is the
      // fallback passed to resolveLanguage.
      expect(i18nService.resolveLanguage).toHaveBeenCalledWith(undefined, 'fr');
      expect(emailService.sendNotificationEmail).toHaveBeenCalledWith(
        'user9@example.com',
        'Sujet',
        'tmpl',
        { message: 'Bonjour' },
        'fr',
      );
    });

    it('skips sending when the user has no email on file', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'user-10',
        email: null,
        preferredLanguage: 'en',
      });

      await service.sendEmailNotification('user-10', 'Subject', 'tmpl', {});

      expect(emailService.sendNotificationEmail).not.toHaveBeenCalled();
    });
  });
});
