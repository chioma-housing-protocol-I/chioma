import { Controller, Get, Query, Param, Delete, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { AuditRetentionService } from './audit-retention.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';
import { AuditLog } from './entities/audit-log.entity';

@ApiTags('Audit Logs')
@Controller('audit')
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly auditRetentionService: AuditRetentionService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Query audit logs with filtering and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Audit logs retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/AuditLog' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  async queryAuditLogs(@Query() queryDto: QueryAuditLogsDto) {
    return this.auditService.query(queryDto);
  }

  @Get('trail/:entityType/:entityId')
  @ApiOperation({ summary: 'Get audit trail for a specific entity' })
  @ApiResponse({
    status: 200,
    description: 'Audit trail retrieved successfully',
    type: [AuditLog],
  })
  async getAuditTrail(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.getAuditTrail(entityType, entityId, limit);
  }

  @Get('user-activity/:userId')
  @ApiOperation({ summary: 'Get activity logs for a specific user' })
  @ApiResponse({
    status: 200,
    description: 'User activity retrieved successfully',
    type: [AuditLog],
  })
  async getUserActivity(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.getUserActivity(userId, limit);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get audit log statistics' })
  @ApiResponse({
    status: 200,
    description: 'Audit log statistics retrieved successfully',
  })
  async getLogStatistics() {
    return this.auditRetentionService.getLogStatistics();
  }

  @Delete('cleanup')
  @ApiOperation({ summary: 'Manually cleanup old audit logs (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Cleanup completed successfully',
  })
  async cleanupOldLogs(@Query('daysToKeep') daysToKeep?: number) {
    const deletedCount =
      await this.auditRetentionService.cleanupOldLogs(daysToKeep);
    return { message: `Deleted ${deletedCount} old audit logs` };
  }

  @Post('retention/run')
  @ApiOperation({
    summary: 'Manually trigger log retention cleanup (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Retention cleanup completed successfully',
  })
  async runRetentionCleanup() {
    await this.auditRetentionService.performLogRetention();
    return { message: 'Log retention cleanup completed' };
  }
}
