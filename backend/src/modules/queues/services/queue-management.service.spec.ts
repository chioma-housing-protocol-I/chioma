import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { QueueManagementService } from './queue-management.service';

describe('QueueManagementService', () => {
  let service: QueueManagementService;
  let mockEmailQueue: any;
  let mockDocumentsQueue: any;
  let mockBlockchainQueue: any;
  let mockDataSyncQueue: any;

  beforeEach(async () => {
    mockEmailQueue = {
      add: jest.fn().mockResolvedValue({ id: '1' }),
      getJobCounts: jest.fn().mockResolvedValue({
        active: 1,
        wait: 5,
        delayed: 0,
        failed: 0,
        completed: 100,
      }),
      getFailed: jest.fn().mockResolvedValue([]),
      getDelayed: jest.fn().mockResolvedValue([]),
      isPaused: jest.fn().mockReturnValue(false),
      pause: jest.fn().mockResolvedValue(undefined),
      resume: jest.fn().mockResolvedValue(undefined),
      clean: jest.fn().mockResolvedValue(undefined),
      getJob: jest.fn(),
    };

    mockDocumentsQueue = {
      add: jest.fn().mockResolvedValue({ id: '2' }),
      getJobCounts: jest.fn().mockResolvedValue({
        active: 0,
        wait: 2,
        delayed: 0,
        failed: 0,
        completed: 50,
      }),
      getFailed: jest.fn().mockResolvedValue([]),
      getDelayed: jest.fn().mockResolvedValue([]),
      isPaused: jest.fn().mockReturnValue(false),
      pause: jest.fn().mockResolvedValue(undefined),
      resume: jest.fn().mockResolvedValue(undefined),
      clean: jest.fn().mockResolvedValue(undefined),
      getJob: jest.fn(),
    };

    mockBlockchainQueue = {
      add: jest.fn().mockResolvedValue({ id: '3' }),
      getJobCounts: jest.fn().mockResolvedValue({
        active: 2,
        wait: 10,
        delayed: 1,
        failed: 0,
        completed: 200,
      }),
      getFailed: jest.fn().mockResolvedValue([]),
      getDelayed: jest.fn().mockResolvedValue([]),
      isPaused: jest.fn().mockReturnValue(false),
      pause: jest.fn().mockResolvedValue(undefined),
      resume: jest.fn().mockResolvedValue(undefined),
      clean: jest.fn().mockResolvedValue(undefined),
      getJob: jest.fn(),
    };

    mockDataSyncQueue = {
      add: jest.fn().mockResolvedValue({ id: '4' }),
      getJobCounts: jest.fn().mockResolvedValue({
        active: 0,
        wait: 3,
        delayed: 0,
        failed: 0,
        completed: 75,
      }),
      getFailed: jest.fn().mockResolvedValue([]),
      getDelayed: jest.fn().mockResolvedValue([]),
      isPaused: jest.fn().mockReturnValue(false),
      pause: jest.fn().mockResolvedValue(undefined),
      resume: jest.fn().mockResolvedValue(undefined),
      clean: jest.fn().mockResolvedValue(undefined),
      getJob: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueManagementService,
        {
          provide: getQueueToken('email'),
          useValue: mockEmailQueue,
        },
        {
          provide: getQueueToken('documents'),
          useValue: mockDocumentsQueue,
        },
        {
          provide: getQueueToken('blockchain'),
          useValue: mockBlockchainQueue,
        },
        {
          provide: getQueueToken('data-sync'),
          useValue: mockDataSyncQueue,
        },
      ],
    }).compile();

    service = module.get<QueueManagementService>(QueueManagementService);
  });

  describe('addEmailJob', () => {
    it('should add email job with default options', async () => {
      const jobData = {
        type: 'verification',
        email: 'test@example.com',
        token: 'token-123',
      };

      await service.addEmailJob(jobData);

      expect(mockEmailQueue.add).toHaveBeenCalledWith(
        jobData,
        expect.objectContaining({
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
        }),
      );
    });

    it('should add email job with custom options', async () => {
      const jobData = {
        type: 'verification',
        email: 'test@example.com',
        token: 'token-123',
      };

      await service.addEmailJob(jobData, {
        priority: 10,
        delay: 5000,
      });

      expect(mockEmailQueue.add).toHaveBeenCalledWith(
        jobData,
        expect.objectContaining({
          priority: 10,
          delay: 5000,
          attempts: 3,
        }),
      );
    });
  });

  describe('addDocumentJob', () => {
    it('should add document job', async () => {
      const jobData = {
        type: 'process-image',
        fileKey: 's3://bucket/image.jpg',
        ownerId: 'user-123',
        fileName: 'image.jpg',
        contentType: 'image/jpeg',
      };

      await service.addDocumentJob(jobData);

      expect(mockDocumentsQueue.add).toHaveBeenCalledWith(
        jobData,
        expect.objectContaining({
          attempts: 3,
          backoff: { type: 'exponential', delay: 3000 },
        }),
      );
    });
  });

  describe('addBlockchainJob', () => {
    it('should add blockchain job with 5 retries', async () => {
      const jobData = {
        type: 'send-payment',
        data: { amount: '1000' },
      };

      await service.addBlockchainJob(jobData);

      expect(mockBlockchainQueue.add).toHaveBeenCalledWith(
        jobData,
        expect.objectContaining({
          attempts: 5,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: false,
        }),
      );
    });
  });

  describe('addDataSyncJob', () => {
    it('should add data sync job', async () => {
      const jobData = {
        type: 'sync-user-profile',
        entityId: 'user-123',
      };

      await service.addDataSyncJob(jobData);

      expect(mockDataSyncQueue.add).toHaveBeenCalledWith(
        jobData,
        expect.objectContaining({
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        }),
      );
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      const stats = await service.getQueueStats('email');

      expect(stats).toEqual({
        name: 'email',
        counts: {
          active: 1,
          wait: 5,
          delayed: 0,
          failed: 0,
          completed: 100,
        },
        failedCount: 0,
        delayedCount: 0,
        isPaused: false,
      });
    });
  });

  describe('getAllQueueStats', () => {
    it('should return stats for all queues', async () => {
      const allStats = await service.getAllQueueStats();

      expect(allStats).toHaveLength(4);
      expect(allStats[0].name).toBe('email');
      expect(allStats[1].name).toBe('documents');
      expect(allStats[2].name).toBe('blockchain');
      expect(allStats[3].name).toBe('data-sync');
    });
  });

  describe('pauseQueue', () => {
    it('should pause a queue', async () => {
      await service.pauseQueue('email');

      expect(mockEmailQueue.pause).toHaveBeenCalled();
    });
  });

  describe('resumeQueue', () => {
    it('should resume a queue', async () => {
      await service.resumeQueue('email');

      expect(mockEmailQueue.resume).toHaveBeenCalled();
    });
  });

  describe('clearQueue', () => {
    it('should clear a queue', async () => {
      await service.clearQueue('email');

      expect(mockEmailQueue.clean).toHaveBeenCalledTimes(4);
    });
  });

  describe('retryFailedJob', () => {
    it('should retry a failed job', async () => {
      const mockJob = { retry: jest.fn().mockResolvedValue(undefined) };
      mockEmailQueue.getJob.mockResolvedValue(mockJob);

      await service.retryFailedJob('email', '123');

      expect(mockJob.retry).toHaveBeenCalled();
    });

    it('should throw error if job not found', async () => {
      mockEmailQueue.getJob.mockResolvedValue(null);

      await expect(service.retryFailedJob('email', '999')).rejects.toThrow(
        'Job 999 not found',
      );
    });
  });

  describe('removeJob', () => {
    it('should remove a job', async () => {
      const mockJob = { remove: jest.fn().mockResolvedValue(undefined) };
      mockEmailQueue.getJob.mockResolvedValue(mockJob);

      await service.removeJob('email', '123');

      expect(mockJob.remove).toHaveBeenCalled();
    });
  });

  describe('getJobDetails', () => {
    it('should return job details', async () => {
      const mockJob = {
        id: '123',
        data: { email: 'test@example.com' },
        getState: jest.fn().mockResolvedValue('completed'),
        progress: jest.fn().mockReturnValue(100),
        attemptsMade: 1,
        opts: { attempts: 3 },
        failedReason: null,
        stacktrace: [],
        createdTimestamp: 1000,
        finishedOn: 2000,
      };

      mockEmailQueue.getJob.mockResolvedValue(mockJob);

      const details = await service.getJobDetails('email', '123');

      expect(details).toEqual({
        id: '123',
        data: { email: 'test@example.com' },
        state: 'completed',
        progress: 100,
        attempts: 1,
        maxAttempts: 3,
        failedReason: null,
        stacktrace: [],
        createdAt: 1000,
        finishedAt: 2000,
      });
    });
  });
});
