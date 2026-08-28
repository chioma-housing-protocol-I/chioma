import {
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
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

  @ApiResponse({ status: 200, description: 'Retrieved' })
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
    description:
      'Pass dryRun=true to report candidate counts and sample ids without deleting anything. Deletions are capped per run by ORPHAN_CLEANUP_MAX_DELETIONS_PER_RUN; a run that would exceed the cap aborts and raises an alert.',
  })
  @ApiQuery({
    name: 'dryRun',
    required: false,
    description: 'When true, log and return the candidate set without mutating',
  })
  @ApiResponse({
    status: 200,
    description: 'Orphaned records scan completed successfully',
  })
  async runOrphanedRecordsCleanup(
    @Query('dryRun') dryRun?: string,
  ): Promise<OrphanedRecordsCleanupStats> {
    return this.orphanedRecordsCleanupService.runCleanup(
      dryRun === undefined ? undefined : { dryRun: dryRun === 'true' },
    );
  }
}
