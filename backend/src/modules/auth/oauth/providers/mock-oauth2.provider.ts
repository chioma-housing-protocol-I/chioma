import * as nock from 'nock';
import {
  OAuth2ProviderConfig,
  OAuth2TokenResponse,
  OAuth2UserProfile,
} from '../oauth2.types';

interface StoredAuthorizationCode {
  profile: OAuth2UserProfile;
  redirectUri: string;
  state: string;
  used: boolean;
}

function parseFormBody(body: unknown): Record<string, string> {
  if (typeof body === 'string') {
    return Object.fromEntries(new URLSearchParams(body));
  }
  if (body && typeof body === 'object') {
    return body as Record<string, string>;
  }
  return {};
}

/**
 * In-memory OAuth2 provider for development and integration testing.
 * Registers nock HTTP interceptors matching standard OAuth2 endpoints.
 */
export class MockOAuth2Provider {
  private readonly codes = new Map<string, StoredAuthorizationCode>();
  private readonly accessTokens = new Map<string, OAuth2UserProfile>();
  private readonly refreshTokens = new Map<string, string>();
  private readonly revokedTokens = new Set<string>();
  private nockScope: nock.Scope | null = null;

  constructor(readonly config: OAuth2ProviderConfig) {}

  issueAuthorizationCode(
    profile: OAuth2UserProfile,
    redirectUri: string,
    state: string,
  ): string {
    const code = `mock_code_${profile.id}_${Date.now()}`;
    this.codes.set(code, { profile, redirectUri, state, used: false });
    return code;
  }

  buildAuthorizationUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state,
      scope: 'openid email profile',
    });
    return `${this.config.baseUrl}/oauth/authorize?${params.toString()}`;
  }

  registerHttpMocks(): void {
    this.nockScope?.persist(false);
    nock.cleanAll();

    this.nockScope = nock(this.config.baseUrl)
      .persist()
      .post('/oauth/token')
      .reply(200, (_uri, body: unknown) => {
        const parsedBody = parseFormBody(body);
        const grantType = parsedBody.grant_type;

        if (grantType === 'authorization_code') {
          return this.exchangeAuthorizationCode(parsedBody);
        }

        if (grantType === 'refresh_token') {
          return this.refreshAccessToken(parsedBody.refresh_token);
        }

        return [400, { error: 'unsupported_grant_type' }];
      })
      .get('/oauth/userinfo')
      .reply(200, (_uri, _body, headers) => {
        const authHeader = headers.authorization ?? '';
        const token = authHeader.replace(/^Bearer\s+/i, '');
        if (!token || this.revokedTokens.has(token)) {
          return [401, { error: 'invalid_token' }];
        }

        const profile = this.accessTokens.get(token);
        if (!profile) {
          return [401, { error: 'invalid_token' }];
        }

        return {
          sub: profile.id,
          email: profile.email,
          given_name: profile.firstName,
          family_name: profile.lastName,
          picture: profile.avatarUrl,
        };
      })
      .post('/oauth/revoke')
      .reply(200, (_uri, body: unknown) => {
        const parsedBody = parseFormBody(body);
        const token = parsedBody.token;
        if (token) {
          this.revokedTokens.add(token);
          this.accessTokens.delete(token);
        }
        return {};
      });
  }

  cleanup(): void {
    this.nockScope?.persist(false);
    nock.cleanAll();
    this.nockScope = null;
    this.codes.clear();
    this.accessTokens.clear();
    this.refreshTokens.clear();
    this.revokedTokens.clear();
  }

  isTokenRevoked(token: string): boolean {
    return this.revokedTokens.has(token);
  }

  seedAccessToken(token: string, profile: OAuth2UserProfile): void {
    this.accessTokens.set(token, profile);
  }

  revokeTokenForTest(token: string): void {
    this.revokedTokens.add(token);
    this.accessTokens.delete(token);
  }

  private exchangeAuthorizationCode(
    body: Record<string, string>,
  ): OAuth2TokenResponse | [number, { error: string }] {
    const stored = this.codes.get(body.code);
    if (!stored || stored.used) {
      return [400, { error: 'invalid_grant' }];
    }

    if (stored.redirectUri !== body.redirect_uri) {
      return [400, { error: 'redirect_uri_mismatch' }];
    }

    if (body.client_id !== this.config.clientId) {
      return [401, { error: 'invalid_client' }];
    }

    if (body.client_secret !== this.config.clientSecret) {
      return [401, { error: 'invalid_client' }];
    }

    stored.used = true;
    const accessToken = `mock_access_${stored.profile.id}`;
    const refreshToken = `mock_refresh_${stored.profile.id}`;
    this.accessTokens.set(accessToken, stored.profile);
    this.refreshTokens.set(refreshToken, accessToken);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 3600,
    };
  }

  private refreshAccessToken(
    refreshToken: string,
  ): OAuth2TokenResponse | [number, { error: string }] {
    if (this.revokedTokens.has(refreshToken)) {
      return [401, { error: 'invalid_grant' }];
    }

    const accessToken = this.refreshTokens.get(refreshToken);
    if (!accessToken) {
      return [400, { error: 'invalid_grant' }];
    }

    const profile = this.accessTokens.get(accessToken);
    if (!profile) {
      return [400, { error: 'invalid_grant' }];
    }

    const newAccessToken = `mock_access_refreshed_${profile.id}_${Date.now()}`;
    this.accessTokens.set(newAccessToken, profile);
    this.refreshTokens.set(refreshToken, newAccessToken);

    return {
      access_token: newAccessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 3600,
    };
  }
}
