import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UnauthorizedException,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiResponse,
} from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IpAccessControlGuard } from '../auth/guards/ip-access-control.guard';
import { UserRole } from '../users/entities/user.entity';
import {
  AdminRefundsService,
  type AdminRefundDetail,
} from './admin-refunds.service';
import { AdminRefundDecisionDto } from './dto/admin-refund-decision.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { AuditAction, AuditLevel } from '../audit/entities/audit-log.entity';
import { AuditLogInterceptor } from '../audit/interceptors/audit-log.interceptor';

interface RequestUser {
  id?: string;
  role?: UserRole | string;
}

@ApiTags('Admin Refunds')
@ApiBearerAuth('JWT-auth')
@UseGuards(IpAccessControlGuard, JwtAuthGuard)
@Controller('admin/refunds')
@UseInterceptors(AuditLogInterceptor)
export class AdminRefundsController {
  constructor(private readonly adminRefundsService: AdminRefundsService) {}

  @ApiResponse({ status: 200, description: 'Retrieved' })
  @Get()
  @ApiOperation({ summary: 'List admin refund requests' })
  async listRefundRequests(
    @Request() req: { user?: RequestUser },
    @Query() query: PaginationQueryDto,
  ) {
    this.ensureAdmin(req.user);
    return this.adminRefundsService.listRefunds(query.page, query.limit);
  }

  @ApiResponse({ status: 200, description: 'Retrieved' })
  @Get(':id')
  @ApiOperation({ summary: 'Get admin refund request detail' })
  async getRefundRequest(
    @Param('id') id: string,
    @Request() req: { user?: RequestUser },
  ): Promise<{ data: AdminRefundDetail }> {
    this.ensureAdmin(req.user);
    const detail = await this.adminRefundsService.getRefundById(id);
    return { data: detail };
  }

  @ApiResponse({ status: 201, description: 'Created' })
  @Post(':id/decision')
  @ApiOperation({ summary: 'Approve or reject a refund request' })
  @AuditLog({
    action: AuditAction.PAYMENT_REFUNDED,
    entityType: 'Refund',
    level: AuditLevel.SECURITY,
    includeOldValues: false,
    includeNewValues: true,
    sensitive: true,
  })
  async decideRefundRequest(
    @Param('id') id: string,
    @Body() dto: AdminRefundDecisionDto,
    @Request() req: { user?: RequestUser },
  ): Promise<{ data: AdminRefundDetail }> {
    this.ensureAdmin(req.user);
    const detail = await this.adminRefundsService.applyDecision(
      id,
      dto,
      req.user?.id || 'system',
    );
    return { data: detail };
  }

  private ensureAdmin(user?: RequestUser) {
    const role = user?.role;
    if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
      throw new UnauthorizedException('Admin access required');
    }
  }
}
