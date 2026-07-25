import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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
}
