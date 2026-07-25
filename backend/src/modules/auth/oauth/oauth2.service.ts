import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { User, UserRole } from '../../users/entities/user.entity';
import { AuthService } from '../auth.service';
import { OAuth2ClientService } from './oauth2-client.service';
import { OAuthAccount } from './entities/oauth-account.entity';
import {
  OAuth2AuthResult,
  OAuth2AuthorizationResult,
  OAuth2LinkResult,
  OAuth2Provider,
  OAuth2UserProfile,
} from './oauth2.types';
import { OAUTH_STATE_EXPIRY_MINUTES } from '../../../common/constants/business-rules.constants';

const STATE_EXPIRY_MINUTES = OAUTH_STATE_EXPIRY_MINUTES;

interface PendingOAuthState {
  provider: OAuth2Provider;
  redirectUri: string;
  userId?: string;
  expiresAt: Date;
}

@Injectable()
export class OAuth2Service {
  private readonly logger = new Logger(OAuth2Service.name);
  private readonly pendingStates = new Map<string, PendingOAuthState>();
  private readonly providerTokens = new Map<
    string,
    { provider: OAuth2Provider; accessToken: string; refreshToken: string }
  >();

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(OAuthAccount)
    private readonly oauthAccountRepository: Repository<OAuthAccount>,
    private readonly oauth2Client: OAuth2ClientService,
    private readonly authService: AuthService,
  ) {}

  initiateAuthorization(
    provider: OAuth2Provider,
    redirectUri?: string,
  ): OAuth2AuthorizationResult {
    this.cleanupExpiredStates();
    const resolvedRedirectUri =
      redirectUri ??
      this.oauth2Client.getProviderConfig(provider).defaultRedirectUri;
    const state = crypto.randomBytes(24).toString('hex');

    this.pendingStates.set(state, {
      provider,
      redirectUri: resolvedRedirectUri,
      expiresAt: new Date(Date.now() + STATE_EXPIRY_MINUTES * 60 * 1000),
    });

    const authorizationUrl = this.oauth2Client.buildAuthorizationUrl(
      provider,
      state,
      resolvedRedirectUri,
    );

    return { authorizationUrl, state };
  }

  async completeAuthorization(
    provider: OAuth2Provider,
    code: string,
    state: string,
    redirectUri?: string,
  ): Promise<OAuth2AuthResult> {
    const pending = this.validateState(state, provider);
    const resolvedRedirectUri = redirectUri ?? pending.redirectUri;

    const tokenResponse = await this.oauth2Client.exchangeAuthorizationCode(
      provider,
      code,
      resolvedRedirectUri,
    );

    const profile = await this.oauth2Client.fetchUserProfile(
      provider,
      tokenResponse.access_token,
    );

    const user = await this.findOrCreateUser(profile);
    await this.ensureOAuthLink(user.id, provider, profile);

    const tokens = this.authService.generateTokens(
      user.id,
      user.email,
      user.role,
    );
    await this.authService.updateRefreshToken(user.id, tokens.refreshToken);

    this.storeProviderTokens(user.id, provider, tokenResponse);
    this.pendingStates.delete(state);

    this.logger.log(
      `OAuth2 login completed for user ${user.id} via ${provider}`,
    );

    return {
      user: this.authService.sanitizeUser(user) as OAuth2AuthResult['user'],
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      provider,
    };
  }

  async getUserProfile(
    provider: OAuth2Provider,
    accessToken: string,
  ): Promise<OAuth2UserProfile> {
    return this.oauth2Client.fetchUserProfile(provider, accessToken);
  }

  async linkAccount(
    userId: string,
    provider: OAuth2Provider,
    code: string,
    state: string,
    redirectUri?: string,
  ): Promise<OAuth2LinkResult> {
    const pending = this.validateState(state, provider);
    if (pending.userId && pending.userId !== userId) {
      throw new UnauthorizedException(
        'OAuth state does not match the current user',
      );
    }

    const resolvedRedirectUri = redirectUri ?? pending.redirectUri;
    const tokenResponse = await this.oauth2Client.exchangeAuthorizationCode(
      provider,
      code,
      resolvedRedirectUri,
    );

    const profile = await this.oauth2Client.fetchUserProfile(
      provider,
      tokenResponse.access_token,
    );

    const existingLink = await this.oauthAccountRepository.findOne({
      where: { provider, providerUserId: profile.id },
    });

    if (existingLink && existingLink.userId !== userId) {
      throw new ConflictException(
        'This provider account is already linked to another user',
      );
    }

    const link = await this.ensureOAuthLink(userId, provider, profile);
    this.storeProviderTokens(userId, provider, tokenResponse);
    this.pendingStates.delete(state);

    return {
      id: link.id,
      userId: link.userId,
      provider: link.provider,
      providerUserId: link.providerUserId,
      linkedAt: link.linkedAt,
    };
  }

  initiateAccountLink(
    userId: string,
    provider: OAuth2Provider,
    redirectUri?: string,
  ): OAuth2AuthorizationResult {
    const result = this.initiateAuthorization(provider, redirectUri);
    const pending = this.pendingStates.get(result.state);
    if (pending) {
      pending.userId = userId;
    }
    return result;
  }

  async logout(
    userId: string,
    provider?: OAuth2Provider,
  ): Promise<{ message: string; revoked: boolean }> {
    let revoked = false;

    if (provider) {
      const stored = this.providerTokens.get(this.tokenKey(userId, provider));
      if (stored) {
        await this.oauth2Client.revokeToken(provider, stored.accessToken);
        await this.oauth2Client.revokeToken(provider, stored.refreshToken);
        this.providerTokens.delete(this.tokenKey(userId, provider));
        revoked = true;
      }
    } else {
      for (const key of this.providerTokens.keys()) {
        if (key.startsWith(`${userId}:`)) {
          const stored = this.providerTokens.get(key);
          if (stored) {
            await this.oauth2Client.revokeToken(
              stored.provider,
              stored.accessToken,
            );
            await this.oauth2Client.revokeToken(
              stored.provider,
              stored.refreshToken,
            );
            this.providerTokens.delete(key);
            revoked = true;
          }
        }
      }
    }

    await this.authService.logout(userId);
    this.logger.log(`OAuth2 logout completed for user ${userId}`);

    return {
      message: 'Logged out successfully',
      revoked,
    };
  }

  async revokeProviderToken(
    provider: OAuth2Provider,
    token: string,
  ): Promise<void> {
    await this.oauth2Client.revokeToken(provider, token);
  }

  private validateState(
    state: string,
    provider: OAuth2Provider,
  ): PendingOAuthState {
    this.cleanupExpiredStates();
    const pending = this.pendingStates.get(state);

    if (!pending) {
      throw new UnauthorizedException('Invalid or expired OAuth state');
    }

    if (pending.provider !== provider) {
      throw new BadRequestException('OAuth provider mismatch');
    }

    if (pending.expiresAt < new Date()) {
      this.pendingStates.delete(state);
      throw new UnauthorizedException('OAuth state has expired');
    }

    return pending;
  }

  private async findOrCreateUser(profile: OAuth2UserProfile): Promise<User> {
    const normalizedEmail = profile.email.toLowerCase();
    let user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (!user) {
      user = this.userRepository.create({
        email: normalizedEmail,
        firstName: profile.firstName ?? null,
        lastName: profile.lastName ?? null,
        avatarUrl: profile.avatarUrl ?? null,
        role: UserRole.USER,
        emailVerified: true,
        isActive: true,
        password: undefined,
      });
      user = await this.userRepository.save(user);
      this.logger.log(`Created user via OAuth2: ${user.id}`);
    }

    return user;
  }

  private async ensureOAuthLink(
    userId: string,
    provider: OAuth2Provider,
    profile: OAuth2UserProfile,
  ): Promise<OAuthAccount> {
    const existing = await this.oauthAccountRepository.findOne({
      where: { userId, provider },
    });

    if (existing) {
      existing.providerUserId = profile.id;
      existing.email = profile.email;
      return this.oauthAccountRepository.save(existing);
    }

    const link = this.oauthAccountRepository.create({
      userId,
      provider,
      providerUserId: profile.id,
      email: profile.email,
    });

    return this.oauthAccountRepository.save(link);
  }

  private storeProviderTokens(
    userId: string,
    provider: OAuth2Provider,
    tokenResponse: { access_token: string; refresh_token: string },
  ): void {
    this.providerTokens.set(this.tokenKey(userId, provider), {
      provider,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
    });
  }

  private tokenKey(userId: string, provider: OAuth2Provider): string {
    return `${userId}:${provider}`;
  }

  private cleanupExpiredStates(): void {
    const now = new Date();
    for (const [state, pending] of this.pendingStates.entries()) {
      if (pending.expiresAt < now) {
        this.pendingStates.delete(state);
      }
    }
  }
}
