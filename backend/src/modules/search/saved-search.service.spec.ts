import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import {
  SavedSearchService,
  propertyMatchesFilters,
} from './saved-search.service';
import { SavedSearch } from './entities/saved-search.entity';
import {
  Property,
  PropertyType,
  ListingStatus,
} from '../properties/entities/property.entity';
import { NotificationsService } from '../notifications/notifications.service';

describe('propertyMatchesFilters', () => {
  const baseProperty: Property = {
    id: 'prop-1',
    title: 'Sunny 2-bed apartment',
    address: '12 Palm Ave',
    city: 'Lekki',
    state: 'Lagos',
    country: 'NG',
    type: PropertyType.APARTMENT,
    status: ListingStatus.PUBLISHED,
    price: 1200,
    bedrooms: 2,
    bathrooms: 2,
    isFurnished: true,
    hasParking: true,
    petsAllowed: false,
    amenities: [{ name: 'Gym' } as any, { name: 'Pool' } as any],
  } as any;

  it('matches when all filters are satisfied', () => {
    expect(
      propertyMatchesFilters(baseProperty, {
        city: 'lekki',
        minPrice: 1000,
        maxPrice: 1500,
        bedrooms: 2,
        isFurnished: true,
      }),
    ).toBe(true);
  });

  it('rejects when price is above maxPrice', () => {
    expect(propertyMatchesFilters(baseProperty, { maxPrice: 1000 })).toBe(
      false,
    );
  });

  it('rejects when bedrooms is below the requested minimum', () => {
    expect(propertyMatchesFilters(baseProperty, { bedrooms: 3 })).toBe(false);
  });

  it('rejects a non-published property by default', () => {
    const draft = { ...baseProperty, status: ListingStatus.DRAFT };
    expect(propertyMatchesFilters(draft, {})).toBe(false);
  });

  it('rejects when a required amenity is missing', () => {
    expect(propertyMatchesFilters(baseProperty, { amenities: ['Sauna'] })).toBe(
      false,
    );
  });

  it('matches when all required amenities are present', () => {
    expect(
      propertyMatchesFilters(baseProperty, { amenities: ['gym', 'pool'] }),
    ).toBe(true);
  });

  it('rejects when petsAllowed does not match', () => {
    expect(propertyMatchesFilters(baseProperty, { petsAllowed: true })).toBe(
      false,
    );
  });
});

describe('SavedSearchService', () => {
  let service: SavedSearchService;
  let savedSearchRepository: Repository<SavedSearch>;
  let propertyRepository: Repository<Property>;
  let notificationsService: NotificationsService;

  const mockUserId = 'user-123';

  const mockSavedSearch: SavedSearch = {
    id: 'saved-1',
    userId: mockUserId,
    name: 'My search',
    filters: { city: 'Lekki' },
    alertsEnabled: true,
    lastNotifiedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  } as any;

  const mockProperty: Property = {
    id: 'prop-1',
    title: 'Sunny 2-bed apartment',
    address: '12 Palm Ave',
    city: 'Lekki',
    type: PropertyType.APARTMENT,
    status: ListingStatus.PUBLISHED,
    price: 1200,
    amenities: [],
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SavedSearchService,
        {
          provide: getRepositoryToken(SavedSearch),
          useValue: {
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Property),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            notify: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SavedSearchService>(SavedSearchService);
    savedSearchRepository = module.get(getRepositoryToken(SavedSearch));
    propertyRepository = module.get(getRepositoryToken(Property));
    notificationsService = module.get(NotificationsService);
  });

  describe('create', () => {
    it('persists a new saved search for the user', async () => {
      jest
        .spyOn(savedSearchRepository, 'create')
        .mockReturnValue(mockSavedSearch);
      jest
        .spyOn(savedSearchRepository, 'save')
        .mockResolvedValue(mockSavedSearch);

      const result = await service.create(mockUserId, {
        name: 'My search',
        filters: { city: 'Lekki' } as any,
      });

      expect(result.name).toBe('My search');
      expect(savedSearchRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          name: 'My search',
          alertsEnabled: true,
        }),
      );
    });
  });

  describe('findAllForUser', () => {
    it('returns saved searches for the user ordered by creation date', async () => {
      jest
        .spyOn(savedSearchRepository, 'find')
        .mockResolvedValue([mockSavedSearch]);

      const result = await service.findAllForUser(mockUserId);

      expect(result).toHaveLength(1);
      expect(savedSearchRepository.find).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('remove', () => {
    it('deletes a saved search owned by the user', async () => {
      jest
        .spyOn(savedSearchRepository, 'delete')
        .mockResolvedValue({ affected: 1 } as any);

      await service.remove(mockUserId, 'saved-1');

      expect(savedSearchRepository.delete).toHaveBeenCalledWith({
        id: 'saved-1',
        userId: mockUserId,
      });
    });

    it('throws when the saved search does not exist for the user', async () => {
      jest
        .spyOn(savedSearchRepository, 'delete')
        .mockResolvedValue({ affected: 0 } as any);

      await expect(service.remove(mockUserId, 'saved-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('notifyMatchingSearches', () => {
    it('notifies owners of matching saved searches and stamps lastNotifiedAt', async () => {
      jest
        .spyOn(savedSearchRepository, 'find')
        .mockResolvedValue([mockSavedSearch]);
      jest
        .spyOn(savedSearchRepository, 'save')
        .mockResolvedValue(mockSavedSearch);

      const matchCount = await service.notifyMatchingSearches(mockProperty);

      expect(matchCount).toBe(1);
      expect(notificationsService.notify).toHaveBeenCalledWith(
        mockUserId,
        expect.any(String),
        expect.stringContaining(mockProperty.title),
        'saved_search_match',
      );
      expect(savedSearchRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ lastNotifiedAt: expect.any(Date) }),
      );
    });

    it('does not notify when no saved searches match', async () => {
      const nonMatching = { ...mockSavedSearch, filters: { city: 'Ikeja' } };
      jest
        .spyOn(savedSearchRepository, 'find')
        .mockResolvedValue([nonMatching as SavedSearch]);

      const matchCount = await service.notifyMatchingSearches(mockProperty);

      expect(matchCount).toBe(0);
      expect(notificationsService.notify).not.toHaveBeenCalled();
    });

    it('swallows errors so a failure never throws', async () => {
      jest
        .spyOn(savedSearchRepository, 'find')
        .mockRejectedValue(new Error('db down'));

      await expect(service.notifyMatchingSearches(mockProperty)).resolves.toBe(
        0,
      );
    });
  });

  describe('notifyForRecentListings', () => {
    it('sweeps recently published listings and notifies matches', async () => {
      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockProperty]),
      };
      jest.spyOn(propertyRepository, 'createQueryBuilder').mockReturnValue(qb);
      jest
        .spyOn(savedSearchRepository, 'find')
        .mockResolvedValue([mockSavedSearch]);
      jest
        .spyOn(savedSearchRepository, 'save')
        .mockResolvedValue(mockSavedSearch);

      const notified = await service.notifyForRecentListings(15);

      expect(notified).toBe(1);
      expect(qb.where).toHaveBeenCalledWith('property.status = :status', {
        status: ListingStatus.PUBLISHED,
      });
    });
  });
});
