import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import * as StellarSdk from '@stellar/stellar-sdk';
import { QueueManagementService } from './queue-management.service';
import {
  BlockchainQueueProcessor,
  BlockchainJobData,
} from '../processors/blockchain.processor';
import { PaymentProcessingService } from '../../stellar/services/payment-processing.service';
import { EscrowIntegrationService } from '../../agreements/escrow-integration.service';
import { RentObligationNftService } from '../../stellar/services/rent-obligation-nft.service';
import { Job } from 'bull';

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
      getJobCounts: jest.fn().mockResolvedValue({
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
      expect.objectContaining(payload),
      expect.objectContaining({ attempts: 5, removeOnComplete: false }),
    );
  });

  it('propagates correlation id from requestContext into enqueued job payload', async () => {
    const { requestContext } = await import('../../../common/request-context/request-context');
    const payload = { transactionId: 'tx-xyz789', action: 'mint-nft' };

    await requestContext.run({ correlationId: 'corr-req-12345', requestId: 'req-987' }, async () => {
      await service.addBlockchainJob(payload);
    });

    expect(mockBlockchainQueue.add).toHaveBeenCalledWith(
      expect.objectContaining({
        ...payload,
        correlationId: 'corr-req-12345',
        requestId: 'req-987',
      }),
      expect.any(Object),
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

// ---------------------------------------------------------------------------
// Integration: BlockchainQueueProcessor dispatches jobs to real services
//
// Instantiates the processor with mock services (no Redis, no Stellar node)
// and asserts that each job type calls the correct service method with the
// correct payload — and that service errors propagate as processor failures.
// ---------------------------------------------------------------------------

describe('BlockchainQueueProcessor — service dispatch integration', () => {
  let processor: BlockchainQueueProcessor;
  let fromSecretSpy: jest.SpyInstance;

  const mockPaymentProcessingService = { processRentPayment: jest.fn() };
  const mockEscrowIntegrationService = {
    createEscrowForAgreement: jest.fn(),
    approveEscrowRelease: jest.fn(),
  };
  const mockRentObligationNftService = { mintObligation: jest.fn() };

  /** Minimal Bull Job stub */
  const makeJob = (data: BlockchainJobData): Job<BlockchainJobData> =>
    ({ id: 'integ-job-1', data } as Job<BlockchainJobData>);

  beforeEach(async () => {
    jest.clearAllMocks();
    fromSecretSpy = jest
      .spyOn(StellarSdk.Keypair, 'fromSecret')
      .mockReturnValue({ publicKey: () => 'GFAKE_PUBLIC_KEY' } as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockchainQueueProcessor,
        {
          provide: PaymentProcessingService,
          useValue: mockPaymentProcessingService,
        },
        {
          provide: EscrowIntegrationService,
          useValue: mockEscrowIntegrationService,
        },
        {
          provide: RentObligationNftService,
          useValue: mockRentObligationNftService,
        },
      ],
    }).compile();

    processor = module.get<BlockchainQueueProcessor>(BlockchainQueueProcessor);
  });

  afterEach(() => {
    fromSecretSpy.mockRestore();
  });

  it('send-payment: enqueue-to-service round-trip calls PaymentProcessingService', async () => {
    mockPaymentProcessingService.processRentPayment.mockResolvedValue('tx-hash');

    await processor.handleBlockchainJob(
      makeJob({
        type: 'send-payment',
        data: {
          from: 'GSENDER',
          agreementId: 'ag-1',
          amount: '500000',
          callerSecret:
            'SCZANGBA5AKIA5OEDUXV4T4UVIEXN7BXSRMTUGWTCXHQLQM3BUXQNBDE',
        },
      }),
    );

    expect(mockPaymentProcessingService.processRentPayment).toHaveBeenCalledTimes(1);
  });

  it('create-escrow: enqueue-to-service round-trip calls EscrowIntegrationService', async () => {
    mockEscrowIntegrationService.createEscrowForAgreement.mockResolvedValue({ id: 1 });

    await processor.handleBlockchainJob(
      makeJob({ type: 'create-escrow', data: { agreementId: 'ag-2' } }),
    );

    expect(
      mockEscrowIntegrationService.createEscrowForAgreement,
    ).toHaveBeenCalledWith('ag-2');
  });

  it('release-escrow: enqueue-to-service round-trip calls EscrowIntegrationService', async () => {
    mockEscrowIntegrationService.approveEscrowRelease.mockResolvedValue(undefined);

    await processor.handleBlockchainJob(
      makeJob({
        type: 'release-escrow',
        data: { escrowId: 7, releaseTo: 'GRECEIVER' },
      }),
    );

    expect(
      mockEscrowIntegrationService.approveEscrowRelease,
    ).toHaveBeenCalledWith(7, 'GRECEIVER');
  });

  it('mint-nft: enqueue-to-service round-trip calls RentObligationNftService', async () => {
    mockRentObligationNftService.mintObligation.mockResolvedValue({
      txHash: 'nft-hash',
      obligationId: 'ag-3',
    });

    await processor.handleBlockchainJob(
      makeJob({
        type: 'mint-nft',
        data: { agreementId: 'ag-3', adminAddress: 'GADMIN' },
      }),
    );

    expect(mockRentObligationNftService.mintObligation).toHaveBeenCalledWith({
      agreementId: 'ag-3',
      adminAddress: 'GADMIN',
    });
  });

  it('propagates service failure so Bull marks the job as failed', async () => {
    mockEscrowIntegrationService.createEscrowForAgreement.mockRejectedValue(
      new Error('on-chain escrow creation failed'),
    );

    await expect(
      processor.handleBlockchainJob(
        makeJob({ type: 'create-escrow', data: { agreementId: 'ag-fail' } }),
      ),
    ).rejects.toThrow('on-chain escrow creation failed');
  });

  it('restores correlationId and requestId into requestContext during job execution', async () => {
    const { requestContext } = await import('../../../common/request-context/request-context');
    let capturedCorrelationId: string | undefined;
    let capturedRequestId: string | undefined;

    mockEscrowIntegrationService.createEscrowForAgreement.mockImplementation(async () => {
      const ctx = requestContext.get();
      capturedCorrelationId = ctx?.correlationId;
      capturedRequestId = ctx?.requestId;
      return { id: 10 };
    });

    await processor.handleBlockchainJob(
      makeJob({
        type: 'create-escrow',
        correlationId: 'req-corr-999',
        requestId: 'req-id-888',
        data: { agreementId: 'ag-ctx' },
      }),
    );

    expect(capturedCorrelationId).toBe('req-corr-999');
    expect(capturedRequestId).toBe('req-id-888');
  });
});
