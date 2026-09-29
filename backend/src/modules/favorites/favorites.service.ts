import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { Favorite } from './entities/favorite.entity';
import {
  FavoriteCollection,
  UNCATEGORIZED_COLLECTION_ID,
  UNCATEGORIZED_COLLECTION_NAME,
} from './entities/favorite-collection.entity';
import { Property } from '../properties/entities/property.entity';
import {
  DEFAULT_FAVORITES_PAGE_SIZE,
  FavoriteCollectionDto,
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
    @InjectRepository(FavoriteCollection)
    private readonly collectionRepository: Repository<FavoriteCollection>,
  ) {}

  async getFavorites(
    userId: string,
    page?: number,
    limit?: number,
    collectionId?: string,
  ): Promise<PaginatedFavoritesDto> {
    // Defensive clamping so a large favorites list can never produce an
    // unbounded payload, even if a caller bypasses DTO validation.
    const safePage = Math.max(1, Math.floor(page ?? 1));
    const safeLimit = Math.min(
      MAX_FAVORITES_PAGE_SIZE,
      Math.max(1, Math.floor(limit ?? DEFAULT_FAVORITES_PAGE_SIZE)),
    );

    const where: FindOptionsWhere<Favorite> = { userId };
    if (collectionId === UNCATEGORIZED_COLLECTION_ID) {
      where.collectionId = IsNull();
    } else if (collectionId) {
      where.collectionId = collectionId;
    }

    const [favorites, total] = await this.favoriteRepository.findAndCount({
      where,
      relations: ['property'],
      order: { createdAt: 'DESC' },
      skip: PaginationUtils.calculateOffset(safePage, safeLimit),
      take: safeLimit,
    });

    const data: FavoriteItemDto[] = favorites.map((fav) => ({
      id: fav.id,
      propertyId: fav.propertyId,
      property: fav.property,
      collectionId: fav.collectionId ?? null,
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

  async addFavorite(
    userId: string,
    propertyId: string,
    collectionId?: string,
  ): Promise<Favorite> {
    const property = await this.propertyRepository.findOne({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException(`Property ${propertyId} not found`);
    }

    const existing = await this.favoriteRepository.findOne({
      where: { userId, propertyId },
    });

    if (collectionId) {
      await this.getOwnedCollection(userId, collectionId);
    }

    if (existing) {
      if (collectionId && existing.collectionId !== collectionId) {
        existing.collectionId = collectionId;
        return await this.favoriteRepository.save(existing);
      }
      return existing;
    }

    const favorite = this.favoriteRepository.create({
      userId,
      propertyId,
      collectionId: collectionId ?? null,
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

  // ---- Collections -------------------------------------------------------

  async listCollections(userId: string): Promise<FavoriteCollectionDto[]> {
    const [collections, counts] = await Promise.all([
      this.collectionRepository.find({
        where: { userId },
        order: { createdAt: 'ASC' },
      }),
      this.favoriteRepository
        .createQueryBuilder('f')
        .select('f.collection_id', 'collectionId')
        .addSelect('COUNT(*)', 'count')
        .where('f.user_id = :userId', { userId })
        .groupBy('f.collection_id')
        .getRawMany<{ collectionId: string | null; count: string }>(),
    ]);

    const countFor = (id: string | null) =>
      Number(counts.find((c) => (c.collectionId ?? null) === id)?.count ?? 0);

    return [
      {
        id: UNCATEGORIZED_COLLECTION_ID,
        name: UNCATEGORIZED_COLLECTION_NAME,
        favoriteCount: countFor(null),
      },
      ...collections.map((c) => ({
        id: c.id,
        name: c.name,
        favoriteCount: countFor(c.id),
        createdAt: c.createdAt.toISOString(),
      })),
    ];
  }

  async createCollection(
    userId: string,
    name: string,
  ): Promise<FavoriteCollection> {
    const trimmed = await this.assertNameAvailable(userId, name);
    return this.collectionRepository.save(
      this.collectionRepository.create({ userId, name: trimmed }),
    );
  }

  async renameCollection(
    userId: string,
    collectionId: string,
    name: string,
  ): Promise<FavoriteCollection> {
    const collection = await this.getOwnedCollection(userId, collectionId);
    collection.name = await this.assertNameAvailable(
      userId,
      name,
      collectionId,
    );
    return this.collectionRepository.save(collection);
  }

  /** Deletes a collection; its favorites fall back to Uncategorized. */
  async deleteCollection(userId: string, collectionId: string): Promise<void> {
    await this.getOwnedCollection(userId, collectionId);
    await this.favoriteRepository.update(
      { userId, collectionId },
      { collectionId: null },
    );
    await this.collectionRepository.delete({ id: collectionId, userId });
  }

  async moveFavorite(
    userId: string,
    propertyId: string,
    collectionId?: string | null,
  ): Promise<Favorite> {
    const favorite = await this.favoriteRepository.findOne({
      where: { userId, propertyId },
    });
    if (!favorite) {
      throw new NotFoundException(
        `Favorite not found for property ${propertyId}`,
      );
    }
    if (collectionId) {
      await this.getOwnedCollection(userId, collectionId);
    }
    favorite.collectionId = collectionId ?? null;
    return this.favoriteRepository.save(favorite);
  }

  private async getOwnedCollection(
    userId: string,
    collectionId: string,
  ): Promise<FavoriteCollection> {
    const collection = await this.collectionRepository.findOne({
      where: { id: collectionId, userId },
    });
    if (!collection) {
      throw new NotFoundException(`Collection ${collectionId} not found`);
    }
    return collection;
  }

  private async assertNameAvailable(
    userId: string,
    name: string,
    excludeId?: string,
  ): Promise<string> {
    const trimmed = name.trim();
    if (trimmed.toLowerCase() === UNCATEGORIZED_COLLECTION_NAME.toLowerCase()) {
      throw new ConflictException(`"${trimmed}" is a reserved collection name`);
    }
    const existing = await this.collectionRepository.findOne({
      where: { userId, name: trimmed },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Collection "${trimmed}" already exists`);
    }
    return trimmed;
  }
}
