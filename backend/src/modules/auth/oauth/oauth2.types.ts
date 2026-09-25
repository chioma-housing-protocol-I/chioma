export enum OAuth2Provider {
  GOOGLE = 'google',
  GITHUB = 'github',
}

export interface OAuth2UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

export interface OAuth2TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface OAuth2AuthorizationResult {
  authorizationUrl: string;
  state: string;
}

export interface OAuth2AuthResult {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
  provider: OAuth2Provider;
}

export interface OAuth2LinkResult {
  id: string;
  userId: string;
  provider: OAuth2Provider;
  providerUserId: string;
  linkedAt: Date;
}

export interface OAuth2ProviderConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  defaultRedirectUri: string;
}
