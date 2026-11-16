import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { LoginActivityService } from '../services/login-activity.service';
import { LoginActivity } from '../entities/login-activity.entity';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { RolesGuard } from '../guards/roles.guard';

@ApiTags('auth')
@Controller('auth/login-activity')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LoginActivityController {
  constructor(private readonly loginActivityService: LoginActivityService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get my login history' })
  @ApiResponse({
    status: 200,
    description: 'Login history retrieved successfully',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of records to return',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of records to skip',
  })
  async getMyLoginHistory(
    @Request() req: any,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<{ activities: LoginActivity[]; total: number }> {
    const userId = req.user.sub;
    return this.loginActivityService.getUserLoginHistory(userId, limit, offset);
  }

  @Get('me/stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get my login statistics' })
  @ApiResponse({
    status: 200,
    description: 'Login statistics retrieved successfully',
  })
  async getMyLoginStats(@Request() req: any): Promise<{
    totalLogins: number;
    successfulLogins: number;
    failedAttempts: number;
    lastLoginAt: Date | null;
    uniqueIPs: number;
    suspiciousAttempts: number;
  }> {
    const userId = req.user.sub;
    return this.loginActivityService.getUserLoginStats(userId);
  }

  @Get('me/failed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get my recent failed login attempts' })
  @ApiResponse({
    status: 200,
    description: 'Recent failed attempts retrieved successfully',
  })
  @ApiQuery({
    name: 'hours',
    required: false,
    type: Number,
    description: 'Hours to look back (default: 24)',
  })
  async getMyFailedAttempts(
    @Request() req: any,
    @Query('hours', new DefaultValuePipe(24), ParseIntPipe) hours: number,
  ): Promise<LoginActivity[]> {
    const userId = req.user.sub;
    return this.loginActivityService.getRecentFailedAttempts(userId, hours);
  }

  @Get('suspicious')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get suspicious login activities (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Suspicious activities retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of records to return',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of records to skip',
  })
  async getSuspiciousActivities(
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<{ activities: LoginActivity[]; total: number }> {
    return this.loginActivityService.getSuspiciousActivities(limit, offset);
  }

  @Get('user/:userId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get login history for a specific user (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'User login history retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of records to return',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of records to skip',
  })
  async getUserLoginHistory(
    @Query('userId') userId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<{ activities: LoginActivity[]; total: number }> {
    return this.loginActivityService.getUserLoginHistory(userId, limit, offset);
  }
}
