import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StatusService } from './status.service';

@ApiTags('Status')
@Controller('status')
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Public status page',
    description:
      'Overall service status, per-component health, and uptime — for status-page integrations and uptime monitors.',
  })
  @ApiResponse({ status: 200, description: 'Current service status' })
  getStatus() {
    return this.statusService.getStatusPage();
  }

  @Get('uptime')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Service uptime' })
  @ApiResponse({ status: 200, description: 'Uptime since service start' })
  getUptime() {
    return this.statusService.getUptime();
  }
}
