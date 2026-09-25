import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PerformanceAlertService } from './performance-alert.service';
import { AlertSeverity } from './entities/performance-alert.entity';

@ApiTags('Monitoring')
@Controller('monitoring/performance')
export class PerformanceController {
  constructor(private readonly alertService: PerformanceAlertService) {}

  @Get('alerts')
  @ApiOperation({ summary: 'List persisted performance threshold alerts' })
  @ApiQuery({ name: 'severity', required: false, enum: AlertSeverity })
  @ApiQuery({ name: 'resolved', required: false, type: Boolean })
  @ApiQuery({ name: 'since', required: false, description: 'ISO timestamp' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAlerts(
    @Query('severity') severity?: AlertSeverity,
    @Query('resolved') resolved?: string,
    @Query('since') since?: string,
    @Query('limit') limit?: string,
  ) {
    const alerts = await this.alertService.getAlerts({
      severity: Object.values(AlertSeverity).includes(severity!)
        ? severity
        : undefined,
      resolved:
        resolved === 'true' ? true : resolved === 'false' ? false : undefined,
      since: since && !isNaN(Date.parse(since)) ? new Date(since) : undefined,
      limit: limit ? parseInt(limit, 10) || undefined : undefined,
    });
    return {
      alerts,
      total: alerts.length,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch('alerts/:id/resolve')
  @ApiOperation({ summary: 'Mark a performance alert as resolved' })
  resolveAlert(@Param('id') id: string) {
    return this.alertService.resolve(id);
  }
}
