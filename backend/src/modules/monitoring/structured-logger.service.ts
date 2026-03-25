import { Injectable, Logger } from '@nestjs/common';

// Simplified structured logger without winston dependency
// Install winston for full functionality: pnpm add winston winston-daily-rotate-file

@Injectable()
export class StructuredLoggerService {
  private readonly logger = new Logger('StructuredLogger');

  log(message: string, context?: any) {
    this.logger.log(message, context);
  }

  error(message: string, trace?: string, context?: any) {
    this.logger.error(message, trace);
    if (context) {
      this.logger.error(JSON.stringify(context));
    }
  }

  warn(message: string, context?: any) {
    this.logger.warn(message, context);
  }

  debug(message: string, context?: any) {
    this.logger.debug(message, context);
  }

  verbose(message: string, context?: any) {
    this.logger.verbose(message, context);
  }
}
