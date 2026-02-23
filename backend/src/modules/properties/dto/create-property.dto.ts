import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PropertyType } from '../entities/property.entity';

export class CreatePropertyImageDto {
  @ApiProperty({
    description: 'URL of the property image',
    example: 'https://example.com/images/property1.jpg',
  })
  @IsNotEmpty()
  @IsUrl()
  url: string;

  @ApiPropertyOptional({
    description: 'Sort order of the image',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Whether this is the primary image',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CreatePropertyAmenityDto {
  @ApiProperty({
    description: 'Name of the amenity',
    example: 'Swimming Pool',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Icon identifier for the amenity',
    example: 'pool',
  })
  @IsOptional()
  @IsString()
  icon?: string;
}

export class CreateRentalUnitDto {
  @ApiProperty({
    description: 'Unit number or identifier',
    example: 'A-101',
  })
  @IsNotEmpty()
  @IsString()
  unitNumber: string;

  @ApiPropertyOptional({
    description: 'Floor number of the unit',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  floor?: number;

  @ApiPropertyOptional({
    description: 'Number of bedrooms',
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bedrooms?: number;

  @ApiPropertyOptional({
    description: 'Number of bathrooms',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bathrooms?: number;

  @ApiPropertyOptional({
    description: 'Area in square meters',
    example: 75.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  area?: number;

  @ApiProperty({
    description: 'Monthly rent price',
    example: 1500.0,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;
}

export class CreatePropertyDto {
  @ApiProperty({
    description: 'Title of the property listing',
    example: 'Modern 2-Bedroom Apartment in Downtown',
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the property',
    example:
      'Beautiful modern apartment with stunning city views, fully renovated kitchen, and access to building amenities.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Type of property',
    enum: PropertyType,
    example: PropertyType.APARTMENT,
    default: PropertyType.APARTMENT,
  })
  @IsOptional()
  @IsEnum(PropertyType)
  type?: PropertyType;

  // Location
  @ApiPropertyOptional({
    description: 'Latitude coordinate',
    example: 40.7128,
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude coordinate',
    example: -74.006,
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Street address',
    example: '123 Main Street, Apt 4B',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'City',
    example: 'New York',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'State or province',
    example: 'NY',
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    description: 'Postal code',
    example: '10001',
  })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({
    description: 'Country',
    example: 'USA',
  })
  @IsOptional()
  @IsString()
  country?: string;

  // Pricing
  @ApiProperty({
    description: 'Monthly rent or sale price',
    example: 2500.0,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'USD',
    default: 'USD',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  // Property details
  @ApiPropertyOptional({
    description: 'Number of bedrooms',
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bedrooms?: number;

  @ApiPropertyOptional({
    description: 'Number of bathrooms',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bathrooms?: number;

  @ApiPropertyOptional({
    description: 'Total area in square meters',
    example: 85.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  area?: number;

  @ApiPropertyOptional({
    description: 'Floor number',
    example: 4,
  })
  @IsOptional()
  @IsNumber()
  floor?: number;

  @ApiPropertyOptional({
    description: 'Whether the property is furnished',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isFurnished?: boolean;

  @ApiPropertyOptional({
    description: 'Whether parking is available',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  hasParking?: boolean;

  @ApiPropertyOptional({
    description: 'Whether pets are allowed',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  petsAllowed?: boolean;

  // Metadata
  @ApiPropertyOptional({
    description: 'Additional metadata as JSON',
    example: { yearBuilt: 2020, heatingType: 'central' },
  })
  @IsOptional()
  metadata?: Record<string, unknown>;

  // Nested DTOs
  @ApiPropertyOptional({
    description: 'Array of property images',
    type: [CreatePropertyImageDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePropertyImageDto)
  images?: CreatePropertyImageDto[];

  @ApiPropertyOptional({
    description: 'Array of property amenities',
    type: [CreatePropertyAmenityDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePropertyAmenityDto)
  amenities?: CreatePropertyAmenityDto[];

  @ApiPropertyOptional({
    description: 'Array of rental units (for multi-unit properties)',
    type: [CreateRentalUnitDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRentalUnitDto)
  rentalUnits?: CreateRentalUnitDto[];
}
