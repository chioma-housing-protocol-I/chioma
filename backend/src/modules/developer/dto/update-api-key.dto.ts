import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  MaxLength,
  MinLength,
  IsArray,
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
    example: 'Updated description',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({
    description: 'Expiration date in ISO 8601 format',
    example: '2026-06-25T12:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({
    example: ['properties:read', 'properties:write'],
    description: 'List of permissions/scopes for this key',
  })
  @IsOptional()
  @IsArray()
  permissions?: string[];
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
