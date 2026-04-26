import { Test, TestingModule } from '@nestjs/testing';
import { ReferralController } from './referral.controller';
import { ReferralService } from './referral.service';
import { User, UserRole } from '../users/entities/user.entity';

describe('ReferralController', () => {
  let controller: ReferralController;
  let service: ReferralService;

  const mockUser: Partial<User> = {
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.USER,
    referralCode: 'ABC12345',
  };

  const mockReferralStats = {
    totalReferrals: 5,
    completedReferrals: 3,
    totalRewards: 30,
    referrals: [
      {
        id: 'ref-1',
        referredName: 'John Doe',
        status: 'completed',
        createdAt: new Date(),
        rewardAmount: 10,
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReferralController],
      providers: [
        {
          provide: ReferralService,
          useValue: {
            getReferralStats: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ReferralController>(ReferralController);
    service = module.get<ReferralService>(ReferralService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStats', () => {
    it('should return referral statistics for the current user', async () => {
      jest.spyOn(service, 'getReferralStats').mockResolvedValue(mockReferralStats);

      const result = await controller.getStats(mockUser as User);

      expect(result).toEqual(mockReferralStats);
      expect(service.getReferralStats).toHaveBeenCalledWith(mockUser.id);
      expect(service.getReferralStats).toHaveBeenCalledTimes(1);
    });

    it('should handle empty referral statistics', async () => {
      const emptyStats = {
        totalReferrals: 0,
        completedReferrals: 0,
        totalRewards: 0,
        referrals: [],
      };

      jest.spyOn(service, 'getReferralStats').mockResolvedValue(emptyStats);

      const result = await controller.getStats(mockUser as User);

      expect(result).toEqual(emptyStats);
      expect(result.totalReferrals).toBe(0);
      expect(result.referrals).toHaveLength(0);
    });
  });

  describe('getCode', () => {
    it('should return the user referral code', async () => {
      const result = await controller.getCode(mockUser as User);

      expect(result).toEqual({ referralCode: mockUser.referralCode });
    });

    it('should handle user without referral code', async () => {
      const userWithoutCode = { ...mockUser, referralCode: null };

      const result = await controller.getCode(userWithoutCode as User);

      expect(result).toEqual({ referralCode: null });
    });
  });
});