import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DataArchivalService, ArchivalStats } from './data-archival.service';

export class ManualArchiveDto {
  entityType: string;
  olderThanDays?: number;
}

@ApiTags('Data Archival')
@Controller('data-archival')
export class DataArchivalController {
  private readonly logger = new Logger(DataArchivalController.name);

  constructor(private readonly dataArchivalService: DataArchivalService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get archival statistics' })
  @ApiResponse({
    status: 200,
    description: 'Archival statistics retrieved successfully',
  })
  async getArchivalStats() {
    return await this.dataArchivalService.getArchivalStats();
  }

  @Post('manual-archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Manually trigger archival for specific entity type',
  })
  @ApiResponse({
    status: 200,
    description: 'Manual archival completed successfully',
  })
  async manualArchive(@Body() dto: ManualArchiveDto): Promise<ArchivalStats> {
    this.logger.log(
      `Manual archival triggered for ${dto.entityType}${dto.olderThanDays ? ` (older than ${dto.olderThanDays} days)` : ''}`,
    );

    return await this.dataArchivalService.manualArchive(
      dto.entityType,
      dto.olderThanDays,
    );
  }

  @Post('trigger-scheduled')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger scheduled archival process manually' })
  @ApiResponse({
    status: 200,
    description: 'Scheduled archival process triggered successfully',
  })
  async triggerScheduledArchival(): Promise<{ message: string }> {
    this.logger.log('Manual trigger of scheduled archival process');

    // Run in background to avoid timeout
    setImmediate(() => {
      this.dataArchivalService.performScheduledArchival();
    });

    return {
      message: 'Scheduled archival process triggered. Check logs for progress.',
    };
  }
}
