import { BaseAppError } from '../errors/base.error';
import { ErrorCode } from '../errors/error-codes';
import { HttpStatus } from '@nestjs/common';

export class IdempotencyKeyMissingError extends BaseAppError {
  constructor(message?: string, context?: Record<string, unknown>) {
    super(
      ErrorCode.IDEMPOTENCY_KEY_MISSING,
      HttpStatus.BAD_REQUEST,
      message,
      true,
      context,
    );
  }
}
