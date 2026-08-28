import {
  Controller,
  Get,
  Param,
  Post,
  Delete,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RateLimitService } from '../services/rate-limit.service';
import { AbuseDetectionService } from '../services/abuse-detection.service';
import { RateLimitAnalyticsService } from '../services/rate-limit-analytics.service';
import { EndpointCategory } from '../types/rate-limit.types';
import { SkipRateLimit } from '../decorators/rate-limit.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { AuditLog } from '../../audit/decorators/audit-log.decorator';
import { AuditAction, AuditLevel } from '../../audit/entities/audit-log.entity';
import { AuditLogInterceptor } from '../../audit/interceptors/audit-log.interceptor';

@ApiTags('rate-limiting')
@Controller('rate-limiting')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@SkipRateLimit()
@UseInterceptors(AuditLogInterceptor)
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
  @AuditLog({
    action: AuditAction.CONFIG_CHANGE,
    entityType: 'RateLimitWhitelist',
    level: AuditLevel.WARN,
    includeOldValues: true,
  })
  async whitelistIdentifier(@Param('identifier') identifier: string) {
    await this.rateLimitService.whitelistIdentifier(identifier);
    return { message: 'Identifier whitelisted successfully' };
  }

  @Delete('block/:identifier')
  @ApiOperation({ summary: 'Unblock an identifier' })
  @AuditLog({
    action: AuditAction.CONFIG_CHANGE,
    entityType: 'RateLimitBlock',
    level: AuditLevel.WARN,
    includeOldValues: true,
  })
  async unblockIdentifier(@Param('identifier') identifier: string) {
    await this.abuseDetectionService.unblockIdentifier(identifier);
    return { message: 'Identifier unblocked successfully' };
  }

  @Post('reset/:identifier/:category')
  @ApiOperation({ summary: 'Reset rate limit for identifier and category' })
  @AuditLog({
    action: AuditAction.CONFIG_CHANGE,
    entityType: 'RateLimit',
    level: AuditLevel.WARN,
    includeOldValues: true,
  })
  async resetLimit(
    @Param('identifier') identifier: string,
    @Param('category') category: EndpointCategory,
  ) {
    await this.rateLimitService.resetLimit(identifier, category);
    return { message: 'Rate limit reset successfully' };
  }
}
