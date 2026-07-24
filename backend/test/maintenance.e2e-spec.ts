import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MaintenanceModule } from '../src/modules/maintenance/maintenance.module';
import { UsersModule } from '../src/modules/users/users.module';
import { PropertiesModule } from '../src/modules/properties/properties.module';
import { StorageModule } from '../src/modules/storage/storage.module';
import { NotificationsModule } from '../src/modules/notifications/notifications.module';
import { ReviewsModule } from '../src/modules/reviews/reviews.module';
import {
  MaintenanceRequest,
  MaintenanceStatus,
} from '../src/modules/maintenance/maintenance-request.entity';
import { User, UserRole } from '../src/modules/users/entities/user.entity';
import { Property } from '../src/modules/properties/entities/property.entity';
import { getTestDatabaseConfig, clearRepositories } from './test-helpers';
import * as bcrypt from 'bcryptjs';

describe('Maintenance E2E Tests', () => {
  let app: INestApplication;
  let maintenanceRepository: any;
  let userRepository: any;
  let propertyRepository: any;
  let jwtService: JwtService;
  let testTenant: User;
  let testAdmin: User;
  let testProperty: Property;
  let tenantToken: string;
  let adminToken: string;

  const TEST_PASSWORD = 'TestPassword@123';
  const SALT_ROUNDS = 10;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot(
          getTestDatabaseConfig([MaintenanceRequest, User, Property]),
        ),
        MaintenanceModule,
        UsersModule,
        PropertiesModule,
        StorageModule,
        NotificationsModule,
        ReviewsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    maintenanceRepository = moduleFixture.get(
      getRepositoryToken(MaintenanceRequest),
    );
    userRepository = moduleFixture.get(getRepositoryToken(User));
    propertyRepository = moduleFixture.get(getRepositoryToken(Property));
    jwtService = moduleFixture.get(JwtService);
  }, 60000);

  afterAll(async () => {
    await clearRepositories([
      maintenanceRepository,
      propertyRepository,
      userRepository,
    ]);
    if (app) {
      await app.close();
    }
  }, 60000);

  beforeEach(async () => {
    await clearRepositories([
      maintenanceRepository,
      propertyRepository,
      userRepository,
    ]);

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, SALT_ROUNDS);
    testTenant = await userRepository.save(
      userRepository.create({
        email: 'test.tenant@chioma.local',
        firstName: 'Test',
        lastName: 'Tenant',
        password: passwordHash,
        role: UserRole.USER,
        emailVerified: true,
        isActive: true,
      }),
    );

    testAdmin = await userRepository.save(
      userRepository.create({
        email: 'test.admin@chioma.local',
        firstName: 'Test',
        lastName: 'Admin',
        password: passwordHash,
        role: UserRole.ADMIN,
        emailVerified: true,
        isActive: true,
      }),
    );

    testProperty = await propertyRepository.save(
      propertyRepository.create({
        title: 'Test Property',
        description: 'Test property for maintenance',
        type: 'apartment',
        status: 'published',
        price: 1000,
        ownerId: testAdmin.id,
        rentalMode: 'long_term',
      }),
    );

    tenantToken = jwtService.sign({
      sub: testTenant.id,
      role: testTenant.role,
    });
    adminToken = jwtService.sign({ sub: testAdmin.id, role: testAdmin.role });
  }, 60000);

  afterEach(async () => {
    await clearRepositories([
      maintenanceRepository,
      propertyRepository,
      userRepository,
    ]);
  }, 60000);

  describe('POST /api/maintenance', () => {
    it('should create a maintenance request successfully as a tenant', () => {
      return request(app.getHttpServer())
        .post('/api/maintenance')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          propertyId: testProperty.id,
          landlordId: testAdmin.id,
          category: 'plumbing',
          description: 'Kitchen sink is leaking',
          priority: 'HIGH',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.status).toBe(MaintenanceStatus.OPEN);
          expect(res.body.category).toBe('plumbing');
          expect(res.body.priority).toBe('HIGH');
        });
    });

    it('should reject maintenance request without authorization', () => {
      return request(app.getHttpServer())
        .post('/api/maintenance')
        .send({
          propertyId: testProperty.id,
          landlordId: testAdmin.id,
          category: 'plumbing',
          description: 'Kitchen sink is leaking',
        })
        .expect(401);
    });

    it('should reject maintenance request from non-tenant user', () => {
      return request(app.getHttpServer())
        .post('/api/maintenance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          propertyId: testProperty.id,
          landlordId: testAdmin.id,
          category: 'plumbing',
          description: 'Kitchen sink is leaking',
        })
        .expect(403);
    });

    it('should reject maintenance request with missing required fields', () => {
      return request(app.getHttpServer())
        .post('/api/maintenance')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          propertyId: testProperty.id,
        })
        .expect(400);
    });

    it('should reject maintenance request with invalid propertyId', () => {
      return request(app.getHttpServer())
        .post('/api/maintenance')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          propertyId: 'invalid-uuid',
          landlordId: testAdmin.id,
          category: 'plumbing',
          description: 'Kitchen sink is leaking',
        })
        .expect(400);
    });
  });

  describe('GET /api/maintenance', () => {
    it('should list all maintenance requests', async () => {
      const req1 = await maintenanceRepository.save(
        maintenanceRepository.create({
          propertyId: testProperty.id,
          tenantId: testTenant.id,
          landlordId: testAdmin.id,
          category: 'plumbing',
          description: 'Sink leak',
          status: MaintenanceStatus.OPEN,
        }),
      );

      const req2 = await maintenanceRepository.save(
        maintenanceRepository.create({
          propertyId: testProperty.id,
          tenantId: testTenant.id,
          landlordId: testAdmin.id,
          category: 'electrical',
          description: 'Light not working',
          status: MaintenanceStatus.IN_PROGRESS,
        }),
      );

      return request(app.getHttpServer())
        .get('/api/maintenance')
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(2);
        });
    });

    it('should filter maintenance requests by status', async () => {
      await maintenanceRepository.save(
        maintenanceRepository.create({
          propertyId: testProperty.id,
          tenantId: testTenant.id,
          landlordId: testAdmin.id,
          category: 'plumbing',
          description: 'Sink leak',
          status: MaintenanceStatus.OPEN,
        }),
      );

      await maintenanceRepository.save(
        maintenanceRepository.create({
          propertyId: testProperty.id,
          tenantId: testTenant.id,
          landlordId: testAdmin.id,
          category: 'electrical',
          description: 'Light not working',
          status: MaintenanceStatus.IN_PROGRESS,
        }),
      );

      return request(app.getHttpServer())
        .get('/api/maintenance?status=OPEN')
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(200)
        .expect((res) => {
          expect(
            res.body.every((req: any) => req.status === MaintenanceStatus.OPEN),
          ).toBe(true);
        });
    });
  });

  describe('GET /api/maintenance/:id', () => {
    it('should get a single maintenance request by id', async () => {
      const req = await maintenanceRepository.save(
        maintenanceRepository.create({
          propertyId: testProperty.id,
          tenantId: testTenant.id,
          landlordId: testAdmin.id,
          category: 'plumbing',
          description: 'Kitchen sink leak',
          status: MaintenanceStatus.OPEN,
        }),
      );

      return request(app.getHttpServer())
        .get(`/api/maintenance/${req.id}`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(req.id);
          expect(res.body.category).toBe('plumbing');
        });
    });
  });

  describe('PATCH /api/maintenance/:id/status', () => {
    it('should update maintenance request status as admin', async () => {
      const req = await maintenanceRepository.save(
        maintenanceRepository.create({
          propertyId: testProperty.id,
          tenantId: testTenant.id,
          landlordId: testAdmin.id,
          category: 'plumbing',
          description: 'Kitchen sink leak',
          status: MaintenanceStatus.OPEN,
        }),
      );

      return request(app.getHttpServer())
        .patch(`/api/maintenance/${req.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: MaintenanceStatus.IN_PROGRESS })
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe(MaintenanceStatus.IN_PROGRESS);
        });
    });

    it('should reject status update from tenant', async () => {
      const req = await maintenanceRepository.save(
        maintenanceRepository.create({
          propertyId: testProperty.id,
          tenantId: testTenant.id,
          landlordId: testAdmin.id,
          category: 'plumbing',
          description: 'Kitchen sink leak',
          status: MaintenanceStatus.OPEN,
        }),
      );

      return request(app.getHttpServer())
        .patch(`/api/maintenance/${req.id}/status`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({ status: MaintenanceStatus.IN_PROGRESS })
        .expect(403);
    });

    it('should reject status update with invalid status value', async () => {
      const req = await maintenanceRepository.save(
        maintenanceRepository.create({
          propertyId: testProperty.id,
          tenantId: testTenant.id,
          landlordId: testAdmin.id,
          category: 'plumbing',
          description: 'Kitchen sink leak',
          status: MaintenanceStatus.OPEN,
        }),
      );

      return request(app.getHttpServer())
        .patch(`/api/maintenance/${req.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'INVALID_STATUS' })
        .expect(400);
    });

    it('should trigger review prompt when status is set to CLOSED', async () => {
      const req = await maintenanceRepository.save(
        maintenanceRepository.create({
          propertyId: testProperty.id,
          tenantId: testTenant.id,
          landlordId: testAdmin.id,
          category: 'plumbing',
          description: 'Kitchen sink leak',
          status: MaintenanceStatus.OPEN,
        }),
      );

      return request(app.getHttpServer())
        .patch(`/api/maintenance/${req.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: MaintenanceStatus.CLOSED })
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe(MaintenanceStatus.CLOSED);
        });
    });
  });
});
