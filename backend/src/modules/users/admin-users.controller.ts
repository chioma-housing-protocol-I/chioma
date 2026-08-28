import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { IpAccessControlGuard } from '../auth/guards/ip-access-control.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from './entities/user.entity';
import { AuditLogInterceptor } from '../audit/interceptors/audit-log.interceptor';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { AuditAction, AuditLevel } from '../audit/entities/audit-log.entity';

@ApiTags('Admin Users')
@ApiBearerAuth('JWT-auth')
@Controller('admin/users')
@UseGuards(IpAccessControlGuard, JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@UseInterceptors(AuditLogInterceptor)
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users (admin)' })
  @ApiResponse({ status: 200, description: 'Paginated user list' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async list(@Query() query: AdminUserQueryDto) {
    return this.usersService.findAllForAdmin(query);
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Suspend a user account (admin)' })
  @ApiResponse({ status: 200, description: 'User suspended' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @AuditLog({
    action: AuditAction.USER_SUSPENDED,
    entityType: 'User',
    level: AuditLevel.SECURITY,
    includeNewValues: true,
  })
  async deactivate(@Param('id') id: string, @CurrentUser() admin: User) {
    return this.usersService.adminDeactivateAccount(id, admin.id);
  }

  @Post(':id/verify')
  @ApiOperation({ summary: 'Mark a user as verified (admin)' })
  @ApiResponse({ status: 200, description: 'User verified' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @AuditLog({
    action: AuditAction.USER_VERIFIED,
    entityType: 'User',
    level: AuditLevel.SECURITY,
    includeNewValues: true,
  })
  async verify(@Param('id') id: string, @CurrentUser() admin: User) {
    return this.usersService.adminVerifyAccount(id, admin.id);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore/reactivate a user account (admin)' })
  @ApiResponse({ status: 200, description: 'User restored' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @AuditLog({
    action: AuditAction.USER_RESTORED,
    entityType: 'User',
    level: AuditLevel.SECURITY,
    includeNewValues: true,
  })
  async restore(@Param('id') id: string, @CurrentUser() admin: User) {
    return this.usersService.adminRestoreAccount(id, admin.id);
  }
}
