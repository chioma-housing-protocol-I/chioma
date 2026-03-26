import { LoggerService } from './logger.service';

/**
 * Create a lightweight logger for ts-node scripts (seed/migrations).
 * Uses the same Winston configuration + redaction as the app logger.
 */
export function createScriptLogger(context: string): LoggerService {
  return new LoggerService(undefined, context);
}
