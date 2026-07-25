import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { QueueManagementService } from './queue-management.service';

/**
 * Integration Tests: Data Import
 *
 * Verifies that data import jobs are correctly enqueued onto the data-sync
 * queue with the right payload shape, retry options, and backoff strategy.
 * Uses in-process queue mocks — no Redis connection required.
 */
describe('Data Import Integration', () => {
  let service: QueueManagementService;
  let mockDataSyncQueue: jest.Mocked<any>;

  beforeEach(async () => {
    mockDataSyncQueue = {
      add: jest.fn().mockResolvedValue({ id: 'import-job-1' }),
      getJobCounts: jest.fn().mockResolvedValue({
        active: 0,
        wait: 0,
        delayed: 0,
        failed: 0,
        completed: 0,
      }),
      getFailed: jest.fn().mockResolvedValue([]),
      getDelayed: jest.fn().mockResolvedValue([]),
      isPaused: jest.fn().mockResolvedValue(false),
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
          useValue: {
            add: jest.fn(),
            getJobCounts: jest.fn().mockResolvedValue({}),
            getFailed: jest.fn().mockResolvedValue([]),
            getDelayed: jest.fn().mockResolvedValue([]),
            isPaused: jest.fn().mockResolvedValue(false),
            pause: jest.fn(),
            resume: jest.fn(),
            clean: jest.fn(),
          },
        },
        {
          provide: getQueueToken('documents'),
          useValue: {
            add: jest.fn(),
            getJobCounts: jest.fn().mockResolvedValue({}),
            getFailed: jest.fn().mockResolvedValue([]),
            getDelayed: jest.fn().mockResolvedValue([]),
            isPaused: jest.fn().mockResolvedValue(false),
            pause: jest.fn(),
            resume: jest.fn(),
            clean: jest.fn(),
          },
        },
        {
          provide: getQueueToken('blockchain'),
          useValue: {
            add: jest.fn(),
            getJobCounts: jest.fn().mockResolvedValue({}),
            getFailed: jest.fn().mockResolvedValue([]),
            getDelayed: jest.fn().mockResolvedValue([]),
            isPaused: jest.fn().mockResolvedValue(false),
            pause: jest.fn(),
            resume: jest.fn(),
            clean: jest.fn(),
          },
        },
        { provide: getQueueToken('data-sync'), useValue: mockDataSyncQueue },
      ],
    }).compile();

    service = module.get<QueueManagementService>(QueueManagementService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('enqueues a sync-user-profile import job with correct payload', async () => {
    const payload = {
      type: 'sync-user-profile',
      entityId: 'user-42',
      entityType: 'user',
    };

    const job = await service.addDataSyncJob(payload);

    expect(job).toBeDefined();
    expect(mockDataSyncQueue.add).toHaveBeenCalledTimes(1);
    const [calledPayload] = mockDataSyncQueue.add.mock.calls[0];
    expect(calledPayload).toMatchObject({
      type: 'sync-user-profile',
      entityId: 'user-42',
    });
  });

  it('enqueues a sync-property-data import job and applies default retry options', async () => {
    const payload = {
      type: 'sync-property-data',
      entityId: 'prop-99',
      entityType: 'property',
    };

    await service.addDataSyncJob(payload);

    const [, opts] = mockDataSyncQueue.add.mock.calls[0];
    expect(opts.attempts).toBeGreaterThanOrEqual(1);
    expect(opts.backoff).toBeDefined();
    expect(opts.backoff.type).toBe('exponential');
  });

  it('imports multiple records sequentially without cross-contamination', async () => {
    const records = [
      { type: 'sync-agreement-status', entityId: 'agr-1' },
      { type: 'sync-payment-status', entityId: 'pay-1' },
      { type: 'sync-user-profile', entityId: 'user-7' },
    ];

    for (const record of records) {
      await service.addDataSyncJob(record);
    }

    expect(mockDataSyncQueue.add).toHaveBeenCalledTimes(3);
    const calledIds = mockDataSyncQueue.add.mock.calls.map(
      ([p]: [any]) => p.entityId,
    );
    expect(calledIds).toEqual(['agr-1', 'pay-1', 'user-7']);
  });

  it('propagates queue errors on import failure', async () => {
    mockDataSyncQueue.add.mockRejectedValueOnce(
      new Error('Redis connection lost'),
    );

    await expect(
      service.addDataSyncJob({
        type: 'sync-user-profile',
        entityId: 'user-bad',
      }),
    ).rejects.toThrow('Redis connection lost');
  });
});
