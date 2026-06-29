/**
 * Integration tests: OAuth2 authentication flow (issue #1120)
 * Covers authorization code flow, token exchange, profile retrieval,
 * account linking, logout, and token revocation with a mock OAuth2 provider.
 */
process.env.NODE_ENV = 'test';

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2ClientService } from '../oauth2-client.service';
import { OAuth2Service } from '../oauth2.service';
import { AuthService } from '../../auth.service';
import { User, UserRole } from '../../../users/entities/user.entity';
import { OAuthAccount } from '../entities/oauth-account.entity';
import { MockOAuth2Provider } from '../providers/mock-oauth2.provider';
import { OAuth2Provider } from '../oauth2.types';

describe('OAuth2 Integration (issue #1120)', () => {
  let oauth2Service: OAuth2Service;
  let oauth2Client: OAuth2ClientService;
  let mockProvider: MockOAuth2Provider;

  const redirectUri = 'http://localhost:3001/auth/oauth/callback';
  const providerConfig = {
    baseUrl: 'https://mock-oauth.test',
    clientId: 'chioma-test-client',
    clientSecret: 'chioma-test-secret',
    defaultRedirectUri: redirectUri,
  };

  const googleProfile = {
    id: 'google-user-123',
    email: 'oauth.user@example.com',
    firstName: 'OAuth',
    lastName: 'User',
    avatarUrl: 'https://example.com/avatar.png',
  };

  const existingUser: User = {
    id: 'existing-user-1',
    email: 'existing@example.com',
    password: 'hashed',
    firstName: 'Existing',
    lastName: 'User',
    role: UserRole.USER,
    emailVerified: true,
    isActive: true,
  } as User;

  const users: User[] = [];
  const oauthLinks: OAuthAccount[] = [];

  const mockUserRepository = {
    findOne: jest.fn(async ({ where }: { where: { email?: string; id?: string } }) => {
      if (where.email) {
        return users.find((u) => u.email === where.email) ?? null;
      }
      if (where.id) {
        return users.find((u) => u.id === where.id) ?? null;
      }
      return null;
    }),
    create: jest.fn((data: Partial<User>) => ({ id: `user-${Date.now()}`, ...data })),
    save: jest.fn(async (user: User) => {
      const idx = users.findIndex((u) => u.id === user.id);
      if (idx >= 0) {
        users[idx] = user;
      } else {
        users.push(user);
      }
      return user;
    }),
    update: jest.fn(async (_criteria, data: Partial<User>) => {
      const user = users.find((u) => u.id === existingUser.id);
      if (user) {
        Object.assign(user, data);
      }
    }),
  };

  const mockOAuthAccountRepository = {
    findOne: jest.fn(
      async ({
        where,
      }: {
        where: {
          userId?: string;
          provider?: OAuth2Provider;
          providerUserId?: string;
        };
      }) => {
        return (
          oauthLinks.find((link) => {
            if (where.userId && link.userId !== where.userId) return false;
            if (where.provider && link.provider !== where.provider) return false;
            if (
              where.providerUserId &&
              link.providerUserId !== where.providerUserId
            ) {
              return false;
            }
            return true;
          }) ?? null
        );
      },
    ),
    create: jest.fn(
      (data: Partial<OAuthAccount>) =>
        ({
          id: `link-${Date.now()}`,
          linkedAt: new Date(),
          ...data,
        }) as OAuthAccount,
    ),
    save: jest.fn(async (link: OAuthAccount) => {
      const idx = oauthLinks.findIndex((l) => l.id === link.id);
      if (idx >= 0) {
        oauthLinks[idx] = link;
      } else {
        oauthLinks.push(link);
      }
      return link;
    }),
  };

  const mockAuthService = {
    generateTokens: jest.fn((userId: string, email: string, role: string) => ({
      accessToken: `jwt-access-${userId}`,
      refreshToken: `jwt-refresh-${userId}`,
    })),
    updateRefreshToken: jest.fn(async () => undefined),
    sanitizeUser: jest.fn((user: User) => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    })),
    logout: jest.fn(async () => ({ message: 'Logged out successfully' })),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        OAUTH2_PROVIDER_URL: providerConfig.baseUrl,
        OAUTH2_CLIENT_ID: providerConfig.clientId,
        OAUTH2_CLIENT_SECRET: providerConfig.clientSecret,
        OAUTH2_REDIRECT_URI: providerConfig.defaultRedirectUri,
        JWT_SECRET: 'test-jwt-secret-key-minimum-32-characters-long',
        JWT_REFRESH_SECRET:
          'test-refresh-secret-key-minimum-32-characters-long',
      };
      return values[key];
    }),
  };

  beforeAll(async () => {
    mockProvider = new MockOAuth2Provider(providerConfig);
    mockProvider.registerHttpMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuth2Service,
        OAuth2ClientService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        {
          provide: getRepositoryToken(OAuthAccount),
          useValue: mockOAuthAccountRepository,
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn() },
        },
      ],
    }).compile();

    oauth2Service = module.get<OAuth2Service>(OAuth2Service);
    oauth2Client = module.get<OAuth2ClientService>(OAuth2ClientService);
  });

  afterAll(() => {
    mockProvider.cleanup();
  });

  beforeEach(() => {
    users.length = 0;
    oauthLinks.length = 0;
    jest.clearAllMocks();
    mockProvider.registerHttpMocks();
  });

  describe('Authorization code flow', () => {
    it('returns an authorization URL with state', () => {
      const result = oauth2Service.initiateAuthorization(
        OAuth2Provider.GOOGLE,
        redirectUri,
      );

      expect(result.authorizationUrl).toContain(providerConfig.baseUrl);
      expect(result.authorizationUrl).toContain('response_type=code');
      expect(result.authorizationUrl).toContain(`state=${result.state}`);
      expect(result.state).toHaveLength(48);
    });

    it('rejects callback with invalid state', async () => {
      const code = mockProvider.issueAuthorizationCode(
        googleProfile,
        redirectUri,
        'valid-state',
      );

      await expect(
        oauth2Service.completeAuthorization(
          OAuth2Provider.GOOGLE,
          code,
          'invalid-state',
          redirectUri,
        ),
      ).rejects.toThrow('Invalid or expired OAuth state');
    });

    it('rejects callback with provider mismatch', async () => {
      const { state } = oauth2Service.initiateAuthorization(
        OAuth2Provider.GOOGLE,
        redirectUri,
      );
      const code = mockProvider.issueAuthorizationCode(
        googleProfile,
        redirectUri,
        state,
      );

      await expect(
        oauth2Service.completeAuthorization(
          OAuth2Provider.GITHUB,
          code,
          state,
          redirectUri,
        ),
      ).rejects.toThrow('OAuth provider mismatch');
    });
  });

  describe('Token exchange and authentication', () => {
    it('completes the full OAuth2 login flow for a new user', async () => {
      const { state } = oauth2Service.initiateAuthorization(
        OAuth2Provider.GOOGLE,
        redirectUri,
      );
      const code = mockProvider.issueAuthorizationCode(
        googleProfile,
        redirectUri,
        state,
      );

      const result = await oauth2Service.completeAuthorization(
        OAuth2Provider.GOOGLE,
        code,
        state,
        redirectUri,
      );

      expect(result.user.email).toBe(googleProfile.email);
      expect(result.accessToken).toMatch(/^jwt-access-/);
      expect(result.refreshToken).toMatch(/^jwt-refresh-/);
      expect(result.provider).toBe(OAuth2Provider.GOOGLE);
      expect(mockAuthService.generateTokens).toHaveBeenCalled();
      expect(mockAuthService.updateRefreshToken).toHaveBeenCalled();
      expect(users).toHaveLength(1);
      expect(oauthLinks).toHaveLength(1);
    });

    it('logs in an existing user matched by email', async () => {
      users.push({ ...existingUser });

      const profile = {
        ...googleProfile,
        email: existingUser.email,
        id: 'google-existing-999',
      };

      const { state } = oauth2Service.initiateAuthorization(
        OAuth2Provider.GOOGLE,
        redirectUri,
      );
      const code = mockProvider.issueAuthorizationCode(
        profile,
        redirectUri,
        state,
      );

      const result = await oauth2Service.completeAuthorization(
        OAuth2Provider.GOOGLE,
        code,
        state,
        redirectUri,
      );

      expect(result.user.id).toBe(existingUser.id);
      expect(users).toHaveLength(1);
    });

    it('rejects reused authorization codes', async () => {
      const { state } = oauth2Service.initiateAuthorization(
        OAuth2Provider.GOOGLE,
        redirectUri,
      );
      const code = mockProvider.issueAuthorizationCode(
        googleProfile,
        redirectUri,
        state,
      );

      await oauth2Service.completeAuthorization(
        OAuth2Provider.GOOGLE,
        code,
        state,
        redirectUri,
      );

      const { state: state2 } = oauth2Service.initiateAuthorization(
        OAuth2Provider.GOOGLE,
        redirectUri,
      );

      await expect(
        oauth2Service.completeAuthorization(
          OAuth2Provider.GOOGLE,
          code,
          state2,
          redirectUri,
        ),
      ).rejects.toThrow();
    });
  });

  describe('User profile retrieval', () => {
    it('fetches profile from provider using access token', async () => {
      const { state } = oauth2Service.initiateAuthorization(
        OAuth2Provider.GOOGLE,
        redirectUri,
      );
      const code = mockProvider.issueAuthorizationCode(
        googleProfile,
        redirectUri,
        state,
      );

      const authResult = await oauth2Service.completeAuthorization(
        OAuth2Provider.GOOGLE,
        code,
        state,
        redirectUri,
      );

      const profile = await oauth2Service.getUserProfile(
        OAuth2Provider.GOOGLE,
        `mock_access_${googleProfile.id}`,
      );

      expect(profile.email).toBe(googleProfile.email);
      expect(profile.id).toBe(googleProfile.id);
      expect(authResult.user.email).toBe(profile.email);
    });

    it('rejects profile fetch with revoked token', async () => {
      const token = `mock_access_${googleProfile.id}`;
      mockProvider.seedAccessToken(token, googleProfile);
      await oauth2Service.revokeProviderToken(OAuth2Provider.GOOGLE, token);

      await expect(
        oauth2Service.getUserProfile(OAuth2Provider.GOOGLE, token),
      ).rejects.toThrow();
    });
  });

  describe('Account linking', () => {
    it('links a provider account to an authenticated user', async () => {
      users.push({ ...existingUser });

      const linkInit = oauth2Service.initiateAccountLink(
        existingUser.id,
        OAuth2Provider.GITHUB,
        redirectUri,
      );

      const githubProfile = {
        id: 'github-user-456',
        email: 'github-linked@example.com',
        firstName: 'Git',
        lastName: 'Hub',
      };

      const code = mockProvider.issueAuthorizationCode(
        githubProfile,
        redirectUri,
        linkInit.state,
      );

      const link = await oauth2Service.linkAccount(
        existingUser.id,
        OAuth2Provider.GITHUB,
        code,
        linkInit.state,
        redirectUri,
      );

      expect(link.userId).toBe(existingUser.id);
      expect(link.provider).toBe(OAuth2Provider.GITHUB);
      expect(link.providerUserId).toBe(githubProfile.id);
      expect(oauthLinks).toHaveLength(1);
    });

    it('prevents linking a provider account already owned by another user', async () => {
      users.push({ ...existingUser });
      users.push({
        ...existingUser,
        id: 'other-user-2',
        email: 'other@example.com',
      } as User);

      oauthLinks.push({
        id: 'existing-link',
        userId: 'other-user-2',
        provider: OAuth2Provider.GITHUB,
        providerUserId: 'github-taken-789',
        email: 'taken@example.com',
        linkedAt: new Date(),
      });

      const linkInit = oauth2Service.initiateAccountLink(
        existingUser.id,
        OAuth2Provider.GITHUB,
        redirectUri,
      );

      const code = mockProvider.issueAuthorizationCode(
        {
          id: 'github-taken-789',
          email: 'taken@example.com',
        },
        redirectUri,
        linkInit.state,
      );

      await expect(
        oauth2Service.linkAccount(
          existingUser.id,
          OAuth2Provider.GITHUB,
          code,
          linkInit.state,
          redirectUri,
        ),
      ).rejects.toThrow('already linked to another user');
    });
  });

  describe('Token refresh', () => {
    it('refreshes provider access tokens', async () => {
      const { state } = oauth2Service.initiateAuthorization(
        OAuth2Provider.GOOGLE,
        redirectUri,
      );
      const code = mockProvider.issueAuthorizationCode(
        googleProfile,
        redirectUri,
        state,
      );

      const initialTokens = await oauth2Client.exchangeAuthorizationCode(
        OAuth2Provider.GOOGLE,
        code,
        redirectUri,
      );

      const refreshed = await oauth2Client.refreshAccessToken(
        OAuth2Provider.GOOGLE,
        initialTokens.refresh_token,
      );

      expect(refreshed.access_token).toContain('mock_access_refreshed');
      expect(refreshed.refresh_token).toBe(initialTokens.refresh_token);
    });
  });

  describe('Logout and token revocation', () => {
    it('logs out and revokes provider tokens', async () => {
      const { state } = oauth2Service.initiateAuthorization(
        OAuth2Provider.GOOGLE,
        redirectUri,
      );
      const code = mockProvider.issueAuthorizationCode(
        googleProfile,
        redirectUri,
        state,
      );

      const authResult = await oauth2Service.completeAuthorization(
        OAuth2Provider.GOOGLE,
        code,
        state,
        redirectUri,
      );

      const accessToken = `mock_access_${googleProfile.id}`;
      expect(mockProvider.isTokenRevoked(accessToken)).toBe(false);

      const logoutResult = await oauth2Service.logout(
        authResult.user.id,
        OAuth2Provider.GOOGLE,
      );

      expect(logoutResult.message).toBe('Logged out successfully');
      expect(logoutResult.revoked).toBe(true);
      expect(mockAuthService.logout).toHaveBeenCalledWith(authResult.user.id);
      expect(mockProvider.isTokenRevoked(accessToken)).toBe(true);
    });

    it('revokes a specific provider token on demand', async () => {
      const token = 'mock_access_revoke_test';
      mockProvider.seedAccessToken(token, googleProfile);

      expect(mockProvider.isTokenRevoked(token)).toBe(false);
      await oauth2Service.revokeProviderToken(OAuth2Provider.GOOGLE, token);
      expect(mockProvider.isTokenRevoked(token)).toBe(true);
    });

    it('clears session even when no provider tokens are stored', async () => {
      users.push({ ...existingUser });

      const result = await oauth2Service.logout(existingUser.id);

      expect(result.message).toBe('Logged out successfully');
      expect(result.revoked).toBe(false);
      expect(mockAuthService.logout).toHaveBeenCalledWith(existingUser.id);
    });
  });
});
