import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { Property } from '../../properties/entities/property.entity';

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
