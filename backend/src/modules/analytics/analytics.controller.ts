import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
}
