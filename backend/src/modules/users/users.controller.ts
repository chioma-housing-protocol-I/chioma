import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import {
  UpdateUserProfileDto,
  ChangeEmailDto,
  ChangePasswordDto,
} from './dto/update-user.dto';
import { UserRestoreDto } from './dto/user-restore.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from './entities/user.entity';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: User) {
    return user;
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateProfileDto: UpdateUserProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, updateProfileDto);
  }

  @Post('me/email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change email address' })
  @ApiResponse({ status: 200, description: 'Email changed successfully' })
  @ApiResponse({ status: 400, description: 'Email already in use' })
  @ApiResponse({ status: 401, description: 'Invalid password' })
  async changeEmail(
    @CurrentUser() user: User,
    @Body() changeEmailDto: ChangeEmailDto,
  ) {
    return this.usersService.changeEmail(user.id, changeEmailDto);
  }

  @Post('me/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Invalid current password' })
  async changePassword(
    @CurrentUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.id, changePasswordDto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete user account' })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteAccount(@CurrentUser() user: User) {
    return this.usersService.deleteAccount(user.id);
  }

  @Post('me/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate user account' })
  @ApiResponse({ status: 200, description: 'Account deactivated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deactivateAccount(@CurrentUser() user: User) {
    return this.usersService.deactivateAccount(user.id);
  }

  @Get('me/activity')
  @ApiOperation({ summary: 'Get user activity history' })
  @ApiResponse({
    status: 200,
    description: 'Activity history retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserActivity(@CurrentUser() user: User) {
    return this.usersService.getUserActivity(user.id);
  }

  @Get('me/export')
  @ApiOperation({ summary: 'Export all user data (GDPR)' })
  @ApiResponse({ status: 200, description: 'User data export successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async exportUserData(@CurrentUser() user: User) {
    return this.usersService.exportUserData(user.id);
  }

  @Delete('me/gdpr')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete user account and anonymize data (GDPR)' })
  @ApiResponse({
    status: 200,
    description: 'Account deleted and data anonymized',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async gdprDeleteAccount(@CurrentUser() user: User) {
    return this.usersService.gdprDeleteAccount(user.id);
  }

  @Post('me/consent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user consent preferences (GDPR)' })
  @ApiResponse({ status: 200, description: 'Consent updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateConsent(
    @CurrentUser() user: User,
    @Body() consent: Record<string, unknown>,
  ) {
    return this.usersService.updateConsent(user.id, consent);
  }

  @Get('me/privacy-settings')
  @ApiOperation({ summary: 'Get user privacy settings (GDPR)' })
  @ApiResponse({ status: 200, description: 'Privacy settings retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPrivacySettings(@CurrentUser() user: User) {
    return this.usersService.getPrivacySettings(user.id);
  }

  @Public()
  @Post('restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore soft-deleted user account' })
  @ApiResponse({ status: 200, description: 'Account restored successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or account not deleted',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async restoreAccount(@Body() userRestoreDto: UserRestoreDto) {
    return this.usersService.restoreAccount(userRestoreDto);
  }

  @Delete(':id/permanent')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Permanently delete user account (Admin only)' })
  @ApiResponse({ status: 200, description: 'Account permanently deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async hardDeleteAccount(@Param('id') id: string) {
    return this.usersService.hardDeleteAccount(id);
  }
}
