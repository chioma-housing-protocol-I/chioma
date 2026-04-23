import { BaseAppError } from '../errors/base.error';
import { ErrorCode } from '../errors/error-codes';
import { HttpStatus } from '@nestjs/common';

export class LockNotAcquiredError extends BaseAppError {
  constructor(message?: string, context?: Record<string, unknown>) {
    super(
      ErrorCode.LOCK_NOT_ACQUIRED,
      HttpStatus.CONFLICT,
      message,
      true,
      context,
    );
  }
}
