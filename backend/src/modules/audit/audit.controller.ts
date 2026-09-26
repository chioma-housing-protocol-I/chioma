import {
  Controller,
  Get,
  Query,
  Param,
  Delete,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { AuditRetentionService } from './audit-retention.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';
import { AuditLog } from './entities/audit-log.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';

@ApiTags('Audit Logs')
@ApiBearerAuth('JWT-auth')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly auditRetentionService: AuditRetentionService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Query audit logs with filtering and pagination' })
  @ApiPaginatedResponse(AuditLog)
  async queryAuditLogs(@Query() queryDto: QueryAuditLogsDto) {
    return this.auditService.query(queryDto);
  }

  @Get('trail/:entityType/:entityId')
  @ApiOperation({ summary: 'Get audit trail for a specific entity' })
  @ApiPaginatedResponse(AuditLog)
  async getAuditTrail(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.auditService.getAuditTrail(
      entityType,
      entityId,
      query.page,
      query.limit,
    );
  }

  @Get('user-activity/:userId')
  @ApiOperation({ summary: 'Get activity logs for a specific user' })
  @ApiPaginatedResponse(AuditLog)
  async getUserActivity(
    @Param('userId') userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.auditService.getUserActivity(userId, query.page, query.limit);
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
