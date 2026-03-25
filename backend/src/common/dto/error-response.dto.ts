import { ApiProperty } from '@nestjs/swagger';

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
}
