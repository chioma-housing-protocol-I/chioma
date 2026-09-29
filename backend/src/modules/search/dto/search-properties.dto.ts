import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  Min,
  Max,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  PropertyType,
  ListingStatus,
} from '../../properties/entities/property.entity';

/** Trims a string and strips ASCII / unicode control characters. */
function sanitizeString(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  // \p{Cc} = Unicode "Control" category (covers NUL, BEL, DEL, etc.)
  // The 'u' flag is required for Unicode property escapes.
  return value.trim().replace(/\p{Cc}/gu, '');
}

/** Converts the common 'true'/'false' query string values to a boolean. */
function toBoolean(value: unknown): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

export class SearchPropertiesDto {
  @ApiPropertyOptional({
    description: 'Full-text search query',
    maxLength: 200,
  })
  @IsOptional()
  @Transform(({ value }) => sanitizeString(value))
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({ description: 'Filter by city', maxLength: 100 })
  @IsOptional()
  @Transform(({ value }) => sanitizeString(value))
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'Filter by state', maxLength: 100 })
  @IsOptional()
  @Transform(({ value }) => sanitizeString(value))
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ description: 'Filter by country', maxLength: 100 })
  @IsOptional()
  @Transform(({ value }) => sanitizeString(value))
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({
    description: 'Filter by property type',
    enum: PropertyType,
  })
  @IsOptional()
  @IsEnum(PropertyType)
  type?: PropertyType;

  @ApiPropertyOptional({
    description: 'Filter by listing status',
    enum: ListingStatus,
  })
  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;

  @ApiPropertyOptional({ description: 'Minimum price', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum price', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Minimum bedrooms', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  bedrooms?: number;

  @ApiPropertyOptional({ description: 'Minimum bathrooms', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  bathrooms?: number;

  @ApiPropertyOptional({ description: 'Filter by furnished status' })
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  furnished?: boolean;

  @ApiPropertyOptional({ description: 'Filter by parking availability' })
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  parking?: boolean;

  @ApiPropertyOptional({ description: 'Filter by pets-allowed status' })
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  petsAllowed?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by amenity names (comma-separated or repeated param)',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',').map((a) => a.trim()) : value,
  )
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  amenities?: string[];

  @ApiPropertyOptional({
    description: 'Latitude for proximity search',
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional({
    description: 'Longitude for proximity search',
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @ApiPropertyOptional({
    description: 'Search radius in kilometres',
    minimum: 0.1,
    maximum: 500,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(500)
  radiusKm?: number;

  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
