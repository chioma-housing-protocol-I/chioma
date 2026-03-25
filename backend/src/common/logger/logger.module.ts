import { Global, Module } from '@nestjs/common';
import { LoggerService } from './logger.service';

/**
 * Global LoggerModule providing the consolidated LoggerService.
 */
@Global()
@Module({
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
