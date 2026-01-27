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
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto, MessageResponseDto } from './dto/auth-response.dto';

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
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, firstName, lastName, role } = registerDto;

    const existingUser = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
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
    };
  }

  async refreshToken(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { refreshToken } = refreshTokenDto;

    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          'your-refresh-secret-key',
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

      const tokens = this.generateTokens(user.id, user.email, user.role);
      await this.updateRefreshToken(user.id, tokens.refreshToken);

      this.logger.log(`Token refreshed for user: ${user.id}`);

      return tokens;
    } catch (error) {
      this.logger.error(`Token refresh failed: ${error.message}`);
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

    console.log(`[DEV] Reset token for ${email}: ${resetToken}`);

    return {
      message:
        'If an account exists with this email, you will receive a password reset link',
    };
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

    // Check password history to prevent reuse
    if (await this.isPasswordInHistory(user, newPassword)) {
      throw new BadRequestException(
        'Cannot reuse any of your last 5 passwords',
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password history
    const passwordHistory = await this.updatePasswordHistory(
      user.passwordHistory,
      user.password,
    );

    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpires = null;
    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;
    user.passwordChangedAt = new Date();
    user.passwordHistory = passwordHistory;
    // Invalidate all existing sessions (session fixation prevention)
    user.tokensValidAfter = new Date();
    user.refreshToken = null;

    await this.userRepository.save(user);
    this.logger.log(`Password reset successful for user: ${user.id}`);

    return {
      message:
        'Password has been reset successfully. Please log in with your new password',
    };
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<MessageResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      this.logger.warn(`Invalid current password for user: ${userId}`);
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Check password history
    if (await this.isPasswordInHistory(user, newPassword)) {
      throw new BadRequestException(
        'Cannot reuse any of your last 5 passwords',
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const passwordHistory = await this.updatePasswordHistory(
      user.passwordHistory,
      user.password,
    );

    // Invalidate all sessions on password change
    await this.userRepository.update(userId, {
      password: hashedPassword,
      passwordChangedAt: new Date(),
      passwordHistory,
      tokensValidAfter: new Date(),
      refreshToken: null,
    });

    this.logger.log(`Password changed for user: ${userId}`);

    return {
      message: 'Password changed successfully. Please log in again.',
    };
  }

  /**
   * Invalidate all sessions for a user
   */
  async invalidateAllSessions(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      tokensValidAfter: new Date(),
      refreshToken: null,
    });
    this.logger.log(`All sessions invalidated for user: ${userId}`);
  }

  /**
   * Check if password is in history
   */
  private async isPasswordInHistory(
    user: User,
    newPassword: string,
  ): Promise<boolean> {
    if (!user.passwordHistory) return false;

    const history = user.passwordHistory.split(',');
    for (const hashedPwd of history) {
      if (await bcrypt.compare(newPassword, hashedPwd)) {
        return true;
      }
    }

    // Also check current password
    if (await bcrypt.compare(newPassword, user.password)) {
      return true;
    }

    return false;
  }

  /**
   * Update password history (keep last 5)
   */
  private async updatePasswordHistory(
    currentHistory: string | null,
    currentPassword: string,
  ): Promise<string> {
    const history = currentHistory ? currentHistory.split(',') : [];
    history.unshift(currentPassword);

    // Keep only last 5 passwords
    if (history.length > 5) {
      history.pop();
    }

    return history.join(',');
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

  async validateUserById(userId: string, tokenIssuedAt?: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account has been deactivated');
    }

    // Check if token was issued before session invalidation
    if (user.tokensValidAfter && tokenIssuedAt) {
      const tokenIssuedDate = new Date(tokenIssuedAt * 1000);
      if (tokenIssuedDate < user.tokensValidAfter) {
        throw new UnauthorizedException(
          'Session expired. Please log in again.',
        );
      }
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
    const {
      password,
      refreshToken,
      resetToken,
      verificationToken,
      ...sanitized
    } = user;
    return sanitized;
  }
}
