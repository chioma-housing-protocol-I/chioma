import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthModule } from '../src/modules/auth/auth.module';
import { UsersModule } from '../src/modules/users/users.module';
import { User } from '../src/modules/users/entities/user.entity';
import { getTestDatabaseConfig } from './test-helpers';

describe.skip('Auth E2E Tests', () => {
  // Skipped: Requires PostgreSQL database (User entity uses enum types not supported by SQLite)
  let app: INestApplication;
  let userRepository: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot(getTestDatabaseConfig([User])),
        AuthModule,
        UsersModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    userRepository = moduleFixture.get(getRepositoryToken(User));
  });

  afterAll(async () => {
    if (userRepository) {
      await userRepository.clear();
    }
    if (app) {
      await app.close();
    }
  }, 60000);

  afterEach(async () => {
    if (userRepository) {
      const users = await userRepository.find();
      const testUser = users.find(
        (u: any) => u.email === 'testuser@example.com',
      );
      if (testUser) {
        await userRepository.remove(
          users.filter((u: any) => u.email !== 'testuser@example.com'),
        );
      } else {
        await userRepository.clear();
      }
    }
  }, 60000);

  describe('POST /auth/register', () => {
    it('should register a new user successfully', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'testuser@example.com',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          role: 'tenant',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user.email).toBe('testuser@example.com');
          expect(res.body.user.firstName).toBe('Test');
          expect(res.body.user.lastName).toBe('User');
          expect(res.body.user.role).toBe('tenant');
          expect(res.body.user).not.toHaveProperty('passwordHash');
          expect(res.body.user).not.toHaveProperty('refreshToken');
        });
    });

    it('should reject registration with weak password', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'weakpass@example.com',
          password: 'weak',
          firstName: 'Test',
          lastName: 'User',
          role: 'tenant',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Password');
        });
    });

    it('should reject registration with invalid email format', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          role: 'tenant',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('email');
        });
    });

    it('should reject registration with missing required fields', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'incomplete@example.com',
          password: 'SecurePass123!',
        })
        .expect(400);
    });

    it('should reject duplicate email registration', async () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'testuser@example.com',
          password: 'SecurePass123!',
          firstName: 'Duplicate',
          lastName: 'User',
          role: 'tenant',
        })
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toContain('already registered');
        });
    });

    it('should reject invalid role', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalidrole@example.com',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          role: 'invalid_role',
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login user with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'SecurePass123!',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user.email).toBe('testuser@example.com');
          expect(res.body.user).not.toHaveProperty('passwordHash');
        });
    });

    it('should reject login with invalid password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'WrongPassword123!',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('Invalid');
        });
    });

    it('should reject login for non-existent user', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SecurePass123!',
        })
        .expect(401);
    });

    it('should reject login with missing credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'testuser@example.com',
        })
        .expect(400);
    });

    it('should reject login with invalid email format', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: 'SecurePass123!',
        })
        .expect(400);
    });
  });

  describe('POST /auth/refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'SecurePass123!',
        });
      refreshToken = loginRes.body.refreshToken;
    });

    it('should refresh access token with valid refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body.refreshToken).not.toBe(refreshToken);
        });
    });

    it('should reject invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid.token.here',
        })
        .expect(401);
    });

    it('should reject missing refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(400);
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should send reset email for existing user', () => {
      return request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({
          email: 'testuser@example.com',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('If an account exists');
        });
    });

    it('should return generic success for non-existent email (security)', () => {
      return request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toContain('If an account exists');
        });
    });

    it('should reject invalid email format', () => {
      return request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({
          email: 'invalid-email',
        })
        .expect(400);
    });

    it('should reject missing email', () => {
      return request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({})
        .expect(400);
    });
  });

  describe('POST /auth/logout', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'SecurePass123!',
        });
      accessToken = loginRes.body.accessToken;
      refreshToken = loginRes.body.refreshToken;
    });

    it('should logout user successfully with valid token', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('Logged out');
        });
    });

    it('should reject logout without authorization header', () => {
      return request(app.getHttpServer()).post('/auth/logout').expect(401);
    });

    it('should reject logout with invalid token', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });

    it('should reject logout with malformed authorization header', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', accessToken)
        .expect(401);
    });

    it('should invalidate refresh token after logout', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken,
        })
        .expect(401);
    });
  });

  describe('GET /auth/verify-email', () => {
    it('should verify email with valid token', async () => {
      const user = await userRepository.findOne({
        where: { email: 'testuser@example.com' },
      });

      if (user && user.verificationToken) {
        return request(app.getHttpServer())
          .get(`/auth/verify-email?token=${user.verificationToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('message');
            expect(res.body.message).toContain('verified');
          });
      }
    });

    it('should reject invalid verification token', () => {
      return request(app.getHttpServer())
        .get('/auth/verify-email?token=invalid-token')
        .expect(400);
    });

    it('should reject missing token', () => {
      return request(app.getHttpServer()).get('/auth/verify-email').expect(400);
    });
  });
});
