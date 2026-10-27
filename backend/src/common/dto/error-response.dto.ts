import { ApiProperty } from '@nestjs/swagger';
import { ErrorCode } from '../errors/error-codes';

export class ErrorBodyDto {
  @ApiProperty({
    example: 'VAL_2001',
    description: 'Machine-readable error code',
    enum: ErrorCode,
  })
  code: ErrorCode;

  @ApiProperty({
    example: 'The provided data is invalid',
    description: 'Human-readable error message',
  })
  message: string | string[];

  @ApiProperty({
    example: { field: 'email', reason: 'must be an email' },
    description:
      'Additional error context (validation issues, conflicting values, etc). Omitted when there is nothing beyond the message.',
    required: false,
  })
  details?: unknown;

  @ApiProperty({
    example: '2026-04-23T10:30:00.000Z',
    description: 'Timestamp when the error occurred',
    required: false,
  })
  timestamp?: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Unique identifier for the request',
    required: false,
  })
  requestId?: string;

  @ApiProperty({
    example: '/api/v1/users',
    description: 'The path of the request that failed',
    required: false,
  })
  path?: string;
}

/**
 * Standard error envelope returned by every endpoint (#2071). All error
 * bodies are shaped as `{ error: { code, message, details } }`; details is
 * only present when there is more to report than the message itself
 * (e.g. per-field validation failures).
 */
export class ErrorResponseDto {
  @ApiProperty({ type: ErrorBodyDto })
  error: ErrorBodyDto;
}
