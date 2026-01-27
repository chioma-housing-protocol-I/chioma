import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrivacyService } from './privacy.service';
import { IsString, IsBoolean, IsOptional } from 'class-validator';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

class ConsentUpdateDto {
  @IsBoolean()
  marketingEmails: boolean;

  @IsBoolean()
  analyticsTracking: boolean;

  @IsBoolean()
  @IsOptional()
  thirdPartySharing?: boolean;
}

class DataDeletionRequestDto {
  @IsString()
  password: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

/**
 * Privacy Controller
 * GDPR/CCPA compliance endpoints
 */
@ApiTags('Privacy')
@ApiBearerAuth('JWT-auth')
@Controller('api/users/me/privacy')
@UseGuards(JwtAuthGuard)
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  /**
   * Get all personal data (GDPR Article 15 - Right of Access)
   */
  @Get('data-export')
  @ApiOperation({ summary: 'Export all personal data (GDPR Right of Access)' })
  @ApiResponse({ status: 200, description: 'Personal data export' })
  async exportData(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const data = (await this.privacyService.exportUserData(user.id)) as Record<
      string,
      unknown
    >;

    res.set({
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="chioma-data-export-${Date.now()}.json"`,
    });

    return new StreamableFile(Buffer.from(JSON.stringify(data, null, 2)));
  }

  /**
   * Get data export as JSON response
   */
  @Get('data-summary')
  @ApiOperation({ summary: 'Get summary of stored personal data' })
  @ApiResponse({ status: 200, description: 'Data summary' })
  async getDataSummary(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Record<string, unknown>> {
    return (await this.privacyService.getDataSummary(user.id)) as Record<
      string,
      unknown
    >;
  }

  /**
   * Request data deletion (GDPR Article 17 - Right to Erasure)
   */
  @Post('delete-request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request account and data deletion (GDPR Right to Erasure)',
  })
  @ApiResponse({ status: 200, description: 'Deletion request created' })
  async requestDeletion(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DataDeletionRequestDto,
  ): Promise<Record<string, unknown>> {
    return (await this.privacyService.requestDataDeletion(
      user.id,
      dto.password,
      dto.reason,
    )) as Record<string, unknown>;
  }

  /**
   * Confirm and execute data deletion
   */
  @Delete('confirm-deletion')
  @ApiOperation({ summary: 'Confirm and execute data deletion' })
  @ApiResponse({ status: 200, description: 'Data deleted' })
  async confirmDeletion(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Record<string, unknown>> {
    return (await this.privacyService.executeDataDeletion(user.id)) as Record<
      string,
      unknown
    >;
  }

  /**
   * Get consent preferences
   */
  @Get('consent')
  @ApiOperation({ summary: 'Get current consent preferences' })
  @ApiResponse({ status: 200, description: 'Consent preferences' })
  async getConsent(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Record<string, unknown>> {
    return await this.privacyService.getConsentPreferences(user.id);
  }

  /**
   * Update consent preferences (GDPR Article 7 - Conditions for consent)
   */
  @Post('consent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update consent preferences' })
  @ApiResponse({ status: 200, description: 'Consent updated' })
  async updateConsent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConsentUpdateDto,
  ): Promise<Record<string, unknown>> {
    return await this.privacyService.updateConsentPreferences(user.id, dto);
  }

  /**
   * Request data portability (GDPR Article 20)
   */
  @Get('portable-data')
  @ApiOperation({
    summary: 'Get data in portable format (GDPR Data Portability)',
  })
  @ApiResponse({ status: 200, description: 'Portable data export' })
  async getPortableData(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const data = (await this.privacyService.getPortableData(user.id)) as Record<
      string,
      unknown
    >;

    res.set({
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="chioma-portable-data-${Date.now()}.json"`,
    });

    return new StreamableFile(Buffer.from(JSON.stringify(data, null, 2)));
  }

  /**
   * Get privacy policy version acknowledgment status
   */
  @Get('policy-status')
  @ApiOperation({ summary: 'Check privacy policy acknowledgment status' })
  async getPolicyStatus(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Record<string, unknown>> {
    return await this.privacyService.getPolicyAcknowledgmentStatus(user.id);
  }

  /**
   * Acknowledge privacy policy
   */
  @Post('acknowledge-policy')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Acknowledge privacy policy' })
  async acknowledgePolicy(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Record<string, unknown>> {
    return await this.privacyService.acknowledgePrivacyPolicy(user.id);
  }
}
