/**
 * Integration tests: property alerts via notification preferences (issue)
 * Covers enabling/disabling new-property-match alerts, toggling push alerts,
 * critical-alert delivery gating, and preference persistence across reloads.
 */
process.env.NODE_ENV = 'test';

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { Notification } from '../src/modules/notifications/entities/notification.entity';
import {
  UserNotificationPreference,
  DEFAULT_NOTIFICATION_PREFERENCES,
  UserPreferences,
} from '../src/modules/users/entities/user-notification-preference.entity';
import { UsersService } from '../src/modules/users/users.service';
import { User } from '../src/modules/users/entities/user.entity';
import { NotificationsRealtimeService } from '../src/modules/notifications/notifications-realtime.service';
import { AuditService } from '../src/modules/audit/audit.service';

// ─── Shared mock registries ───────────────────────────────────────────────────

const mockNotificationRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockPreferenceRepo = {
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
};

const mockUserRepo = {
  findOne: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

const mockRealtimeService: Partial<NotificationsRealtimeService> = {
  emitToUser: jest.fn(),
};

const mockAuditService = { log: jest.fn() };

// ─── Test fixtures ────────────────────────────────────────────────────────────

const USER_ID = 'user-alerts-001';

const baseNotification: Notification = {
  id: 'notif-alerts-001',
  userId: USER_ID,
  title: 'New Property Match',
  message: 'A property matching your criteria is now available.',
  type: 'NEW_PROPERTY_MATCH',
  isRead: false,
  createdAt: new Date(),
  user: null as any,
};

const defaultPref: UserNotificationPreference = {
  id: 'pref-alerts-001',
  userId: USER_ID,
  preferences: DEFAULT_NOTIFICATION_PREFERENCES,
} as UserNotificationPreference;

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('Property Alerts Integration', () => {
  let notificationsService: NotificationsService;
  let usersService: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        UsersService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepo,
        },
        {
          provide: getRepositoryToken(UserNotificationPreference),
          useValue: mockPreferenceRepo,
        },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        {
          provide: NotificationsRealtimeService,
          useValue: mockRealtimeService,
        },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    notificationsService =
      module.get<NotificationsService>(NotificationsService);
    usersService = module.get<UsersService>(UsersService);
  });

  // ── 1. Alert delivered when newPropertyMatches is enabled ─────────────────

  describe('New-property-match alert delivery', () => {
    it('delivers a realtime alert when newPropertyMatches preference is ON', async () => {
      mockNotificationRepo.create.mockReturnValue(baseNotification);
      mockNotificationRepo.save.mockResolvedValue(baseNotification);
      mockPreferenceRepo.findOne.mockResolvedValue(defaultPref); // newPropertyMatches: true by default

      await notificationsService.notify(
        USER_ID,
        'New Property Match',
        'A property matching your criteria is available.',
        'NEW_PROPERTY_MATCH',
      );

      expect(mockNotificationRepo.save).toHaveBeenCalledTimes(1);
      expect(mockRealtimeService.emitToUser).toHaveBeenCalledWith(
        USER_ID,
        baseNotification,
      );
    });

    it('saves the alert record even when realtime delivery is disabled', async () => {
      const noRealtimePrefs: UserPreferences = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        notifications: {
          ...DEFAULT_NOTIFICATION_PREFERENCES.notifications,
          inAppSummary: false,
        },
      };

      mockNotificationRepo.create.mockReturnValue(baseNotification);
      mockNotificationRepo.save.mockResolvedValue(baseNotification);
      mockPreferenceRepo.findOne.mockResolvedValue({
        ...defaultPref,
        preferences: noRealtimePrefs,
      });

      const result = await notificationsService.notify(
        USER_ID,
        'New Property Match',
        'A matching property was found.',
        'NEW_PROPERTY_MATCH',
      );

      expect(mockNotificationRepo.save).toHaveBeenCalledTimes(1);
      expect(mockRealtimeService.emitToUser).not.toHaveBeenCalled();
      expect(result.id).toBe(baseNotification.id);
    });
  });

  // ── 2. Preference toggle – disabling alerts ───────────────────────────────

  describe('Toggling newPropertyMatches preference', () => {
    it('updates preference to disable new-property-match emails', async () => {
      const updatedPrefs: UserPreferences = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        notifications: {
          ...DEFAULT_NOTIFICATION_PREFERENCES.notifications,
          email: {
            ...DEFAULT_NOTIFICATION_PREFERENCES.notifications.email,
            newPropertyMatches: false,
          },
        },
      };

      mockUserRepo.findOne.mockResolvedValue({ id: USER_ID });
      mockPreferenceRepo.findOne.mockResolvedValue({
        ...defaultPref,
        preferences: updatedPrefs,
      });
      mockPreferenceRepo.save.mockResolvedValue({
        ...defaultPref,
        preferences: updatedPrefs,
      });

      const result = await usersService.updateNotificationPreferences(
        USER_ID,
        updatedPrefs,
      );

      expect(mockPreferenceRepo.save).toHaveBeenCalledTimes(1);
      expect(result.notifications.email.newPropertyMatches).toBe(false);
    });

    it('re-enables newPropertyMatches and persists the updated value', async () => {
      const reEnabledPrefs: UserPreferences = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        notifications: {
          ...DEFAULT_NOTIFICATION_PREFERENCES.notifications,
          email: {
            ...DEFAULT_NOTIFICATION_PREFERENCES.notifications.email,
            newPropertyMatches: true,
          },
        },
      };

      mockUserRepo.findOne.mockResolvedValue({ id: USER_ID });
      mockPreferenceRepo.findOne.mockResolvedValue({
        ...defaultPref,
        preferences: reEnabledPrefs,
      });
      mockPreferenceRepo.save.mockResolvedValue({
        ...defaultPref,
        preferences: reEnabledPrefs,
      });

      const result = await usersService.updateNotificationPreferences(
        USER_ID,
        reEnabledPrefs,
      );

      expect(result.notifications.email.newPropertyMatches).toBe(true);
    });
  });

  // ── 3. Critical push-alert gating ────────────────────────────────────────

  describe('Critical push-alert gating', () => {
    it('emits a critical alert when push.criticalAlerts is ON', async () => {
      const criticalNotification: Notification = {
        ...baseNotification,
        id: 'notif-critical-001',
        type: 'CRITICAL_ALERT',
        title: 'Critical System Alert',
      };

      mockNotificationRepo.create.mockReturnValue(criticalNotification);
      mockNotificationRepo.save.mockResolvedValue(criticalNotification);
      mockPreferenceRepo.findOne.mockResolvedValue(defaultPref);

      await notificationsService.notify(
        USER_ID,
        'Critical System Alert',
        'Immediate action required.',
        'CRITICAL_ALERT',
      );

      expect(mockRealtimeService.emitToUser).toHaveBeenCalledWith(
        USER_ID,
        criticalNotification,
      );
    });

    it('suppresses realtime delivery when inAppSummary is OFF regardless of type', async () => {
      const inAppOffPrefs: UserPreferences = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        notifications: {
          ...DEFAULT_NOTIFICATION_PREFERENCES.notifications,
          inAppSummary: false,
        },
      };

      const criticalNotification: Notification = {
        ...baseNotification,
        id: 'notif-critical-002',
        type: 'CRITICAL_ALERT',
      };

      mockNotificationRepo.create.mockReturnValue(criticalNotification);
      mockNotificationRepo.save.mockResolvedValue(criticalNotification);
      mockPreferenceRepo.findOne.mockResolvedValue({
        ...defaultPref,
        preferences: inAppOffPrefs,
      });

      await notificationsService.notify(
        USER_ID,
        'Critical Alert',
        'Action required.',
        'CRITICAL_ALERT',
      );

      expect(mockRealtimeService.emitToUser).not.toHaveBeenCalled();
    });
  });

  // ── 4. Default-fallback and preference persistence ────────────────────────

  describe('Default preferences and persistence', () => {
    it('returns default preferences when no record exists for the user', async () => {
      mockUserRepo.findOne.mockResolvedValue({ id: USER_ID });
      mockPreferenceRepo.findOne.mockResolvedValue(null);

      const result = await usersService.getNotificationPreferences(USER_ID);

      expect(result.notifications.email.newPropertyMatches).toBe(true);
      expect(result.notifications.push.criticalAlerts).toBe(true);
      expect(result.notifications.inAppSummary).toBe(true);
      expect(result.appearanceTheme).toBe('system');
    });

    it('persists a new preferences record when one does not already exist', async () => {
      const newPrefs: UserPreferences = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        language: 'fr',
      };

      const createdRecord = {
        id: 'pref-new-001',
        userId: USER_ID,
        preferences: newPrefs,
      };

      mockUserRepo.findOne.mockResolvedValue({ id: USER_ID });
      mockPreferenceRepo.findOne.mockResolvedValue(null);
      mockPreferenceRepo.create.mockReturnValue(createdRecord);
      mockPreferenceRepo.save.mockResolvedValue(createdRecord);

      const result = await usersService.updateNotificationPreferences(
        USER_ID,
        newPrefs,
      );

      expect(mockPreferenceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: USER_ID }),
      );
      expect(mockPreferenceRepo.save).toHaveBeenCalledTimes(1);
      expect(result.language).toBe('fr');
    });
  });
});
