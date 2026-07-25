import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { CleanupController } from './cleanup.controller';
import { DataArchivalController } from './data-archival.controller';
import { CodeQualityAnalysisService } from './code-quality-analysis.service';
import { AutomatedRefactoringService } from './automated-refactoring.service';
import { DependencyManagementService } from './dependency-management.service';
import { TempFileCleanupService } from './temp-file-cleanup.service';
import { DataArchivalService } from './data-archival.service';
import { SecurityPatchManagementService } from './security-patch-management.service';
import { DatabaseMaintenanceService } from './database-maintenance.service';
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
    TempFileCleanupService,
    DataArchivalService,
    SecurityPatchManagementService,
    DatabaseMaintenanceService,
  ],
  exports: [
    DataArchivalService,
    SecurityPatchManagementService,
    DatabaseMaintenanceService,
  ],
})
export class CleanupModule {}
