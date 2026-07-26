import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  OAuth2Provider,
  OAuth2ProviderConfig,
  OAuth2TokenResponse,
  OAuth2UserProfile,
} from './oauth2.types';

@Injectable()
export class OAuth2ClientService {
  private readonly http: AxiosInstance;
  private readonly configs: Map<OAuth2Provider, OAuth2ProviderConfig>;

  constructor(private readonly configService: ConfigService) {
    this.http = axios.create({ timeout: 10000 });
    this.configs = this.loadProviderConfigs();
  }

  getProviderConfig(provider: OAuth2Provider): OAuth2ProviderConfig {
    const config = this.configs.get(provider);
    if (!config) {
      throw new BadRequestException(`Unsupported OAuth2 provider: ${provider}`);
    }
    return config;
  }

  buildAuthorizationUrl(
    provider: OAuth2Provider,
    state: string,
    redirectUri: string,
  ): string {
    const config = this.getProviderConfig(provider);
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state,
      scope: 'openid email profile',
    });
    return `${config.baseUrl}/oauth/authorize?${params.toString()}`;
  }

  async exchangeAuthorizationCode(
    provider: OAuth2Provider,
    code: string,
    redirectUri: string,
  ): Promise<OAuth2TokenResponse> {
    const config = this.getProviderConfig(provider);
    const response = await this.http.post<OAuth2TokenResponse>(
      `${config.baseUrl}/oauth/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    return response.data;
  }

  async refreshAccessToken(
    provider: OAuth2Provider,
    refreshToken: string,
  ): Promise<OAuth2TokenResponse> {
    const config = this.getProviderConfig(provider);
    const response = await this.http.post<OAuth2TokenResponse>(
      `${config.baseUrl}/oauth/token`,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    return response.data;
  }

  async fetchUserProfile(
    provider: OAuth2Provider,
    accessToken: string,
  ): Promise<OAuth2UserProfile> {
    const config = this.getProviderConfig(provider);
    const response = await this.http.get<{
      sub: string;
      email: string;
      given_name?: string;
      family_name?: string;
      picture?: string;
    }>(`${config.baseUrl}/oauth/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return {
      id: response.data.sub,
      email: response.data.email,
      firstName: response.data.given_name,
      lastName: response.data.family_name,
      avatarUrl: response.data.picture,
    };
  }

  async revokeToken(provider: OAuth2Provider, token: string): Promise<void> {
    const config = this.getProviderConfig(provider);
    await this.http.post(
      `${config.baseUrl}/oauth/revoke`,
      new URLSearchParams({ token }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
  }

  private loadProviderConfigs(): Map<OAuth2Provider, OAuth2ProviderConfig> {
    const baseUrl =
      this.configService.get<string>('OAUTH2_PROVIDER_URL') ??
      'https://mock-oauth.test';
    const clientId =
      this.configService.get<string>('OAUTH2_CLIENT_ID') ??
      'chioma-test-client';
    const clientSecret =
      this.configService.get<string>('OAUTH2_CLIENT_SECRET') ??
      'chioma-test-secret';
    const defaultRedirectUri =
      this.configService.get<string>('OAUTH2_REDIRECT_URI') ??
      'http://localhost:3000/oauth/callback';

    const sharedConfig: OAuth2ProviderConfig = {
      baseUrl,
      clientId,
      clientSecret,
      defaultRedirectUri,
    };

    return new Map([
      [OAuth2Provider.GOOGLE, sharedConfig],
      [OAuth2Provider.GITHUB, sharedConfig],
    ]);
  }
}
