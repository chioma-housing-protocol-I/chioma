import { Controller, Get, Post, Body, HttpCode } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { AlertService } from './alert.service';

@Controller()
export class MonitoringController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly alertService: AlertService,
  ) {}

  @Get('metrics')
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }

  @Post('api/alerts/webhook')
  @HttpCode(200)
  async handleAlert(@Body() alert: any) {
    await this.alertService.handleAlert(alert);
    return { status: 'received' };
  }
}
