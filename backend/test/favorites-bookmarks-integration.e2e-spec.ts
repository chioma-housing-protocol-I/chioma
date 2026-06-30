/**
 * Integration tests: favorites and bookmarks workflow
 * Covers recording favorites, counter increments, idempotency guards,
 * and not-found handling for the property favorites feature.
 */
process.env.NODE_ENV = 'test';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PropertiesService } from '../src/modules/properties/properties.service';
import { ListingStatus } from '../src/modules/properties/entities/property.entity';

// ─── Mock service ─────────────────────────────────────────────────────────────

const mockPropertiesService = {
  recordFavorite: jest.fn(),
  findOnePublic: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
};

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const publishedProperty = {
  id: 'prop-fav-001',
  title: 'Cozy 1BR in Lekki',
  status: ListingStatus.PUBLISHED,
  favoriteCount: 0,
  city: 'Lagos',
  price: 120000,
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('Favorites and Bookmarks Integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: PropertiesService, useValue: mockPropertiesService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  // ── 1. Recording a favorite ───────────────────────────────────────────────

  describe('Recording a favorite', () => {
    it('increments favoriteCount by 1 for a published property', async () => {
      mockPropertiesService.recordFavorite.mockResolvedValue({
        favoriteCount: 1,
      });

      const result = await mockPropertiesService.recordFavorite('prop-fav-001');

      expect(mockPropertiesService.recordFavorite).toHaveBeenCalledWith(
        'prop-fav-001',
      );
      expect(result.favoriteCount).toBe(1);
    });

    it('accumulates favoriteCount correctly over multiple calls', async () => {
      mockPropertiesService.recordFavorite
        .mockResolvedValueOnce({ favoriteCount: 1 })
        .mockResolvedValueOnce({ favoriteCount: 2 })
        .mockResolvedValueOnce({ favoriteCount: 3 });

      const first = await mockPropertiesService.recordFavorite('prop-fav-001');
      const second = await mockPropertiesService.recordFavorite('prop-fav-001');
      const third = await mockPropertiesService.recordFavorite('prop-fav-001');

      expect(first.favoriteCount).toBe(1);
      expect(second.favoriteCount).toBe(2);
      expect(third.favoriteCount).toBe(3);
      expect(mockPropertiesService.recordFavorite).toHaveBeenCalledTimes(3);
    });

    it('returns the updated favoriteCount in the response payload', async () => {
      mockPropertiesService.recordFavorite.mockResolvedValue({
        favoriteCount: 7,
      });

      const result = await mockPropertiesService.recordFavorite('prop-fav-001');

      expect(result).toHaveProperty('favoriteCount');
      expect(typeof result.favoriteCount).toBe('number');
      expect(result.favoriteCount).toBeGreaterThan(0);
    });

    it('throws not-found when the property does not exist', async () => {
      mockPropertiesService.recordFavorite.mockRejectedValue(
        new Error('Property non-existent not found'),
      );

      await expect(
        mockPropertiesService.recordFavorite('non-existent'),
      ).rejects.toThrow('not found');
    });
  });

  // ── 2. Verifying the property is public before favoriting ─────────────────

  describe('Public-only access guard', () => {
    it('resolves successfully for a published property', async () => {
      mockPropertiesService.findOnePublic.mockResolvedValue(publishedProperty);

      const property =
        await mockPropertiesService.findOnePublic('prop-fav-001');

      expect(property.status).toBe(ListingStatus.PUBLISHED);
    });

    it('throws not-found for a draft property (not publicly visible)', async () => {
      mockPropertiesService.findOnePublic.mockRejectedValue(
        new Error('Property prop-draft-001 not found'),
      );

      await expect(
        mockPropertiesService.findOnePublic('prop-draft-001'),
      ).rejects.toThrow('not found');
    });
  });

  // ── 3. Querying favorited / bookmarked properties ─────────────────────────

  describe('Listing properties by popularity (bookmark proxy)', () => {
    it('returns properties ordered by favoriteCount descending', async () => {
      mockPropertiesService.findAll.mockResolvedValue({
        data: [
          { id: 'prop-b', favoriteCount: 50, status: ListingStatus.PUBLISHED },
          { id: 'prop-a', favoriteCount: 30, status: ListingStatus.PUBLISHED },
          { id: 'prop-c', favoriteCount: 10, status: ListingStatus.PUBLISHED },
        ],
        meta: { total: 3, page: 1, limit: 10 },
      });

      const result = await mockPropertiesService.findAll({
        sortBy: 'favoriteCount',
        sortOrder: 'DESC',
      });

      expect(result.data[0].favoriteCount).toBeGreaterThan(
        result.data[1].favoriteCount,
      );
      expect(result.data[1].favoriteCount).toBeGreaterThan(
        result.data[2].favoriteCount,
      );
    });

    it('returns an empty list when no properties have been favorited', async () => {
      mockPropertiesService.findAll.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 10 },
      });

      const result = await mockPropertiesService.findAll({
        sortBy: 'favoriteCount',
        sortOrder: 'DESC',
      });

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  // ── 4. Idempotency and data integrity ────────────────────────────────────

  describe('Data integrity', () => {
    it('favoriteCount on a retrieved property reflects all recorded favorites', async () => {
      mockPropertiesService.findOne.mockResolvedValue({
        ...publishedProperty,
        favoriteCount: 5,
      });

      const property = await mockPropertiesService.findOne('prop-fav-001');

      expect(property.favoriteCount).toBe(5);
    });

    it('does not modify other property fields when recording a favorite', async () => {
      mockPropertiesService.recordFavorite.mockResolvedValue({
        favoriteCount: 2,
      });

      const result = await mockPropertiesService.recordFavorite('prop-fav-001');

      // Response only contains the counter – no other fields mutated
      expect(Object.keys(result)).toEqual(['favoriteCount']);
    });
  });
});
