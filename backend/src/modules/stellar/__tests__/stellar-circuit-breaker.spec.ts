import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { StellarService } from '../services/stellar.service';
import { EncryptionService } from '../services/encryption.service';
import { CircuitBreakerService } from '../../../common/resilience/circuit-breaker.service';
import { StellarAccount } from '../entities/stellar-account.entity';
import { StellarTransaction } from '../entities/stellar-transaction.entity';
import { StellarEscrow } from '../entities/stellar-escrow.entity';

jest.mock('@stellar/stellar-sdk', () => {
  const horizon = {
    loadAccount: jest.fn(),
    submitTransaction: jest.fn(),
  };
  return {
    __mockHorizon: horizon,
    Horizon: { Server: jest.fn(() => horizon) },
    Keypair: { random: jest.fn(), fromSecret: jest.fn() },
    Asset: { native: jest.fn() },
    Networks: { TESTNET: 'test', PUBLIC: 'public' },
    TransactionBuilder: jest.fn(),
    Operation: {},
    Memo: {},
  };
});

const mockHorizon = jest.requireMock('@stellar/stellar-sdk').__mockHorizon;

const BREAKER = 'stellar-horizon';

describe('StellarService Horizon circuit breaker', () => {
  let service: StellarService;
  let breakers: CircuitBreakerService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarService,
        CircuitBreakerService,
        { provide: getRepositoryToken(StellarAccount), useValue: {} },
        { provide: getRepositoryToken(StellarTransaction), useValue: {} },
        { provide: getRepositoryToken(StellarEscrow), useValue: {} },
        { provide: DataSource, useValue: {} },
        {
          provide: ConfigService,
          useValue: {
            get: () => ({
              horizonUrl: 'https://horizon.test',
              networkPassphrase: 'test',
              baseFee: '100',
            }),
          },
        },
        { provide: EncryptionService, useValue: {} },
      ],
    }).compile();

    service = module.get<StellarService>(StellarService);
    breakers = module.get<CircuitBreakerService>(CircuitBreakerService);

    // Pre-create with a short recovery window so state transitions are quick
    // to assert. The service reuses an existing breaker with the same name.
    breakers.getBreaker(BREAKER, {
      failureThreshold: 0.5,
      successThreshold: 0.5,
      timeout: 20,
      windowSize: 3,
    });
  });

  it('passes successful Horizon calls through a closed breaker', async () => {
    const account = { balances: [], sequenceNumber: () => '1' };
    mockHorizon.loadAccount.mockResolvedValue(account);

    await expect(service.getAccountInfoFromNetwork('GABC')).resolves.toBe(
      account,
    );
    expect(breakers.getMetricsForBreaker(BREAKER)).toEqual(
      expect.objectContaining({ state: 'CLOSED', successes: 1 }),
    );
  });

  it('opens after repeated failures and rejects further calls without calling Horizon', async () => {
    mockHorizon.loadAccount.mockRejectedValue(new Error('Horizon down'));

    for (let i = 0; i < 3; i++) {
      await expect(service.getAccountInfoFromNetwork('GABC')).rejects.toThrow(
        'Failed to load account from Stellar network',
      );
    }
    expect(breakers.getMetricsForBreaker(BREAKER)).toEqual(
      expect.objectContaining({ state: 'OPEN' }),
    );

    const callsBefore = mockHorizon.loadAccount.mock.calls.length;
    // The @Retry decorator wraps the final error, but the clear circuit-open
    // message is preserved for the caller.
    await expect(service.getAccountInfoFromNetwork('GABC')).rejects.toThrow(
      'Stellar service is temporarily unavailable',
    );
    expect(mockHorizon.loadAccount).toHaveBeenCalledTimes(callsBefore);
    expect(breakers.getMetricsForBreaker(BREAKER)).toEqual(
      expect.objectContaining({ rejects: 1 }),
    );
  });

  it('moves through half-open back to closed after the network recovers', async () => {
    mockHorizon.loadAccount.mockRejectedValue(new Error('Horizon down'));
    for (let i = 0; i < 3; i++) {
      await expect(service.getAccountInfoFromNetwork('GABC')).rejects.toThrow();
    }
    expect(breakers.getMetricsForBreaker(BREAKER)?.state).toBe('OPEN');

    await new Promise((resolve) => setTimeout(resolve, 30));
    mockHorizon.loadAccount.mockResolvedValue({ balances: [] });

    await expect(service.getAccountInfoFromNetwork('GABC')).resolves.toEqual({
      balances: [],
    });
    expect(breakers.getMetricsForBreaker(BREAKER)?.state).toBe('CLOSED');
  });
});
