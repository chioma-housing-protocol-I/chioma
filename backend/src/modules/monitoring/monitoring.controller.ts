import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  UseGuards,
  Query,
} from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { AlertService } from './alert.service';
import { CacheService } from '../../common/cache/cache.service';
import { DatabaseMonitorService } from './database-monitor.service';
import { WebhookSignatureGuard } from '../webhooks/guards/webhook-signature.guard';
import { WebhookSecret } from '../webhooks/decorators/webhook-secret.decorator';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Monitoring')
@Controller()
export class MonitoringController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly alertService: AlertService,
    private readonly cacheService: CacheService,
    private readonly databaseMonitorService: DatabaseMonitorService,
  ) {}

  @Get('metrics')
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }

  @Get('cache/stats')
  getCacheStats() {
    return this.cacheService.getStats();
  }

  @Get('api/database/health')
  @ApiOperation({ summary: 'Get database health snapshot' })
  async getDatabaseHealth() {
    return this.databaseMonitorService.getHealthSnapshot();
  }

  @Get('api/database/history')
  @ApiOperation({ summary: 'Get database health history' })
  @ApiQuery({ name: 'count', required: false, example: 10 })
  async getDatabaseHistory(@Query('count') count?: string) {
    const limit = count ? parseInt(count, 10) : 10;
    return this.databaseMonitorService.getHistory(limit);
  }

  @Get('api/database/pool')
  @ApiOperation({ summary: 'Get database connection pool metrics' })
  async getDatabasePoolMetrics() {
    return this.databaseMonitorService.getPoolMetrics();
  }

  @Get('api/database/size')
  @ApiOperation({ summary: 'Get database size metrics' })
  async getDatabaseSizeMetrics() {
    return this.databaseMonitorService.getSizeMetrics();
  }

  @Get('api/database/queries')
  @ApiOperation({ summary: 'Get database query performance metrics' })
  async getDatabaseQueryMetrics() {
    return this.databaseMonitorService.getQueryMetrics();
  }

  @Post('api/alerts/webhook')
  @HttpCode(200)
  @UseGuards(WebhookSignatureGuard)
  @WebhookSecret('ALERT_WEBHOOK_SECRET')
  async handleAlert(@Body() alert: any) {
    await this.alertService.handleAlert(alert);
    return { status: 'received' };
  }
}
