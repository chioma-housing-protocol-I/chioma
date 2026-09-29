import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabasePerformanceController } from './database-performance.controller';
import { DatabasePerformanceService } from './database-performance.service';
import { QueryAnalysisModule } from '../../common/query-logger/query-analysis.module';

@Module({
  imports: [TypeOrmModule.forFeature([]), QueryAnalysisModule],
  controllers: [DatabasePerformanceController],
  providers: [DatabasePerformanceService],
  exports: [DatabasePerformanceService],
})
export class DatabasePerformanceModule {}
