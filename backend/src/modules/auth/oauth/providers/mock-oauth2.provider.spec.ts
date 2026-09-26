import { MockOAuth2Provider } from '../providers/mock-oauth2.provider';
import { OAuth2ProviderConfig, OAuth2UserProfile } from '../oauth2.types';

describe('MockOAuth2Provider', () => {
  const config: OAuth2ProviderConfig = {
    baseUrl: 'https://mock-oauth-unit.test',
    clientId: 'unit-client',
    clientSecret: 'unit-secret',
    defaultRedirectUri: 'http://localhost/callback',
  };

  const profile: OAuth2UserProfile = {
    id: 'provider-user-1',
    email: 'mock@example.com',
    firstName: 'Mock',
    lastName: 'User',
  };

  let provider: MockOAuth2Provider;

  beforeEach(() => {
    provider = new MockOAuth2Provider(config);
    provider.registerHttpMocks();
  });

  afterEach(() => {
    provider.cleanup();
  });

  it('builds authorization URLs with state and redirect URI', () => {
    const url = provider.buildAuthorizationUrl(
      'state-123',
      config.defaultRedirectUri,
    );

    expect(url).toContain('/oauth/authorize');
    expect(url).toContain('state=state-123');
    expect(url).toContain(
      `redirect_uri=${encodeURIComponent(config.defaultRedirectUri)}`,
    );
  });

  it('tracks revoked tokens', () => {
    const token = 'token-to-revoke';
    provider.seedAccessToken(token, profile);
    provider.revokeTokenForTest(token);

    expect(provider.isTokenRevoked(token)).toBe(true);
  });

  it('issues unique authorization codes per profile', () => {
    const code1 = provider.issueAuthorizationCode(
      profile,
      config.defaultRedirectUri,
      'state-1',
    );
    const code2 = provider.issueAuthorizationCode(
      profile,
      config.defaultRedirectUri,
      'state-2',
    );

    expect(code1).not.toBe(code2);
    expect(code1).toContain(profile.id);
  });
});
