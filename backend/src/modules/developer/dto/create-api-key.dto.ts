import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  MaxLength,
  MinLength,
  IsArray,
  IsOptional,
} from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({ example: 'My integration', minLength: 1, maxLength: 80 })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @ApiProperty({
    example: 'Integration for external service',
    required: false,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiProperty({
    example: ['properties:read', 'properties:write'],
    description: 'List of permissions/scopes for this key',
    required: false,
  })
  @IsOptional()
  @IsArray()
  permissions?: string[];
}
