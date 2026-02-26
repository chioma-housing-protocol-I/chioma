import { Module } from '@nestjs/common';
import { CodeQualityAnalysisService } from './services/code-quality-analysis.service';
import { AutomatedRefactoringService } from './services/automated-refactoring.service';
import { DependencyManagementService } from './services/dependency-management.service';
import { TechnicalDebtController } from './controllers/technical-debt.controller';

@Module({
  controllers: [TechnicalDebtController],
  providers: [
    CodeQualityAnalysisService,
    AutomatedRefactoringService,
    DependencyManagementService,
  ],
  exports: [
    CodeQualityAnalysisService,
    AutomatedRefactoringService,
    DependencyManagementService,
  ],
})
export class TechnicalDebtModule {}
