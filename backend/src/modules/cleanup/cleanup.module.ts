import { Module } from '@nestjs/common';
import { CleanupController } from './cleanup.controller';
import { CodeQualityAnalysisService } from './code-quality-analysis.service';
import { AutomatedRefactoringService } from './automated-refactoring.service';
import { DependencyManagementService } from './dependency-management.service';

@Module({
  controllers: [CleanupController],
  providers: [
    CodeQualityAnalysisService,
    AutomatedRefactoringService,
    DependencyManagementService,
  ],
})
export class CleanupModule {}
