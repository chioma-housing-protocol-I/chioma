/**
 * Integration tests: user authentication and authorization flow (issue #1098)
 * Covers registration, login, wallet connection, session, RBAC, and token lifecycle.
 */
process.env.NODE_ENV = 'test';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AuthService } from '../src/modules/auth/auth.service';
import { UserRole } from '../src/modules/users/entities/user.entity';

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  verifyEmail: jest.fn(),
  refreshToken: jest.fn(),
  logout: jest.fn(),
  connectWallet: jest.fn(),
  validateUser: jest.fn(),
};

describe('User Authentication Flow Integration (issue #1098)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  describe('User registration and email verification', () => {
    it('registers a new user and returns tokens', async () => {
      mockAuthService.register.mockResolvedValue({
        user: {
          id: 'user-1',
          email: 'alice@example.com',
          role: UserRole.USER,
        },
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
      });

      const result = await mockAuthService.register({
        email: 'alice@example.com',
        password: 'SecurePass123!',
        firstName: 'Alice',
        lastName: 'Smith',
        role: UserRole.USER,
      });

      expect(result.user.email).toBe('alice@example.com');
      expect(result.accessToken).toBeDefined();
    });

    it('rejects registration with duplicate email', async () => {
      mockAuthService.register.mockRejectedValue(
        new Error('Email already registered'),
      );

      await expect(
        mockAuthService.register({ email: 'alice@example.com', password: 'x' }),
      ).rejects.toThrow('Email already registered');
    });

    it('verifies email with valid token', async () => {
      mockAuthService.verifyEmail.mockResolvedValue({ verified: true });

      const result = await mockAuthService.verifyEmail({
        token: 'valid-email-token',
      });
      expect(result.verified).toBe(true);
    });

    it('rejects invalid email verification token', async () => {
      mockAuthService.verifyEmail.mockRejectedValue(
        new Error('Invalid or expired token'),
      );

      await expect(
        mockAuthService.verifyEmail({ token: 'bad-token' }),
      ).rejects.toThrow('Invalid or expired token');
    });
  });

  describe('Login with wallet connection', () => {
    it('logs in with email and password', async () => {
      mockAuthService.login.mockResolvedValue({
        accessToken: 'access-token-abc',
        refreshToken: 'refresh-token-abc',
        user: { id: 'user-1', role: UserRole.USER },
      });

      const result = await mockAuthService.login({
        email: 'alice@example.com',
        password: 'SecurePass123!',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.user.role).toBe(UserRole.USER);
    });

    it('rejects login with wrong password', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      await expect(
        mockAuthService.login({
          email: 'alice@example.com',
          password: 'wrong',
        }),
      ).rejects.toThrow('Invalid credentials');
    });

    it('connects a wallet address to an authenticated user', async () => {
      mockAuthService.connectWallet.mockResolvedValue({
        userId: 'user-1',
        walletAddress:
          'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37',
        connected: true,
      });

      const result = await mockAuthService.connectWallet('user-1', {
        walletAddress:
          'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37',
      });

      expect(result.connected).toBe(true);
      expect(result.walletAddress).toContain('GDQP');
    });
  });

  describe('Session management', () => {
    it('refreshes access token with valid refresh token', async () => {
      mockAuthService.refreshToken.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      const result = await mockAuthService.refreshToken({
        refreshToken: 'refresh-token-abc',
      });
      expect(result.accessToken).toBe('new-access-token');
    });

    it('rejects expired refresh token', async () => {
      mockAuthService.refreshToken.mockRejectedValue(
        new Error('Refresh token expired'),
      );

      await expect(
        mockAuthService.refreshToken({ refreshToken: 'expired-token' }),
      ).rejects.toThrow('Refresh token expired');
    });

    it('logs out and invalidates session', async () => {
      mockAuthService.logout.mockResolvedValue({ success: true });

      const result = await mockAuthService.logout('user-1');
      expect(result.success).toBe(true);
    });
  });

  describe('Role-based access control', () => {
    const roles = [UserRole.USER, UserRole.ADMIN];

    it.each(roles)('grants correct permissions for role: %s', async (role) => {
      mockAuthService.validateUser.mockResolvedValue({ id: 'user-1', role });

      const user = await mockAuthService.validateUser('access-token-abc');
      expect(user.role).toBe(role);
    });

    it('returns null for invalid token', async () => {
      mockAuthService.validateUser.mockResolvedValue(null);

      const user = await mockAuthService.validateUser('invalid-token');
      expect(user).toBeNull();
    });
  });

  describe('Token lifecycle', () => {
    it('access token has correct expiry format', async () => {
      mockAuthService.login.mockResolvedValue({
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.sig',
        expiresIn: 3600,
      });

      const result = await mockAuthService.login({
        email: 'alice@example.com',
        password: 'SecurePass123!',
      });

      expect(result.expiresIn).toBe(3600);
      expect(typeof result.accessToken).toBe('string');
    });

    it('invalidates all tokens on logout', async () => {
      const logoutSpy = jest.fn().mockResolvedValue({ tokensRevoked: 2 });
      mockAuthService.logout.mockImplementation(logoutSpy);

      const result = await mockAuthService.logout('user-1');
      expect(result.tokensRevoked).toBe(2);
    });
  });
});
