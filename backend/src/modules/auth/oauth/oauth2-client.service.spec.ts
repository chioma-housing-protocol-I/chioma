import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as nock from 'nock';
import { OAuth2ClientService } from '../oauth2-client.service';
import { OAuth2Provider } from '../oauth2.types';

describe('OAuth2ClientService', () => {
  let service: OAuth2ClientService;
  const baseUrl = 'https://mock-oauth-client.test';

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        OAUTH2_PROVIDER_URL: baseUrl,
        OAUTH2_CLIENT_ID: 'test-client',
        OAUTH2_CLIENT_SECRET: 'test-secret',
        OAUTH2_REDIRECT_URI: 'http://localhost/callback',
      };
      return values[key];
    }),
  };

  beforeEach(async () => {
    nock.cleanAll();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuth2ClientService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<OAuth2ClientService>(OAuth2ClientService);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('builds authorization URL with required parameters', () => {
    const url = service.buildAuthorizationUrl(
      OAuth2Provider.GOOGLE,
      'state-abc',
      'http://localhost/callback',
    );

    expect(url).toContain(`${baseUrl}/oauth/authorize`);
    expect(url).toContain('client_id=test-client');
    expect(url).toContain('state=state-abc');
    expect(url).toContain('response_type=code');
  });

  it('exchanges authorization code for tokens', async () => {
    nock(baseUrl)
      .post('/oauth/token')
      .reply(200, {
        access_token: 'access-123',
        refresh_token: 'refresh-123',
        token_type: 'Bearer',
        expires_in: 3600,
      });

    const tokens = await service.exchangeAuthorizationCode(
      OAuth2Provider.GOOGLE,
      'code-123',
      'http://localhost/callback',
    );

    expect(tokens.access_token).toBe('access-123');
    expect(tokens.refresh_token).toBe('refresh-123');
  });

  it('fetches user profile with bearer token', async () => {
    nock(baseUrl)
      .get('/oauth/userinfo')
      .matchHeader('authorization', 'Bearer access-123')
      .reply(200, {
        sub: 'user-1',
        email: 'user@example.com',
        given_name: 'Test',
        family_name: 'User',
      });

    const profile = await service.fetchUserProfile(
      OAuth2Provider.GOOGLE,
      'access-123',
    );

    expect(profile.id).toBe('user-1');
    expect(profile.email).toBe('user@example.com');
    expect(profile.firstName).toBe('Test');
  });

  it('revokes provider token', async () => {
    nock(baseUrl).post('/oauth/revoke').reply(200, {});

    await expect(
      service.revokeToken(OAuth2Provider.GOOGLE, 'token-to-revoke'),
    ).resolves.toBeUndefined();
  });
});
