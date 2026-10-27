/**
 * OAuth state validation (issue #1861)
 * Covers generation, server-side storage, single-use consumption, expiry,
 * provider/user binding and redirect URI binding of the OAuth `state`.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { OAuth2Service } from '../oauth2.service';
import { OAuth2ClientService } from '../oauth2-client.service';
import { AuthService } from '../../auth.service';
import { User } from '../../../users/entities/user.entity';
import { OAuthAccount } from '../entities/oauth-account.entity';
import { OAuthState } from '../entities/oauth-state.entity';
import { OAuth2Provider } from '../oauth2.types';
import { OAUTH_STATE_EXPIRY_MINUTES } from '../../../../common/constants/business-rules.constants';

describe('OAuth state validation (issue #1861)', () => {
  let service: OAuth2Service;
  const states = new Map<string, OAuthState>();
  const redirectUri = 'http://localhost/callback';

  const mockOAuth2Client = {
    getProviderConfig: jest.fn(() => ({
      baseUrl: 'https://discord.test',
      clientId: 'client',
      clientSecret: 'secret',
      defaultRedirectUri: redirectUri,
    })),
    buildAuthorizationUrl: jest.fn(
      (_provider, state) => `https://discord.test/oauth/authorize?state=${state}`,
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
    findOne: jest.fn(async () => null),
    create: jest.fn((data) => ({ id: 'user-1', ...data })),
    save: jest.fn(async (user) => user),
  };

  const mockOAuthAccountRepository = {
    findOne: jest.fn(async () => null),
    create: jest.fn((data) => ({ id: 'link-1', linkedAt: new Date(), ...data })),
    save: jest.fn(async (link) => link),
  };

  const mockOAuthStateRepository = {
    create: jest.fn((data: Partial<OAuthState>) =>
      Object.assign(new OAuthState(), data),
    ),
    save: jest.fn(async (state: OAuthState) => {
      states.set(state.state, state);
      return state;
    }),
    findOne: jest.fn(
      async ({ where }: { where: { state: string } }) =>
        states.get(where.state) ?? null,
    ),
    delete: jest.fn(async (criteria: { state?: string }) => ({
      affected: criteria.state && states.delete(criteria.state) ? 1 : 0,
    })),
  };

  const mockSuccessfulProvider = () => {
    mockOAuth2Client.exchangeAuthorizationCode.mockResolvedValue({
      access_token: 'provider-access',
      refresh_token: 'provider-refresh',
      token_type: 'Bearer',
      expires_in: 604800,
    });
    mockOAuth2Client.fetchUserProfile.mockResolvedValue({
      id: 'discord-1',
      email: 'discord@example.com',
    });
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    states.clear();

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
        {
          provide: getRepositoryToken(OAuthState),
          useValue: mockOAuthStateRepository,
        },
      ],
    }).compile();

    service = module.get(OAuth2Service);
  });

  describe('generation and storage', () => {
    it('generates a 256-bit hex state that is unique per request', async () => {
      const a = await service.initiateAuthorization(OAuth2Provider.DISCORD);
      const b = await service.initiateAuthorization(OAuth2Provider.DISCORD);

      expect(a.state).toMatch(/^[a-f0-9]{64}$/);
      expect(b.state).toMatch(/^[a-f0-9]{64}$/);
      expect(a.state).not.toBe(b.state);
    });

    it('persists the state in the database before returning the URL', async () => {
      const before = Date.now();
      const { state } = await service.initiateAuthorization(
        OAuth2Provider.DISCORD,
      );

      const stored = states.get(state);
      expect(stored).toBeDefined();
      expect(stored?.provider).toBe(OAuth2Provider.DISCORD);
      expect(stored?.redirectUri).toBe(redirectUri);
      expect(stored?.expiresAt.getTime()).toBeGreaterThanOrEqual(
        before + OAUTH_STATE_EXPIRY_MINUTES * 60 * 1000,
      );
    });

    it('uses a 5 minute expiry by default', () => {
      expect(OAUTH_STATE_EXPIRY_MINUTES).toBe(5);
    });

    it('fails closed when the state cannot be stored', async () => {
      mockOAuthStateRepository.save.mockRejectedValueOnce(new Error('db down'));

      await expect(
        service.initiateAuthorization(OAuth2Provider.DISCORD),
      ).rejects.toThrow(InternalServerErrorException);
      expect(mockOAuth2Client.buildAuthorizationUrl).not.toHaveBeenCalled();
    });

    it('binds the linking user in the same insert', async () => {
      const { state } = await service.initiateAccountLink(
        'user-1',
        OAuth2Provider.DISCORD,
      );

      expect(mockOAuthStateRepository.save).toHaveBeenCalledTimes(1);
      expect(states.get(state)?.userId).toBe('user-1');
    });
  });

  describe('callback validation', () => {
    it('accepts a valid state and consumes it', async () => {
      mockSuccessfulProvider();
      const { state } = await service.initiateAuthorization(
        OAuth2Provider.DISCORD,
      );

      await service.completeAuthorization(OAuth2Provider.DISCORD, 'code', state);

      expect(states.has(state)).toBe(false);
    });

    it('rejects a replayed state', async () => {
      mockSuccessfulProvider();
      const { state } = await service.initiateAuthorization(
        OAuth2Provider.DISCORD,
      );
      await service.completeAuthorization(OAuth2Provider.DISCORD, 'code', state);

      await expect(
        service.completeAuthorization(OAuth2Provider.DISCORD, 'code', state),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('consumes the state even when the token exchange fails', async () => {
      mockOAuth2Client.exchangeAuthorizationCode.mockRejectedValueOnce(
        new Error('invalid_grant'),
      );
      const { state } = await service.initiateAuthorization(
        OAuth2Provider.DISCORD,
      );

      await expect(
        service.completeAuthorization(OAuth2Provider.DISCORD, 'code', state),
      ).rejects.toThrow('invalid_grant');
      expect(states.has(state)).toBe(false);
    });

    it('rejects a state consumed concurrently by another request', async () => {
      const { state } = await service.initiateAuthorization(
        OAuth2Provider.DISCORD,
      );
      mockOAuthStateRepository.delete.mockResolvedValueOnce({ affected: 0 });

      await expect(
        service.completeAuthorization(OAuth2Provider.DISCORD, 'code', state),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockOAuth2Client.exchangeAuthorizationCode).not.toHaveBeenCalled();
    });

    it.each([
      ['empty', ''],
      ['too short', 'abc123'],
      ['non-hex', 'z'.repeat(64)],
      ['uppercase hex', 'A'.repeat(64)],
      ['SQL-ish', "' OR 1=1 --"],
    ])('rejects a malformed (%s) state without a DB lookup', async (_, bad) => {
      await expect(
        service.completeAuthorization(OAuth2Provider.DISCORD, 'code', bad),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockOAuthStateRepository.findOne).not.toHaveBeenCalled();
    });

    it('rejects an unknown but well-formed state', async () => {
      await expect(
        service.completeAuthorization(
          OAuth2Provider.DISCORD,
          'code',
          'a'.repeat(64),
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an expired state', async () => {
      const { state } = await service.initiateAuthorization(
        OAuth2Provider.DISCORD,
      );
      states.get(state)!.expiresAt = new Date(Date.now() - 1000);

      await expect(
        service.completeAuthorization(OAuth2Provider.DISCORD, 'code', state),
      ).rejects.toThrow('OAuth provider mismatch or state expired');
      expect(states.has(state)).toBe(false);
    });

    it('rejects a state issued for a different provider', async () => {
      const { state } = await service.initiateAuthorization(
        OAuth2Provider.GITHUB,
      );

      await expect(
        service.completeAuthorization(OAuth2Provider.DISCORD, 'code', state),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a redirectUri that differs from the authorization request', async () => {
      const { state } = await service.initiateAuthorization(
        OAuth2Provider.DISCORD,
      );

      await expect(
        service.completeAuthorization(
          OAuth2Provider.DISCORD,
          'code',
          state,
          'https://attacker.example/callback',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockOAuth2Client.exchangeAuthorizationCode).not.toHaveBeenCalled();
    });
  });

  describe('account linking binding', () => {
    it('rejects a link state used by a different user', async () => {
      const { state } = await service.initiateAccountLink(
        'victim-user',
        OAuth2Provider.DISCORD,
      );

      await expect(
        service.linkAccount('attacker-user', OAuth2Provider.DISCORD, 'code', state),
      ).rejects.toThrow('OAuth state does not match the current user');
    });

    it('rejects a login state used to link an account', async () => {
      const { state } = await service.initiateAuthorization(
        OAuth2Provider.DISCORD,
      );

      await expect(
        service.linkAccount('user-1', OAuth2Provider.DISCORD, 'code', state),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a link state used for login', async () => {
      const { state } = await service.initiateAccountLink(
        'user-1',
        OAuth2Provider.DISCORD,
      );

      await expect(
        service.completeAuthorization(OAuth2Provider.DISCORD, 'code', state),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('cleanup', () => {
    it('deletes expired states', async () => {
      await service.cleanupExpiredStates();

      expect(mockOAuthStateRepository.delete).toHaveBeenCalledWith({
        expiresAt: expect.anything(),
      });
    });
  });
});
