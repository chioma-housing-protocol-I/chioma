import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Query,
  Request,
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
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User, AuthMethod } from '../users/entities/user.entity';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authMetricsService: AuthMetricsService,
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
  })
  @ApiResponse({
    status: 409,
    description: 'Email already registered',
  })
  async register(
    @Body() registerDto: RegisterDto,
    @Request() req: any,
  ): Promise<AuthResponseDto> {
    const startTime = Date.now();
    
    try {
      const result = await this.authService.register(registerDto);
      const duration = Date.now() - startTime;
      
      // Record successful registration metric
      await this.authMetricsService.recordAuthAttempt({
        authMethod: AuthMethod.PASSWORD,
        success: true,
        duration,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Record failed registration metric
      await this.authMetricsService.recordAuthAttempt({
        authMethod: AuthMethod.PASSWORD,
        success: false,
        duration,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        errorMessage: error.message,
      });
      
      throw error;
    }
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login user',
    description: 'Authenticate user with email and password',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or account locked',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Request() req: any,
  ): Promise<AuthResponseDto> {
    const startTime = Date.now();
    
    try {
      const result = await this.authService.login(loginDto);
      const duration = Date.now() - startTime;
      
      // Record successful login metric
      await this.authMetricsService.recordAuthAttempt({
        authMethod: AuthMethod.PASSWORD,
        success: true,
        duration,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Record failed login metric
      await this.authMetricsService.recordAuthAttempt({
        authMethod: AuthMethod.PASSWORD,
        success: false,
        duration,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        errorMessage: error.message,
      });
      
      throw error;
    }
  }

  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Get a new access token using refresh token',
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
  })
  async refreshTokens(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.authService.refreshToken(refreshTokenDto);
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
  })
  async logout(@CurrentUser() user: User): Promise<MessageResponseDto> {
    return this.authService.logout(user.id);
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
  })
  async verifyEmail(
    @Query() verifyEmailDto: VerifyEmailDto,
  ): Promise<MessageResponseDto> {
    return this.authService.verifyEmail(verifyEmailDto.token);
  }
}
