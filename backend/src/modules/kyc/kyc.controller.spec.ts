import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import * as request from 'supertest';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WebhookSignatureGuard } from '../webhooks/guards/webhook-signature.guard';
import { AuditLogInterceptor } from '../audit/interceptors/audit-log.interceptor';
import { KycStatus } from './kyc-status.enum';
import { Kyc } from './kyc.entity';

describe('KycController', () => {
  let app: INestApplication;
  let kycService: {
    submitKyc: jest.Mock;
    getKycStatus: jest.Mock;
    handleWebhook: jest.Mock;
  };

  beforeAll(async () => {
    const mock = {
      submitKyc: jest.fn(),
      getKycStatus: jest.fn(),
      handleWebhook: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [KycController],
      providers: [{ provide: KycService, useValue: mock }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest();
          req.user = { id: 'ctrl-user-1' };
          return true;
        },
      })
      .overrideGuard(WebhookSignatureGuard)
      .useValue({ canActivate: () => true })
      .overrideInterceptor(AuditLogInterceptor)
      .useValue({
        intercept(_ctx: ExecutionContext, next: CallHandler) {
          return next.handle();
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    kycService = moduleRef.get(KycService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /kyc/submit', () => {
    it('validates body and returns saved KYC', async () => {
      const saved: Partial<Kyc> = {
        id: 'kyc-1',
        userId: 'ctrl-user-1',
        status: KycStatus.PENDING,
      };
      kycService.submitKyc.mockResolvedValue(saved);

      const res = await request(app.getHttpServer())
        .post('/kyc/submit')
        .send({
          kycData: { first_name: 'Jane', last_name: 'Doe' },
        })
        .expect(201);

      expect(res.body).toMatchObject({ id: 'kyc-1', status: KycStatus.PENDING });
      expect(kycService.submitKyc).toHaveBeenCalledWith('ctrl-user-1', {
        kycData: { first_name: 'Jane', last_name: 'Doe' },
      });
    });

    it('returns 400 when kycData is missing', async () => {
      await request(app.getHttpServer()).post('/kyc/submit').send({}).expect(400);
      expect(kycService.submitKyc).not.toHaveBeenCalled();
    });
  });

  describe('GET /kyc/status', () => {
    it('returns KYC record from service', async () => {
      kycService.getKycStatus.mockResolvedValue({
        id: 'kyc-1',
        status: KycStatus.APPROVED,
        userId: 'ctrl-user-1',
      });

      const res = await request(app.getHttpServer()).get('/kyc/status').expect(200);

      expect(res.body.status).toBe(KycStatus.APPROVED);
      expect(kycService.getKycStatus).toHaveBeenCalledWith('ctrl-user-1');
    });

    it('returns null body shape when no record', async () => {
      kycService.getKycStatus.mockResolvedValue(null);
      const res = await request(app.getHttpServer()).get('/kyc/status').expect(200);
      expect(res.body).toEqual(null);
    });
  });

  describe('POST /kyc/webhook', () => {
    it('returns 400 for invalid payload', async () => {
      await request(app.getHttpServer())
        .post('/kyc/webhook')
        .send({ providerReference: 123 })
        .expect(400);
      expect(kycService.handleWebhook).not.toHaveBeenCalled();
    });

    it('processes valid webhook and returns success', async () => {
      kycService.handleWebhook.mockResolvedValue(undefined);
      const body = {
        providerReference: 'ref-1',
        status: KycStatus.APPROVED,
      };
      const res = await request(app.getHttpServer())
        .post('/kyc/webhook')
        .send(body)
        .expect(201);

      expect(res.body).toEqual({ success: true });
      expect(kycService.handleWebhook).toHaveBeenCalledWith(body);
    });
  });
});
