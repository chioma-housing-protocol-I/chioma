import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { KycService } from './kyc.service';
import { SubmitKycDto, KycWebhookDto, KycStatusResponseDto } from './kyc.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { AuditAction, AuditLevel } from '../audit/entities/audit-log.entity';
import { AuditLogInterceptor } from '../audit/interceptors/audit-log.interceptor';
import { Public } from '../auth/decorators/public.decorator';
import { WebhookSignatureGuard } from '../webhooks/guards/webhook-signature.guard';
import { WebhookSecret } from '../webhooks/decorators/webhook-secret.decorator';

@ApiTags('KYC')
@Controller('kyc')
@UseInterceptors(AuditLogInterceptor)
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @UseGuards(JwtAuthGuard)
  @Post('submit')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Submit KYC data',
    description:
      'Submit identity/address data for KYC verification (SEP-9 style).',
  })
  @ApiResponse({ status: 200, description: 'KYC submission accepted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @AuditLog({
    action: AuditAction.KYC_SUBMITTED,
    entityType: 'Kyc',
    level: AuditLevel.SECURITY,
    includeNewValues: true,
    sensitive: true,
  })
  async submitKyc(
    @Req() req: { user: { id: string } },
    @Body() dto: SubmitKycDto,
  ) {
    return this.kycService.submitKyc(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('status')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get KYC status',
    description:
      'Returns current KYC verification status for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'KYC status',
    type: KycStatusResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getKycStatus(@Req() req: { user: { id: string } }) {
    return this.kycService.getKycStatus(req.user.id);
  }

  @Post('webhook')
  @Public()
  @UseGuards(WebhookSignatureGuard)
  @WebhookSecret('KYC_WEBHOOK_SECRET')
  @ApiOperation({
    summary: 'KYC provider webhook',
    description:
      'Called by KYC provider to notify status changes. Not for client use.',
  })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  @AuditLog({
    action: AuditAction.UPDATE,
    entityType: 'Kyc',
    level: AuditLevel.SECURITY,
    includeNewValues: true,
    sensitive: true,
  })
  async webhook(@Body() dto: KycWebhookDto) {
    await this.kycService.handleWebhook(dto);
    return { success: true };
  }
}
