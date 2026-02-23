import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthMetricsService } from './services/auth-metrics.service';
import { MfaService } from './services/mfa.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UserRole } from '../users/entities/user.entity';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthResponse = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.TENANT,
    },
    mfaRequired: false as const,
  };

  const mockMessageResponse = {
    message: 'Test message',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            refreshToken: jest.fn(),
            forgotPassword: jest.fn(),
            resetPassword: jest.fn(),
            logout: jest.fn(),
            completeMfaLogin: jest.fn(),
          },
        },
        {
          provide: AuthMetricsService,
          useValue: {
            recordAuthAttempt: jest.fn(),
          },
        },
        {
          provide: MfaService,
          useValue: {
            verifyTotpToken: jest.fn(),
            verifyBackupCode: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn(), verify: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto: RegisterDto = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        firstName: 'New',
        lastName: 'User',
        role: UserRole.TENANT,
      };

      jest.spyOn(service, 'register').mockResolvedValue(mockAuthResponse);

      const mockReq = { get: jest.fn(), ip: '127.0.0.1' } as any;
      const mockRes = { cookie: jest.fn(), clearCookie: jest.fn() } as any;
      const result = await controller.register(registerDto, mockReq, mockRes);

      const expected = { ...mockAuthResponse } as any;
      delete expected.refreshToken;
      expect(result).toEqual(expected);
      expect(service.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('login', () => {
    it('should login user', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      jest.spyOn(service, 'login').mockResolvedValue(mockAuthResponse);

      const mockReq = { get: jest.fn(), ip: '127.0.0.1' } as any;
      const mockRes = { cookie: jest.fn(), clearCookie: jest.fn() } as any;
      const result = await controller.login(loginDto, mockReq, mockRes);

      const expected = { ...mockAuthResponse } as any;
      delete expected.refreshToken;
      delete expected.mfaRequired; // controller strips mfaRequired from the login response body
      expect(result).toEqual(expected);
      expect(service.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('refresh', () => {
    it('should refresh access token', async () => {
      const refreshTokenDto = {
        refreshToken: 'mock-refresh-token',
      };

      const mockRefreshResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      jest
        .spyOn(service, 'refreshToken')
        .mockResolvedValue(mockRefreshResponse);

      const mockReq = { cookies: {}, ip: '127.0.0.1', get: jest.fn() } as any;
      const mockRes = { cookie: jest.fn(), clearCookie: jest.fn() } as any;

      const result = await controller.refreshTokens(
        refreshTokenDto,
        mockReq,
        mockRes,
      );

      expect(result).toEqual({ accessToken: mockRefreshResponse.accessToken });
      expect(service.refreshToken).toHaveBeenCalledWith(refreshTokenDto);
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset email', async () => {
      const forgotPasswordDto: ForgotPasswordDto = {
        email: 'test@example.com',
      };

      jest
        .spyOn(service, 'forgotPassword')
        .mockResolvedValue(mockMessageResponse);

      const result = await controller.forgotPassword(forgotPasswordDto);

      expect(result).toEqual(mockMessageResponse);
      expect(service.forgotPassword).toHaveBeenCalledWith(forgotPasswordDto);
    });
  });

  describe('resetPassword', () => {
    it('should reset password', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: 'reset-token',
        newPassword: 'NewSecurePass123!',
      };

      jest
        .spyOn(service, 'resetPassword')
        .mockResolvedValue(mockMessageResponse);

      const result = await controller.resetPassword(resetPasswordDto);

      expect(result).toEqual(mockMessageResponse);
      expect(service.resetPassword).toHaveBeenCalledWith(resetPasswordDto);
    });
  });

  describe('logout', () => {
    it('should logout user', async () => {
      const mockUser = {
        id: 'test-user-id',
      } as any;

      jest.spyOn(service, 'logout').mockResolvedValue(mockMessageResponse);

      const mockRes = { cookie: jest.fn(), clearCookie: jest.fn() } as any;
      const result = await controller.logout(mockUser, mockRes);

      expect(result).toEqual(mockMessageResponse);
      expect(service.logout).toHaveBeenCalledWith('test-user-id');
    });
  });
});
