import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SorobanRpc } from '@stellar/stellar-sdk';
import {
  TransactionPollingService,
  TransactionPollingState,
  PollingConfig,
} from './transaction-polling.service';

describe('TransactionPollingService', () => {
  let service: TransactionPollingService;
  let configService: ConfigService;
  let mockServer: any;

  beforeEach(async () => {
    mockServer = {
      getTransaction: jest.fn(),
    };

    // Mock SorobanRpc.Server
    jest.spyOn(SorobanRpc, 'Server' as any).mockImplementation(() => mockServer);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionPollingService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'SOROBAN_RPC_URL') {
                return 'https://soroban-testnet.stellar.org';
              }
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TransactionPollingService>(TransactionPollingService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('pollTransactionStatus', () => {
    const testHash = 'test-tx-hash-12345';

    describe('succeeded state', () => {
      it('should return SUCCEEDED state when transaction succeeds on first poll', async () => {
        mockServer.getTransaction.mockResolvedValue({
          status: SorobanRpc.Api.GetTransactionStatus.SUCCESS,
        });

        const result = await service.pollTransactionStatus(testHash);

        expect(result.state).toBe(TransactionPollingState.SUCCEEDED);
        expect(result.hash).toBe(testHash);
        expect(result.attemptsUsed).toBe(1);
        expect(mockServer.getTransaction).toHaveBeenCalledTimes(1);
      });

      it('should return SUCCEEDED after pending attempts', async () => {
        mockServer.getTransaction
          .mockResolvedValueOnce({
            status: SorobanRpc.Api.GetTransactionStatus.PENDING,
          })
          .mockResolvedValueOnce({
            status: SorobanRpc.Api.GetTransactionStatus.PENDING,
          })
          .mockResolvedValueOnce({
            status: SorobanRpc.Api.GetTransactionStatus.SUCCESS,
          });

        const result = await service.pollTransactionStatus(testHash, {
          initialDelayMs: 10,
          maxAttempts: 10,
        });

        expect(result.state).toBe(TransactionPollingState.SUCCEEDED);
        expect(result.attemptsUsed).toBe(3);
        expect(mockServer.getTransaction).toHaveBeenCalledTimes(3);
      });
    });

    describe('failed state', () => {
      it('should return FAILED state when transaction fails', async () => {
        mockServer.getTransaction.mockResolvedValue({
          status: SorobanRpc.Api.GetTransactionStatus.FAILED,
          errorResult: { detail: 'Contract error' },
        });

        const result = await service.pollTransactionStatus(testHash);

        expect(result.state).toBe(TransactionPollingState.FAILED);
        expect(result.hash).toBe(testHash);
        expect(result.attemptsUsed).toBe(1);
        expect(result.errorMessage).toBeDefined();
      });

      it('should return FAILED after detecting failure on second attempt', async () => {
        mockServer.getTransaction
          .mockResolvedValueOnce({
            status: SorobanRpc.Api.GetTransactionStatus.PENDING,
          })
          .mockResolvedValueOnce({
            status: SorobanRpc.Api.GetTransactionStatus.FAILED,
            errorResult: { code: 'ERR_AUTH' },
          });

        const result = await service.pollTransactionStatus(testHash, {
          initialDelayMs: 10,
          maxAttempts: 10,
        });

        expect(result.state).toBe(TransactionPollingState.FAILED);
        expect(result.attemptsUsed).toBe(2);
        expect(mockServer.getTransaction).toHaveBeenCalledTimes(2);
      });
    });

    describe('timeout state', () => {
      it('should return TIMEOUT when max attempts exceeded', async () => {
        mockServer.getTransaction.mockResolvedValue({
          status: SorobanRpc.Api.GetTransactionStatus.PENDING,
        });

        const result = await service.pollTransactionStatus(testHash, {
          maxAttempts: 3,
          initialDelayMs: 1,
        });

        expect(result.state).toBe(TransactionPollingState.TIMEOUT);
        expect(result.attemptsUsed).toBe(3);
        expect(mockServer.getTransaction).toHaveBeenCalledTimes(3);
      });

      it('should throw error if server fails on final attempt', async () => {
        const error = new Error('Network error');
        mockServer.getTransaction.mockRejectedValue(error);

        await expect(
          service.pollTransactionStatus(testHash, {
            maxAttempts: 1,
            initialDelayMs: 1,
          }),
        ).rejects.toThrow('Network error');
      });
    });

    describe('exponential backoff', () => {
      it('should apply exponential backoff between attempts', async () => {
        const delays: number[] = [];
        const originalSetTimeout = global.setTimeout;

        jest.spyOn(global, 'setTimeout').mockImplementation((callback, delay) => {
          delays.push(delay as number);
          originalSetTimeout(callback, 1);
          return undefined as any;
        });

        mockServer.getTransaction
          .mockResolvedValueOnce({
            status: SorobanRpc.Api.GetTransactionStatus.PENDING,
          })
          .mockResolvedValueOnce({
            status: SorobanRpc.Api.GetTransactionStatus.PENDING,
          })
          .mockResolvedValueOnce({
            status: SorobanRpc.Api.GetTransactionStatus.SUCCESS,
          });

        await service.pollTransactionStatus(testHash, {
          initialDelayMs: 100,
          backoffMultiplier: 2,
          maxAttempts: 10,
        });

        // Should have 2 delays (first attempt has no delay, then delays before 2nd and 3rd)
        expect(delays.length).toBe(2);
        expect(delays[0]).toBe(100);
        expect(delays[1]).toBe(200); // 100 * 2

        jest.restoreAllMocks();
      });

      it('should cap delay at maxDelayMs', async () => {
        const delays: number[] = [];
        const originalSetTimeout = global.setTimeout;

        jest.spyOn(global, 'setTimeout').mockImplementation((callback, delay) => {
          delays.push(delay as number);
          originalSetTimeout(callback, 1);
          return undefined as any;
        });

        mockServer.getTransaction.mockResolvedValue({
          status: SorobanRpc.Api.GetTransactionStatus.PENDING,
        });

        await service.pollTransactionStatus(testHash, {
          initialDelayMs: 100,
          backoffMultiplier: 2,
          maxDelayMs: 500,
          maxAttempts: 10,
        });

        // Delays should: 100, 200, 400, 500 (capped), 500, 500, 500, 500, 500
        expect(delays[0]).toBe(100);
        expect(delays[1]).toBe(200);
        expect(delays[2]).toBe(400);
        expect(delays[3]).toBe(500); // Capped
        expect(delays[4]).toBe(500); // Stays capped

        jest.restoreAllMocks();
      });
    });

    describe('state transitions', () => {
      it('should transition from PENDING to SUCCEEDED', async () => {
        mockServer.getTransaction
          .mockResolvedValueOnce({
            status: SorobanRpc.Api.GetTransactionStatus.PENDING,
          })
          .mockResolvedValueOnce({
            status: SorobanRpc.Api.GetTransactionStatus.SUCCESS,
          });

        const result = await service.pollTransactionStatus(testHash, {
          initialDelayMs: 1,
          maxAttempts: 10,
        });

        expect(result.state).toBe(TransactionPollingState.SUCCEEDED);
      });

      it('should transition from PENDING to FAILED', async () => {
        mockServer.getTransaction
          .mockResolvedValueOnce({
            status: SorobanRpc.Api.GetTransactionStatus.PENDING,
          })
          .mockResolvedValueOnce({
            status: SorobanRpc.Api.GetTransactionStatus.FAILED,
          });

        const result = await service.pollTransactionStatus(testHash, {
          initialDelayMs: 1,
          maxAttempts: 10,
        });

        expect(result.state).toBe(TransactionPollingState.FAILED);
      });

      it('should transition from NOT_FOUND to SUCCEEDED', async () => {
        mockServer.getTransaction
          .mockResolvedValueOnce({
            status: 'NOT_FOUND',
          })
          .mockResolvedValueOnce({
            status: SorobanRpc.Api.GetTransactionStatus.SUCCESS,
          });

        const result = await service.pollTransactionStatus(testHash, {
          initialDelayMs: 1,
          maxAttempts: 10,
        });

        expect(result.state).toBe(TransactionPollingState.SUCCEEDED);
      });
    });

    describe('maximum attempts limit', () => {
      it('should respect maxAttempts configuration', async () => {
        mockServer.getTransaction.mockResolvedValue({
          status: SorobanRpc.Api.GetTransactionStatus.PENDING,
        });

        const result = await service.pollTransactionStatus(testHash, {
          maxAttempts: 5,
          initialDelayMs: 1,
        });

        expect(result.attemptsUsed).toBe(5);
        expect(mockServer.getTransaction).toHaveBeenCalledTimes(5);
      });

      it('should default to 30 attempts', async () => {
        mockServer.getTransaction.mockResolvedValue({
          status: SorobanRpc.Api.GetTransactionStatus.PENDING,
        });

        const result = await service.pollTransactionStatus(testHash, {
          initialDelayMs: 1,
        });

        expect(result.attemptsUsed).toBe(30);
      });
    });

    describe('configurable timeout', () => {
      it('should use SOROBAN_RPC_URL from config', () => {
        const spy = jest.spyOn(configService, 'get');
        service = new TransactionPollingService(configService);

        expect(spy).toHaveBeenCalledWith('SOROBAN_RPC_URL');
      });
    });
  });

  describe('pollTransactionStatusStrict', () => {
    const testHash = 'test-tx-hash-strict';

    it('should return hash on success', async () => {
      mockServer.getTransaction.mockResolvedValue({
        status: SorobanRpc.Api.GetTransactionStatus.SUCCESS,
      });

      const result = await service.pollTransactionStatusStrict(testHash);

      expect(result).toBe(testHash);
    });

    it('should throw on failure', async () => {
      mockServer.getTransaction.mockResolvedValue({
        status: SorobanRpc.Api.GetTransactionStatus.FAILED,
        errorResult: { detail: 'Contract error' },
      });

      await expect(
        service.pollTransactionStatusStrict(testHash),
      ).rejects.toThrow('Transaction failed');
    });

    it('should throw on timeout', async () => {
      mockServer.getTransaction.mockResolvedValue({
        status: SorobanRpc.Api.GetTransactionStatus.PENDING,
      });

      await expect(
        service.pollTransactionStatusStrict(testHash, {
          maxAttempts: 2,
          initialDelayMs: 1,
        }),
      ).rejects.toThrow('Transaction polling failed');
    });
  });
});
