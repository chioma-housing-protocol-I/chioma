import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { AlertService } from './alert.service';
import { CacheService } from '../../common/cache/cache.service';
import { WebhookSignatureGuard } from '../webhooks/guards/webhook-signature.guard';
import { WebhookSecret } from '../webhooks/decorators/webhook-secret.decorator';

@Controller()
export class MonitoringController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly alertService: AlertService,
    private readonly cacheService: CacheService,
  ) {}

  @Get('metrics')
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }

  @Get('cache/stats')
  getCacheStats() {
    return this.cacheService.getStats();
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
