import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueryAnalysisService } from './query-analysis.service';
import { QueryThresholdConfig } from './query-threshold.config';

@Module({
  imports: [TypeOrmModule.forFeature([])],
  providers: [QueryAnalysisService, QueryThresholdConfig],
  exports: [QueryAnalysisService, QueryThresholdConfig],
})
export class QueryAnalysisModule {}
