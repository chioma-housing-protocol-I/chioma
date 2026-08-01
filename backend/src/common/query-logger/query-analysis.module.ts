import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueryAnalysisService } from './query-analysis.service';

@Module({
  imports: [TypeOrmModule.forFeature([])],
  providers: [QueryAnalysisService],
  exports: [QueryAnalysisService],
})
export class QueryAnalysisModule {}
