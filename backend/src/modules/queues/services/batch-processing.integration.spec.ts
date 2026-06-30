import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { QueueManagementService } from './queue-management.service';

/**
 * Integration Tests: Batch Processing
 *
 * Verifies that the QueueManagementService correctly handles batch job
 * scenarios: enqueuing multiple jobs, fetching stats, pausing / resuming
 * a queue, and clearing completed/failed jobs.
 */
describe('Batch Processing Integration', () => {
  let service: QueueManagementService;
  let mockEmailQueue: jest.Mocked<any>;
  let mockDataSyncQueue: jest.Mocked<any>;

  const makeQueueMock = (overrides: Partial<any> = {}) => ({
    add: jest.fn().mockResolvedValue({ id: 'job-mock' }),
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

  beforeEach(async () => {
    mockEmailQueue = makeQueueMock({
      getJobCounts: jest
        .fn()
        .mockResolvedValue({
          active: 2,
          wait: 8,
          delayed: 1,
          failed: 0,
          completed: 50,
        }),
    });

    mockDataSyncQueue = makeQueueMock({
      getJobCounts: jest
        .fn()
        .mockResolvedValue({
          active: 1,
          wait: 4,
          delayed: 0,
          failed: 2,
          completed: 30,
        }),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueManagementService,
        { provide: getQueueToken('email'), useValue: mockEmailQueue },
        { provide: getQueueToken('documents'), useValue: makeQueueMock() },
        { provide: getQueueToken('blockchain'), useValue: makeQueueMock() },
        { provide: getQueueToken('data-sync'), useValue: mockDataSyncQueue },
      ],
    }).compile();

    service = module.get<QueueManagementService>(QueueManagementService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('enqueues a batch of email jobs and confirms each call', async () => {
    const batch = [
      { type: 'notification', email: 'a@test.com', subject: 'Msg 1' },
      { type: 'notification', email: 'b@test.com', subject: 'Msg 2' },
      { type: 'alert', email: 'c@test.com', subject: 'Alert' },
    ];

    for (const job of batch) {
      await service.addEmailJob(job);
    }

    expect(mockEmailQueue.add).toHaveBeenCalledTimes(3);
    const subjects = mockEmailQueue.add.mock.calls.map(
      ([p]: [any]) => p.subject,
    );
    expect(subjects).toEqual(['Msg 1', 'Msg 2', 'Alert']);
  });

  it('reports correct aggregated stats across all queues', async () => {
    const stats = await service.getAllQueueStats();

    expect(stats).toHaveLength(4);
    const emailStats = stats.find((s) => s.name === 'email');
    expect(emailStats).toBeDefined();
    expect(emailStats!.counts.wait).toBe(8);
    expect(emailStats!.counts.active).toBe(2);
  });

  it('pauses and resumes a queue without throwing', async () => {
    await expect(service.pauseQueue('email')).resolves.toBeUndefined();
    expect(mockEmailQueue.pause).toHaveBeenCalledTimes(1);

    await expect(service.resumeQueue('email')).resolves.toBeUndefined();
    expect(mockEmailQueue.resume).toHaveBeenCalledTimes(1);
  });

  it('clears a queue by cleaning all job states', async () => {
    await expect(service.clearQueue('data-sync')).resolves.toBeUndefined();

    // clearQueue calls clean for each state: failed, delayed, active, wait
    expect(mockDataSyncQueue.clean).toHaveBeenCalledTimes(4);
  });
});
