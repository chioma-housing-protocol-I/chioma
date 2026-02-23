import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Query,
  Res,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AuthMetricsService } from './services/auth-metrics.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { AuthResponseDto, MessageResponseDto } from './dto/auth-response.dto';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User, AuthMethod } from '../users/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MfaService } from './services/mfa.service';
import {
  EnableMfaDto,
  VerifyMfaDto,
  DisableMfaDto,
} from './dto/enable-mfa.dto';
import { CompleteMfaLoginDto } from './dto/complete-mfa-login.dto';
import { Request, Response } from 'express';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authMetricsService: AuthMetricsService,
    private readonly mfaService: MfaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Create a new user account with secure password hashing',
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or password does not meet requirements',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Email already registered',
    type: ErrorResponseDto,
  })
  async register(
    @Body() registerDto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const startTime = Date.now();

    try {
      const result = await this.authService.register(registerDto);
      const duration = Date.now() - startTime;

      // Set secure refresh token cookie
      if (result.refreshToken) {
        this.setRefreshTokenCookie(res, result.refreshToken);
      }

      // Record successful registration metric
      await this.authMetricsService.recordAuthAttempt({
        authMethod: AuthMethod.PASSWORD,
        success: true,
        duration,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') ?? undefined,
      });

      // Don't return refreshToken in response body when using cookies
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { refreshToken: _refreshToken, ...responseWithoutRefresh } = result;
      return responseWithoutRefresh as AuthResponseDto;
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Unknown error';

      // Record failed registration metric
      await this.authMetricsService.recordAuthAttempt({
        authMethod: AuthMethod.PASSWORD,
        success: false,
        duration,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') ?? undefined,
        errorMessage: message,
      });

      throw error;
    }
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login user',
    description:
      'Authenticate user with email and password. Returns MFA token if MFA is enabled.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful or MFA required',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or account locked',
    type: ErrorResponseDto,
  })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<
    | AuthResponseDto
    | { mfaRequired: true; mfaToken: string; user: AuthResponseDto['user'] }
  > {
    const startTime = Date.now();

    try {
      const result = await this.authService.login(loginDto);
      const duration = Date.now() - startTime;

      // If MFA is required, return MFA token
      if (
        'mfaRequired' in result &&
        result.mfaRequired &&
        'mfaToken' in result
      ) {
        return {
          mfaRequired: true,
          mfaToken: result.mfaToken,
          user: result.user,
        };
      }

      // Set secure refresh token cookie
      if (result.refreshToken) {
        this.setRefreshTokenCookie(res, result.refreshToken);
      }

      // Record successful login metric
      await this.authMetricsService.recordAuthAttempt({
        authMethod: AuthMethod.PASSWORD,
        success: true,
        duration,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') ?? undefined,
      });

      // Don't return refreshToken in response body when using cookies
      /* eslint-disable @typescript-eslint/no-unused-vars */
      const {
        refreshToken: _refreshToken,
        mfaRequired: _mfaRequired,
        ...responseWithoutRefresh
      } = result;
      /* eslint-enable @typescript-eslint/no-unused-vars */
      return responseWithoutRefresh as AuthResponseDto;
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Unknown error';

      // Record failed login metric
      await this.authMetricsService.recordAuthAttempt({
        authMethod: AuthMethod.PASSWORD,
        success: false,
        duration,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') ?? undefined,
        errorMessage: message,
      });

      throw error;
    }
  }

  @Post('login/mfa/complete')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Complete MFA login',
    description: 'Complete login after MFA verification',
  })
  @ApiResponse({
    status: 200,
    description: 'Login completed successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid MFA code or token',
    type: ErrorResponseDto,
  })
  async completeMfaLogin(
    @Body() completeMfaLoginDto: CompleteMfaLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    // Decode MFA token to get userId
    const payload = this.jwtService.verify<{
      sub: string;
      email: string;
      role: string;
      type: string;
    }>(completeMfaLoginDto.mfaToken, {
      secret: this.configService.get<string>('JWT_SECRET') || 'your-secret-key',
    });

    if (payload.type !== 'mfa_required') {
      throw new UnauthorizedException('Invalid token type');
    }

    const userId = payload.sub;

    // Verify MFA code
    const isValid =
      (await this.mfaService.verifyTotpToken(
        userId,
        completeMfaLoginDto.mfaCode,
      )) ||
      (await this.mfaService.verifyBackupCode(
        userId,
        completeMfaLoginDto.mfaCode,
      ));

    if (!isValid) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    const result = await this.authService.completeMfaLogin(
      completeMfaLoginDto.mfaToken,
    );

    // Set secure refresh token cookie
    if (result.refreshToken) {
      this.setRefreshTokenCookie(res, result.refreshToken);
    }

    // Record successful MFA login
    await this.authMetricsService.recordAuthAttempt({
      authMethod: AuthMethod.PASSWORD,
      success: true,
      duration: 0,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? undefined,
    });

    // Don't return refreshToken in response body when using cookies
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { refreshToken: _refreshToken, ...responseWithoutRefresh } = result;
    return responseWithoutRefresh as AuthResponseDto;
  }

  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Get a new access token using refresh token from cookie or body',
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
    type: ErrorResponseDto,
  })
  async refreshTokens(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    // Try to get refresh token from cookie first, then body
    const cookies = (req as Request & { cookies?: Record<string, string> })
      .cookies as Record<string, string> | undefined;
    const refreshToken: string | undefined =
      cookies?.refreshToken ?? refreshTokenDto.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not provided');
    }

    const tokens = await this.authService.refreshToken({
      refreshToken,
    });

    // Update refresh token cookie
    if (tokens.refreshToken) {
      this.setRefreshTokenCookie(res, tokens.refreshToken);
    }

    // Return only access token (refresh token is in cookie)
    return { accessToken: tokens.accessToken };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout user',
    description: 'Invalidate user refresh token',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  async logout(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MessageResponseDto> {
    // Clear refresh token cookie
    this.clearRefreshTokenCookie(res);
    return this.authService.logout(user.id);
  }

  /**
   * Set secure refresh token cookie
   */
  private setRefreshTokenCookie(res: Response, refreshToken: string): void {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, // Prevent XSS attacks
      secure: isProduction, // Only send over HTTPS in production
      sameSite: 'strict', // Prevent CSRF attacks
      maxAge,
      path: '/api/auth',
    });
  }

  /**
   * Clear refresh token cookie
   */
  private clearRefreshTokenCookie(res: Response): void {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/api/auth',
    });
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Send password reset email to registered email address',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent',
    type: MessageResponseDto,
  })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<MessageResponseDto> {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password',
    description: 'Reset password using reset token received via email',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successful',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired reset token',
    type: ErrorResponseDto,
  })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<MessageResponseDto> {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Get('verify-email')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Verify email with token',
    description: 'Verify user email address using token sent via email',
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired verification token',
    type: ErrorResponseDto,
  })
  async verifyEmail(
    @Query() verifyEmailDto: VerifyEmailDto,
  ): Promise<MessageResponseDto> {
    return this.authService.verifyEmail(verifyEmailDto.token);
  }

  @Post('mfa/enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enable MFA',
    description: 'Generate MFA secret and QR code for TOTP setup',
  })
  @ApiResponse({
    status: 200,
    description: 'MFA secret generated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'MFA already enabled',
    type: ErrorResponseDto,
  })
  async enableMfa(
    @CurrentUser() user: User,
    @Body() enableMfaDto: EnableMfaDto,
  ) {
    return this.mfaService.generateMfaSecret(user.id, enableMfaDto.deviceName);
  }

  @Post('mfa/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify MFA token',
    description: 'Verify TOTP token or backup code',
  })
  @ApiResponse({
    status: 200,
    description: 'MFA token verified successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid MFA token',
    type: ErrorResponseDto,
  })
  async verifyMfa(
    @CurrentUser() user: User,
    @Body() verifyMfaDto: VerifyMfaDto,
  ) {
    const isValid =
      (await this.mfaService.verifyTotpToken(user.id, verifyMfaDto.token)) ||
      (await this.mfaService.verifyBackupCode(user.id, verifyMfaDto.token));

    if (!isValid) {
      throw new UnauthorizedException('Invalid MFA token');
    }

    return { message: 'MFA token verified successfully' };
  }

  @Post('mfa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Disable MFA',
    description: 'Disable MFA for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'MFA disabled successfully',
  })
  async disableMfa(
    @CurrentUser() user: User,
    @Body() disableMfaDto: DisableMfaDto,
  ) {
    // Verify token before disabling
    const isValid =
      (await this.mfaService.verifyTotpToken(user.id, disableMfaDto.token)) ||
      (await this.mfaService.verifyBackupCode(user.id, disableMfaDto.token));

    if (!isValid) {
      throw new UnauthorizedException('Invalid MFA token');
    }

    await this.mfaService.disableMfa(user.id);
    return { message: 'MFA disabled successfully' };
  }

  @Post('mfa/backup-codes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Regenerate backup codes',
    description: 'Generate new backup codes for MFA',
  })
  @ApiResponse({
    status: 200,
    description: 'Backup codes regenerated successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  async regenerateBackupCodes(@CurrentUser() user: User) {
    const codes = await this.mfaService.regenerateBackupCodes(user.id);
    return { backupCodes: codes };
  }

  @Get('mfa/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get MFA status',
    description: 'Check if MFA is enabled for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'MFA status retrieved successfully',
  })
  async getMfaStatus(@CurrentUser() user: User) {
    const isEnabled = await this.mfaService.isMfaEnabled(user.id);
    return { mfaEnabled: isEnabled };
  }
}
