import { Controller, Get, Query, UseGuards, Post, Body } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { AnalyticsService } from './analytics.service';
import { LandlordAnalyticsQueryDto } from './dto/landlord-analytics-query.dto';
import { GenerateReportDto } from './dto/generate-report.dto';
import { ExportAnalyticsDto } from './dto/export-analytics.dto';
import { UseReplica } from '../../common/decorators/use-replica.decorator';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('landlord/dashboard')
  @UseReplica({ maxStaleness: '5m', reason: 'Dashboard analytics tolerate staleness for performance' })
  @ApiOperation({ summary: 'Get landlord property analytics dashboard data' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to include in trend data (1-365)',
  })
  async getLandlordDashboard(
    @CurrentUser() user: User,
    @Query() query: LandlordAnalyticsQueryDto,
  ) {
    return this.analyticsService.getLandlordDashboard(
      user.id,
      query.days ?? 30,
    );
  }

  @Get('landlord/fees-summary')
  @UseReplica({ maxStaleness: '5m', reason: 'Fees summary tolerates staleness' })
  @ApiOperation({ summary: 'Get landlord platform fees summary' })
  async getLandlordFeesSummary(@CurrentUser() user: User) {
    return this.analyticsService.getLandlordFeesSummary(user.id);
  }

  @Get('dashboard/metrics')
  @UseReplica({ maxStaleness: '5m', reason: 'Dashboard metrics tolerate staleness' })
  @ApiOperation({ summary: 'Get overall dashboard metrics' })
  async getDashboardMetrics(@CurrentUser() user: User) {
    return this.analyticsService.getDashboardMetrics(user.id);
  }

  @Get('payment/analytics')
  @UseReplica({ maxStaleness: '5m', reason: 'Payment analytics tolerate staleness' })
  @ApiOperation({ summary: 'Get payment analytics data' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to include (1-365)',
  })
  async getPaymentAnalytics(
    @CurrentUser() user: User,
    @Query() query: LandlordAnalyticsQueryDto,
  ) {
    return this.analyticsService.getPaymentAnalytics(user.id, query.days ?? 30);
  }

  @Get('user/activity')
  @UseReplica({ maxStaleness: '5m', reason: 'User activity analytics tolerate staleness' })
  @ApiOperation({ summary: 'Get user activity analytics' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to include (1-365)',
  })
  async getUserActivityAnalytics(
    @CurrentUser() user: User,
    @Query() query: LandlordAnalyticsQueryDto,
  ) {
    return this.analyticsService.getUserActivityAnalytics(
      user.id,
      query.days ?? 30,
    );
  }

  @Post('reports/generate')
  @ApiOperation({ summary: 'Generate analytics report' })
  async generateReport(
    @CurrentUser() user: User,
    @Body() dto: GenerateReportDto,
  ) {
    return this.analyticsService.generateReport(user.id, dto);
  }

  @Post('export')
  @ApiOperation({ summary: 'Export analytics data' })
  async exportAnalytics(
    @CurrentUser() user: User,
    @Body() dto: ExportAnalyticsDto,
  ) {
    return this.analyticsService.exportAnalytics(user.id, dto);
  }
}
