import {
  Controller,
  Get,
  Param,
  Post,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RateLimitService } from '../services/rate-limit.service';
import { AbuseDetectionService } from '../services/abuse-detection.service';
import { RateLimitAnalyticsService } from '../services/rate-limit-analytics.service';
import { EndpointCategory } from '../types/rate-limit.types';
import {
  SkipRateLimit,
  RateLimitCategory,
} from '../decorators/rate-limit.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';

@ApiTags('rate-limiting')
@Controller('rate-limiting')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@SkipRateLimit()
export class RateLimitController {
  constructor(
    private readonly rateLimitService: RateLimitService,
    private readonly abuseDetectionService: AbuseDetectionService,
    private readonly analyticsService: RateLimitAnalyticsService,
  ) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get current rate limit metrics' })
  async getMetrics() {
    return this.analyticsService.getMetrics();
  }

  @Get('metrics/history/:hours')
  @ApiOperation({ summary: 'Get historical rate limit metrics' })
  async getHistoricalMetrics(@Param('hours') hours: number) {
    return this.analyticsService.getHistoricalMetrics(hours);
  }

  @Get('abuse-score/:identifier')
  @ApiOperation({ summary: 'Get abuse score for identifier' })
  async getAbuseScore(@Param('identifier') identifier: string) {
    const score = await this.abuseDetectionService.getAbuseScore(identifier);
    const isBlocked = await this.abuseDetectionService.isBlocked(identifier);
    return { identifier, score, isBlocked };
  }

  @Post('whitelist/:identifier')
  @ApiOperation({ summary: 'Whitelist an identifier' })
  async whitelistIdentifier(@Param('identifier') identifier: string) {
    await this.rateLimitService.whitelistIdentifier(identifier);
    return { message: 'Identifier whitelisted successfully' };
  }

  @Delete('block/:identifier')
  @ApiOperation({ summary: 'Unblock an identifier' })
  async unblockIdentifier(@Param('identifier') identifier: string) {
    await this.abuseDetectionService.unblockIdentifier(identifier);
    return { message: 'Identifier unblocked successfully' };
  }

  @Post('reset/:identifier/:category')
  @ApiOperation({ summary: 'Reset rate limit for identifier and category' })
  async resetLimit(
    @Param('identifier') identifier: string,
    @Param('category') category: EndpointCategory,
  ) {
    await this.rateLimitService.resetLimit(identifier, category);
    return { message: 'Rate limit reset successfully' };
  }
}
