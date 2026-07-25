import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabasePerformanceController } from './database-performance.controller';
import { DatabasePerformanceService } from './database-performance.service';

@Module({
  imports: [TypeOrmModule.forFeature([])],
  controllers: [DatabasePerformanceController],
  providers: [DatabasePerformanceService],
  exports: [DatabasePerformanceService],
})
export class DatabasePerformanceModule {}
