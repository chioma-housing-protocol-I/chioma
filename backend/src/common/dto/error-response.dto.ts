import { ApiProperty } from '@nestjs/swagger';
import { ErrorCode } from '../errors/error-codes';

export class ErrorResponseDto {
  @ApiProperty({
    example: 400,
    description: 'The HTTP status code',
  })
  statusCode: number;

  @ApiProperty({
    example: 'Bad Request',
    description: 'The error message summary',
  })
  message: string | string[];

  @ApiProperty({
    example: 'Bad Request',
    description: 'The error type',
    required: false,
  })
  error?: string;

  @ApiProperty({
    example: 'VAL_2001',
    description: 'Machine-readable error code',
    enum: ErrorCode,
    required: false,
  })
  code?: ErrorCode;

  @ApiProperty({
    example: '2026-04-23T10:30:00.000Z',
    description: 'Timestamp when the error occurred',
    required: false,
  })
  timestamp?: string;

  @ApiProperty({
    example: 60,
    description: 'Seconds to wait before retrying (for rate limit errors)',
    required: false,
  })
  retryAfter?: number;
}
