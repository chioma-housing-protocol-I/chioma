import { Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bull';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Queue } from 'bull';
import { PropertyCacheWarmingService } from '../../properties/property-cache-warming.service';
import {
  Property,
  ListingStatus,
} from '../../properties/entities/property.entity';
import { CacheService } from '../../../common/cache/cache.service';
import { RentReminderService } from '../../rent/rent-reminder.service';
import {
  RentReminder,
  ReminderStatus,
  ReminderType,
} from '../../rent/entities/rent-reminder.entity';
import { EmailService } from '../../notifications/email.service';
import { QueueMonitoringService } from '../../queues/services/queue-monitoring.service';
import { DeadLetterQueueService } from '../../queues/services/dead-letter-queue.service';
import {
  DEAD_LETTER_JOB_NAME,
  DEAD_LETTER_QUEUE_NAME,
} from '../../queues/queues.constants';
import { SecurityPatchManagementService } from '../../cleanup/security-patch-management.service';

describe('Scheduled Tasks Integration', () => {
  let moduleRef: TestingModule;

  const propertyRepository = {
    find: jest.fn(),
  };
  const cacheService = {
    set: jest.fn().mockResolvedValue(undefined),
  };

  const reminderRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const emailService = {
    sendNotificationEmail: jest.fn(),
  };

  const queueFactory = (counts = {}) =>
    ({
      getJobCounts: jest.fn().mockResolvedValue({
        active: 0,
        waiting: 0,
        delayed: 0,
        failed: 0,
        completed: 0,
        ...counts,
      }),
      isPaused: jest.fn().mockResolvedValue(false),
      getCompleted: jest.fn().mockResolvedValue([]),
      getWaiting: jest.fn().mockResolvedValue([]),
      getFailed: jest.fn().mockResolvedValue([]),
      getJob: jest.fn(),
      add: jest.fn(),
    }) as unknown as Queue;

  const deadLetterQueue = {
    add: jest.fn().mockResolvedValue({ id: 'dlq-1' }),
    getJob: jest.fn(),
    getCompleted: jest.fn().mockResolvedValue([]),
    getWaiting: jest.fn().mockResolvedValue([]),
    getFailed: jest.fn().mockResolvedValue([]),
    getJobCounts: jest.fn().mockResolvedValue({
      waiting: 0,
      failed: 0,
      completed: 0,
    }),
    getJobs: jest.fn().mockResolvedValue([]),
  };
  const workerQueue = {
    add: jest.fn().mockResolvedValue({ id: 'retry-1' }),
  };

  const configService = {
    get: jest.fn((key: string, fallback?: string) => {
      const config: Record<string, string> = {
        DEAD_LETTER_QUEUE_ENABLED: 'true',
        DEAD_LETTER_RETENTION_DAYS: '30',
      };

      return config[key] ?? fallback;
    }),
  };

  beforeEach(async () => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    moduleRef = await Test.createTestingModule({
      providers: [
        PropertyCacheWarmingService,
        RentReminderService,
        QueueMonitoringService,
        DeadLetterQueueService,
        SecurityPatchManagementService,
        { provide: getRepositoryToken(Property), useValue: propertyRepository },
        { provide: CacheService, useValue: cacheService },
        {
          provide: getRepositoryToken(RentReminder),
          useValue: reminderRepository,
        },
        { provide: EmailService, useValue: emailService },
        { provide: getQueueToken('email'), useValue: queueFactory() },
        { provide: getQueueToken('documents'), useValue: queueFactory() },
        { provide: getQueueToken('blockchain'), useValue: queueFactory() },
        { provide: getQueueToken('data-sync'), useValue: queueFactory() },
        {
          provide: getQueueToken(DEAD_LETTER_QUEUE_NAME),
          useValue: deadLetterQueue,
        },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  describe('property cache warming', () => {
    it('warms only published properties and writes cache entries', async () => {
      propertyRepository.find.mockResolvedValue([
        buildProperty({ id: 'prop-1', status: ListingStatus.PUBLISHED }),
        buildProperty({ id: 'prop-2', status: ListingStatus.DRAFT }),
      ]);

      const service = moduleRef.get(PropertyCacheWarmingService);
      await service.warmCache();

      expect(propertyRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: ListingStatus.PUBLISHED },
        }),
      );
      expect(cacheService.set).toHaveBeenCalledTimes(2);
      expect(cacheService.set).toHaveBeenCalledWith(
        'property:prop-1',
        expect.objectContaining({ id: 'prop-1' }),
        expect.any(Number),
        ['property:prop-1'],
      );
      expect(cacheService.set).toHaveBeenCalledWith(
        'property:prop-2',
        expect.objectContaining({ id: 'prop-2' }),
        expect.any(Number),
        ['property:prop-2'],
      );
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Warmed 2 published property cache entries',
      );
    });

    it('skips startup warming in test mode', async () => {
      const service = moduleRef.get(PropertyCacheWarmingService);
      await service.onModuleInit();

      expect(propertyRepository.find).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });
  });

  describe('rent reminder scheduling', () => {
    it('creates reminder jobs across the configured offsets', async () => {
      const dueDate = futureDate(30);
      reminderRepository.create.mockImplementation((value) => ({ ...value }));
      reminderRepository.save.mockImplementation(async (value) => value);

      const service = moduleRef.get(RentReminderService);
      const reminders = await service.createRemindersForAgreement(
        'agreement-1',
        'tenant-1',
        'tenant@example.com',
        dueDate,
        1500,
      );

      expect(reminders).toHaveLength(5);
      expect(reminderRepository.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            agreementId: 'agreement-1',
            tenantId: 'tenant-1',
            tenantEmail: 'tenant@example.com',
            type: ReminderType.EMAIL,
            status: ReminderStatus.PENDING,
            sent: false,
          }),
        ]),
      );
    });

    it('processes due reminders and marks them as sent', async () => {
      const dueReminder = buildReminder({
        id: 'rem-1',
        daysBefore: 1,
        dueDate: futureDate(-1),
      });
      reminderRepository.find.mockResolvedValue([dueReminder]);
      reminderRepository.save.mockImplementation(async (value) => value);
      emailService.sendNotificationEmail.mockResolvedValue(undefined);

      const service = moduleRef.get(RentReminderService);
      const sentCount = await service.processPendingReminders();

      expect(sentCount).toBe(1);
      expect(emailService.sendNotificationEmail).toHaveBeenCalledWith(
        'tenant@example.com',
        expect.stringContaining('Rent Reminder'),
        'rent-reminder',
        expect.objectContaining({
          title: 'Rent Payment Reminder',
        }),
      );
      expect(reminderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'rem-1',
          status: ReminderStatus.SENT,
          sent: true,
        }),
      );
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Sent reminder rem-1 to tenant@example.com',
      );
    });

    it('marks failed reminders and surfaces the failure for monitoring', async () => {
      const dueReminder = buildReminder({
        id: 'rem-2',
        daysBefore: 0,
        dueDate: futureDate(0),
      });
      reminderRepository.find.mockResolvedValue([dueReminder]);
      reminderRepository.save.mockImplementation(async (value) => value);
      emailService.sendNotificationEmail.mockRejectedValue(
        new Error('smtp unavailable'),
      );

      const service = moduleRef.get(RentReminderService);
      const sentCount = await service.processPendingReminders();

      expect(sentCount).toBe(0);
      expect(reminderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'rem-2',
          status: ReminderStatus.FAILED,
          errorMessage: 'smtp unavailable',
        }),
      );
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to send reminder rem-2: smtp unavailable',
      );
    });

    it('cancels an existing reminder', async () => {
      reminderRepository.findOne.mockResolvedValue(
        buildReminder({ id: 'rem-3' }),
      );
      reminderRepository.save.mockImplementation(async (value) => value);

      const service = moduleRef.get(RentReminderService);
      const cancelled = await service.cancelReminder('rem-3');

      expect(cancelled.status).toBe(ReminderStatus.CANCELLED);
      expect(reminderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'rem-3',
          status: ReminderStatus.CANCELLED,
        }),
      );
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Cancelled reminder rem-3',
      );
    });

    it('throws when trying to cancel a missing reminder', async () => {
      reminderRepository.findOne.mockResolvedValue(null);

      const service = moduleRef.get(RentReminderService);
      await expect(service.cancelReminder('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('queue monitoring', () => {
    it('collects queue metrics and keeps the latest entry per queue', async () => {
      const service = moduleRef.get(QueueMonitoringService);
      await service.collectMetrics();

      const current = await service.getCurrentMetrics('email');
      expect(current).toMatchObject({
        queueName: 'email',
        active: 0,
        waiting: 0,
        delayed: 0,
        failed: 0,
        completed: 0,
        paused: false,
      });
    });

    it('marks unhealthy queues when failures are high or paused', async () => {
      const failingModule = await Test.createTestingModule({
        providers: [
          QueueMonitoringService,
          {
            provide: getQueueToken('email'),
            useValue: queueFactory({ failed: 21 }),
          },
          { provide: getQueueToken('documents'), useValue: queueFactory() },
          { provide: getQueueToken('blockchain'), useValue: queueFactory() },
          { provide: getQueueToken('data-sync'), useValue: queueFactory() },
        ],
      }).compile();

      const service = failingModule.get(QueueMonitoringService);
      await service.collectMetrics();

      const health = await service.getQueueHealth();
      expect(health.summary.unhealthyQueues).toContain('email');

      await failingModule.close();
    });
  });

  describe('dead letter handling', () => {
    it('moves exhausted jobs into the dead letter queue', async () => {
      const service = moduleRef.get(DeadLetterQueueService);
      const job = {
        id: 'job-1',
        data: { id: 'payload-1' },
        attemptsMade: 3,
        opts: { attempts: 3 },
        stacktrace: ['boom'],
        remove: jest.fn().mockResolvedValue(undefined),
      };

      await service.moveToDeadLetter('email', job as any, new Error('boom'));

      expect(deadLetterQueue.add).toHaveBeenCalledWith(
        DEAD_LETTER_JOB_NAME,
        expect.objectContaining({
          sourceQueue: 'email',
          originalJobId: 'job-1',
          failedReason: 'boom',
        }),
        expect.objectContaining({ attempts: 1, removeOnComplete: false }),
      );
      expect(job.remove).toHaveBeenCalled();
    });

    it('retries a dead letter job back onto its source queue', async () => {
      deadLetterQueue.getJob.mockResolvedValue({
        id: 'dlq-1',
        data: {
          sourceQueue: 'email',
          originalJobId: 'job-1',
          data: { id: 'payload-1' },
          failedReason: 'boom',
          stacktrace: [],
          attemptsMade: 3,
          maxAttempts: 3,
          failedAt: new Date().toISOString(),
        },
        remove: jest.fn().mockResolvedValue(undefined),
      });

      const service = moduleRef.get(DeadLetterQueueService);
      jest.spyOn(service as any, 'getWorkerQueue').mockReturnValue(workerQueue);

      await service.retryFromDeadLetter('dlq-1');

      expect(workerQueue.add).toHaveBeenCalledWith(
        { id: 'payload-1' },
        expect.objectContaining({
          attempts: 3,
          removeOnComplete: true,
          removeOnFail: false,
        }),
      );
      expect(deadLetterQueue.getJob).toHaveBeenCalledWith('dlq-1');
    });

    it('purges expired dead letter jobs on schedule', async () => {
      const expiredJob = {
        data: {
          failedAt: new Date(
            Date.now() - 40 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
        remove: jest.fn().mockResolvedValue(undefined),
      };
      const freshJob = {
        data: {
          failedAt: new Date().toISOString(),
        },
        remove: jest.fn().mockResolvedValue(undefined),
      };
      deadLetterQueue.getJobs.mockResolvedValue([expiredJob, freshJob]);

      const service = moduleRef.get(DeadLetterQueueService);
      const removed = await service.purgeExpiredJobs();

      expect(removed).toBe(1);
      expect(expiredJob.remove).toHaveBeenCalled();
      expect(freshJob.remove).not.toHaveBeenCalled();
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Purged 1 expired dead letter jobs',
      );
    });
  });

  describe('security patch scheduling', () => {
    it('reports that no patch is needed when audit returns zero vulnerabilities', async () => {
      const auditService = moduleRef.get(SecurityPatchManagementService);
      jest
        .spyOn(auditService as any, 'detectPackageManager')
        .mockReturnValue('pnpm');
      jest.spyOn(auditService as any, 'runAudit').mockResolvedValue({
        metadata: {
          vulnerabilities: {
            critical: 0,
            high: 0,
            moderate: 0,
            low: 0,
            info: 0,
            total: 0,
          },
        },
      });

      const summary = await auditService.checkForSecurityPatches(process.cwd());

      expect(summary.recommendedAction).toBe('none');
      expect(summary.packageManager).toBe('pnpm');
    });

    it('logs a warning when urgent patching is required', async () => {
      const auditService = moduleRef.get(SecurityPatchManagementService);
      jest.spyOn(auditService, 'checkForSecurityPatches').mockResolvedValue({
        packageManager: 'pnpm',
        checkedAt: new Date().toISOString(),
        vulnerabilities: {
          critical: 1,
          high: 0,
          moderate: 0,
          low: 0,
          info: 0,
          total: 1,
        },
        recommendedAction: 'urgent_patch',
      });

      await auditService.runScheduledSecurityPatchCheck();

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Security audit found 1 high/critical issue(s)',
      );
    });

    it('logs a warning when a scheduled patch is enough', async () => {
      const auditService = moduleRef.get(SecurityPatchManagementService);
      jest.spyOn(auditService, 'checkForSecurityPatches').mockResolvedValue({
        packageManager: 'pnpm',
        checkedAt: new Date().toISOString(),
        vulnerabilities: {
          critical: 0,
          high: 0,
          moderate: 2,
          low: 0,
          info: 0,
          total: 2,
        },
        recommendedAction: 'scheduled_patch',
      });

      await auditService.runScheduledSecurityPatchCheck();

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Security audit found 2 moderate issue(s)',
      );
    });
  });
});

function buildProperty(overrides: Partial<Property>): Property {
  return {
    id: overrides.id ?? 'property-1',
    status: overrides.status ?? ListingStatus.PUBLISHED,
  } as Property;
}

function buildReminder(
  overrides: Partial<RentReminder> & { id: string },
): RentReminder {
  return {
    id: overrides.id,
    agreementId: overrides.agreementId ?? 'agreement-1',
    tenantId: overrides.tenantId ?? 'tenant-1',
    tenantEmail: overrides.tenantEmail ?? 'tenant@example.com',
    dueDate: overrides.dueDate ?? futureDate(30),
    daysBefore: overrides.daysBefore ?? 7,
    amount: overrides.amount ?? 1500,
    type: overrides.type ?? ReminderType.EMAIL,
    status: overrides.status ?? ReminderStatus.PENDING,
    sent: overrides.sent ?? false,
    errorMessage: overrides.errorMessage,
  } as RentReminder;
}

function futureDate(daysAhead: number): Date {
  return new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
}
