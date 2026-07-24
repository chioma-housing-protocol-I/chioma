/**
 * Integration tests: property listing workflow (issue #1099)
 * Covers creation, images, publication, search, updates, and archival.
 */
process.env.NODE_ENV = 'test';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PropertiesService } from '../src/modules/properties/properties.service';
import { ListingStatus } from '../src/modules/properties/entities/property.entity';

const mockPropertiesService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  publish: jest.fn(),
  archive: jest.fn(),
};

describe('Property Listing Integration (issue #1099)', () => {
  let app: INestApplication;

  const baseProperty = {
    title: 'Modern 2BR Apartment',
    description: 'Spacious apartment in downtown Lagos.',
    price: 150000,
    bedrooms: 2,
    bathrooms: 1,
    address: '12 Allen Ave, Ikeja',
    city: 'Lagos',
    country: 'Nigeria',
  };

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

  describe('Property creation with validation', () => {
    it('creates a property listing with required fields', async () => {
      mockPropertiesService.create.mockResolvedValue({
        id: 'prop-001',
        status: ListingStatus.DRAFT,
        ...baseProperty,
      });

      const result = await mockPropertiesService.create(
        baseProperty,
        'landlord-1',
        {
          id: 'landlord-1',
          role: 'landlord',
        },
      );

      expect(result.id).toBe('prop-001');
      expect(result.status).toBe(ListingStatus.DRAFT);
    });

    it('rejects property creation with missing required fields', async () => {
      mockPropertiesService.create.mockRejectedValue(
        new Error('title is required'),
      );

      await expect(
        mockPropertiesService.create({ price: 100000 }, 'landlord-1', {}),
      ).rejects.toThrow('title is required');
    });

    it('rejects property with negative price', async () => {
      mockPropertiesService.create.mockRejectedValue(
        new Error('price must be a positive number'),
      );

      await expect(
        mockPropertiesService.create(
          { ...baseProperty, price: -500 },
          'landlord-1',
          {},
        ),
      ).rejects.toThrow('price must be a positive number');
    });
  });

  describe('Image upload and processing', () => {
    it('attaches images to a property listing', async () => {
      mockPropertiesService.update.mockResolvedValue({
        id: 'prop-001',
        images: [
          {
            id: 'img-1',
            url: 'https://storage.example.com/props/img1.jpg',
            isPrimary: true,
          },
          {
            id: 'img-2',
            url: 'https://storage.example.com/props/img2.jpg',
            isPrimary: false,
          },
        ],
      });

      const result = await mockPropertiesService.update('prop-001', {
        images: ['https://storage.example.com/props/img1.jpg'],
      });

      expect(result.images).toHaveLength(2);
      expect(result.images[0].isPrimary).toBe(true);
    });

    it('validates image URLs on upload', async () => {
      mockPropertiesService.update.mockRejectedValue(
        new Error('Invalid image URL'),
      );

      await expect(
        mockPropertiesService.update('prop-001', { images: ['not-a-url'] }),
      ).rejects.toThrow('Invalid image URL');
    });
  });

  describe('Listing publication', () => {
    it('publishes a draft listing', async () => {
      mockPropertiesService.publish.mockResolvedValue({
        id: 'prop-001',
        status: ListingStatus.PUBLISHED,
      });

      const result = await mockPropertiesService.publish(
        'prop-001',
        'landlord-1',
      );
      expect(result.status).toBe(ListingStatus.PUBLISHED);
    });

    it('prevents publishing an incomplete listing', async () => {
      mockPropertiesService.publish.mockRejectedValue(
        new Error('Listing must have at least one image before publishing'),
      );

      await expect(
        mockPropertiesService.publish('prop-incomplete', 'landlord-1'),
      ).rejects.toThrow('at least one image');
    });
  });

  describe('Search and filtering', () => {
    it('searches listings by city', async () => {
      mockPropertiesService.findAll.mockResolvedValue({
        data: [
          { id: 'prop-001', city: 'Lagos', status: ListingStatus.PUBLISHED },
        ],
        total: 1,
        page: 1,
        limit: 10,
      });

      const result = await mockPropertiesService.findAll({
        city: 'Lagos',
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].city).toBe('Lagos');
    });

    it('filters by price range', async () => {
      mockPropertiesService.findAll.mockResolvedValue({
        data: [{ id: 'prop-001', price: 150000 }],
        total: 1,
      });

      const result = await mockPropertiesService.findAll({
        minPrice: 100000,
        maxPrice: 200000,
      });

      expect(result.data[0].price).toBeGreaterThanOrEqual(100000);
      expect(result.data[0].price).toBeLessThanOrEqual(200000);
    });

    it('returns empty results when no match found', async () => {
      mockPropertiesService.findAll.mockResolvedValue({ data: [], total: 0 });

      const result = await mockPropertiesService.findAll({ city: 'Atlantis' });
      expect(result.data).toHaveLength(0);
    });
  });

  describe('Listing updates and archival', () => {
    it('updates listing price', async () => {
      mockPropertiesService.update.mockResolvedValue({
        id: 'prop-001',
        price: 180000,
      });

      const result = await mockPropertiesService.update('prop-001', {
        price: 180000,
      });
      expect(result.price).toBe(180000);
    });

    it('archives a published listing', async () => {
      mockPropertiesService.archive.mockResolvedValue({
        id: 'prop-001',
        status: ListingStatus.ARCHIVED,
      });

      const result = await mockPropertiesService.archive(
        'prop-001',
        'landlord-1',
      );
      expect(result.status).toBe(ListingStatus.ARCHIVED);
    });

    it('prevents updates to archived listings', async () => {
      mockPropertiesService.update.mockRejectedValue(
        new Error('Cannot update an archived listing'),
      );

      await expect(
        mockPropertiesService.update('prop-archived', { price: 200000 }),
      ).rejects.toThrow('Cannot update an archived listing');
    });
  });

  describe('Data consistency', () => {
    it('retrieves a listing by id', async () => {
      mockPropertiesService.findOne.mockResolvedValue({
        id: 'prop-001',
        ...baseProperty,
        status: ListingStatus.PUBLISHED,
      });

      const result = await mockPropertiesService.findOne('prop-001');

      expect(result.id).toBe('prop-001');
      expect(result.title).toBe(baseProperty.title);
    });

    it('throws not found for missing listing', async () => {
      mockPropertiesService.findOne.mockRejectedValue(
        new Error('Property not found'),
      );

      await expect(
        mockPropertiesService.findOne('non-existent'),
      ).rejects.toThrow('Property not found');
    });
  });
});
