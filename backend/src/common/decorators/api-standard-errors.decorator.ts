import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ErrorResponseDto } from '../dto/error-response.dto';

/**
 * Decorator that adds standard error responses to Swagger documentation.
 * Includes 400, 401, 403, 404, 429, and 500 error responses.
 */
export function ApiStandardErrors() {
  return applyDecorators(
    ApiResponse({
      status: 400,
      description:
        'Bad Request - Invalid input data or business rule violation',
      type: ErrorResponseDto,
    }),
    ApiResponse({
      status: 401,
      description:
        'Unauthorized - Invalid or missing authentication credentials',
      type: ErrorResponseDto,
    }),
    ApiResponse({
      status: 403,
      description:
        'Forbidden - Insufficient permissions to access the resource',
      type: ErrorResponseDto,
    }),
    ApiResponse({
      status: 404,
      description: 'Not Found - The requested resource was not found',
      type: ErrorResponseDto,
    }),
    ApiResponse({
      status: 429,
      description: 'Too Many Requests - Rate limit exceeded',
      type: ErrorResponseDto,
    }),
    ApiResponse({
      status: 500,
      description:
        'Internal Server Error - An unexpected error occurred on the server',
      type: ErrorResponseDto,
    }),
  );
}
