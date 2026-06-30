import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { QueueManagementService } from './queue-management.service';

/**
 * Integration Tests: Queue Processing
 *
 * Verifies the end-to-end queue job lifecycle: adding jobs to multiple
 * queues, fetching/retrying failed jobs, removing jobs, and reading job
 * details — all using in-process mocks (no Redis required).
 */
describe('Queue Processing Integration', () => {
  let service: QueueManagementService;

  const makeQueueMock = (overrides: Partial<any> = {}) => ({
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    getJobCounts: jest
      .fn()
      .mockResolvedValue({
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
    ...overrides,
  });

  let mockEmailQueue: jest.Mocked<any>;
  let mockBlockchainQueue: jest.Mocked<any>;

  beforeEach(async () => {
    const failedJob = {
      id: 'failed-99',
      data: { type: 'verification', email: 'fail@test.com' },
      failedReason: 'SMTP timeout',
      attemptsMade: 3,
      opts: { attempts: 3 },
      stacktrace: [],
      progress: jest.fn().mockReturnValue(0),
      getState: jest.fn().mockResolvedValue('failed'),
      finishedOn: Date.now(),
      retry: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    mockEmailQueue = makeQueueMock({
      getFailed: jest.fn().mockResolvedValue([failedJob]),
      getJob: jest
        .fn()
        .mockImplementation((id: string) =>
          id === 'failed-99'
            ? Promise.resolve(failedJob)
            : Promise.resolve(null),
        ),
    });

    mockBlockchainQueue = makeQueueMock({
      add: jest.fn().mockResolvedValue({ id: 'bc-job-5' }),
      getJobCounts: jest
        .fn()
        .mockResolvedValue({
          active: 1,
          wait: 3,
          delayed: 2,
          failed: 0,
          completed: 10,
        }),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueManagementService,
        { provide: getQueueToken('email'), useValue: mockEmailQueue },
        { provide: getQueueToken('documents'), useValue: makeQueueMock() },
        { provide: getQueueToken('blockchain'), useValue: mockBlockchainQueue },
        { provide: getQueueToken('data-sync'), useValue: makeQueueMock() },
      ],
    }).compile();

    service = module.get<QueueManagementService>(QueueManagementService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('adds a blockchain job and returns the created job object', async () => {
    const payload = { transactionId: 'tx-abc123', action: 'mint-nft' };

    const job = await service.addBlockchainJob(payload);

    expect(job).toBeDefined();
    expect(job.id).toBe('bc-job-5');
    expect(mockBlockchainQueue.add).toHaveBeenCalledWith(
      payload,
      expect.objectContaining({ attempts: 5, removeOnComplete: false }),
    );
  });

  it('retrieves failed jobs from the email queue', async () => {
    const failedJobs = await service.getFailedJobs('email');

    expect(failedJobs).toHaveLength(1);
    expect(failedJobs[0].id).toBe('failed-99');
    expect(failedJobs[0].failedReason).toBe('SMTP timeout');
  });

  it('retries a specific failed job by id', async () => {
    const failedJob = (await mockEmailQueue.getFailed())[0];

    await expect(
      service.retryFailedJob('email', 'failed-99'),
    ).resolves.toBeUndefined();
    expect(failedJob.retry).toHaveBeenCalledTimes(1);
  });

  it('throws when removing a job that does not exist', async () => {
    mockEmailQueue.getJob.mockResolvedValueOnce(null);

    await expect(service.removeJob('email', 'nonexistent-id')).rejects.toThrow(
      'Job nonexistent-id not found in queue email',
    );
  });
});
