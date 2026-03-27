import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ScreeningService } from './screening.service';
import { CreateTenantScreeningRequestDto } from './dto/create-tenant-screening-request.dto';
import { GrantTenantScreeningConsentDto } from './dto/grant-tenant-screening-consent.dto';
import { TenantScreeningWebhookDto } from './dto/tenant-screening-webhook.dto';
import { WebhookSignatureGuard } from '../webhooks/guards/webhook-signature.guard';
import { WebhookSecret } from '../webhooks/decorators/webhook-secret.decorator';

type RequestWithUser = {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  user: {
    id: string;
    role: UserRole;
  };
};

@ApiTags('Tenant Screening')
@Controller('screenings/tenant')
export class ScreeningController {
  constructor(private readonly screeningService: ScreeningService) {}

  @Post('request')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LANDLORD, UserRole.AGENT, UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a tenant screening request' })
  @ApiResponse({ status: 201, description: 'Screening request created' })
  createRequest(
    @Req() req: RequestWithUser,
    @Body() dto: CreateTenantScreeningRequestDto,
  ) {
    return this.screeningService.createRequest(
      {
        id: req.user.id,
        role: req.user.role,
        ipAddress: req.ip,
        userAgent: this.getUserAgent(req),
      },
      dto,
    );
  }

  @Post(':id/consent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Grant consent for a tenant screening request' })
  grantConsent(
    @Param('id') screeningId: string,
    @Req() req: RequestWithUser,
    @Body() dto: GrantTenantScreeningConsentDto,
  ) {
    return this.screeningService.grantConsent(
      screeningId,
      {
        id: req.user.id,
        role: req.user.role,
        ipAddress: req.ip,
        userAgent: this.getUserAgent(req),
      },
      dto,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get tenant screening status' })
  getScreening(@Param('id') screeningId: string, @Req() req: RequestWithUser) {
    return this.screeningService.getScreening(screeningId, {
      id: req.user.id,
      role: req.user.role,
    });
  }

  @Get(':id/report')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get a securely stored tenant screening report' })
  getReport(@Param('id') screeningId: string, @Req() req: RequestWithUser) {
    return this.screeningService.getScreeningReport(screeningId, {
      id: req.user.id,
      role: req.user.role,
    });
  }

  @Post('webhook')
  @Public()
  @UseGuards(WebhookSignatureGuard)
  @WebhookSecret('TENANT_SCREENING_WEBHOOK_SECRET')
  @ApiOperation({ summary: 'Tenant screening provider webhook' })
  handleProviderWebhook(@Body() dto: TenantScreeningWebhookDto) {
    return this.screeningService.handleProviderWebhook(dto);
  }

  private getUserAgent(req: RequestWithUser): string | undefined {
    const header = req.headers['user-agent'];
    return Array.isArray(header) ? header[0] : header;
  }
}
