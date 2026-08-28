import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from './entities/favorite.entity';
import { Property } from '../properties/entities/property.entity';
import {
  DEFAULT_FAVORITES_PAGE_SIZE,
  FavoriteItemDto,
  FavoriteStatusDto,
  MAX_FAVORITES_PAGE_SIZE,
  PaginatedFavoritesDto,
} from './dtos/favorite.dto';
import { PaginationUtils } from '../../common/utils';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoriteRepository: Repository<Favorite>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
  ) {}

  async getFavorites(
    userId: string,
    page?: number,
    limit?: number,
  ): Promise<PaginatedFavoritesDto> {
    // Defensive clamping so a large favorites list can never produce an
    // unbounded payload, even if a caller bypasses DTO validation.
    const safePage = Math.max(1, Math.floor(page ?? 1));
    const safeLimit = Math.min(
      MAX_FAVORITES_PAGE_SIZE,
      Math.max(1, Math.floor(limit ?? DEFAULT_FAVORITES_PAGE_SIZE)),
    );

    const [favorites, total] = await this.favoriteRepository.findAndCount({
      where: { userId },
      relations: ['property'],
      order: { createdAt: 'DESC' },
      skip: PaginationUtils.calculateOffset(safePage, safeLimit),
      take: safeLimit,
    });

    const data: FavoriteItemDto[] = favorites.map((fav) => ({
      id: fav.id,
      propertyId: fav.propertyId,
      property: fav.property,
      createdAt: fav.createdAt.toISOString(),
    }));

    return PaginationUtils.buildPaginationResponse(
      data,
      total,
      safePage,
      safeLimit,
    );
  }

  async getFavoriteStatus(
    userId: string,
    propertyId: string,
  ): Promise<FavoriteStatusDto> {
    const property = await this.propertyRepository.findOne({
      where: { id: propertyId },
      select: ['id', 'favoriteCount'],
    });

    if (!property) {
      throw new NotFoundException(`Property ${propertyId} not found`);
    }

    const favorite = await this.favoriteRepository.findOne({
      where: { userId, propertyId },
    });

    return {
      isFavorited: !!favorite,
      favoriteCount: property.favoriteCount || 0,
    };
  }

  async addFavorite(userId: string, propertyId: string): Promise<Favorite> {
    const property = await this.propertyRepository.findOne({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException(`Property ${propertyId} not found`);
    }

    const existing = await this.favoriteRepository.findOne({
      where: { userId, propertyId },
    });

    if (existing) {
      return existing;
    }

    const favorite = this.favoriteRepository.create({
      userId,
      propertyId,
    });

    return await this.favoriteRepository.save(favorite);
  }

  async removeFavorite(userId: string, propertyId: string): Promise<void> {
    const result = await this.favoriteRepository.delete({
      userId,
      propertyId,
    });

    if (result.affected === 0) {
      throw new NotFoundException(
        `Favorite not found for property ${propertyId}`,
      );
    }
  }

  async isFavorited(userId: string, propertyId: string): Promise<boolean> {
    const favorite = await this.favoriteRepository.findOne({
      where: { userId, propertyId },
    });
    return !!favorite;
  }
  async getFavoriteCount(
    propertyId: string,
  ): Promise<{ favoriteCount: number }> {
    const property = await this.propertyRepository.findOne({
      where: { id: propertyId },
      select: ['id', 'favoriteCount'],
    });

    if (!property) {
      throw new NotFoundException(`Property ${propertyId} not found`);
    }

    return {
      favoriteCount: property.favoriteCount || 0,
    };
  }
}
