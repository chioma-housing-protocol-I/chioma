import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { DeadLetterQueueService } from './dead-letter-queue.service';
import {
  DEAD_LETTER_JOB_NAME,
  DEAD_LETTER_QUEUE_NAME,
} from '../queues.constants';
import { ErrorNotificationService } from '../../monitoring/error-notification.service';

describe('DeadLetterQueueService', () => {
  let service: DeadLetterQueueService;
  let deadLetterQueue: {
    add: jest.Mock;
    getJob: jest.Mock;
    getCompleted: jest.Mock;
    getWaiting: jest.Mock;
    getFailed: jest.Mock;
    getJobCounts: jest.Mock;
    getJobs: jest.Mock;
  };
  let emailQueue: { add: jest.Mock };
  let errorNotificationService: { notifyAlert: jest.Mock };

  const config: Record<string, string> = {
    DEAD_LETTER_QUEUE_ENABLED: 'true',
    DEAD_LETTER_RETENTION_DAYS: '30',
  };

  beforeEach(async () => {
    deadLetterQueue = {
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
    emailQueue = { add: jest.fn().mockResolvedValue({ id: 'new-1' }) };
    errorNotificationService = {
      notifyAlert: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeadLetterQueueService,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => config[key] ?? null },
        },
        {
          provide: getQueueToken(DEAD_LETTER_QUEUE_NAME),
          useValue: deadLetterQueue,
        },
        { provide: getQueueToken('email'), useValue: emailQueue },
        { provide: getQueueToken('documents'), useValue: { add: jest.fn() } },
        { provide: getQueueToken('blockchain'), useValue: { add: jest.fn() } },
        { provide: getQueueToken('data-sync'), useValue: { add: jest.fn() } },
        { provide: getQueueToken('analytics'), useValue: { add: jest.fn() } },
        {
          provide: ErrorNotificationService,
          useValue: errorNotificationService,
        },
      ],
    }).compile();

    service = module.get(DeadLetterQueueService);
  });

  it('moves exhausted jobs to the dead letter queue', async () => {
    const job = {
      id: '42',
      data: { type: 'verification', email: 'test@example.com' },
      attemptsMade: 3,
      opts: { attempts: 3 },
      stacktrace: ['Error: send failed'],
      remove: jest.fn().mockResolvedValue(undefined),
    };

    await service.moveToDeadLetter(
      'email',
      job as any,
      new Error('send failed'),
    );

    expect(deadLetterQueue.add).toHaveBeenCalledWith(
      DEAD_LETTER_JOB_NAME,
      expect.objectContaining({
        sourceQueue: 'email',
        originalJobId: '42',
        failedReason: 'send failed',
      }),
      expect.objectContaining({ removeOnComplete: false }),
    );
    expect(job.remove).toHaveBeenCalled();
  });

  it('alerts on-call when a job exhausts its retries', async () => {
    const job = {
      id: '42',
      data: { type: 'verification', email: 'test@example.com' },
      attemptsMade: 3,
      opts: { attempts: 3 },
      stacktrace: ['Error: send failed'],
      remove: jest.fn().mockResolvedValue(undefined),
    };

    await service.moveToDeadLetter(
      'email',
      job as any,
      new Error('send failed'),
    );

    expect(errorNotificationService.notifyAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'firing',
        labels: expect.objectContaining({
          alertname: 'AsyncJobRetryExhausted',
          queue: 'email',
        }),
      }),
      expect.anything(),
    );
  });

  it('does not throw when the alert notification itself fails', async () => {
    errorNotificationService.notifyAlert.mockRejectedValueOnce(
      new Error('smtp down'),
    );
    const job = {
      id: '42',
      data: {},
      attemptsMade: 3,
      opts: { attempts: 3 },
      remove: jest.fn().mockResolvedValue(undefined),
    };

    await expect(
      service.moveToDeadLetter('email', job as any, new Error('fail')),
    ).resolves.not.toThrow();
  });

  it('alerts when the dead letter backlog exceeds the threshold', async () => {
    deadLetterQueue.getJobCounts.mockResolvedValue({
      waiting: 15,
      failed: 10,
      completed: 0,
    });

    await service.monitorDeadLetterBacklog();

    expect(errorNotificationService.notifyAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        labels: expect.objectContaining({
          alertname: 'DeadLetterQueueBacklogHigh',
        }),
      }),
      expect.anything(),
    );
  });

  it('does not alert when the dead letter backlog is within the threshold', async () => {
    deadLetterQueue.getJobCounts.mockResolvedValue({
      waiting: 2,
      failed: 1,
      completed: 0,
    });

    await service.monitorDeadLetterBacklog();

    expect(errorNotificationService.notifyAlert).not.toHaveBeenCalled();
  });

  it('detects when a job has exhausted retries', () => {
    expect(
      service.shouldMoveToDeadLetter({
        attemptsMade: 3,
        opts: { attempts: 3 },
      } as any),
    ).toBe(true);
    expect(
      service.shouldMoveToDeadLetter({
        attemptsMade: 1,
        opts: { attempts: 3 },
      } as any),
    ).toBe(false);
  });

  it('re-queues jobs from the dead letter queue', async () => {
    deadLetterQueue.getJob.mockResolvedValue({
      id: 'dlq-1',
      data: {
        sourceQueue: 'email',
        originalJobId: '42',
        data: { type: 'verification', email: 'test@example.com' },
        maxAttempts: 3,
      },
      remove: jest.fn().mockResolvedValue(undefined),
    });

    await service.retryFromDeadLetter('dlq-1');

    expect(emailQueue.add).toHaveBeenCalled();
  });

  it('throws when dead letter job is missing', async () => {
    deadLetterQueue.getJob.mockResolvedValue(null);
    await expect(service.retryFromDeadLetter('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('purges expired dead letter jobs', async () => {
    const oldDate = new Date(
      Date.now() - 40 * 24 * 60 * 60 * 1000,
    ).toISOString();
    deadLetterQueue.getJobs.mockResolvedValue([
      {
        data: { failedAt: oldDate },
        remove: jest.fn().mockResolvedValue(undefined),
      },
      {
        data: { failedAt: new Date().toISOString() },
        remove: jest.fn().mockResolvedValue(undefined),
      },
    ]);

    const removed = await service.purgeExpiredJobs();
    expect(removed).toBe(1);
  });

  it('skips move when dead letter queue is disabled', async () => {
    config.DEAD_LETTER_QUEUE_ENABLED = 'false';
    const job = {
      id: '42',
      data: {},
      attemptsMade: 3,
      opts: { attempts: 3 },
      remove: jest.fn(),
    };

    await service.moveToDeadLetter('email', job as any, new Error('fail'));
    expect(deadLetterQueue.add).not.toHaveBeenCalled();
    config.DEAD_LETTER_QUEUE_ENABLED = 'true';
  });
});
