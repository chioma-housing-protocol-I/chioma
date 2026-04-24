/**
 * KYC E2E: JWT submit/status, signed provider webhooks, and auth validation.
 */
process.env.NODE_ENV = 'test';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { Kyc } from '../src/modules/kyc/kyc.entity';
import { KycStatus } from '../src/modules/kyc/kyc-status.enum';
import { UserRole } from '../src/modules/users/entities/user.entity';
import { WebhookSignatureService } from '../src/modules/webhooks/webhook-signature.service';

describe('KYC (e2e)', () => {
  let app: INestApplication;
  let kycRepo: Repository<Kyc>;
  let webhookSig: WebhookSignatureService;
  let accessToken: string;
  let userId: string;

  const password = 'SecurePass123!';
  const email = `kyc-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 10)}@example.test`;
  const webhookSecret = process.env.KYC_WEBHOOK_SECRET!;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.setGlobalPrefix('api', {
      exclude: [
        'health',
        'health/detailed',
        'security.txt',
        '.well-known',
        'developer-portal',
      ],
    });

    const config = new DocumentBuilder()
      .setTitle('Chioma API')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'JWT-auth',
      )
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    await app.init();

    kycRepo = app.get(getRepositoryToken(Kyc));
    webhookSig = app.get(WebhookSignatureService);

    const reg = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email,
        password,
        firstName: 'Kyc',
        lastName: 'E2E',
        role: UserRole.USER,
      })
      .expect(201);

    accessToken = reg.body.accessToken;
    userId = reg.body.user.id;
  }, 120000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  }, 60000);

  it('rejects submit without bearer token', async () => {
    await request(app.getHttpServer())
      .post('/api/kyc/submit')
      .send({ kycData: { first_name: 'A' } })
      .expect(401);
  });

  it('rejects status without bearer token', async () => {
    await request(app.getHttpServer()).get('/api/kyc/status').expect(401);
  });

  it('rejects webhook without signature headers', async () => {
    await request(app.getHttpServer())
      .post('/api/kyc/webhook')
      .send({
        providerReference: 'noop-ref',
        status: KycStatus.APPROVED,
      })
      .expect(401);
  });

  it('returns 400 when kycData is missing', async () => {
    await request(app.getHttpServer())
      .post('/api/kyc/submit')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(400);
  });

  describe('verification workflow', () => {
    it('submits KYC, accepts signed webhook, and reflects APPROVED status', async () => {
      const submit = await request(app.getHttpServer())
        .post('/api/kyc/submit')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          kycData: {
            first_name: 'E2e',
            last_name: 'User',
            country: 'US',
          },
        })
        .expect(201);

      expect(submit.body).toHaveProperty('id');
      expect(submit.body.status).toBe(KycStatus.PENDING);

      const providerRef = `e2e-ref-${Date.now()}`;
      await kycRepo.update({ userId }, { providerReference: providerRef });

      const payload = JSON.stringify({
        providerReference: providerRef,
        status: KycStatus.APPROVED,
      });
      const ts = Date.now().toString();
      const signature = webhookSig.generateSignature(
        payload,
        ts,
        webhookSecret,
      );

      await request(app.getHttpServer())
        .post('/api/kyc/webhook')
        .set('Content-Type', 'application/json')
        .set('x-webhook-timestamp', ts)
        .set('x-webhook-signature', signature)
        .send(payload)
        .expect(201);

      const statusRes = await request(app.getHttpServer())
        .get('/api/kyc/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(statusRes.body.status).toBe(KycStatus.APPROVED);

      const payloadInfo = JSON.stringify({
        providerReference: providerRef,
        status: KycStatus.NEEDS_INFO,
      });
      const tsInfo = Date.now().toString();
      const sigInfo = webhookSig.generateSignature(
        payloadInfo,
        tsInfo,
        webhookSecret,
      );

      await request(app.getHttpServer())
        .post('/api/kyc/webhook')
        .set('Content-Type', 'application/json')
        .set('x-webhook-timestamp', tsInfo)
        .set('x-webhook-signature', sigInfo)
        .send(payloadInfo)
        .expect(201);

      const afterInfo = await request(app.getHttpServer())
        .get('/api/kyc/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(afterInfo.body.status).toBe(KycStatus.NEEDS_INFO);
    });
  });
});
