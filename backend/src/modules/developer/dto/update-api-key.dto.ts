import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsIn,
  MaxLength,
  MinLength,
  IsArray,
} from 'class-validator';
import { API_SCOPES } from '../constants/api-scopes';

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
    enum: API_SCOPES,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(API_SCOPES, { each: true })
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
