import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { Favorite } from './entities/favorite.entity';
import {
  Property,
  PropertyType,
  ListingStatus,
} from '../properties/entities/property.entity';

describe('FavoritesService', () => {
  let service: FavoritesService;
  let favoriteRepository: Repository<Favorite>;
  let propertyRepository: Repository<Property>;

  const mockUserId = 'user-123';
  const mockPropertyId = 'property-456';

  const mockProperty: Property = {
    id: mockPropertyId,
    title: 'Test Property',
    description: 'A test property',
    type: PropertyType.APARTMENT,
    listingStatus: ListingStatus.PUBLISHED,
    favoriteCount: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  const mockFavorite: Favorite = {
    id: 'fav-789',
    userId: mockUserId,
    propertyId: mockPropertyId,
    createdAt: new Date(),
    property: mockProperty,
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoritesService,
        {
          provide: getRepositoryToken(Favorite),
          useValue: {
            find: jest.fn(),
            findAndCount: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Property),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FavoritesService>(FavoritesService);
    favoriteRepository = module.get<Repository<Favorite>>(
      getRepositoryToken(Favorite),
    );
    propertyRepository = module.get<Repository<Property>>(
      getRepositoryToken(Property),
    );
  });

  describe('getFavorites', () => {
    it('should return user favorites ordered by creation date', async () => {
      const mockFavorites = [mockFavorite];
      jest
        .spyOn(favoriteRepository, 'findAndCount')
        .mockResolvedValue([mockFavorites, 1]);

      const result = await service.getFavorites(mockUserId);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].propertyId).toBe(mockPropertyId);
      expect(favoriteRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        relations: ['property'],
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('should return empty array if user has no favorites', async () => {
      jest
        .spyOn(favoriteRepository, 'findAndCount')
        .mockResolvedValue([[], 0]);

      const result = await service.getFavorites(mockUserId);

      expect(result.data).toEqual([]);
    });
  });

  describe('getFavoriteStatus', () => {
    it('should return favorited status and count', async () => {
      jest.spyOn(propertyRepository, 'findOne').mockResolvedValue(mockProperty);
      jest.spyOn(favoriteRepository, 'findOne').mockResolvedValue(mockFavorite);

      const result = await service.getFavoriteStatus(
        mockUserId,
        mockPropertyId,
      );

      expect(result.isFavorited).toBe(true);
      expect(result.favoriteCount).toBe(5);
    });

    it('should return false for not favorited property', async () => {
      jest.spyOn(propertyRepository, 'findOne').mockResolvedValue(mockProperty);
      jest.spyOn(favoriteRepository, 'findOne').mockResolvedValue(null);

      const result = await service.getFavoriteStatus(
        mockUserId,
        mockPropertyId,
      );

      expect(result.isFavorited).toBe(false);
      expect(result.favoriteCount).toBe(5);
    });

    it('should throw error if property not found', async () => {
      jest.spyOn(propertyRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.getFavoriteStatus(mockUserId, mockPropertyId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addFavorite', () => {
    it('should add a new favorite', async () => {
      jest.spyOn(propertyRepository, 'findOne').mockResolvedValue(mockProperty);
      jest.spyOn(favoriteRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(favoriteRepository, 'create').mockReturnValue(mockFavorite);
      jest.spyOn(favoriteRepository, 'save').mockResolvedValue(mockFavorite);

      const result = await service.addFavorite(mockUserId, mockPropertyId);

      expect(result.id).toBe('fav-789');
      expect(result.userId).toBe(mockUserId);
      expect(result.propertyId).toBe(mockPropertyId);
    });

    it('should return existing favorite if already exists (idempotent)', async () => {
      jest.spyOn(propertyRepository, 'findOne').mockResolvedValue(mockProperty);
      jest.spyOn(favoriteRepository, 'findOne').mockResolvedValue(mockFavorite);

      const result = await service.addFavorite(mockUserId, mockPropertyId);

      expect(result.id).toBe('fav-789');
      expect(favoriteRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error if property not found', async () => {
      jest.spyOn(propertyRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.addFavorite(mockUserId, mockPropertyId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeFavorite', () => {
    it('should remove a favorite', async () => {
      jest.spyOn(favoriteRepository, 'delete').mockResolvedValue({
        affected: 1,
      } as any);

      await service.removeFavorite(mockUserId, mockPropertyId);

      expect(favoriteRepository.delete).toHaveBeenCalledWith({
        userId: mockUserId,
        propertyId: mockPropertyId,
      });
    });

    it('should throw error if favorite not found', async () => {
      jest.spyOn(favoriteRepository, 'delete').mockResolvedValue({
        affected: 0,
      } as any);

      await expect(
        service.removeFavorite(mockUserId, mockPropertyId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('isFavorited', () => {
    it('should return true if property is favorited', async () => {
      jest.spyOn(favoriteRepository, 'findOne').mockResolvedValue(mockFavorite);

      const result = await service.isFavorited(mockUserId, mockPropertyId);

      expect(result).toBe(true);
    });

    it('should return false if property is not favorited', async () => {
      jest.spyOn(favoriteRepository, 'findOne').mockResolvedValue(null);

      const result = await service.isFavorited(mockUserId, mockPropertyId);

      expect(result).toBe(false);
    });
  });
});
