import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
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
  CollectionNameDto,
  FavoriteCollectionDto,
  MoveFavoriteDto,
  FavoriteItemDto,
  FavoriteStatusDto,
  FavoritesQueryDto,
  PaginatedFavoritesDto,
} from './dtos/favorite.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';

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
    return this.favoritesService.getFavorites(
      user.id,
      query.page,
      query.limit,
      query.collectionId,
    );
  }

  @Get('collections')
  @ApiOperation({ summary: "List the current user's favorite collections" })
  @ApiResponse({ status: 200, type: [FavoriteCollectionDto] })
  listCollections(@CurrentUser() user: User): Promise<FavoriteCollectionDto[]> {
    return this.favoritesService.listCollections(user.id);
  }

  @Post('collections')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a favorite collection' })
  @ApiResponse({ status: 409, description: 'Name already in use' })
  async createCollection(
    @CurrentUser() user: User,
    @Body() dto: CollectionNameDto,
  ): Promise<FavoriteCollectionDto> {
    const c = await this.favoritesService.createCollection(user.id, dto.name);
    return {
      id: c.id,
      name: c.name,
      favoriteCount: 0,
      createdAt: c.createdAt.toISOString(),
    };
  }

  @Patch('collections/:collectionId')
  @ApiOperation({ summary: 'Rename a favorite collection' })
  async renameCollection(
    @CurrentUser() user: User,
    @Param('collectionId', ParseUUIDPipe) collectionId: string,
    @Body() dto: CollectionNameDto,
  ) {
    const c = await this.favoritesService.renameCollection(
      user.id,
      collectionId,
      dto.name,
    );
    return { id: c.id, name: c.name };
  }

  @Delete('collections/:collectionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a collection (its favorites move to Uncategorized)',
  })
  async deleteCollection(
    @CurrentUser() user: User,
    @Param('collectionId', ParseUUIDPipe) collectionId: string,
  ): Promise<void> {
    await this.favoritesService.deleteCollection(user.id, collectionId);
  }

  @Patch(':propertyId/collection')
  @ApiOperation({ summary: 'Move a favorite to another collection' })
  async moveFavorite(
    @CurrentUser() user: User,
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Body() dto: MoveFavoriteDto,
  ): Promise<FavoriteItemDto> {
    const f = await this.favoritesService.moveFavorite(
      user.id,
      propertyId,
      dto.collectionId,
    );
    return {
      id: f.id,
      propertyId: f.propertyId,
      collectionId: f.collectionId,
      createdAt: f.createdAt.toISOString(),
    };
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
      dto.collectionId,
    );
    return {
      id: favorite.id,
      propertyId: favorite.propertyId,
      collectionId: favorite.collectionId,
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
