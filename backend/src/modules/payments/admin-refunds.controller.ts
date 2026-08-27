import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UnauthorizedException,
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
  type AdminRefundRow,
} from './admin-refunds.service';
import { AdminRefundDecisionDto } from './dto/admin-refund-decision.dto';

interface RequestUser {
  id?: string;
  role?: UserRole | string;
}

@ApiTags('Admin Refunds')
@ApiBearerAuth('JWT-auth')
@UseGuards(IpAccessControlGuard, JwtAuthGuard)
@Controller('admin/refunds')
export class AdminRefundsController {
  constructor(private readonly adminRefundsService: AdminRefundsService) {}

  @ApiResponse({ status: 200, description: 'Retrieved' })
  @Get()
  @ApiOperation({ summary: 'List admin refund requests' })
  async listRefundRequests(
    @Request() req: { user?: RequestUser },
  ): Promise<{ data: AdminRefundRow[] }> {
    this.ensureAdmin(req.user);
    const rows = await this.adminRefundsService.listRefunds();
    return { data: rows };
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
