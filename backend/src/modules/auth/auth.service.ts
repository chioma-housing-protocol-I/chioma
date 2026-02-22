import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../users/entities/user.entity';
import {
  MfaDevice,
  MfaDeviceStatus,
  MfaDeviceType,
} from './entities/mfa-device.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto, MessageResponseDto } from './dto/auth-response.dto';
import { PasswordPolicyService } from './services/password-policy.service';

const SALT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;
const RESET_TOKEN_EXPIRY_HOURS = 1;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(MfaDevice)
    private mfaDeviceRepository: Repository<MfaDevice>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private passwordPolicyService: PasswordPolicyService,
  ) { }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, firstName, lastName, role } = registerDto;

    // Validate password against policy
    await this.passwordPolicyService.validatePassword(password);

    const existingUser = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
      withDeleted: true,
    });

    if (existingUser) {
      if (existingUser.deletedAt) {
        throw new ConflictException(
          'This email is associated with a deleted account. Please restore your account to continue.',
        );
      }
      this.logger.warn(`Registration attempt for existing email: ${email}`);
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = this.userRepository.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      role,
      emailVerified: false,
      failedLoginAttempts: 0,
      verificationToken,
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);
    this.logger.log(`User registered successfully: ${savedUser.id}`);

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
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      this.logger.warn(`Login attempt for non-existent user: ${email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      this.logger.warn(`Login attempt for inactive account: ${email}`);
      throw new UnauthorizedException('Account has been deactivated');
    }

    if (user.accountLockedUntil) {
      const now = new Date();
      if (user.accountLockedUntil > now) {
        const minutesRemaining = Math.ceil(
          (user.accountLockedUntil.getTime() - now.getTime()) / (1000 * 60),
        );
        this.logger.warn(`Login attempt for locked account: ${email}`);
        throw new UnauthorizedException(
          `Account is locked. Try again in ${minutesRemaining} minutes`,
        );
      } else {
        user.accountLockedUntil = null;
        user.failedLoginAttempts = 0;
      }
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      await this.handleFailedLogin(user);
      this.logger.warn(`Failed login attempt for user: ${email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;
    user.lastLoginAt = new Date();

    await this.userRepository.save(user);

    // Check if MFA is enabled
    const mfaDevice = await this.mfaDeviceRepository.findOne({
      where: {
        userId: user.id,
        type: MfaDeviceType.TOTP,
        status: MfaDeviceStatus.ACTIVE,
      },
    });

    if (mfaDevice) {
      // Generate temporary token for MFA verification
      const tempToken = this.jwtService.sign(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
          type: 'mfa_required',
        },
        {
          secret: this.getJwtSecret(),
          expiresIn: '5m', // Short-lived token for MFA verification
        },
      );

      this.logger.log(`MFA required for user: ${user.id}`);
      return {
        user: this.sanitizeUser(user),
        accessToken: null,
        refreshToken: null,
        mfaRequired: true,
        mfaToken: tempToken,
      } as AuthResponseDto & { mfaRequired: true; mfaToken: string };
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
  async completeMfaLogin(mfaToken: string): Promise<AuthResponseDto> {
    try {
      // Verify temporary MFA token
      const payload = this.jwtService.verify<{
        sub: string;
        email: string;
        role: string;
        type: string;
      }>(mfaToken, {
        secret: this.getJwtSecret(),
      });

      if (payload.type !== 'mfa_required') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Generate final tokens
      const { accessToken, refreshToken } = this.generateTokens(
        user.id,
        user.email,
        user.role,
      );

      await this.updateRefreshToken(user.id, refreshToken);

      this.logger.log(`MFA login completed for user: ${user.id}`);

      return {
        user: this.sanitizeUser(user),
        accessToken,
        refreshToken,
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Invalid or expired MFA token';
      this.logger.error(`MFA login failed: ${message}`);
      throw new UnauthorizedException('Invalid or expired MFA token');
    }
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

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('User not found or token revoked');
      }

      const isValidRefreshToken = await bcrypt.compare(
        refreshToken,
        user.refreshToken,
      );

      if (!isValidRefreshToken) {
        this.logger.warn(`Invalid refresh token for user: ${user.id}`);
        throw new UnauthorizedException('Invalid refresh token');
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
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<MessageResponseDto> {
    const { email } = forgotPasswordDto;

    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

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

    return {
      message:
        'If an account exists with this email, you will receive a password reset link',
    };
  }

  private getJwtSecret(): string {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is required');
    }
    return secret;
  }

  private getJwtRefreshSecret(): string {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is required');
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
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (!user.resetTokenExpires || user.resetTokenExpires < new Date()) {
      this.logger.warn(`Expired password reset token for user: ${user.id}`);
      throw new BadRequestException('Reset token has expired');
    }

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
      throw new BadRequestException('Invalid verification token');
    }

    user.emailVerified = true;
    user.verificationToken = null;

    await this.userRepository.save(user);
    this.logger.log(`Email verified for user: ${user.id}`);

    return {
      message: 'Email verified successfully',
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
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account has been deactivated');
    }

    return this.sanitizeUser(user);
  }

  private async handleFailedLogin(user: User): Promise<void> {
    user.failedLoginAttempts += 1;

    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.accountLockedUntil = new Date(
        Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000,
      );
      this.logger.warn(`Account locked due to failed attempts: ${user.email}`);
    }

    await this.userRepository.save(user);
  }

  private generateTokens(
    userId: string,
    email: string,
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
        secret:
          this.configService.get<string>('JWT_SECRET') || 'your-secret-key',
        expiresIn: '15m',
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
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          'your-refresh-secret-key',
        expiresIn: '7d',
      },
    );

    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, SALT_ROUNDS);
    await this.userRepository.update(userId, {
      refreshToken: hashedRefreshToken,
    });
  }

  private sanitizeUser(user: User) {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const {
      password: _password,
      refreshToken: _refreshToken,
      resetToken: _resetToken,
      verificationToken: _verificationToken,
      ...sanitized
    } = user;
    /* eslint-enable @typescript-eslint/no-unused-vars */
    return sanitized;
  }
}
