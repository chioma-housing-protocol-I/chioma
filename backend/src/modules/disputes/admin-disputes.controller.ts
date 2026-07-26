import {
    Body,
    Controller,
    Patch,
    Param,
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
import { DisputesService } from './disputes.service';
import { AdminUpdateDisputeDto } from './dto/admin-update-dispute.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { IpAccessControlGuard } from '../auth/guards/ip-access-control.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { AuditAction, AuditLevel } from '../audit/entities/audit-log.entity';
import { AuditLogInterceptor } from '../audit/interceptors/audit-log.interceptor';
import { ValidationError } from '../../common/errors/domain-errors';

@ApiTags('Admin Disputes')
@ApiBearerAuth('JWT-auth')
@Controller('admin/disputes')
@UseGuards(IpAccessControlGuard, JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@UseInterceptors(AuditLogInterceptor)
export class AdminDisputesController {
    constructor(private readonly disputesService: DisputesService) { }

    @Patch(':id')
    @ApiOperation({
        summary: 'Admin update dispute status and resolution',
        description:
            'Allows admins to update dispute status and add resolution. Validates status transitions.',
    })
    @ApiResponse({ status: 200, description: 'Dispute updated successfully' })
    @ApiResponse({ status: 404, description: 'Dispute not found' })
    @ApiResponse({ status: 400, description: 'Invalid status transition' })
    @ApiResponse({ status: 403, description: 'Admin access required' })
    @AuditLog({
        action: AuditAction.UPDATE,
        entityType: 'Dispute',
        level: AuditLevel.SECURITY,
        includeOldValues: true,
        includeNewValues: true,
    })
    async updateDispute(
        @Param('id') id: string,
        @Body() adminUpdateDisputeDto: AdminUpdateDisputeDto,
        @Request() req,
    ) {
        const numericId = parseInt(id, 10);
        if (isNaN(numericId)) {
            throw new ValidationError(`Invalid dispute ID: ${id}. Must be a valid number.`);
        }
        return this.disputesService.update(
            numericId,
            adminUpdateDisputeDto,
            req.user.id,
        );
    }
}
