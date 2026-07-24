import * as bcrypt from 'bcryptjs';

import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { User, UserRole } from '../users/entities/user.entity';

import {
  AuthenticationError,
  DuplicateEntryError,
  ValidationError,
} from '../../common/errors/domain-errors';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../notifications/email.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { MfaDevice } from './entities/mfa-device.entity';
import { MfaService } from './services/mfa.service';
import { PasswordPolicyService } from './services/password-policy.service';
import { RegisterDto } from './dto/register.dto';
import { Repository } from 'typeorm';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReferralService } from '../referral/referral.service';
import { LoggerService } from '../../common/services/logger.service';
import { LockService } from '../../common/lock';

describe('AuthService', () => {
  let service: AuthService;
  let _userRepository: Repository<User>;
  let _jwtService: JwtService;
  let _configService: ConfigService;
  let emailService: EmailService;

  const mockUser: Partial<User> = {
    id: 'test-user-id',
    email: 'test@example.com',
    password: 'hashed-password',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.USER,
    isActive: true,
    emailVerified: true,
    failedLoginAttempts: 0,
    accountLockedUntil: null,
    resetTokenExpires: null,
    resetToken: null,
    refreshToken: null,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    phoneNumber: null,
    avatarUrl: null,
    verificationToken: null,
    verificationTokenExpires: null,
  };

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
      const config = {
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_EXPIRATION: '15m',
        JWT_REFRESH_EXPIRATION: '7d',
      };
      return config[key as never];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(MfaDevice),
          useValue: { findOne: jest.fn(), save: jest.fn() },
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PasswordPolicyService,
          useValue: {
            validatePassword: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
            sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: MfaService,
          useValue: {
            checkMfaRequired: jest.fn().mockResolvedValue(false),
            generateMfaToken: jest.fn().mockResolvedValue(undefined),
            verifyMfaToken: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ReferralService,
          useValue: {
            generateReferralCode: jest.fn().mockResolvedValue('REF12345'),
            trackReferral: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
        {
          provide: LockService,
          useValue: {
            withLock: jest.fn(
              async (
                _key: string,
                _ttlMs: number,
                fn: () => Promise<unknown>,
              ) => fn(),
            ),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    _userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    _jwtService = module.get<JwtService>(JwtService);
    _configService = module.get<ConfigService>(ConfigService);
    emailService = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerDto: RegisterDto = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        firstName: 'New',
        lastName: 'User',
        role: UserRole.USER,
      };

      const hashedPassword = 'hashed-password';
      const newUser = {
        ...mockUser,
        ...registerDto,
        passwordHash: hashedPassword,
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(newUser);
      mockUserRepository.save.mockResolvedValue(newUser);
      mockJwtService.sign
        .mockReturnValueOnce('mock-access-token')
        .mockReturnValueOnce('mock-refresh-token');
      jest.spyOn(bcrypt, 'hash').mockResolvedValue(hashedPassword as never);

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(registerDto.email);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.arrayContaining([
            expect.objectContaining({ email: registerDto.email }),
          ]),
          withDeleted: true,
        }),
      );
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        registerDto.email,
        expect.any(String),
      );
    });

    it('should throw DuplicateEntryError if email already exists', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.USER,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        DuplicateEntryError,
      );
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-token' as never);
      mockJwtService.sign
        .mockReturnValueOnce('mock-access-token')
        .mockReturnValueOnce('mock-refresh-token');

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(mockUser.email);
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.login(loginDto)).rejects.toThrow(
        AuthenticationError,
      );
    });

    it('should throw AuthenticationError for non-existent user', async () => {
      const loginDto: LoginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        AuthenticationError,
      );
    });

    it('should throw AuthenticationError for inactive account', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        AuthenticationError,
      );
    });

    it('should handle account lockout after failed attempts', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      const lockedUser = {
        ...mockUser,
        accountLockedUntil: new Date(Date.now() + 3600000),
      };

      mockUserRepository.findOne.mockResolvedValue(lockedUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.login(loginDto)).rejects.toThrow(
        AuthenticationError,
      );
    });
  });

  describe('forgotPassword', () => {
    it('should generate reset token for existing user', async () => {
      const forgotPasswordDto: ForgotPasswordDto = {
        email: 'test@example.com',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(result).toHaveProperty('message');
      expect(result.message).toContain('If an account exists');
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        forgotPasswordDto.email,
        expect.any(String),
      );
    });

    it('should return generic message for non-existent email (security)', async () => {
      const forgotPasswordDto: ForgotPasswordDto = {
        email: 'nonexistent@example.com',
      };

      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(result.message).toBeDefined();
      expect(result.message).toContain('If an account exists');
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const mockUserWithToken = {
        ...mockUser,
        passwordResetToken: 'hashed-token',
        resetTokenExpiresAt: new Date(Date.now() + 3600000),
      };

      const resetPasswordDto: ResetPasswordDto = {
        token: 'reset-token',
        newPassword: 'NewSecurePass123!',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUserWithToken);
      mockUserRepository.save.mockResolvedValue(mockUser);
      jest
        .spyOn(bcrypt, 'hash')
        .mockResolvedValue('new-hashed-password' as never);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.resetPassword(resetPasswordDto);

      expect(result).toHaveProperty('message');
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid token', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: 'invalid-token',
        newPassword: 'new-password',
      };

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        ValidationError,
      );
    });

    it('should throw BadRequestException for expired token', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: 'expired-token',
        newPassword: 'new-password',
      };

      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        resetTokenExpires: new Date(Date.now() - 3600000),
      });
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      await service.verifyEmail('valid-token');

      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException with invalid token', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe('resendVerificationEmail', () => {
    it('generates a token and sends the email for an unverified user', async () => {
      const unverifiedUser = {
        ...mockUser,
        emailVerified: false,
        verificationToken: null,
        verificationTokenExpires: null,
      };

      mockUserRepository.findOne.mockResolvedValue(unverifiedUser);
      mockUserRepository.save.mockImplementation(async (u: User) => u);

      const result = await service.resendVerificationEmail(mockUser.id!);

      expect(mockUserRepository.save).toHaveBeenCalledTimes(1);
      expect(unverifiedUser.verificationToken).toEqual(expect.any(String));
      expect(unverifiedUser.verificationTokenExpires).toBeInstanceOf(Date);
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        unverifiedUser.email,
        unverifiedUser.verificationToken,
      );
      expect(result.message).toContain('verification link');
    });

    it('reuses an existing unexpired token instead of overwriting it', async () => {
      const existingToken = 'existing-valid-token';
      const unverifiedUser = {
        ...mockUser,
        emailVerified: false,
        verificationToken: existingToken,
        verificationTokenExpires: new Date(Date.now() + 60 * 60 * 1000),
      };

      mockUserRepository.findOne.mockResolvedValue(unverifiedUser);
      mockUserRepository.save.mockImplementation(async (u: User) => u);

      await service.resendVerificationEmail(mockUser.id!);

      // The already-issued token (and its link) must remain valid.
      expect(unverifiedUser.verificationToken).toBe(existingToken);
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        unverifiedUser.email,
        existingToken,
      );
    });

    it('rotates an expired token', async () => {
      const expiredToken = 'expired-token';
      const unverifiedUser = {
        ...mockUser,
        emailVerified: false,
        verificationToken: expiredToken,
        verificationTokenExpires: new Date(Date.now() - 60 * 60 * 1000),
      };

      mockUserRepository.findOne.mockResolvedValue(unverifiedUser);
      mockUserRepository.save.mockImplementation(async (u: User) => u);

      await service.resendVerificationEmail(mockUser.id!);

      expect(unverifiedUser.verificationToken).not.toBe(expiredToken);
      expect(unverifiedUser.verificationToken).toEqual(expect.any(String));
    });

    it('is a no-op for an already-verified user', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        emailVerified: true,
      });

      const result = await service.resendVerificationEmail(mockUser.id!);

      expect(result.message).toContain('already verified');
      expect(mockUserRepository.save).not.toHaveBeenCalled();
      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('throws when the user does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.resendVerificationEmail('missing-id'),
      ).rejects.toThrow(ValidationError);
    });

    it('handles concurrent requests idempotently (single shared token)', async () => {
      const unverifiedUser = {
        ...mockUser,
        emailVerified: false,
        verificationToken: null,
        verificationTokenExpires: null,
      };

      // Both concurrent requests resolve the same user entity, mirroring two
      // requests that read the row before either has written a token.
      mockUserRepository.findOne.mockResolvedValue(unverifiedUser);
      mockUserRepository.save.mockImplementation(async (u: User) => u);

      await Promise.all([
        service.resendVerificationEmail(mockUser.id!),
        service.resendVerificationEmail(mockUser.id!),
      ]);

      const emailCalls = (emailService.sendVerificationEmail as jest.Mock).mock
        .calls;
      expect(emailCalls).toHaveLength(2);
      // Both emails carry the identical token — no request clobbered the other.
      expect(emailCalls[0][1]).toBe(emailCalls[1][1]);
      expect(unverifiedUser.verificationToken).toBe(emailCalls[0][1]);
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      mockUserRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.logout('test-user-id');

      expect(result).toHaveProperty('message');
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        { id: 'test-user-id' },
        { refreshToken: null },
      );
    });
  });

  describe('validateUserById', () => {
    it('should return user if exists', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.validateUserById('test-user-id');

      expect(result.id).toBe(mockUser.id);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.validateUserById('non-existent-id')).rejects.toThrow(
        AuthenticationError,
      );
    });
  });
});
