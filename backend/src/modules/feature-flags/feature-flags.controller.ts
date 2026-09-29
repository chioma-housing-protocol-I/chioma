import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { FeatureFlagsService } from './feature-flags.service';
import { CreateFeatureFlagDto } from './dto/create-feature-flag.dto';
import { UpdateFeatureFlagDto } from './dto/update-feature-flag.dto';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { AuditAction, AuditLevel } from '../audit/entities/audit-log.entity';
import { AuditLogInterceptor } from '../audit/interceptors/audit-log.interceptor';

@ApiTags('Feature Flags')
@Controller()
@UseInterceptors(AuditLogInterceptor)
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @ApiResponse({ status: 200, description: 'Retrieved' })
  @Get('feature-flags/eval')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Evaluate a single feature flag for a user' })
  @ApiQuery({ name: 'key', required: true, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  async evaluateFlag(
    @Query('key') key: string,
    @Query('userId') userId?: string,
  ) {
    const isEnabled = await this.featureFlagsService.isFeatureEnabled(
      key,
      userId,
    );
    return { key, userId: userId || null, isEnabled };
  }

  @ApiResponse({ status: 200, description: 'Retrieved' })
  @Get('feature-flags/eval-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Evaluate all feature flags for a user' })
  @ApiQuery({ name: 'userId', required: false, type: String })
  async evaluateAllFlags(@Query('userId') userId?: string) {
    return this.featureFlagsService.evaluateAllFlagsForUser(userId);
  }

  // --- Admin Endpoints ---

  @ApiResponse({ status: 200, description: 'Retrieved' })
  @Get('admin/feature-flags')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all feature flags (Admin)' })
  async getAllFlags() {
    return this.featureFlagsService.getAllFlags();
  }

  @ApiResponse({ status: 200, description: 'Retrieved' })
  @Get('admin/feature-flags/:key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get feature flag details by key (Admin)' })
  async getFlagByKey(@Param('key') key: string) {
    return this.featureFlagsService.getFlagByKey(key);
  }

  @Post('admin/feature-flags')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new feature flag (Admin)' })
  @ApiResponse({
    status: 201,
    description: 'Feature flag successfully created',
  })
  @AuditLog({
    action: AuditAction.CREATE,
    entityType: 'FeatureFlag',
    level: AuditLevel.WARN,
    includeNewValues: true,
  })
  async createFlag(@Body() dto: CreateFeatureFlagDto) {
    return this.featureFlagsService.createFlag(dto);
  }

  @ApiResponse({ status: 200, description: 'Updated' })
  @Patch('admin/feature-flags/:key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a feature flag rollout/status (Admin)' })
  @AuditLog({
    action: AuditAction.CONFIG_CHANGE,
    entityType: 'FeatureFlag',
    level: AuditLevel.WARN,
    includeOldValues: true,
    includeNewValues: true,
  })
  async updateFlag(
    @Param('key') key: string,
    @Body() dto: UpdateFeatureFlagDto,
  ) {
    return this.featureFlagsService.updateFlag(key, dto);
  }

  @ApiResponse({ status: 200, description: 'Updated' })
  @Patch('admin/feature-flags/:key/rollout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update rollout percentage for a feature flag (Admin)',
  })
  @AuditLog({
    action: AuditAction.CONFIG_CHANGE,
    entityType: 'FeatureFlag',
    level: AuditLevel.WARN,
    includeOldValues: true,
    includeNewValues: true,
  })
  async setRolloutPercentage(
    @Param('key') key: string,
    @Body('rolloutPercentage', ParseIntPipe) percentage: number,
  ) {
    return this.featureFlagsService.setRolloutPercentage(key, percentage);
  }

  @ApiResponse({ status: 201, description: 'Created' })
  @Post('admin/feature-flags/:key/kill')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trigger emergency kill switch for a feature flag (Admin)',
  })
  @AuditLog({
    action: AuditAction.CONFIG_CHANGE,
    entityType: 'FeatureFlag',
    level: AuditLevel.SECURITY,
    includeOldValues: true,
  })
  async killSwitch(@Param('key') key: string) {
    return this.featureFlagsService.killSwitch(key);
  }

  @ApiResponse({ status: 200, description: 'Deleted' })
  @Delete('admin/feature-flags/:key')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a feature flag (Admin)' })
  @AuditLog({
    action: AuditAction.DELETE,
    entityType: 'FeatureFlag',
    level: AuditLevel.WARN,
    includeOldValues: true,
  })
  async deleteFlag(@Param('key') key: string) {
    await this.featureFlagsService.deleteFlag(key);
  }
}
