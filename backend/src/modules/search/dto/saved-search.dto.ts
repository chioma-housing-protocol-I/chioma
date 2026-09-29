import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { SearchPropertiesDto } from './search-properties.dto';

export class CreateSavedSearchDto {
  @ApiProperty({
    description: 'Display name for the saved search',
    example: 'Furnished 2-bed in Lekki under $1500',
    minLength: 1,
    maxLength: 150,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name: string;

  @ApiProperty({
    description: 'Filter set to persist and re-run against new listings',
    type: () => SearchPropertiesDto,
  })
  @ValidateNested()
  @Type(() => SearchPropertiesDto)
  filters: SearchPropertiesDto;

  @ApiPropertyOptional({
    description: 'Whether to notify the owner when a new listing matches',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  alertsEnabled?: boolean;
}

export class SavedSearchDto {
  @ApiProperty({ description: 'Saved search ID' })
  id: string;

  @ApiProperty({ description: 'Display name' })
  name: string;

  @ApiProperty({
    description: 'Persisted filter set',
    type: () => SearchPropertiesDto,
  })
  filters: SearchPropertiesDto;

  @ApiProperty({ description: 'Whether match notifications are enabled' })
  alertsEnabled: boolean;

  @ApiProperty({
    description: 'When a matching listing was last notified',
    nullable: true,
  })
  lastNotifiedAt: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: string;
}

export class SavedSearchIdParamDto {
  @ApiProperty({ description: 'Saved search ID' })
  @IsUUID()
  id: string;
}
