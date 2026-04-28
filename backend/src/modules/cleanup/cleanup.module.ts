import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { CleanupController } from './cleanup.controller';
import { DataArchivalController } from './data-archival.controller';
import { CodeQualityAnalysisService } from './code-quality-analysis.service';
import { AutomatedRefactoringService } from './automated-refactoring.service';
import { DependencyManagementService } from './dependency-management.service';
import { DataArchivalService } from './data-archival.service';
import { TenantScreeningRequest } from '../screening/entities/tenant-screening-request.entity';
import { TenantScreeningReport } from '../screening/entities/tenant-screening-report.entity';
import { TenantScreeningConsent } from '../screening/entities/tenant-screening-consent.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TenantScreeningRequest,
      TenantScreeningReport,
      TenantScreeningConsent,
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [CleanupController, DataArchivalController],
  providers: [
    CodeQualityAnalysisService,
    AutomatedRefactoringService,
    DependencyManagementService,
    DataArchivalService,
  ],
  exports: [DataArchivalService],
})
export class CleanupModule {}
