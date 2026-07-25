import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerService } from './logger.service';
import { RetryService } from './retry.service';
import { LogMaintenanceService } from './log-maintenance.service';

/**
 * Global logger module that provides LoggerService and RetryService throughout the application
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [LoggerService, RetryService, LogMaintenanceService],
  exports: [LoggerService, RetryService],
})
export class LoggerModule {}
