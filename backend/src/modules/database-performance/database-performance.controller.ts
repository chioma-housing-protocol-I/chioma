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
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginationUtils } from '../../common/utils';

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
  async getSlowQueries(@Query() query: PaginationQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    // Fetch a generously-sized capped set from Postgres, then paginate it —
    // pg_stat_statements ORDER BY doesn't support OFFSET-based paging.
    const rows = await this.performanceService.getSlowQueries(
      Math.max(200, page * limit),
    );
    return PaginationUtils.paginateArray(rows, page, limit);
  }

  @Get('indexes/usage')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get index usage statistics' })
  async getIndexUsage(@Query() query: PaginationQueryDto) {
    const rows = await this.performanceService.getIndexUsage();
    return PaginationUtils.paginateArray(
      rows,
      query.page || 1,
      query.limit || 20,
    );
  }

  @Get('indexes/unused')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get unused or rarely-used indexes' })
  async getUnusedIndexes(@Query() query: PaginationQueryDto) {
    const rows = await this.performanceService.getUnusedIndexes();
    return PaginationUtils.paginateArray(
      rows,
      query.page || 1,
      query.limit || 20,
    );
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
  async getDuplicateIndexes(@Query() query: PaginationQueryDto) {
    const rows = await this.performanceService.getDuplicateIndexCandidates();
    return PaginationUtils.paginateArray(
      rows,
      query.page || 1,
      query.limit || 20,
    );
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
  async getQueryPatterns(
    @Query('search') search: string | undefined,
    @Query() query: PaginationQueryDto,
  ) {
    const patterns = await this.performanceService.getQueryPatterns(search);
    return PaginationUtils.paginateArray(
      patterns,
      query.page || 1,
      query.limit || 20,
    );
  }

  @Get('query-analysis/history')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get recent query execution history' })
  @ApiQuery({ name: 'minDuration', required: false })
  async getQueryHistory(
    @Query('minDuration') minDuration: string | undefined,
    @Query() query: PaginationQueryDto,
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    // getQueryHistory's own `limit` bounds how much in-memory history to
    // scan; fetch enough to cover the requested page, then paginate it.
    const history = await this.performanceService.getQueryHistory(
      Math.max(200, page * limit),
      minDuration ? parseInt(minDuration, 10) : undefined,
    );
    return PaginationUtils.paginateArray(history, page, limit);
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
