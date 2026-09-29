import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserRole, AuthMethod } from './entities/user.entity';
import { UserNotificationPreference } from './entities/user-notification-preference.entity';
import { KycStatus } from '../kyc/kyc-status.enum';
import { AuditService } from '../audit/audit.service';

const baseUser: User = {
  id: 'u1',
  email: 'test@example.com',
  password: 'hashed',
  firstName: 'Test',
  lastName: 'User',
  phoneNumber: null,
  avatarUrl: null,
  role: UserRole.USER,
  emailVerified: true,
  emailCollectedAt: null,
  verificationToken: null,
  resetToken: null,
  resetTokenExpires: null,
  failedLoginAttempts: 0,
  accountLockedUntil: null,
  lastLoginAt: new Date(),
  isActive: true,
  walletAddress: null,
  authMethod: AuthMethod.PASSWORD,
  refreshToken: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  kycStatus: KycStatus.PENDING,
  loginCount: 0,
  preferredLanguage: 'en',
  timezone: 'UTC',
  twoFactorEnabled: false,
  emailNotifications: true,
  smsNotifications: false,
  marketingOptIn: false,
};

describe('UsersService — email onboarding', () => {
  let service: UsersService;

  const mockUserRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockAuditService = { log: jest.fn().mockResolvedValue(undefined) };

  const mockNotificationPreferenceRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        {
          provide: getRepositoryToken(UserNotificationPreference),
          useValue: mockNotificationPreferenceRepository,
        },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── markEmailCollected ───────────────────────────────────────────────────

  describe('markEmailCollected', () => {
    it('throws NotFoundException when user does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      await expect(service.markEmailCollected('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('sets emailCollectedAt when not previously set', async () => {
      const user = { ...baseUser, emailCollectedAt: null };
      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserRepository.save.mockImplementation(async (u: User) => u);

      const result = await service.markEmailCollected('u1');

      expect(result.emailCollectedAt).toBeInstanceOf(Date);
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ emailCollectedAt: expect.any(Date) }),
      );
    });

    it('is idempotent — preserves existing timestamp and skips save', async () => {
      const existing = new Date('2025-01-01T00:00:00Z');
      const user = { ...baseUser, emailCollectedAt: existing };
      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await service.markEmailCollected('u1');

      expect(result.emailCollectedAt).toEqual(existing);
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });
  });

  // ─── getEmailOnboardingStatus ─────────────────────────────────────────────

  describe('getEmailOnboardingStatus', () => {
    it('returns emailCollected false when emailCollectedAt is null', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        ...baseUser,
        emailCollectedAt: null,
      });

      const result = await service.getEmailOnboardingStatus('u1');

      expect(result.emailCollected).toBe(false);
      expect(result.emailCollectedAt).toBeNull();
    });

    it('returns emailCollected true when emailCollectedAt is set', async () => {
      const ts = new Date();
      mockUserRepository.findOne.mockResolvedValue({
        ...baseUser,
        emailCollectedAt: ts,
      });

      const result = await service.getEmailOnboardingStatus('u1');

      expect(result.emailCollected).toBe(true);
      expect(result.emailCollectedAt).toEqual(ts);
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      await expect(service.getEmailOnboardingStatus('ghost')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
