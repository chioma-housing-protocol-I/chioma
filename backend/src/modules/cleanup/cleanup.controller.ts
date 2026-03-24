import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { join } from 'path';
import { CodeQualityAnalysisService } from './code-quality-analysis.service';
import { AutomatedRefactoringService } from './automated-refactoring.service';
import { DependencyManagementService } from './dependency-management.service';

@ApiTags('Cleanup')
@Controller('cleanup')
export class CleanupController {
  constructor(
    private readonly codeQuality: CodeQualityAnalysisService,
    private readonly refactoring: AutomatedRefactoringService,
    private readonly dependencies: DependencyManagementService,
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
}
