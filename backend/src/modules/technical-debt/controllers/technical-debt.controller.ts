import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CodeQualityAnalysisService } from '../services/code-quality-analysis.service';
import { AutomatedRefactoringService } from '../services/automated-refactoring.service';
import { DependencyManagementService } from '../services/dependency-management.service';
import { AnalysisOptions } from '../types/code-quality.types';
import { ApplyRefactoringDto } from '../types/refactoring.types';
import { UpdateOptions } from '../types/dependency.types';

@ApiTags('Technical Debt Management')
@Controller('technical-debt')
@ApiBearerAuth()
export class TechnicalDebtController {
  constructor(
    private readonly qualityAnalysisService: CodeQualityAnalysisService,
    private readonly refactoringService: AutomatedRefactoringService,
    private readonly dependencyService: DependencyManagementService,
  ) {}

  @Get('quality/project')
  @ApiOperation({ summary: 'Analyze project-wide code quality' })
  async analyzeProjectQuality(@Query() options: AnalysisOptions) {
    return this.qualityAnalysisService.analyzeProject(options);
  }

  @Get('quality/module/:moduleName')
  @ApiOperation({ summary: 'Analyze specific module code quality' })
  async analyzeModuleQuality(
    @Query('moduleName') moduleName: string,
    @Query() options: AnalysisOptions,
  ) {
    return this.qualityAnalysisService.analyzeModule(moduleName, options);
  }

  @Get('quality/metrics')
  @ApiOperation({ summary: 'Get code quality metrics' })
  async getQualityMetrics() {
    return this.qualityAnalysisService.getMetrics();
  }

  @Get('refactoring/opportunities')
  @ApiOperation({ summary: 'Identify refactoring opportunities' })
  async getRefactoringOpportunities(@Query('moduleName') moduleName?: string) {
    return this.refactoringService.identifyRefactoringOpportunities(moduleName);
  }

  @Post('refactoring/plan')
  @ApiOperation({ summary: 'Create refactoring plan' })
  async createRefactoringPlan(@Body() body: { opportunityIds: string[] }) {
    const opportunities =
      await this.refactoringService.identifyRefactoringOpportunities();
    const selected = opportunities.filter((opp) =>
      body.opportunityIds.includes(opp.id),
    );
    return this.refactoringService.createRefactoringPlan(selected);
  }

  @Post('refactoring/apply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply refactoring' })
  async applyRefactoring(@Body() dto: ApplyRefactoringDto) {
    return this.refactoringService.applyRefactoring(dto);
  }

  @Get('refactoring/history')
  @ApiOperation({ summary: 'Get refactoring history' })
  async getRefactoringHistory() {
    return this.refactoringService.getRefactoringHistory();
  }

  @Get('refactoring/stats')
  @ApiOperation({ summary: 'Get refactoring statistics' })
  async getRefactoringStats() {
    return this.refactoringService.getRefactoringStats();
  }

  @Get('dependencies/report')
  @ApiOperation({ summary: 'Get comprehensive dependency report' })
  async getDependencyReport() {
    return this.dependencyService.analyzeDependencies();
  }

  @Get('dependencies/vulnerabilities')
  @ApiOperation({ summary: 'Check for security vulnerabilities' })
  async checkVulnerabilities() {
    return this.dependencyService.checkVulnerabilities();
  }

  @Get('dependencies/outdated')
  @ApiOperation({ summary: 'Check for outdated packages' })
  async checkOutdated() {
    return this.dependencyService.checkOutdatedPackages();
  }

  @Get('dependencies/analysis')
  @ApiOperation({ summary: 'Perform full dependency analysis' })
  async performFullAnalysis() {
    return this.dependencyService.performFullAnalysis();
  }

  @Post('dependencies/update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update dependencies' })
  async updateDependencies(@Body() options: UpdateOptions) {
    return this.dependencyService.updateDependencies(options);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get technical debt dashboard data' })
  async getDashboard() {
    const [qualityReport, refactoringOpportunities, dependencyReport] = await Promise.all([
      this.qualityAnalysisService.analyzeProject({ depth: 'shallow' }),
      this.refactoringService.identifyRefactoringOpportunities(),
      this.dependencyService.analyzeDependencies(),
    ]);

    return {
      timestamp: Date.now(),
      quality: {
        overallScore: qualityReport.overallScore.overall,
        level: qualityReport.overallScore.level,
        criticalIssues: qualityReport.summary.criticalIssues,
        highIssues: qualityReport.summary.highIssues,
        technicalDebtHours: Math.round(qualityReport.summary.technicalDebtMinutes / 60),
      },
      refactoring: {
        totalOpportunities: refactoringOpportunities.length,
        critical: refactoringOpportunities.filter(opp => opp.priority === 'critical').length,
        high: refactoringOpportunities.filter(opp => opp.priority === 'high').length,
        autoApplicable: refactoringOpportunities.filter(opp => opp.autoApplicable).length,
      },
      dependencies: {
        total: dependencyReport.totalDependencies,
        vulnerabilities: dependencyReport.vulnerabilities.length,
        criticalVulnerabilities: dependencyReport.summary.critical,
        outdated: dependencyReport.outdated.length,
        unused: dependencyReport.unused.length,
      },
    };
  }
}
