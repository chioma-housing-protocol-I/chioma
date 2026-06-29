import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { OAuth2Service } from '../oauth2.service';
import { OAuth2ClientService } from '../oauth2-client.service';
import { AuthService } from '../../auth.service';
import { User } from '../../../users/entities/user.entity';
import { OAuthAccount } from '../entities/oauth-account.entity';
import { OAuth2Provider } from '../oauth2.types';

describe('OAuth2Service', () => {
  let service: OAuth2Service;

  const mockOAuth2Client = {
    getProviderConfig: jest.fn(() => ({
      baseUrl: 'https://mock-oauth.test',
      clientId: 'client',
      clientSecret: 'secret',
      defaultRedirectUri: 'http://localhost/callback',
    })),
    buildAuthorizationUrl: jest.fn(
      (_provider, state, redirectUri) =>
        `https://mock-oauth.test/oauth/authorize?state=${state}&redirect_uri=${redirectUri}`,
    ),
    exchangeAuthorizationCode: jest.fn(),
    fetchUserProfile: jest.fn(),
    revokeToken: jest.fn(),
  };

  const mockAuthService = {
    generateTokens: jest.fn(() => ({
      accessToken: 'access',
      refreshToken: 'refresh',
    })),
    updateRefreshToken: jest.fn(),
    sanitizeUser: jest.fn((user: User) => user),
    logout: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn((data) => ({ id: 'new-user', ...data })),
    save: jest.fn((user) => Promise.resolve(user)),
    update: jest.fn(),
  };

  const mockOAuthAccountRepository = {
    findOne: jest.fn(),
    create: jest.fn((data) => ({ id: 'link-1', linkedAt: new Date(), ...data })),
    save: jest.fn((link) => Promise.resolve(link)),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuth2Service,
        { provide: OAuth2ClientService, useValue: mockOAuth2Client },
        { provide: AuthService, useValue: mockAuthService },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        {
          provide: getRepositoryToken(OAuthAccount),
          useValue: mockOAuthAccountRepository,
        },
      ],
    }).compile();

    service = module.get<OAuth2Service>(OAuth2Service);
  });

  describe('initiateAuthorization', () => {
    it('returns authorization URL and state', () => {
      const result = service.initiateAuthorization(OAuth2Provider.GOOGLE);

      expect(result.state).toHaveLength(48);
      expect(result.authorizationUrl).toContain(result.state);
      expect(mockOAuth2Client.buildAuthorizationUrl).toHaveBeenCalled();
    });
  });

  describe('completeAuthorization', () => {
    it('creates user and returns tokens on successful callback', async () => {
      const { state } = service.initiateAuthorization(OAuth2Provider.GOOGLE);

      mockOAuth2Client.exchangeAuthorizationCode.mockResolvedValue({
        access_token: 'provider-access',
        refresh_token: 'provider-refresh',
        token_type: 'Bearer',
        expires_in: 3600,
      });
      mockOAuth2Client.fetchUserProfile.mockResolvedValue({
        id: 'prov-1',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
      });
      mockUserRepository.findOne.mockResolvedValue(null);
      mockOAuthAccountRepository.findOne.mockResolvedValue(null);

      const result = await service.completeAuthorization(
        OAuth2Provider.GOOGLE,
        'auth-code',
        state,
      );

      expect(result.accessToken).toBe('access');
      expect(result.user.email).toBe('new@example.com');
      expect(mockAuthService.updateRefreshToken).toHaveBeenCalled();
    });

    it('throws when state is invalid', async () => {
      await expect(
        service.completeAuthorization(
          OAuth2Provider.GOOGLE,
          'code',
          'bad-state',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('linkAccount', () => {
    it('throws when provider account belongs to another user', async () => {
      const { state } = service.initiateAccountLink(
        'user-1',
        OAuth2Provider.GITHUB,
      );

      mockOAuth2Client.exchangeAuthorizationCode.mockResolvedValue({
        access_token: 'access',
        refresh_token: 'refresh',
        token_type: 'Bearer',
        expires_in: 3600,
      });
      mockOAuth2Client.fetchUserProfile.mockResolvedValue({
        id: 'gh-1',
        email: 'gh@example.com',
      });
      mockOAuthAccountRepository.findOne.mockResolvedValue({
        id: 'link-other',
        userId: 'other-user',
        provider: OAuth2Provider.GITHUB,
        providerUserId: 'gh-1',
        email: 'gh@example.com',
        linkedAt: new Date(),
      });

      await expect(
        service.linkAccount(
          'user-1',
          OAuth2Provider.GITHUB,
          'code',
          state,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('logout', () => {
    it('delegates session cleanup to AuthService', async () => {
      const result = await service.logout('user-1');

      expect(result.message).toBe('Logged out successfully');
      expect(mockAuthService.logout).toHaveBeenCalledWith('user-1');
    });
  });
});
