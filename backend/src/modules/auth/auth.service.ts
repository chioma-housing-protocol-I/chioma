import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { EncryptedCacheService } from '../../common/cache/encrypted-cache.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { EmailService } from '../notifications/email.service';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import {
  AuthSuccessResponseDto,
  MfaRequiredResponseDto,
  MessageResponseDto,
} from './dto/auth-response.dto';
import { PasswordPolicyService } from './services/password-policy.service';
import { MfaService } from './services/mfa.service';
import { ReferralService } from '../referral/referral.service';
import { QueueManagementService } from '../queues/services/queue-management.service';
import { LoggerService } from '../../common/services/logger.service';
import { Logging } from '../../common/logger/logging.decorator';
import { Locked, LockService } from '../../common/lock';
import {
  AuthenticationError,
  ValidationError,
  DuplicateEntryError,
} from '../../common/errors/domain-errors';
import { ErrorCode } from '../../common/errors/error-codes';
import { ValidationUtils } from '../../common/utils/validation/validation.utils';

import {
  BCRYPT_SALT_ROUNDS,
  MAX_FAILED_LOGIN_ATTEMPTS,
  LOCKOUT_DURATION_MINUTES,
  PASSWORD_RESET_TOKEN_EXPIRY_HOURS,
  JWT_ACCESS_TOKEN_EXPIRY,
  JWT_REFRESH_TOKEN_EXPIRY,
} from '../../common/constants/business-rules.constants';

