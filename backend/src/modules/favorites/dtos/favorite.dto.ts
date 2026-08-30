import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Property } from '../../properties/entities/property.entity';

/** Page size applied when the client omits `limit`. */
export const DEFAULT_FAVORITES_PAGE_SIZE = 20;
/** Hard cap on `limit`; larger values are rejected. */
export const MAX_FAVORITES_PAGE_SIZE = 100;

export class FavoriteItemDto {
  @ApiProperty({
    description: 'Favorite record ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id?: string;

  @ApiProperty({
    description: 'Property ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  propertyId: string;

  @ApiProperty({
    description: 'Property details',
    type: () => Property,
    required: false,
  })
  property?: Property;

  @ApiProperty({
    description: 'Date favorited',
    example: '2024-01-15T10:30:00Z',
    required: false,
  })
  createdAt?: string;
}

export class AddFavoriteDto {
  @ApiProperty({
    description: 'Property ID to favorite',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  propertyId: string;
}

export class FavoritesQueryDto {
  @ApiPropertyOptional({
    description: '1-based page number',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: `Page size (default ${DEFAULT_FAVORITES_PAGE_SIZE}, max ${MAX_FAVORITES_PAGE_SIZE})`,
    example: DEFAULT_FAVORITES_PAGE_SIZE,
    default: DEFAULT_FAVORITES_PAGE_SIZE,
    minimum: 1,
    maximum: MAX_FAVORITES_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_FAVORITES_PAGE_SIZE)
  limit?: number;
}

export class PaginatedFavoritesDto {
  @ApiProperty({ type: [FavoriteItemDto], description: 'Page of favorites' })
  data: FavoriteItemDto[];

  @ApiProperty({ description: 'Total favorites for the user', example: 42 })
  total: number;

  @ApiProperty({ description: '1-based page number', example: 1 })
  page: number;

  @ApiProperty({ description: 'Page size used', example: 20 })
  limit: number;

  @ApiProperty({ description: 'Total number of pages', example: 3 })
  totalPages: number;
}

export class FavoriteStatusDto {
  @ApiProperty({
    description: 'Whether the property is favorited by current user',
    example: true,
  })
  isFavorited: boolean;

  @ApiProperty({
    description: 'Total favorite count for the property',
    example: 42,
  })
  favoriteCount: number;
}
