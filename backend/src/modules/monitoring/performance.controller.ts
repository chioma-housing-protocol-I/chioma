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
import { PerformanceMonitorService } from './performance-monitor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Performance Monitoring')
@Controller('api/performance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class PerformanceController {
  constructor(private readonly performanceMonitor: PerformanceMonitorService) {}

  @Get('dashboard')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get performance dashboard data' })
  @ApiResponse({
    status: 200,
    description: 'Performance dashboard data retrieved successfully',
  })
  @HttpCode(HttpStatus.OK)
  async getDashboard() {
    const systemStats = this.performanceMonitor.getSystemStats();
    const report = this.performanceMonitor.generatePerformanceReport();

    return {
      timestamp: new Date().toISOString(),
      system: systemStats,
      report,
      status: 'healthy',
    };
  }

  @Get('database')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get database query performance statistics',
    description:
      'Per-operation query timings (avg/p95), the slowest operations, and recent slow queries.',
  })
  @ApiResponse({
    status: 200,
    description: 'Database query performance statistics retrieved successfully',
  })
  @HttpCode(HttpStatus.OK)
  async getDatabaseStats() {
    return {
      timestamp: new Date().toISOString(),
      database: this.performanceMonitor.getDatabaseStats(),
    };
  }

  @Get('endpoints')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get performance statistics for all endpoints' })
  @ApiResponse({
    status: 200,
    description: 'Endpoint performance statistics retrieved successfully',
  })
  @HttpCode(HttpStatus.OK)
  async getEndpointStats() {
    const systemStats = this.performanceMonitor.getSystemStats();
    return {
      endpoints: systemStats.endpointStats,
      summary: {
        totalEndpoints: systemStats.totalEndpoints,
        totalRequests: systemStats.totalRequests,
        avgResponseTime: systemStats.avgResponseTime,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('endpoint')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get performance statistics for a specific endpoint',
  })
  @ApiQuery({ name: 'method', description: 'HTTP method', example: 'GET' })
  @ApiQuery({
    name: 'path',
    description: 'Endpoint path',
    example: '/api/properties',
  })
  @ApiResponse({
    status: 200,
    description: 'Endpoint performance statistics retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Endpoint not found' })
  @HttpCode(HttpStatus.OK)
  async getEndpointStat(
    @Query('method') method: string,
    @Query('path') path: string,
  ) {
    const stats = this.performanceMonitor.getEndpointStats(method, path);

    if (!stats) {
      return {
        message: 'No performance data found for this endpoint',
        endpoint: path,
        method,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      ...stats,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('system')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get system performance metrics' })
  @ApiResponse({
    status: 200,
    description: 'System performance metrics retrieved successfully',
  })
  @HttpCode(HttpStatus.OK)
  async getSystemMetrics() {
    const systemStats = this.performanceMonitor.getSystemStats();

    return {
      ...systemStats,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
    };
  }

  @Get('report')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Generate comprehensive performance report' })
  @ApiResponse({
    status: 200,
    description: 'Performance report generated successfully',
  })
  @HttpCode(HttpStatus.OK)
  async generateReport() {
    return this.performanceMonitor.generatePerformanceReport();
  }

  @Get('health-check')
  @ApiOperation({ summary: 'Performance monitoring health check' })
  @ApiResponse({
    status: 200,
    description: 'Performance monitoring is healthy',
  })
  @HttpCode(HttpStatus.OK)
  async healthCheck() {
    const systemStats = this.performanceMonitor.getSystemStats();
    const memoryUsageMB =
      systemStats.memoryUsage.current.heapUsed / 1024 / 1024;

    const isHealthy = memoryUsageMB < 1024 && systemStats.uptime > 0;

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      uptime: systemStats.uptime,
      memoryUsage: `${memoryUsageMB.toFixed(2)}MB`,
      totalEndpoints: systemStats.totalEndpoints,
      totalRequests: systemStats.totalRequests,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('alerts')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get recent performance alerts' })
  @ApiQuery({
    name: 'limit',
    description: 'Number of alerts to return',
    required: false,
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Performance alerts retrieved successfully',
  })
  @HttpCode(HttpStatus.OK)
  async getAlerts(@Query('limit') limit?: string) {
    // This would typically fetch from a database or cache
    // For now, return a placeholder response
    const alertLimit = limit ? parseInt(limit, 10) : 10;

    return {
      alerts: [], // Would be populated with actual alert data
      count: 0,
      limit: alertLimit,
      timestamp: new Date().toISOString(),
      message: 'No recent performance alerts',
    };
  }

  @Get('trends')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get performance trends over time' })
  @ApiQuery({
    name: 'period',
    description: 'Time period',
    required: false,
    example: '24h',
  })
  @ApiResponse({
    status: 200,
    description: 'Performance trends retrieved successfully',
  })
  @HttpCode(HttpStatus.OK)
  async getTrends(@Query('period') period?: string) {
    const systemStats = this.performanceMonitor.getSystemStats();

    // This would typically aggregate historical data
    // For now, return current stats as a trend point
    return {
      period: period || '24h',
      trends: {
        responseTime: [
          {
            timestamp: new Date().toISOString(),
            value: systemStats.avgResponseTime,
          },
        ],
        throughput: [
          {
            timestamp: new Date().toISOString(),
            value: systemStats.totalRequests,
          },
        ],
        memoryUsage: [
          {
            timestamp: new Date().toISOString(),
            value: systemStats.memoryUsage.current.heapUsed / 1024 / 1024,
          },
        ],
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('response-times')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Per-route response-time summary for a sliding window',
  })
  @ApiQuery({
    name: 'window',
    description: 'Sliding window in seconds',
    required: false,
    example: 60,
  })
  @ApiResponse({
    status: 200,
    description: 'Response-time stats retrieved successfully',
  })
  @HttpCode(HttpStatus.OK)
  getResponseTimes(@Query('window') window?: string) {
    const windowSeconds = window ? parseInt(window, 10) : 60;
    const {
      generatedAt,
      windowSeconds: ws,
      routes,
    } = this.performanceMonitor.getResponseTimeStats(windowSeconds);

    return {
      generated_at: generatedAt.toISOString(),
      window_seconds: ws,
      routes: routes.map((r) => ({
        route: r.route,
        count: r.count,
        rps: r.rps,
        p50_ms: r.p50Ms,
        p95_ms: r.p95Ms,
        p99_ms: r.p99Ms,
        slow_count: r.slowCount,
      })),
    };
  }

  @Get('slow-endpoints')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get the slowest API endpoints by average response time',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of endpoints to return',
    required: false,
    example: 10,
  })
  @ApiQuery({
    name: 'threshold',
    description: 'Minimum average response time in ms to include',
    required: false,
    example: 500,
  })
  @ApiResponse({
    status: 200,
    description: 'Slow endpoints retrieved successfully',
  })
  @HttpCode(HttpStatus.OK)
  async getSlowEndpoints(
    @Query('limit') limit?: string,
    @Query('threshold') threshold?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    const parsedThreshold = threshold ? parseInt(threshold, 10) : 0;

    const endpoints = this.performanceMonitor.getSlowEndpoints(
      parsedLimit,
      parsedThreshold,
    );

    return {
      endpoints,
      count: endpoints.length,
      thresholdMs: parsedThreshold,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('percentiles')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary:
      'Get response-time percentile breakdown for all endpoints, or a specific one',
  })
  @ApiQuery({
    name: 'method',
    description: 'HTTP method (omit for all endpoints)',
    required: false,
    example: 'GET',
  })
  @ApiQuery({
    name: 'path',
    description: 'Endpoint path (omit for all endpoints)',
    required: false,
    example: '/api/properties',
  })
  @ApiResponse({
    status: 200,
    description: 'Percentile data retrieved successfully',
  })
  @HttpCode(HttpStatus.OK)
  async getPercentiles(
    @Query('method') method?: string,
    @Query('path') path?: string,
  ) {
    if (method && path) {
      const percentiles = this.performanceMonitor.getEndpointPercentiles(
        method,
        path,
      );

      if (!percentiles) {
        return {
          message: 'No performance data found for this endpoint',
          endpoint: path,
          method,
          timestamp: new Date().toISOString(),
        };
      }

      return {
        method,
        endpoint: path,
        percentiles,
        timestamp: new Date().toISOString(),
      };
    }

    const all = this.performanceMonitor.getAllEndpointPercentiles();
    return {
      endpoints: all,
      count: all.length,
      timestamp: new Date().toISOString(),
    };
  }
}
