import { Global, Module } from '@nestjs/common';
import { LoggerService } from '../services/logger.service';
import { ClsService } from '../services/cls.service';

@Global()
@Module({
  providers: [LoggerService, ClsService],
  exports: [LoggerService, ClsService],
})
export class LoggerModule {}
