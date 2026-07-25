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
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PropertyType, ListingStatus } from '../entities/property.entity';

/** Trims a string and strips ASCII / unicode control characters. */
function sanitizeString(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  // \p{Cc} = Unicode "Control" category (covers NUL, BEL, DEL, etc.)
  // The 'u' flag is required for Unicode property escapes.
  return value.trim().replace(/\p{Cc}/gu, '');
}

export class QueryPropertyDto {
  // Filters
  @ApiPropertyOptional({
    description: 'Filter by property type',
    enum: PropertyType,
    example: PropertyType.APARTMENT,
  })
  @IsOptional()
  @IsEnum(PropertyType)
  type?: PropertyType;

  @ApiPropertyOptional({
    description: 'Filter by listing status',
    enum: ListingStatus,
    example: ListingStatus.PUBLISHED,
  })
  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;

  @ApiPropertyOptional({
    description: 'Minimum price',
    example: 500,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Maximum price',
    example: 5000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Minimum number of bedrooms',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minBedrooms?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of bedrooms',
    example: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxBedrooms?: number;

  @ApiPropertyOptional({
    description: 'Minimum number of bathrooms',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minBathrooms?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of bathrooms',
    example: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxBathrooms?: number;

  @ApiPropertyOptional({
    description: 'Filter by city',
    example: 'New York',
    maxLength: 100,
  })
  @IsOptional()
  @Transform(({ value }) => sanitizeString(value))
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    description: 'Filter by state',
    example: 'NY',
    maxLength: 100,
  })
  @IsOptional()
  @Transform(({ value }) => sanitizeString(value))
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({
    description: 'Filter by country',
    example: 'USA',
    maxLength: 100,
  })
  @IsOptional()
  @Transform(({ value }) => sanitizeString(value))
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({
    description: 'Filter by amenities (comma-separated names)',
    example: 'Swimming Pool,Gym',
    type: String,
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',').map((s) => s.trim()) : value,
  )
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  amenities?: string[];

  @ApiPropertyOptional({
    description: 'Filter by furnished status',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isFurnished?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by parking availability',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasParking?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by pets allowed',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  petsAllowed?: boolean;

  // Proximity / geospatial filters
  @ApiPropertyOptional({
    description: 'Latitude for proximity search (requires lng and radiusKm)',
    example: 40.7128,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional({
    description: 'Longitude for proximity search (requires lat and radiusKm)',
    example: -74.006,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @ApiPropertyOptional({
    description: 'Search radius in kilometres (requires lat and lng)',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(500)
  radiusKm?: number;

  @ApiPropertyOptional({
    description: 'Filter by owner ID',
    example: 'uuid-string',
    maxLength: 36,
  })
  @IsOptional()
  @Transform(({ value }) => sanitizeString(value))
  @IsString()
  @MaxLength(36)
  ownerId?: string;

  @ApiPropertyOptional({
    description: 'Search keyword for title and description',
    example: 'modern apartment',
    maxLength: 200,
  })
  @IsOptional()
  @Transform(({ value }) => sanitizeString(value))
  @IsString()
  @MaxLength(200)
  search?: string;

  // Pagination
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  // Sorting
  @ApiPropertyOptional({
    description: 'Field to sort by',
    example: 'createdAt',
    default: 'createdAt',
    maxLength: 50,
  })
  @IsOptional()
  @Transform(({ value }) => sanitizeString(value))
  @IsString()
  @MaxLength(50)
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order direction',
    enum: ['ASC', 'DESC'],
    example: 'DESC',
    default: 'DESC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
