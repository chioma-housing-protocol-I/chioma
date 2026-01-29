import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { of } from 'rxjs';
import { getRepositoryToken } from '@nestjs/typeorm';

import { StellarModule } from '../src/modules/stellar/stellar.module';
import { User } from '../src/modules/users/entities/user.entity';
import { SupportedCurrency } from '../src/modules/stellar/entities/supported-currency.entity';
import { AnchorTransaction } from '../src/modules/stellar/entities/anchor-transaction.entity';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { HttpService } from '@nestjs/axios';

describe('Anchor Controller (e2e)', () => {
  let app: INestApplication;
  let userRepository: any;
  let currencyRepository: any;
  let anchorTxRepository: any;

  const mockUserId = '11111111-1111-1111-1111-111111111111';

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
          entities: [User, SupportedCurrency, AnchorTransaction],
          synchronize: true,
          dropSchema: true,
        }),
        StellarModule,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = { id: mockUserId };
          return true;
        },
      })
      .overrideProvider(HttpService)
      .useValue({
        post: jest.fn(),
        get: jest.fn(),
      })
      .compile();

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
    currencyRepository = moduleFixture.get(getRepositoryToken(SupportedCurrency));
    anchorTxRepository = moduleFixture.get(getRepositoryToken(AnchorTransaction));

    // Seed required user + supported currency
    await userRepository.save({
      id: mockUserId,
      email: 'anchor-test@example.com',
      password: null,
      isActive: true,
    });

    await currencyRepository.save({
      code: 'USD',
      name: 'US Dollar',
      type: 'fiat',
      isActive: true,
      exchangeRateToUsd: 1,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean transactions between tests
    await anchorTxRepository.query('DELETE FROM anchor_transactions');
  });

  it('POST /api/v1/anchor/deposit returns created transaction', async () => {
    const httpService = app.get(HttpService);
    (httpService.post as jest.Mock).mockReturnValue(
      of({
        data: {
          id: 'anchor-tx-1',
          url: 'https://anchor.example/interactive',
          external_transaction_id: 'ext-1',
        },
      }),
    );

    const res = await request(app.getHttpServer())
      .post('/api/v1/anchor/deposit')
      .send({
        amount: 10,
        currency: 'USD',
        walletAddress: 'GA123...',
        type: 'SEPA',
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.type).toBe('deposit');
    expect(res.body.fiatCurrency).toBe('USD');
    expect(res.body.anchorTransactionId).toBe('anchor-tx-1');
  });

  it('POST /api/v1/anchor/withdraw returns created transaction', async () => {
    const httpService = app.get(HttpService);
    (httpService.post as jest.Mock).mockReturnValue(
      of({
        data: {
          id: 'anchor-w-1',
          status: 'pending',
          external_transaction_id: 'ext-w-1',
        },
      }),
    );

    const res = await request(app.getHttpServer())
      .post('/api/v1/anchor/withdraw')
      .send({
        amount: 12,
        currency: 'USD',
        destination: 'bank-details',
        walletAddress: 'GA123...',
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.type).toBe('withdrawal');
    expect(res.body.fiatCurrency).toBe('USD');
    expect(res.body.anchorTransactionId).toBe('anchor-w-1');
  });

  it('GET /api/v1/anchor/transactions/:id returns transaction and updates status when pending', async () => {
    const httpService = app.get(HttpService);
    (httpService.get as jest.Mock).mockReturnValue(of({ data: { status: 'completed' } }));

    const tx = await anchorTxRepository.save({
      userId: mockUserId,
      type: 'deposit',
      status: 'pending',
      amount: 10,
      fiatCurrency: 'USD',
      walletAddress: 'GA123...',
      anchorTransactionId: 'anchor-status-1',
    });

    const res = await request(app.getHttpServer())
      .get(`/api/v1/anchor/transactions/${tx.id}`)
      .expect(200);

    expect(res.body.id).toBe(tx.id);
    expect(['pending', 'processing', 'completed', 'failed', 'cancelled']).toContain(
      res.body.status,
    );
    expect(res.body.status).toBe('completed');
  });

  it('POST /api/v1/anchor/deposit rejects unsupported currency', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/anchor/deposit')
      .send({
        amount: 10,
        currency: 'XYZ',
        walletAddress: 'GA123...',
        type: 'SEPA',
      })
      .expect(400);
  });
});
