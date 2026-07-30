import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { DatabasePerformanceService } from './database-performance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Database Performance')
@Controller('database-performance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DatabasePerformanceController {
  constructor(
    private readonly performanceService: DatabasePerformanceService,
  ) {}

  @Get('report')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get a comprehensive database performance report' })
  async getPerformanceReport() {
    return this.performanceService.getPerformanceReport();
  }

  @Get('slow-queries')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get slow query statistics from pg_stat_statements',
  })
  async getSlowQueries() {
    return this.performanceService.getSlowQueries(20);
  }

  @Get('indexes/usage')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get index usage statistics' })
  async getIndexUsage() {
    return this.performanceService.getIndexUsage();
  }

  @Get('indexes/unused')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get unused or rarely-used indexes' })
  async getUnusedIndexes() {
    return this.performanceService.getUnusedIndexes();
  }

  @Get('indexes/recommendations')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get index optimization recommendations' })
  async getIndexRecommendations() {
    return this.performanceService.getIndexRecommendations();
  }

  @Get('indexes/duplicates')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get duplicate index candidates' })
  async getDuplicateIndexes() {
    return this.performanceService.getDuplicateIndexCandidates();
  }

  @Get('query-analysis')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary:
      'Get real-time query analysis including slow query detection and N+1 alerts',
  })
  async getQueryAnalysis() {
    return this.performanceService.getQueryAnalysis();
  }

  @Get('query-analysis/n-plus-one')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get N+1 query detection reports' })
  @ApiQuery({
    name: 'severity',
    required: false,
    enum: ['low', 'medium', 'high', 'critical'],
  })
  async getNPlusOneDetection(@Query('severity') severity?: string) {
    return this.performanceService.getNPlusOneDetection(severity);
  }

  @Get('query-analysis/patterns')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all tracked query patterns with statistics' })
  @ApiQuery({ name: 'search', required: false })
  async getQueryPatterns(@Query('search') search?: string) {
    return this.performanceService.getQueryPatterns(search);
  }

  @Get('query-analysis/history')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get recent query execution history' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'minDuration', required: false })
  async getQueryHistory(
    @Query('limit') limit?: string,
    @Query('minDuration') minDuration?: string,
  ) {
    return this.performanceService.getQueryHistory(
      limit ? parseInt(limit, 10) : 100,
      minDuration ? parseInt(minDuration, 10) : undefined,
    );
  }

  @Get('query-analysis/stats')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get aggregated query execution statistics' })
  async getQueryStats() {
    return this.performanceService.getQueryStats();
  }

  @Get('query-analysis/reset')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Reset query analysis data' })
  async resetQueryAnalysis() {
    return this.performanceService.resetQueryAnalysis();
  }
}
