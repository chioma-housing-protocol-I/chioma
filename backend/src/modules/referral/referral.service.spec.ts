import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ReferralService } from './referral.service';
import { Referral, ReferralStatus } from './entities/referral.entity';
import { User } from '../users/entities/user.entity';
import { StellarService } from '../stellar/services/stellar.service';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

describe('ReferralService', () => {
  let service: ReferralService;
  let referralRepository: Repository<Referral>;
  let userRepository: Repository<User>;
  let stellarService: StellarService;
  let configService: ConfigService;

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

  const mockReferredUser: Partial<User> = {
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
    referralRepository = module.get<Repository<Referral>>(
      getRepositoryToken(Referral),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    stellarService = module.get<StellarService>(StellarService);
    configService = module.get<ConfigService>(ConfigService);

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('generateReferralCode', () => {
    it('should generate a unique referral code', async () => {
      mockUserRepository.findOne
        .mockResolvedValueOnce(null) // First call - code not found
        .mockResolvedValueOnce(mockReferrer); // Second call - code found

      const result = await service.generateReferralCode();

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBe(8); // 4 bytes * 2 hex chars
      expect(result).toMatch(/^[A-F0-9]{8}$/);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { referralCode: result },
      });
    });

    it.skip('should handle code collision and generate new code', async () => {
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

  describe('trackReferral', () => {
    it('should successfully track a referral', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockReferrer);
      mockReferralRepository.create.mockReturnValue(mockReferral);
      mockReferralRepository.save.mockResolvedValue(mockReferral);

      await service.trackReferral(mockReferredUser as User, 'ABC123');

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

      await service.trackReferral(mockReferredUser as User, 'INVALID');

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

      await service.trackReferral(mockReferredUser as User, 'ABC123');

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
