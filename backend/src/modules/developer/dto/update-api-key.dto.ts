import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateApiKeyDto {
  @ApiPropertyOptional({
    example: 'My updated integration',
    minLength: 1,
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({
    description: 'Expiration date in ISO 8601 format',
    example: '2026-06-25T12:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class RotateApiKeyDto {
  @ApiPropertyOptional({
    description: 'Custom expiration date for the new key (ISO 8601)',
    example: '2026-06-25T12:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
