import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AccountTypeDto {
  Tenant = 'tenant',
  Landlord = 'landlord',
  Agent = 'agent',
}

export class CreateProfileDto {
  @ApiProperty({
    enum: AccountTypeDto,
    description: 'The type of account (tenant, landlord, or agent)',
    example: AccountTypeDto.Tenant,
  })
  @IsEnum(AccountTypeDto)
  accountType: AccountTypeDto;

  @ApiPropertyOptional({
    description: 'Display name for the profile',
    maxLength: 100,
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Bio or description',
    maxLength: 500,
    example: 'Experienced landlord with multiple properties',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({
    description: 'Avatar URL',
    maxLength: 500,
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata as JSON',
    example: { preferences: { notifications: true } },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
