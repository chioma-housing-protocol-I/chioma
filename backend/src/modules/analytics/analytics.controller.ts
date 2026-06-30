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

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('landlord/dashboard')
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

  @Get('dashboard/metrics')
  @ApiOperation({ summary: 'Get overall dashboard metrics' })
  async getDashboardMetrics(@CurrentUser() user: User) {
    return this.analyticsService.getDashboardMetrics(user.id);
  }

  @Get('payment/analytics')
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
    return this.analyticsService.getPaymentAnalytics(
      user.id,
      query.days ?? 30,
    );
  }

  @Get('user/activity')
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
