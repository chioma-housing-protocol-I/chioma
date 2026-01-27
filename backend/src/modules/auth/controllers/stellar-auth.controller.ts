import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  ClassSerializerInterceptor,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { StellarAuthService } from '../services/stellar-auth.service';
import { AuthMetricsService } from '../services/auth-metrics.service';
import {
  StellarAuthChallengeDto,
  StellarAuthVerifyDto,
  StellarAuthResponseDto,
} from '../dto/stellar-auth.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { AuthMethod } from '../../users/entities/user.entity';

@ApiTags('Stellar Authentication')
@Controller('auth/stellar')
@UseInterceptors(ClassSerializerInterceptor)
export class StellarAuthController {
  constructor(
    private readonly stellarAuthService: StellarAuthService,
    private readonly authMetricsService: AuthMetricsService,
  ) {}

  @Post('challenge')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate Stellar authentication challenge',
    description:
      'Generate a challenge transaction for the client to sign with their Stellar wallet',
  })
  @ApiResponse({
    status: 200,
    description: 'Challenge generated successfully',
    type: StellarAuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid wallet address or challenge already exists',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests',
  })
  async generateChallenge(
    @Body() challengeDto: StellarAuthChallengeDto,
    @Req() req: Request,
  ): Promise<StellarAuthResponseDto> {
    const startTime = Date.now();

    try {
      const result = this.stellarAuthService.generateChallenge(
        challengeDto.walletAddress,
      );
      const duration = Date.now() - startTime;

      // Record successful challenge generation metric
      await this.authMetricsService.recordAuthAttempt({
        authMethod: AuthMethod.STELLAR,
        success: true,
        duration,
        ipAddress: req.ip || undefined,
        userAgent: req.get('User-Agent') || undefined,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Record failed challenge generation metric
      await this.authMetricsService.recordAuthAttempt({
        authMethod: AuthMethod.STELLAR,
        success: false,
        duration,
        ipAddress: req.ip || undefined,
        userAgent: req.get('User-Agent') || undefined,
        errorMessage,
      });

      throw error;
    }
  }

  @Post('verify')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify Stellar signature and authenticate',
    description:
      'Verify the signed challenge and authenticate the user with their Stellar wallet',
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid wallet address format',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid signature, expired challenge, or verification failed',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests',
  })
  async verifySignature(
    @Body() verifyDto: StellarAuthVerifyDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    const startTime = Date.now();

    try {
      const result = await this.stellarAuthService.verifySignature(verifyDto);
      const duration = Date.now() - startTime;

      // Record successful Stellar authentication metric
      await this.authMetricsService.recordAuthAttempt({
        authMethod: AuthMethod.STELLAR,
        success: true,
        duration,
        ipAddress: req.ip || undefined,
        userAgent: req.get('User-Agent') || undefined,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Record failed Stellar authentication metric
      await this.authMetricsService.recordAuthAttempt({
        authMethod: AuthMethod.STELLAR,
        success: false,
        duration,
        ipAddress: req.ip || undefined,
        userAgent: req.get('User-Agent') || undefined,
        errorMessage,
      });

      throw error;
    }
  }
}
