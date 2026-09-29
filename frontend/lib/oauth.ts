/**
 * OAuth2 sign-in helpers.
 * The backend brokers the provider handshake: we ask it for an authorization
 * URL, send the user there, and exchange the returned code for session tokens
 * at /auth/oauth/callback.
 */

import { apiClient } from '@/lib/api-client';

export type OAuthProvider = 'google' | 'github';

interface AuthorizationResponse {
  authorizationUrl: string;
  state: string;
}

export interface OAuthCallbackResult {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
  provider: OAuthProvider;
}

const OAUTH_STATE_KEY = 'chioma_oauth_state';
const OAUTH_PROVIDER_KEY = 'chioma_oauth_provider';

export function getOAuthRedirectUri(): string {
  return `${window.location.origin}/oauth/callback`;
}

/** Kicks off the flow: fetches the provider URL and navigates to it. */
export async function startOAuth(provider: OAuthProvider): Promise<void> {
  const redirectUri = getOAuthRedirectUri();
  const response = await apiClient.get<AuthorizationResponse>(
    `/auth/oauth/authorize?provider=${provider}&redirectUri=${encodeURIComponent(redirectUri)}`,
    { retries: 1 },
  );

  sessionStorage.setItem(OAUTH_STATE_KEY, response.data.state);
  sessionStorage.setItem(OAUTH_PROVIDER_KEY, provider);
  window.location.assign(response.data.authorizationUrl);
}

/** Completes the flow on /oauth/callback with the code returned by the provider. */
export async function completeOAuth(
  code: string,
  state: string,
): Promise<OAuthCallbackResult> {
  const provider = sessionStorage.getItem(
    OAUTH_PROVIDER_KEY,
  ) as OAuthProvider | null;
  const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY);

  if (!provider) {
    throw new Error('No OAuth flow in progress. Please try signing in again.');
  }
  if (expectedState && expectedState !== state) {
    throw new Error('OAuth state mismatch. Please try signing in again.');
  }

  const response = await apiClient.post<OAuthCallbackResult>(
    '/auth/oauth/callback',
    { provider, code, state, redirectUri: getOAuthRedirectUri() },
    { retries: 0 },
  );

  sessionStorage.removeItem(OAUTH_STATE_KEY);
  sessionStorage.removeItem(OAUTH_PROVIDER_KEY);

  return response.data;
}
