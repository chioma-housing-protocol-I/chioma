import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { FavoritesService } from './favorites.service';
import {
  AddFavoriteDto,
  FavoriteItemDto,
  FavoriteStatusDto,
  FavoritesQueryDto,
  PaginatedFavoritesDto,
} from './dtos/favorite.dto';

@ApiTags('favorites')
@Controller('favorites')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get current user's favorited properties",
    description:
      'Retrieves a paginated list of properties favorited by the current user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of favorited properties',
    type: PaginatedFavoritesDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid pagination parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getFavorites(
    @CurrentUser() user: User,
    @Query() query: FavoritesQueryDto,
  ): Promise<PaginatedFavoritesDto> {
    return this.favoritesService.getFavorites(user.id, query.page, query.limit);
  }

  @Get(':propertyId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get favorite status for a property',
    description:
      'Check if the current user has favorited a property and view the total favorite count.',
  })
  @ApiParam({
    name: 'propertyId',
    description: 'Property UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Favorite status and count',
    type: FavoriteStatusDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async getFavoriteStatus(
    @CurrentUser() user: User,
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
  ): Promise<FavoriteStatusDto> {
    return this.favoritesService.getFavoriteStatus(user.id, propertyId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add a property to favorites',
    description: "Saves a property to the current user's favorites list.",
  })
  @ApiResponse({
    status: 201,
    description: 'Property added to favorites',
    type: FavoriteItemDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async addFavorite(
    @CurrentUser() user: User,
    @Body() dto: AddFavoriteDto,
  ): Promise<FavoriteItemDto> {
    const favorite = await this.favoritesService.addFavorite(
      user.id,
      dto.propertyId,
    );
    return {
      id: favorite.id,
      propertyId: favorite.propertyId,
      createdAt: favorite.createdAt.toISOString(),
    };
  }
  @Get(':propertyId/count')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get favorite count for a property',
    description: 'Get the total number of favorites for a property.',
  })
  @ApiParam({
    name: 'propertyId',
    description: 'Property UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Favorite count',
    schema: {
      properties: {
        favoriteCount: { type: 'number', example: 42 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async getFavoriteCount(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
  ): Promise<{ favoriteCount: number }> {
    return this.favoritesService.getFavoriteCount(propertyId);
  }

  @Delete(':propertyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove a property from favorites',
    description: "Removes a property from the current user's favorites list.",
  })
  @ApiParam({
    name: 'propertyId',
    description: 'Property UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({ status: 204, description: 'Favorite removed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Favorite not found' })
  async removeFavorite(
    @CurrentUser() user: User,
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
  ): Promise<void> {
    await this.favoritesService.removeFavorite(user.id, propertyId);
  }
}
