import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { KycService } from './kyc.service';
import { AdminKycQueryDto, KycDecisionDto } from './kyc.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { AuditAction, AuditLevel } from '../audit/entities/audit-log.entity';
import { AuditLogInterceptor } from '../audit/interceptors/audit-log.interceptor';

@ApiTags('Admin KYC')
@ApiBearerAuth('JWT-auth')
@Controller('admin/kyc')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@UseInterceptors(AuditLogInterceptor)
export class AdminKycController {
  constructor(private readonly kycService: KycService) {}

  @Get('pending')
  @ApiOperation({ summary: 'List pending KYC verifications' })
  @ApiResponse({ status: 200, description: 'Paginated pending verifications' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async listPending(@Query() query: AdminKycQueryDto) {
    return this.kycService.findPendingForAdmin(query);
  }

  @Get('rejected')
  @ApiOperation({ summary: 'List rejected KYC verifications' })
  @ApiResponse({ status: 200, description: 'Paginated rejected verifications' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async listRejected(@Query() query: AdminKycQueryDto) {
    return this.kycService.findRejectedForAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get KYC verification detail' })
  @ApiResponse({ status: 200, description: 'KYC verification detail' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async getDetail(@Param('id') id: string) {
    return this.kycService.findByIdForAdmin(id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a KYC verification' })
  @ApiResponse({ status: 200, description: 'KYC verification approved' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @AuditLog({
    action: AuditAction.KYC_APPROVED,
    entityType: 'Kyc',
    level: AuditLevel.SECURITY,
    includeNewValues: true,
    sensitive: true,
  })
  async approve(
    @Param('id') id: string,
    @Body() dto: KycDecisionDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.kycService.approveKyc(id, req.user.id, dto.reason);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a KYC verification' })
  @ApiResponse({ status: 200, description: 'KYC verification rejected' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @AuditLog({
    action: AuditAction.KYC_REJECTED,
    entityType: 'Kyc',
    level: AuditLevel.SECURITY,
    includeNewValues: true,
    sensitive: true,
  })
  async reject(
    @Param('id') id: string,
    @Body() dto: KycDecisionDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.kycService.rejectKyc(id, req.user.id, dto.reason);
  }
}
