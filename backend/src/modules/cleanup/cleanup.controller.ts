import { Controller, Get, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { join } from 'path';
import { CodeQualityAnalysisService } from './code-quality-analysis.service';
import { AutomatedRefactoringService } from './automated-refactoring.service';
import { DependencyManagementService } from './dependency-management.service';
import {
  OrphanedRecordsCleanupService,
  OrphanedRecordsCleanupStats,
} from './orphaned-records-cleanup.service';

@ApiTags('Cleanup')
@Controller('cleanup')
export class CleanupController {
  constructor(
    private readonly codeQuality: CodeQualityAnalysisService,
    private readonly refactoring: AutomatedRefactoringService,
    private readonly dependencies: DependencyManagementService,
    private readonly orphanedRecordsCleanupService: OrphanedRecordsCleanupService,
  ) {}

  @Get('report')
  @ApiOperation({ summary: 'Get technical debt cleanup report' })
  getReport() {
    const root = join(process.cwd());
    return {
      codeQuality: this.codeQuality.analyzePackageHealth(root),
      dependencies: this.dependencies.getDependencySummary(root),
      refactorSuggestions: this.refactoring.suggestRefactors(),
    };
  }

  @Post('orphaned-records/run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Scan for orphaned database records and delete them if ORPHAN_CLEANUP_DELETE_ENABLED is set',
  })
  @ApiResponse({
    status: 200,
    description: 'Orphaned records scan completed successfully',
  })
  async runOrphanedRecordsCleanup(): Promise<OrphanedRecordsCleanupStats> {
    return this.orphanedRecordsCleanupService.runCleanup();
  }
}
