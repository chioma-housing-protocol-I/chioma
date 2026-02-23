import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { StellarModule } from '../src/modules/stellar/stellar.module';
import { AuthModule } from '../src/modules/auth/auth.module';
import { AnchorTransaction } from '../src/modules/transactions/entities/anchor-transaction.entity';
import { SupportedCurrency } from '../src/modules/transactions/entities/supported-currency.entity';

describe('Anchor Integration (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [AnchorTransaction, SupportedCurrency],
          synchronize: true,
        }),
        StellarModule,
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    // Get auth token for testing
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Test123!@#',
      });

    authToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/anchor/deposit', () => {
    it('should reject request without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/anchor/deposit')
        .send({
          amount: 100,
          currency: 'USD',
          walletAddress: 'GTEST...',
          type: 'ACH',
        })
        .expect(401);
    });

    it('should reject invalid currency', () => {
      return request(app.getHttpServer())
        .post('/api/v1/anchor/deposit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
          currency: 'INVALID',
          walletAddress: 'GTEST...',
          type: 'ACH',
        })
        .expect(400);
    });

    it('should reject invalid payment type', () => {
      return request(app.getHttpServer())
        .post('/api/v1/anchor/deposit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
          currency: 'USD',
          walletAddress: 'GTEST...',
          type: 'INVALID',
        })
        .expect(400);
    });

    it('should reject missing required fields', () => {
      return request(app.getHttpServer())
        .post('/api/v1/anchor/deposit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
        })
        .expect(400);
    });
  });

  describe('POST /api/v1/anchor/withdraw', () => {
    it('should reject request without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/anchor/withdraw')
        .send({
          amount: 100,
          currency: 'USD',
          destination: 'bank-account',
          walletAddress: 'GTEST...',
        })
        .expect(401);
    });

    it('should reject missing required fields', () => {
      return request(app.getHttpServer())
        .post('/api/v1/anchor/withdraw')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
          currency: 'USD',
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/anchor/transactions/:id', () => {
    it('should reject request without authentication', () => {
      return request(app.getHttpServer())
        .get('/api/v1/anchor/transactions/test-id')
        .expect(401);
    });

    it('should return 400 for non-existent transaction', () => {
      return request(app.getHttpServer())
        .get('/api/v1/anchor/transactions/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('POST /api/v1/anchor/webhook', () => {
    it('should accept webhook payload', () => {
      return request(app.getHttpServer())
        .post('/api/v1/anchor/webhook')
        .send({
          id: 'anchor-tx-123',
          status: 'completed',
          stellar_transaction_id: 'stellar-tx-456',
        })
        .expect(200)
        .expect({ success: true });
    });
  });
});
