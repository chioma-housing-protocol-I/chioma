import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CheckTransactionFraudDto } from './dto/check-transaction-fraud.dto';
import { UpdateFraudThresholdsDto } from './dto/update-fraud-thresholds.dto';
import { FraudAlertsService } from './fraud-alerts.service';
import { FraudThresholdsService } from './fraud-thresholds.service';
import { FraudService } from './fraud.service';

@ApiTags('Fraud')
@Controller('fraud')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth('JWT-auth')
export class FraudController {
  constructor(
    private readonly fraudService: FraudService,
    private readonly fraudAlertsService: FraudAlertsService,
    private readonly fraudThresholdsService: FraudThresholdsService,
  ) {}

  @Get('user/:userId')
  @ApiOperation({ summary: 'Check user fraud risk' })
  @ApiParam({ name: 'userId', description: 'User ID to check' })
  async checkUserFraud(@Param('userId') userId: string) {
    return this.fraudService.checkUserFraud(userId);
  }

  @Get('listing/:listingId')
  @ApiOperation({ summary: 'Check listing fraud risk' })
  @ApiParam({ name: 'listingId', description: 'Listing ID to check' })
  async checkListingFraud(@Param('listingId') listingId: string) {
    return this.fraudService.checkListingFraud(listingId);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get fraud alerts' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['open', 'resolved'],
  })
  getFraudAlerts(@Query('status') status?: 'open' | 'resolved') {
    return this.fraudAlertsService.listAlerts(status);
  }

  @Patch('alerts/:alertId/resolve')
  @ApiOperation({ summary: 'Resolve a fraud alert' })
  @ApiParam({ name: 'alertId', description: 'Alert ID to resolve' })
  @ApiResponse({
    status: 200,
    description: 'Alert resolved or already resolved',
  })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  resolveFraudAlert(@Param('alertId') alertId: string) {
    return this.fraudAlertsService.resolveAlert(alertId);
  }

  @Post('transaction')
  @ApiOperation({ summary: 'Check transaction fraud risk' })
  async checkTransactionFraud(@Body() payload: CheckTransactionFraudDto) {
    return this.fraudService.checkTransactionFraud(payload);
  }

  @Get('thresholds')
  @ApiOperation({ summary: 'Get current fraud scoring thresholds' })
  getThresholds() {
    return this.fraudThresholdsService.getThresholds();
  }

  @Patch('thresholds')
  @ApiOperation({
    summary: 'Update fraud scoring thresholds (runtime-configurable)',
  })
  @ApiResponse({ status: 200, description: 'Thresholds updated' })
  @ApiResponse({
    status: 400,
    description: 'Invalid threshold values',
  })
  async updateThresholds(
    @Body() dto: UpdateFraudThresholdsDto,
    @Req() req: any,
  ) {
    return this.fraudThresholdsService.updateThresholds(dto, req.user.id);
  }
}
