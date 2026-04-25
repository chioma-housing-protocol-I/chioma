import * as bcrypt from 'bcryptjs';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User, UserRole } from '../users/entities/user.entity';
import { MfaDevice } from './entities/mfa-device.entity';
import { EmailService } from '../notifications/email.service';
import { MfaService } from './services/mfa.service';
import { PasswordPolicyService } from './services/password-policy.service';
import { ReferralService } from '../referral/referral.service';
import { LoggerService } from '../../common/services/logger.service';
import { LockService } from '../../common/lock';

describe('AuthService — comprehensive coverage', () => {
  let service: AuthService;

  const mockUser: User = {
    id: 'user-1',
    email: 'user@example.com',
    emailHash: 'hashed-email',
    password: 'hashed-password',
    firstName: 'Jane',
    lastName: 'Doe',
    role: UserRole.USER,
    isActive: true,
    emailVerified: true,
    failedLoginAttempts: 0,
    accountLockedUntil: null,
    resetToken: null,
    resetTokenExpires: null,
    refreshToken: 'hashed-refresh-token',
    verificationToken: null,
    lastLoginAt: new Date(),
    loginCount: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
    phoneNumber: null,
    avatarUrl: null,
  } as User;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const cfg: Record<string, string> = {
        JWT_SECRET: 'test-access-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_EXPIRATION: '15m',
        JWT_REFRESH_EXPIRATION: '7d',
      };
      return cfg[key];
    }),
  };

  const mockMfaService = {
    checkMfaRequired: jest.fn().mockResolvedValue(false),
    generateMfaToken: jest.fn(),
    verifyMfaToken: jest.fn(),
  };

  const mockPasswordPolicyService = {
    validatePassword: jest.fn().mockResolvedValue(undefined),
  };

  const mockEmailService = {
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  };

  const mockReferralService = {
    generateReferralCode: jest.fn().mockResolvedValue('REF12345'),
    trackReferral: jest.fn().mockResolvedValue(undefined),
  };

  const mockLoggerService = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        {
          provide: getRepositoryToken(MfaDevice),
          useValue: { findOne: jest.fn(), save: jest.fn() },
        },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PasswordPolicyService, useValue: mockPasswordPolicyService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: MfaService, useValue: mockMfaService },
        { provide: ReferralService, useValue: mockReferralService },
        { provide: LoggerService, useValue: mockLoggerService },
        {
          provide: LockService,
          useValue: {
            withLock: jest.fn(
              async (_k: string, _t: number, fn: () => Promise<unknown>) =>
                fn(),
            ),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ── generateTokens ────────────────────────────────────────────────────────

  describe('generateTokens', () => {
    it('returns both accessToken and refreshToken', () => {
      mockJwtService.sign
        .mockReturnValueOnce('access-jwt')
        .mockReturnValueOnce('refresh-jwt');

      const result = service.generateTokens(
        'user-1',
        'user@example.com',
        UserRole.USER,
      );

      expect(result).toEqual({
        accessToken: 'access-jwt',
        refreshToken: 'refresh-jwt',
      });
    });

    it('signs the access token with JWT_SECRET and type=access', () => {
      mockJwtService.sign.mockReturnValue('token');

      service.generateTokens('user-1', 'user@example.com', UserRole.USER);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'user-1', type: 'access' }),
        expect.objectContaining({ secret: 'test-access-secret' }),
      );
    });

    it('signs the refresh token with JWT_REFRESH_SECRET and type=refresh', () => {
      mockJwtService.sign.mockReturnValue('token');

      service.generateTokens('user-1', 'user@example.com', UserRole.USER);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'user-1', type: 'refresh' }),
        expect.objectContaining({ secret: 'test-refresh-secret' }),
      );
    });
  });

  // ── sanitizeUser ──────────────────────────────────────────────────────────

  describe('sanitizeUser', () => {
    it('removes the password field', () => {
      const sanitized = service.sanitizeUser(mockUser);
      expect(sanitized).not.toHaveProperty('password');
    });

    it('removes the refreshToken field', () => {
      const sanitized = service.sanitizeUser(mockUser);
      expect(sanitized).not.toHaveProperty('refreshToken');
    });

    it('removes the resetToken field', () => {
      const sanitized = service.sanitizeUser(mockUser);
      expect(sanitized).not.toHaveProperty('resetToken');
    });

    it('removes the verificationToken field', () => {
      const sanitized = service.sanitizeUser(mockUser);
      expect(sanitized).not.toHaveProperty('verificationToken');
    });

    it('retains public fields like id, email, and role', () => {
      const sanitized = service.sanitizeUser(mockUser);
      expect(sanitized.id).toBe('user-1');
      expect(sanitized.email).toBe('user@example.com');
      expect(sanitized.role).toBe(UserRole.USER);
    });
  });

  // ── refreshToken ──────────────────────────────────────────────────────────

  describe('refreshToken', () => {
    it('returns new tokens when the refresh token is valid', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-1',
        email: 'user@example.com',
        role: UserRole.USER,
        type: 'refresh',
      });
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest
        .spyOn(bcrypt, 'hash')
        .mockResolvedValue('new-hashed-refresh' as never);
      mockJwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');
      mockUserRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.refreshToken({
        refreshToken: 'valid-refresh-token',
      });

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
      expect(mockUserRepository.update).toHaveBeenCalled();
    });

    it('throws UnauthorizedException when token type is not "refresh"', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-1',
        email: 'user@example.com',
        role: UserRole.USER,
        type: 'access',
      });

      await expect(
        service.refreshToken({ refreshToken: 'access-token-used-as-refresh' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when the stored refresh token is revoked (null)', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-1',
        email: 'user@example.com',
        role: UserRole.USER,
        type: 'refresh',
      });
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        refreshToken: null,
      });

      await expect(
        service.refreshToken({ refreshToken: 'revoked-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user is not found', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'ghost-user',
        email: 'ghost@example.com',
        role: UserRole.USER,
        type: 'refresh',
      });
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.refreshToken({ refreshToken: 'unknown-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when bcrypt comparison fails (token mismatch)', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-1',
        email: 'user@example.com',
        role: UserRole.USER,
        type: 'refresh',
      });
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(
        service.refreshToken({ refreshToken: 'tampered-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when jwtService.verify throws', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(
        service.refreshToken({ refreshToken: 'expired-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── completeMfaLogin ──────────────────────────────────────────────────────

  describe('completeMfaLogin', () => {
    it('delegates to mfaService.verifyMfaToken and returns the result', async () => {
      const expectedResponse = {
        user: service.sanitizeUser(mockUser),
        accessToken: 'mfa-access-token',
        refreshToken: 'mfa-refresh-token',
        mfaRequired: false,
      };
      mockMfaService.verifyMfaToken.mockResolvedValue(expectedResponse);

      const result = await service.completeMfaLogin('mfa-otp-token');

      expect(mockMfaService.verifyMfaToken).toHaveBeenCalledWith(
        'mfa-otp-token',
        service,
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  // ── account lockout ───────────────────────────────────────────────────────

  describe('account lockout behavior', () => {
    it('increments failedLoginAttempts on each wrong password', async () => {
      const user = { ...mockUser, failedLoginAttempts: 3 };
      mockUserRepository.findOne.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
      mockUserRepository.save.mockResolvedValue({
        ...user,
        failedLoginAttempts: 4,
      });

      await expect(
        service.login({ email: 'user@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ failedLoginAttempts: 4 }),
      );
    });

    it('sets accountLockedUntil when failedLoginAttempts reaches 5', async () => {
      const user = { ...mockUser, failedLoginAttempts: 4 };
      mockUserRepository.findOne.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
      mockUserRepository.save.mockImplementation(async (u: typeof user) => u);

      await expect(
        service.login({ email: 'user@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          failedLoginAttempts: 5,
          accountLockedUntil: expect.any(Date),
        }),
      );
    });

    it('clears the lockout after the lockout period has passed', async () => {
      const pastLockout = new Date(Date.now() - 1000);
      const lockedUser = {
        ...mockUser,
        accountLockedUntil: pastLockout,
        failedLoginAttempts: 5,
      };
      mockUserRepository.findOne.mockResolvedValue(lockedUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed' as never);
      mockJwtService.sign
        .mockReturnValueOnce('acc-token')
        .mockReturnValueOnce('ref-token');
      mockUserRepository.save.mockImplementation(
        async (u: typeof lockedUser) => u,
      );
      mockUserRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.login({
        email: 'user@example.com',
        password: 'correct',
      });

      expect((result as any).accessToken).toBe('acc-token');
    });

    it('rejects login while account is still locked', async () => {
      const futureLockout = new Date(Date.now() + 30 * 60 * 1000);
      const lockedUser = { ...mockUser, accountLockedUntil: futureLockout };
      mockUserRepository.findOne.mockResolvedValue(lockedUser);

      await expect(
        service.login({ email: 'user@example.com', password: 'any-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── login with MFA required ───────────────────────────────────────────────

  describe('login — MFA branch', () => {
    it('delegates to mfaService.generateMfaToken when MFA is required', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed' as never);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue({ affected: 1 } as any);
      mockMfaService.checkMfaRequired.mockResolvedValue(true);
      const mfaResponse = { mfaRequired: true, mfaToken: 'pending-mfa-token' };
      mockMfaService.generateMfaToken.mockResolvedValue(mfaResponse);

      const result = await service.login({
        email: 'user@example.com',
        password: 'correct',
      });

      expect(mockMfaService.generateMfaToken).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user-1' }),
        service,
      );
      expect((result as any).mfaRequired).toBe(true);
    });
  });

  // ── service bootstrap ─────────────────────────────────────────────────────

  it('is defined', () => {
    expect(service).toBeDefined();
  });
});
