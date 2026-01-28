import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthMetricsService, AuthStats, PerformanceMetrics } from '../services/auth-metrics.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';

@ApiTags('Authentication Metrics')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/auth/metrics')
export class AuthMetricsController {
  constructor(private readonly authMetricsService: AuthMetricsService) {}

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get authentication statistics',
    description: 'Retrieve comprehensive authentication metrics including success rates, method breakdown, and trends',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to analyze (default: 30, max: 365)',
    example: 30,
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication statistics retrieved successfully',
    schema: {
      example: {
        totalAttempts: 1250,
        successfulAttempts: 1180,
        failedAttempts: 70,
        successRate: 94.4,
        averageDuration: 245.67,
        methodBreakdown: {
          password: {
            attempts: 850,
            successes: 820,
            failures: 30,
            successRate: 96.47,
            averageDuration: 180.45,
          },
          stellar: {
            attempts: 400,
            successes: 360,
            failures: 40,
            successRate: 90.0,
            averageDuration: 380.23,
          },
        },
        dailyTrend: [
          {
            date: '2024-01-26',
            attempts: 45,
            successes: 42,
            failures: 3,
          },
        ],
        errorBreakdown: [
          {
            error: 'Invalid credentials',
            count: 25,
            percentage: 35.71,
          },
          {
            error: 'Invalid signature',
            count: 20,
            percentage: 28.57,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  async getAuthStats(
    @Query('days') days?: number,
  ): Promise<AuthStats> {
    const daysToAnalyze = Math.min(Math.max(days || 30, 1), 365);
    return this.authMetricsService.getAuthStats(daysToAnalyze);
  }

  @Get('performance')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get authentication performance metrics',
    description: 'Retrieve performance metrics including response time percentiles for each authentication method',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to analyze (default: 30, max: 365)',
    example: 30,
  })
  @ApiResponse({
    status: 200,
    description: 'Performance metrics retrieved successfully',
    schema: {
      example: [
        {
          method: 'password',
          p50: 150,
          p95: 320,
          p99: 580,
          average: 180.45,
          min: 45,
          max: 1200,
        },
        {
          method: 'stellar',
          p50: 280,
          p95: 650,
          p99: 1200,
          average: 380.23,
          min: 120,
          max: 2500,
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  async getPerformanceMetrics(
    @Query('days') days?: number,
  ): Promise<PerformanceMetrics[]> {
    const daysToAnalyze = Math.min(Math.max(days || 30, 1), 365);
    return this.authMetricsService.getPerformanceMetrics(daysToAnalyze);
  }

  @Get('hourly-usage')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get hourly authentication usage',
    description: 'Retrieve hourly breakdown of authentication attempts by method for the specified period',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to analyze (default: 7, max: 30)',
    example: 7,
  })
  @ApiResponse({
    status: 200,
    description: 'Hourly usage data retrieved successfully',
    schema: {
      example: [
        {
          hour: '2024-01-26T14',
          password: 12,
          stellar: 8,
          total: 20,
        },
        {
          hour: '2024-01-26T15',
          password: 15,
          stellar: 10,
          total: 25,
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  async getHourlyUsage(
    @Query('days') days?: number,
  ): Promise<Array<{
    hour: string;
    password: number;
    stellar: number;
    total: number;
  }>> {
    const daysToAnalyze = Math.min(Math.max(days || 7, 1), 30);
    return this.authMetricsService.getHourlyUsage(daysToAnalyze);
  }

  @Get('health')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get authentication system health',
    description: 'Quick health check of authentication system with key metrics',
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication system health retrieved successfully',
    schema: {
      example: {
        status: 'healthy',
        totalAttempts24h: 150,
        successRate24h: 95.3,
        averageResponseTime24h: 220.5,
        stellarAdoption24h: 32.5,
        lastUpdated: '2024-01-26T18:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  async getHealth() {
    const stats24h = await this.authMetricsService.getAuthStats(1);
    const performance24h = await this.authMetricsService.getPerformanceMetrics(1);
    
    const stellarAttempts = stats24h.methodBreakdown.stellar.attempts;
    const totalAttempts = stats24h.totalAttempts;
    const stellarAdoption = totalAttempts > 0 ? (stellarAttempts / totalAttempts) * 100 : 0;

    return {
      status: stats24h.successRate > 90 ? 'healthy' : 'degraded',
      totalAttempts24h: stats24h.totalAttempts,
      successRate24h: stats24h.successRate,
      averageResponseTime24h: stats24h.averageDuration,
      stellarAdoption24h: Math.round(stellarAdoption * 100) / 100,
      lastUpdated: new Date().toISOString(),
    };
  }
}
