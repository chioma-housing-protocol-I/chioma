import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { StatusService } from './status.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';

@ApiTags('Status')
@Controller('status')
export class StatusController {
  constructor(
    private readonly statusService: StatusService,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Public status page',
    description:
      'Overall service status, per-component health, and uptime — for status-page integrations and uptime monitors.',
  })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Current service status' })
  async getStatus(@Query('userId') userId?: string) {
    const isEnhancedEnabled = await this.featureFlagsService.isFeatureEnabled(
      'enhanced_status_metrics',
      userId,
    );

    const statusPage = await this.statusService.getStatusPage();

    if (isEnhancedEnabled) {
      return {
        ...statusPage,
        enhancedMetrics: {
          featureFlagsActive: true,
          nodeVersion: process.version,
          memoryUsageMb: Math.round(
            process.memoryUsage().heapUsed / 1024 / 1024,
          ),
        },
      };
    }

    return statusPage;
  }

  @Get('uptime')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Service uptime' })
  @ApiResponse({ status: 200, description: 'Uptime since service start' })
  getUptime() {
    return this.statusService.getUptime();
  }
}
