import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { PropertiesModule } from './properties.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { Property, PropertyType, ListingStatus } from './entities/property.entity';
import { PropertyImage } from './entities/property-image.entity';
import { PropertyAmenity } from './entities/property-amenity.entity';
import { RentalUnit } from './entities/rental-unit.entity';
import { User, UserRole } from '../users/entities/user.entity';

describe('PropertiesController Integration', () => {
  let app: INestApplication;
  let token: string;
  let userId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'password',
          database: process.env.DB_NAME || 'chioma_test',
          entities: [Property, PropertyImage, PropertyAmenity, RentalUnit, User],
          synchronize: true,
          dropSchema: true,
        }),
        CacheModule.register({ isGlobal: true }),
        AuthModule,
        UsersModule,
        PropertiesModule,
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'landlord@test.com',
        password: 'Pass123!',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.LANDLORD,
      });
    token = res.body.accessToken;
    userId = res.body.user.id;

    // Create test properties
    for (const data of [
      { title: 'Apt 1', type: PropertyType.APARTMENT, price: 1500, bedrooms: 2, bathrooms: 1, city: 'NYC', state: 'NY', country: 'USA', amenities: [{ name: 'Gym' }] },
      { title: 'House 1', type: PropertyType.HOUSE, price: 3000, bedrooms: 3, bathrooms: 2, city: 'LA', state: 'CA', country: 'USA', amenities: [{ name: 'Pool' }] },
      { title: 'Apt 2', type: PropertyType.APARTMENT, price: 800, bedrooms: 1, bathrooms: 1, city: 'NYC', state: 'NY', country: 'USA', amenities: [] },
    ]) {
      const prop = await request(app.getHttpServer())
        .post('/api/properties')
        .set('Authorization', `Bearer ${token}`)
        .send(data);
      if (data.price > 1000) {
        await request(app.getHttpServer())
          .post(`/api/properties/${prop.body.id}/publish`)
          .set('Authorization', `Bearer ${token}`);
      }
    }
  });

  afterAll(async () => await app.close());

  describe('Filter Tests', () => {
    it('filters by type', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/properties')
        .query({ type: PropertyType.APARTMENT });
      expect(res.status).toBe(200);
      expect(res.body.data.every((p: Property) => p.type === PropertyType.APARTMENT)).toBe(true);
    });

    it('filters by price range', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/properties')
        .query({ minPrice: 1000, maxPrice: 2000 });
      expect(res.status).toBe(200);
      expect(res.body.data.every((p: Property) => p.price >= 1000 && p.price <= 2000)).toBe(true);
    });

    it('filters by bedrooms', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/properties')
        .query({ minBedrooms: 2 });
      expect(res.status).toBe(200);
      expect(res.body.data.every((p: Property) => p.bedrooms >= 2)).toBe(true);
    });

    it('filters by location', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/properties')
        .query({ city: 'NYC', state: 'NY' });
      expect(res.status).toBe(200);
      expect(res.body.data.every((p: Property) => p.city === 'NYC' && p.state === 'NY')).toBe(true);
    });

    it('combines multiple filters', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/properties')
        .query({ type: PropertyType.APARTMENT, minPrice: 1000, city: 'NYC' });
      expect(res.status).toBe(200);
      expect(res.body.data.every((p: Property) => 
        p.type === PropertyType.APARTMENT && p.price >= 1000 && p.city === 'NYC'
      )).toBe(true);
    });

    it('searches by keyword', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/properties')
        .query({ search: 'Apt' });
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Pagination & Sorting', () => {
    it('paginates results', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/properties')
        .query({ page: 1, limit: 2 });
      expect(res.status).toBe(200);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(2);
    });

    it('sorts by price', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/properties')
        .query({ sortBy: 'price', sortOrder: 'ASC' });
      expect(res.status).toBe(200);
      const prices = res.body.data.map((p: Property) => p.price);
      expect(prices).toEqual([...prices].sort((a, b) => a - b));
    });
  });

  describe('Edge Cases', () => {
    it('rejects negative price', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/properties')
        .query({ minPrice: -100 });
      expect(res.status).toBe(400);
    });

    it('rejects invalid page', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/properties')
        .query({ page: 0 });
      expect(res.status).toBe(400);
    });

    it('rejects limit > 100', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/properties')
        .query({ limit: 101 });
      expect(res.status).toBe(400);
    });

    it('handles empty results', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/properties')
        .query({ minPrice: 999999 });
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('Authorization', () => {
    it('shows only published to public', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/properties');
      expect(res.status).toBe(200);
      expect(res.body.data.every((p: Property) => p.status === ListingStatus.PUBLISHED)).toBe(true);
    });

    it('requires auth for my-properties', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/properties/my-properties');
      expect(res.status).toBe(401);
    });

    it('returns user properties', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/properties/my-properties')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.every((p: Property) => p.ownerId === userId)).toBe(true);
    });
  });
});