const SALT_ROUNDS = BCRYPT_SALT_ROUNDS;
const MAX_FAILED_ATTEMPTS = MAX_FAILED_LOGIN_ATTEMPTS;
const RESET_TOKEN_EXPIRY_HOURS = PASSWORD_RESET_TOKEN_EXPIRY_HOURS;
const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private passwordPolicyService: PasswordPolicyService,
    private emailService: EmailService,
    private mfaService: MfaService,
    private referralService: ReferralService,
    private readonly loggerService: LoggerService,
    private readonly lockService: LockService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly encryptedCache: EncryptedCacheService,
    @Optional()
    private readonly queueManagementService?: QueueManagementService,
  ) {}

  @Logging({ service: 'AuthService' })
  @Locked({
    key: (registerDto: RegisterDto) =>
      `user:register:${registerDto.email?.toLowerCase() ?? 'unknown'}`,
    ttlMs: 5000,
  })
  async register(registerDto: RegisterDto): Promise<AuthSuccessResponseDto> {
    const { email, password, firstName, lastName, role, referralCode } =
      registerDto;
    const normalizedEmail = email.toLowerCase();

    // Validate password against policy
    await this.passwordPolicyService.validatePassword(password);

    const existingUser = await this.findUserByEmail(normalizedEmail, true);

    if (existingUser) {
      if (existingUser.deletedAt) {
        throw new DuplicateEntryError(
          'This email is associated with a deleted account. Please restore your account to continue.',
        );
      }
      this.logger.warn(`Registration attempt for existing email: ${email}`);
      throw new DuplicateEntryError('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const userReferralCode = await this.referralService.generateReferralCode();

    const user = this.userRepository.create({
      email: normalizedEmail,
      emailHash: this.hashLookupValue(normalizedEmail),
      password: hashedPassword,
      firstName,
      lastName,
      role,
      emailVerified: false,
      failedLoginAttempts: 0,
      isActive: true,
      referralCode: userReferralCode,
    });

    const verificationToken = this.issueVerificationToken(user);

    const savedUser = await this.userRepository.save(user);

    // Track referral if code provided. Queued with retry so a transient
    // failure doesn't silently drop the referral; a permanent failure
    // raises a critical alert instead of just a log line.
    if (referralCode) {
      void this.enqueueReferralTracking(savedUser.id, referralCode);
    }

    this.logger.log(`User registered successfully: ${savedUser.id}`);

    // Send verification email asynchronously via the retrying email queue
    // rather than firing-and-forgetting the direct send.
    void this.enqueueVerificationEmail(
      savedUser.id,
      normalizedEmail,
      verificationToken,
    );

    const { accessToken, refreshToken } = this.generateTokens(
      savedUser.id,
      savedUser.email,
      savedUser.role,
    );

    await this.updateRefreshToken(savedUser.id, refreshToken);

    return {
      user: this.sanitizeUser(savedUser),
      accessToken,
      refreshToken,
      mfaRequired: false,
    };
  }

  async login(
    loginDto: LoginDto,
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthSuccessResponseDto | MfaRequiredResponseDto> {
    const { email, password } = loginDto;

    const user = await this.findUserByEmail(email.toLowerCase());

    if (!user) {
      this.logger.warn(`Login attempt for non-existent user: ${email}`);
      throw new AuthenticationError(
        ErrorCode.AUTH_INVALID_CREDENTIALS,
        'Invalid email or password',
      );
    }

    if (!user.isActive) {
      this.logger.warn(`Login attempt for inactive account: ${email}`);
      throw new AuthenticationError(
        ErrorCode.AUTH_ACCOUNT_DISABLED,
        'Invalid email or password',
      );
    }

    this.checkAccountLocked(user);

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      await this.handleFailedLogin(user);
      this.logger.warn(`Failed login attempt for user: ${email}`);
      throw new AuthenticationError(
        ErrorCode.AUTH_INVALID_CREDENTIALS,
        'Invalid email or password',
      );
    }

    // Account takeover detection: flag anomalous logins before issuing tokens
    await this.detectLoginAnomaly(user, context);

    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;
    user.lastLoginAt = new Date();
    user.loginCount = (user.loginCount || 0) + 1;

    await this.userRepository.save(user);

    const mfaCheck = await this.mfaService.checkMfaRequired(user.id);

    if (mfaCheck) {
      return await this.mfaService.generateMfaToken(user, this);
    }

    this.logger.log(`User logged in successfully: ${user.id}`);

    const { accessToken, refreshToken } = this.generateTokens(
      user.id,
      user.email,
      user.role,
    );

    await this.updateRefreshToken(user.id, refreshToken);

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
      mfaRequired: false,
    };
  }

  /**
   * Complete login after MFA verification
   */
  async completeMfaLogin(mfaToken: string): Promise<AuthSuccessResponseDto> {
    return this.mfaService.verifyMfaToken(mfaToken, this);
  }

  async refreshToken(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { refreshToken } = refreshTokenDto;

    try {
      const payload = this.jwtService.verify<{
        sub: string;
        email: string;
        role: string;
        type: string;
      }>(refreshToken, {
        secret: this.getJwtRefreshSecret(),
      });

      if (!ValidationUtils.validateTokenType(payload, 'refresh')) {
        throw new AuthenticationError(
          ErrorCode.AUTH_TOKEN_INVALID,
          'Invalid token type',
        );
      }

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || !user.refreshToken) {
        throw new AuthenticationError(
          ErrorCode.AUTH_USER_NOT_FOUND,
          'User not found or token revoked',
        );
      }

      if (!user.isActive) {
        throw new AuthenticationError(
          ErrorCode.AUTH_ACCOUNT_DISABLED,
          'Account is inactive',
        );
      }

      const isValidRefreshToken = await bcrypt.compare(
        refreshToken,
        user.refreshToken,
      );

      if (!isValidRefreshToken) {
        this.logger.warn(`Invalid refresh token for user: ${user.id}`);
        throw new AuthenticationError(
          ErrorCode.AUTH_TOKEN_INVALID,
          'Invalid refresh token',
        );
      }

      // Token rotation: generate new tokens and invalidate old refresh token
      const tokens = this.generateTokens(user.id, user.email, user.role);

      // Invalidate old refresh token before setting new one (token rotation)
      await this.updateRefreshToken(user.id, tokens.refreshToken);

      this.logger.log(`Token refreshed and rotated for user: ${user.id}`);

      return tokens;
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Invalid or expired refresh token';
      this.logger.error(`Token refresh failed: ${message}`);
      throw new AuthenticationError(
        ErrorCode.AUTH_TOKEN_INVALID,
        'Invalid or expired refresh token',
      );
    }
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<MessageResponseDto> {
    const { email } = forgotPasswordDto;
    const normalizedEmail = email.toLowerCase();

    const user = await this.findUserByEmail(normalizedEmail);

    if (!user) {
      this.logger.warn(
        `Password reset request for non-existent email: ${email}`,
      );
      return {
        message:
          'If an account exists with this email, you will receive a password reset link',
      };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.resetToken = hashedToken;
    user.resetTokenExpires = new Date(
      Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
    );

    await this.userRepository.save(user);
    this.logger.log(`Password reset token generated for user: ${user.id}`);

    // Send password reset email asynchronously
    this.emailService
      .sendPasswordResetEmail(normalizedEmail, resetToken)
      .catch((error) =>
        this.logger.error(
          `Failed to send password reset email for ${user.email}`,
          error,
        ),
      );

    return {
      message:
        'If an account exists with this email, you will receive a password reset link',
    };
  }

  public getJwtSecret(): string {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    return secret;
  }

  private getJwtRefreshSecret(): string {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET environment variable is required');
    }
    return secret;
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<MessageResponseDto> {
    const { token, newPassword } = resetPasswordDto;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.userRepository.findOne({
      where: { resetToken: hashedToken },
    });

    if (!user) {
      this.logger.warn('Password reset attempt with invalid token');
      throw new ValidationError('Invalid or expired reset token');
    }

    if (!user.resetTokenExpires || user.resetTokenExpires < new Date()) {
      this.logger.warn(`Expired password reset token for user: ${user.id}`);
      throw new ValidationError('Reset token has expired');
    }

    this.checkAccountLocked(user);

    // Validate new password against policy
    await this.passwordPolicyService.validatePassword(newPassword, user.id);

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpires = null;
    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;

    await this.userRepository.save(user);
    this.logger.log(`Password reset successful for user: ${user.id}`);

    return {
      message:
        'Password has been reset successfully. Please log in with your new password',
    };
  }

  async verifyEmail(token: string): Promise<MessageResponseDto> {
    const user = await this.userRepository.findOne({
      where: { verificationToken: token },
    });

    if (!user) {
      this.logger.warn('Email verification attempt with invalid token');
      throw new ValidationError('Invalid verification token');
    }

    user.emailVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpires = null;

    await this.userRepository.save(user);
    this.logger.log(`Email verified for user: ${user.id}`);

    return {
      message: 'Email verified successfully',
    };
  }

  /**
   * Attaches an email address (and optionally a name) to a wallet-only
   * account, then sends a verification link through the same flow used
   * during normal registration.
   *
   * Locked per-user so concurrent calls can't each generate and save a
   * different verification token (last write wins, silently invalidating
   * whichever token was already emailed out). Once a token is pending for
   * the same unverified email, it's reused rather than regenerated.
   */
  @Locked({
    key: (userId: string) => `user:verification:${userId}`,
    ttlMs: 5000,
  })
  async completeProfile(
    userId: string,
    dto: CompleteProfileDto,
  ): Promise<MessageResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new ValidationError('User not found');
    }

    const normalizedEmail = dto.email.toLowerCase();
    const existingUser = await this.findUserByEmail(normalizedEmail, true);

    if (existingUser && existingUser.id !== user.id) {
      throw new DuplicateEntryError('Email already registered');
    }

    const emailChanged = user.email !== normalizedEmail;

    user.email = normalizedEmail;
    user.emailHash = this.hashLookupValue(normalizedEmail);
    user.emailVerified = false;
    if (dto.firstName) user.firstName = dto.firstName;
    if (dto.lastName) user.lastName = dto.lastName;

    // A change of email invalidates any token minted for the previous address;
    // otherwise reuse an existing, unexpired token so concurrent requests stay
    // idempotent and links already delivered keep working.
    if (emailChanged) {
      user.verificationToken = null;
      user.verificationTokenExpires = null;
    }
    const verificationToken = this.issueVerificationToken(user);

    await this.userRepository.save(user);
    this.logger.log(`Profile completed for wallet user: ${user.id}`);

    this.emailService
      .sendVerificationEmail(normalizedEmail, verificationToken)
      .catch((error) =>
        this.logger.error(
          `Failed to send verification email for ${normalizedEmail}`,
          error,
        ),
      );

    return {
      message: 'Profile saved. Check your inbox to verify your email.',
    };
  }

  /**
   * Re-sends the email verification link for a user who has not yet verified.
   *
   * Concurrent requests are serialized with a per-user lock, and the token is
   * generated idempotently — an existing, unexpired token is reused rather than
   * overwritten, so a verification link already delivered to the user keeps
   * working instead of being silently invalidated.
   */
  @Locked({
    key: (userId: string) => `user:verification:${userId}`,
    ttlMs: 5000,
  })
  async resendVerificationEmail(userId: string): Promise<MessageResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new ValidationError('User not found');
    }

    if (!user.email) {
      throw new ValidationError('No email is associated with this account');
    }

    if (user.emailVerified) {
      return { message: 'Email is already verified' };
    }

    const verificationToken = this.issueVerificationToken(user);

    await this.userRepository.save(user);
    this.logger.log(`Verification email re-sent for user: ${user.id}`);

    this.emailService
      .sendVerificationEmail(user.email, verificationToken)
      .catch((error) =>
        this.logger.error(
          `Failed to send verification email for ${user.email}`,
          error,
        ),
      );

    return {
      message: 'A new verification link has been sent to your email.',
    };
  }

  async logout(userId: string): Promise<MessageResponseDto> {
    await this.userRepository.update({ id: userId }, { refreshToken: null });
    this.logger.log(`User logged out: ${userId}`);

    return {
      message: 'Logged out successfully',
    };
  }

  async validateUserById(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new AuthenticationError(
        ErrorCode.AUTH_USER_NOT_FOUND,
        'User not found',
      );
    }

    if (!user.isActive) {
      throw new AuthenticationError(
        ErrorCode.AUTH_ACCOUNT_DISABLED,
        'Account has been deactivated',
      );
    }

    return this.sanitizeUser(user);
  }

  /**
   * Detects account takeover signals: new IP, new user-agent, or unusual
   * login time. Logs a warning; does not block (MFA handles hard blocking).
   */
  private async detectLoginAnomaly(
    user: User,
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    if (!context?.ipAddress && !context?.userAgent) return;

    const knownKey = `login:known:${user.id}`;
    const known = await this.encryptedCache
      .get<{ ips: string[]; agents: string[] }>(knownKey)
      .catch(() => null);

    const ip = context.ipAddress ?? '';
    const ua = context.userAgent ?? '';
    const anomalies: string[] = [];

    if (known) {
      if (ip && !known.ips.includes(ip)) {
        anomalies.push(`new_ip:${ip}`);
      }
      if (ua && !known.agents.includes(ua)) {
        anomalies.push('new_user_agent');
      }
    }

    if (anomalies.length) {
      this.logger.warn(
        `Potential account takeover for user ${user.id}: ${anomalies.join(', ')}`,
      );
    }

    // Update known fingerprints (keep last 10 IPs and agents)
    const updatedIps = [...new Set([...(known?.ips ?? []), ip])].slice(-10);
    const updatedAgents = [...new Set([...(known?.agents ?? []), ua])].slice(
      -10,
    );
    await this.encryptedCache
      .set(
        knownKey,
        { ips: updatedIps, agents: updatedAgents },
        30 * 24 * 3600 * 1000,
      )
      .catch(() => null);
  }

  /**
   * Shared account-lockout check, used by both login and password reset so
   * a locked account can't be used via either path until the lockout window
   * expires. Throws AUTH_ACCOUNT_LOCKED while still locked; otherwise clears
   * an expired lock in place (caller must persist the change alongside its
   * own save). No-op if the account was never locked.
   */
  private checkAccountLocked(user: User): void {
    if (!user.accountLockedUntil) {
      return;
    }

    if (user.accountLockedUntil > new Date()) {
      this.logger.warn(`Blocked attempt on locked account: ${user.id}`);
      throw new AuthenticationError(
        ErrorCode.AUTH_ACCOUNT_LOCKED,
        'Invalid email or password',
      );
    }

    user.accountLockedUntil = null;
    user.failedLoginAttempts = 0;
  }

  private async handleFailedLogin(user: User): Promise<void> {
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.accountLockedUntil = new Date(
        Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000,
      );
      this.logger.warn(`Account locked due to failed attempts: ${user.email}`);
    }

    user.failedLoginAttempts += 1;
    await this.userRepository.save(user);
  }

  public generateTokens(
    userId: string,
    email: string | null,
    role: string,
  ): { accessToken: string; refreshToken: string } {
    const accessToken = this.jwtService.sign(
      {
        sub: userId,
        email,
        role,
        type: 'access',
      },
      {
        secret: this.getJwtSecret(),
        expiresIn: JWT_ACCESS_TOKEN_EXPIRY,
      },
    );

    const refreshToken = this.jwtService.sign(
      {
        sub: userId,
        email,
        role,
        type: 'refresh',
      },
      {
        secret: this.getJwtRefreshSecret(),
        expiresIn: JWT_REFRESH_TOKEN_EXPIRY,
      },
    );

    return { accessToken, refreshToken };
  }

  public async updateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, SALT_ROUNDS);
    await this.userRepository.update(userId, {
      refreshToken: hashedRefreshToken,
    });
  }

  /**
   * Idempotently sets a verification token on the given user entity.
   *
   * If the user already holds an unexpired verification token it is reused, so
   * concurrent requests do not overwrite each other and any link already sent
   * to the user stays valid. A fresh token is only minted when none exists or
   * the current one has expired. The token is mutated onto the entity but NOT
   * persisted — the caller is responsible for saving.
   */
  private issueVerificationToken(user: User): string {
    const now = Date.now();

    if (
      user.verificationToken &&
      user.verificationTokenExpires &&
      user.verificationTokenExpires.getTime() > now
    ) {
      return user.verificationToken;
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = verificationToken;
    user.verificationTokenExpires = new Date(
      now + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
    );

    return verificationToken;
  }

  /**
   * Queues the verification email with retry/backoff instead of sending it
   * inline. If the job is never queued, or exhausts its retries and fails
   * permanently, a critical-failure alert is raised so the missed email is
   * visible instead of only appearing in a log line.
   */
  private async enqueueVerificationEmail(
    userId: string,
    email: string,
    token: string,
  ): Promise<void> {
    if (!this.queueManagementService) {
      this.logger.warn(
        `Queue unavailable; verification email not queued for ${userId}`,
      );
      return;
    }

    try {
      const job = await this.queueManagementService.addEmailJob(
        { type: 'verification', email, token },
        {
          attempts:
            this.configService.get<number>('BULL_QUEUE_EMAIL_ATTEMPTS') ?? 3,
          backoff: {
            type: 'exponential',
            delay:
              this.configService.get<number>(
                'BULL_QUEUE_EMAIL_BACKOFF_DELAY',
              ) ?? 2000,
          },
        },
      );

      job.finished().catch((error: unknown) =>
        this.notifyCriticalFailure('verification_email', error, {
          userId,
          email,
        }),
      );
    } catch (error) {
      await this.notifyCriticalFailure('verification_email_enqueue', error, {
        userId,
        email,
      });
    }
  }

  /**
   * Queues referral tracking with retry/backoff instead of running it
   * inline. Same failure-visibility guarantee as {@link enqueueVerificationEmail}.
   */
  private async enqueueReferralTracking(
    userId: string,
    referralCode: string,
  ): Promise<void> {
    if (!this.queueManagementService) {
      this.logger.warn(
        `Queue unavailable; referral tracking not queued for ${userId}`,
      );
      return;
    }

    try {
      const job = await this.queueManagementService.addDataSyncJob({
        type: 'track-referral',
        entityId: userId,
        data: { referralCode },
      });

      job.finished().catch((error: unknown) =>
        this.notifyCriticalFailure('referral_tracking', error, {
          userId,
          referralCode,
        }),
      );
    } catch (error) {
      await this.notifyCriticalFailure('referral_tracking_enqueue', error, {
        userId,
        referralCode,
      });
    }
  }

  /**
   * Raises visibility on a background job that failed permanently (all
   * retries exhausted) or couldn't be queued at all. Always logs at error
   * level; additionally emails the on-call address if one is configured.
   * Never throws — a broken alert path must not affect the caller.
   */
  private async notifyCriticalFailure(
    context: string,
    error: unknown,
    meta: Record<string, unknown>,
  ): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(
      `Critical background failure [${context}]: ${message} ${JSON.stringify(meta)}`,
    );

    const alertEmail = this.configService.get<string>('ALERT_ONCALL_EMAIL');
    if (!alertEmail) {
      return;
    }

    await this.emailService
      .sendAlertEmail(alertEmail, `Critical failure: ${context}`, {
        message,
        details: meta,
      })
      .catch((alertError: unknown) =>
        this.logger.error(
          `Failed to send critical failure alert for ${context}`,
          alertError instanceof Error ? alertError.stack : String(alertError),
        ),
      );
  }

  public sanitizeUser(user: User) {
    const {
      password: _password,
      refreshToken: _refreshToken,
      resetToken: _resetToken,
      verificationToken: _verificationToken,
      verificationTokenExpires: _verificationTokenExpires,
      ...sanitized
    } = user;
    return sanitized;
  }

  private async findUserByEmail(
    email: string,
    withDeleted = false,
  ): Promise<User | null> {
    const hash = this.hashLookupValue(email);
    return this.userRepository.findOne({
      where: [{ email }, { emailHash: hash }],
      withDeleted,
    });
  }

  private hashLookupValue(value: string): string {
    return crypto
      .createHash('sha256')
      .update(value.trim().toLowerCase())
      .digest('hex');
  }
}
