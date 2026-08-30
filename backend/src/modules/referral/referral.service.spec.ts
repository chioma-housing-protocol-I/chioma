import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryFailedError } from 'typeorm';
import { ReferralService } from './referral.service';
import { Referral, ReferralStatus } from './entities/referral.entity';
import { User } from '../users/entities/user.entity';
import { StellarService } from '../stellar/services/stellar.service';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { SystemError } from '../../common/errors/domain-errors';

describe('ReferralService', () => {
  let service: ReferralService;
  let _userRepository: Repository<User>;
  let _stellarService: StellarService;
  let _referralRepository: Repository<Referral>;
  let _configService: ConfigService;

  const mockReferral: Partial<Referral> = {
    id: 'test-referral-id',
    referrerId: 'referrer-id',
    referredId: 'referred-id',
    status: ReferralStatus.PENDING,
    rewardAmount: 10,
    rewardTxHash: null,
    convertedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockReferrer: Partial<User> = {
    id: 'referrer-id',
    email: 'referrer@example.com',
    firstName: 'John',
    lastName: 'Doe',
    referralCode: 'ABC123',
    walletAddress: 'GABC123...',
  };

  const mockReferredUser = {
    id: 'referred-id',
    email: 'referred@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    referredById: null,
  };

  const mockReferralRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockStellarService = {
    sendPayment: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        REFERRAL_REWARD_AMOUNT: 10,
        REFERRAL_REWARD_ASSET: 'USDC',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralService,
        {
          provide: getRepositoryToken(Referral),
          useValue: mockReferralRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: StellarService,
          useValue: mockStellarService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue({
              connect: jest.fn(),
              startTransaction: jest.fn(),
              commitTransaction: jest.fn(),
              rollbackTransaction: jest.fn(),
              release: jest.fn(),
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ReferralService>(ReferralService);
    _referralRepository = module.get<Repository<Referral>>(
      getRepositoryToken(Referral),
    );
    _userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    _stellarService = module.get<StellarService>(StellarService);
    _configService = module.get<ConfigService>(ConfigService);

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('generateReferralCode', () => {
    it('should generate a unique referral code', async () => {
      // The implementation returns as soon as the first lookup misses, so
      // only one findOne call is ever made here — queuing a second
      // resolved value would leak into the next test unconsumed.
      mockUserRepository.findOne.mockResolvedValueOnce(null);

      const result = await service.generateReferralCode();

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBe(8); // 4 bytes * 2 hex chars
      expect(result).toMatch(/^[A-F0-9]{8}$/);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { referralCode: result },
      });
    });

    it('should handle code collision and generate new code', async () => {
      mockUserRepository.findOne
        .mockResolvedValueOnce(mockReferrer) // First code exists
        .mockResolvedValueOnce(mockReferrer) // Second code also exists
        .mockResolvedValueOnce(mockReferrer) // Third code also exists
        .mockResolvedValueOnce(mockReferrer) // Fourth code also exists
        .mockResolvedValueOnce(mockReferrer) // Fifth code also exists
        .mockResolvedValueOnce(null); // Sixth code is unique

      const result = await service.generateReferralCode();

      expect(result).toBeDefined();
      expect(mockUserRepository.findOne).toHaveBeenCalledTimes(6);
    });
  });

  describe('assignUniqueReferralCode (#1601)', () => {
    function uniqueViolation(): QueryFailedError {
      const err = new QueryFailedError(
        'INSERT ...',
        [],
        new Error('duplicate key'),
      );
      (err as unknown as { code: string }).code = '23505';
      return err;
    }

    beforeEach(() => {
      // No pre-existing collisions found by the (racy) pre-check by default;
      // the real collision in these tests is simulated at the save() layer.
      mockUserRepository.findOne.mockResolvedValue(null);
    });

    it('succeeds on the first attempt when there is no collision', async () => {
      const save = jest.fn().mockResolvedValue({ id: 'user-1' });

      const { code, result } = await service.assignUniqueReferralCode(save);

      expect(code).toBeDefined();
      expect(result).toEqual({ id: 'user-1' });
      expect(save).toHaveBeenCalledTimes(1);
    });

    it('retries with a fresh code on a unique-constraint collision and eventually succeeds', async () => {
      const save = jest
        .fn()
        .mockRejectedValueOnce(uniqueViolation())
        .mockRejectedValueOnce(uniqueViolation())
        .mockResolvedValueOnce({ id: 'user-1' });

      const { result } = await service.assignUniqueReferralCode(save);

      expect(result).toEqual({ id: 'user-1' });
      expect(save).toHaveBeenCalledTimes(3);

      // Each retry attempt used a different generated code.
      const attemptedCodes = save.mock.calls.map(([code]) => code);
      expect(new Set(attemptedCodes).size).toBe(3);
    });

    it('does not retry a non-collision error and propagates it immediately', async () => {
      const otherError = new Error('database connection lost');
      const save = jest.fn().mockRejectedValue(otherError);

      await expect(service.assignUniqueReferralCode(save)).rejects.toThrow(
        'database connection lost',
      );
      expect(save).toHaveBeenCalledTimes(1);
    });

    it('is bounded: gives up after the max attempts and raises a domain error, never looping forever', async () => {
      const save = jest.fn().mockRejectedValue(uniqueViolation());

      await expect(service.assignUniqueReferralCode(save)).rejects.toThrow(
        SystemError,
      );
      // Exactly the bounded attempt count — proves this cannot spin forever.
      expect(save).toHaveBeenCalledTimes(5);
    });

    it('the bounded-exhaustion error does not leak the raw database error to the caller', async () => {
      const save = jest.fn().mockRejectedValue(uniqueViolation());

      await expect(service.assignUniqueReferralCode(save)).rejects.toThrow(
        /unique referral code/i,
      );
    });
  });

  describe('trackReferral', () => {
    it('should successfully track a referral', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockReferrer);
      mockReferralRepository.create.mockReturnValue(mockReferral);
      mockReferralRepository.save.mockResolvedValue(mockReferral);

      await service.trackReferral(mockReferredUser.id, 'ABC123');

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { referralCode: 'ABC123' },
      });
      expect(mockReferralRepository.create).toHaveBeenCalledWith({
        referrerId: mockReferrer.id,
        referredId: mockReferredUser.id,
        status: ReferralStatus.PENDING,
      });
      expect(mockReferralRepository.save).toHaveBeenCalled();
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        mockReferredUser.id,
        { referredById: mockReferrer.id },
      );
    });

    it('should not track referral if code does not exist', async () => {
      const loggerWarnSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation();

      mockUserRepository.findOne.mockResolvedValue(null);

      await service.trackReferral(mockReferredUser.id, 'INVALID');

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Referral code INVALID not found for user referred-id',
      );
      expect(mockReferralRepository.create).not.toHaveBeenCalled();
      expect(mockReferralRepository.save).not.toHaveBeenCalled();

      loggerWarnSpy.mockRestore();
    });

    it('should not allow self-referral', async () => {
      const loggerWarnSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation();

      mockUserRepository.findOne.mockResolvedValue({
        ...mockReferrer,
        id: mockReferredUser.id, // Same user
      });

      await service.trackReferral(mockReferredUser.id, 'ABC123');

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'User referred-id tried to refer themselves',
      );
      expect(mockReferralRepository.create).not.toHaveBeenCalled();

      loggerWarnSpy.mockRestore();
    });
  });

  describe('completeReferral', () => {
    it('should complete a pending referral and distribute reward', async () => {
      const pendingReferral = {
        ...mockReferral,
        status: ReferralStatus.PENDING,
      };
      mockReferralRepository.findOne.mockResolvedValue(pendingReferral);
      mockReferralRepository.save.mockResolvedValue({
        ...pendingReferral,
        status: ReferralStatus.REWARDED,
        rewardAmount: 10,
        rewardTxHash: 'fake_tx_hash',
        convertedAt: expect.any(Date),
      });
      mockUserRepository.findOne.mockResolvedValue(mockReferrer);

      await service.completeReferral('referred-id');

      expect(mockReferralRepository.findOne).toHaveBeenCalledWith({
        where: { referredId: 'referred-id', status: ReferralStatus.PENDING },
      });
      expect(mockReferralRepository.save).toHaveBeenCalledTimes(2); // Once in complete, once in distribute
    });

    it('should not complete if no pending referral exists', async () => {
      const loggerWarnSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation();

      mockReferralRepository.findOne.mockResolvedValue(null);

      await service.completeReferral('non-existent-id');

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'No pending referral found for user non-existent-id',
      );
      expect(mockReferralRepository.save).not.toHaveBeenCalled();

      loggerWarnSpy.mockRestore();
    });
  });

  describe('distributeReward', () => {
    it('should distribute reward successfully', async () => {
      const referral = { ...mockReferral, status: ReferralStatus.COMPLETED };
      mockUserRepository.findOne.mockResolvedValue(mockReferrer);

      // Access private method through type assertion
      await (service as any).distributeReward(referral);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: referral.referrerId },
      });
      expect(mockReferralRepository.save).toHaveBeenCalledWith({
        ...referral,
        status: ReferralStatus.REWARDED,
        rewardAmount: 10,
        rewardTxHash: expect.stringContaining('fake_stellar_tx_hash_'),
      });
    });

    it('should handle referrer without wallet address', async () => {
      const loggerErrorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();

      const referral = { ...mockReferral, status: ReferralStatus.COMPLETED };
      mockUserRepository.findOne.mockResolvedValue({
        ...mockReferrer,
        walletAddress: null,
      });

      await (service as any).distributeReward(referral);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Referrer referrer-id has no wallet address',
      );

      loggerErrorSpy.mockRestore();
    });

    it('should handle reward distribution errors', async () => {
      const loggerErrorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();

      const referral = { ...mockReferral, status: ReferralStatus.COMPLETED };
      mockUserRepository.findOne.mockResolvedValue(mockReferrer);
      mockReferralRepository.save.mockRejectedValue(
        new Error('Database error'),
      );

      await (service as any).distributeReward(referral);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to distribute reward: Database error',
      );

      loggerErrorSpy.mockRestore();
    });
  });

  describe('getReferralStats', () => {
    it('should return correct referral statistics', async () => {
      const referrals = [
        {
          id: '1',
          referrerId: 'referrer-id',
          referredId: 'referred-1',
          status: ReferralStatus.COMPLETED,
          rewardAmount: 10,
          createdAt: new Date(),
          referred: {
            firstName: 'John',
            lastName: 'Doe',
          },
        },
        {
          id: '2',
          referrerId: 'referrer-id',
          referredId: 'referred-2',
          status: ReferralStatus.PENDING,
          rewardAmount: 0,
          createdAt: new Date(),
          referred: {
            firstName: 'Jane',
            lastName: 'Smith',
          },
        },
        {
          id: '3',
          referrerId: 'referrer-id',
          referredId: 'referred-3',
          status: ReferralStatus.REWARDED,
          rewardAmount: 15,
          createdAt: new Date(),
          referred: {
            firstName: 'Bob',
            lastName: 'Wilson',
          },
        },
      ];

      mockReferralRepository.find.mockResolvedValue(referrals);

      const result = await service.getReferralStats('referrer-id');

      expect(result.totalReferrals).toBe(3);
      expect(result.completedReferrals).toBe(2); // COMPLETED + REWARDED
      expect(result.totalRewards).toBe(25); // 10 + 15
      expect(result.referrals).toHaveLength(3);
      expect(result.referrals[0]).toHaveProperty('referredName', 'John Doe');
    });

    it('should handle user with no referrals', async () => {
      mockReferralRepository.find.mockResolvedValue([]);

      const result = await service.getReferralStats('user-with-no-referrals');

      expect(result.totalReferrals).toBe(0);
      expect(result.completedReferrals).toBe(0);
      expect(result.totalRewards).toBe(0);
      expect(result.referrals).toEqual([]);
    });
  });
});
