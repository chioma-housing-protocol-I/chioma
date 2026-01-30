import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  IsObject,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AccountTypeDto } from './create-profile.dto';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    enum: AccountTypeDto,
    description: 'The type of account (tenant, landlord, or agent)',
    example: AccountTypeDto.Landlord,
  })
  @IsOptional()
  @IsEnum(AccountTypeDto)
  accountType?: AccountTypeDto;

  @ApiPropertyOptional({
    description: 'Display name for the profile',
    maxLength: 100,
    example: 'Jane Doe',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Bio or description',
    maxLength: 500,
    example: 'Professional property agent',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({
    description: 'Avatar URL',
    maxLength: 500,
    example: 'https://example.com/new-avatar.jpg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata as JSON',
    example: { preferences: { notifications: false } },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
