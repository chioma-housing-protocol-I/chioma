import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import * as request from 'supertest';
import { AdminKycController } from './admin-kyc.controller';
import { KycService } from './kyc.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditLogInterceptor } from '../audit/interceptors/audit-log.interceptor';
import { KycStatus } from './kyc-status.enum';
import { UserRole } from '../users/entities/user.entity';

describe('AdminKycController', () => {
  let app: INestApplication;
  let kycService: {
    findPendingForAdmin: jest.Mock;
    findRejectedForAdmin: jest.Mock;
    findByIdForAdmin: jest.Mock;
    approveKyc: jest.Mock;
    rejectKyc: jest.Mock;
  };
  let currentUser: { id: string; role: UserRole };

  const buildApp = async () => {
    const mock = {
      findPendingForAdmin: jest.fn(),
      findRejectedForAdmin: jest.fn(),
      findByIdForAdmin: jest.fn(),
      approveKyc: jest.fn(),
      rejectKyc: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AdminKycController],
      providers: [{ provide: KycService, useValue: mock }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest();
          req.user = currentUser;
          return true;
        },
      })
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
  };

  afterEach(async () => {
    if (app) await app.close();
  });

  describe('as a non-admin user', () => {
    beforeEach(async () => {
      currentUser = { id: 'user-1', role: UserRole.USER };
      await buildApp();
    });

    it('denies listing pending verifications', async () => {
      await request(app.getHttpServer()).get('/admin/kyc/pending').expect(403);
      expect(kycService.findPendingForAdmin).not.toHaveBeenCalled();
    });

    it('denies listing rejected verifications', async () => {
      await request(app.getHttpServer()).get('/admin/kyc/rejected').expect(403);
      expect(kycService.findRejectedForAdmin).not.toHaveBeenCalled();
    });

    it('denies approve action', async () => {
      await request(app.getHttpServer())
        .post('/admin/kyc/kyc-1/approve')
        .send({})
        .expect(403);
      expect(kycService.approveKyc).not.toHaveBeenCalled();
    });

    it('denies reject action', async () => {
      await request(app.getHttpServer())
        .post('/admin/kyc/kyc-1/reject')
        .send({ reason: 'nope' })
        .expect(403);
      expect(kycService.rejectKyc).not.toHaveBeenCalled();
    });
  });

  describe('as an admin user', () => {
    beforeEach(async () => {
      currentUser = { id: 'admin-1', role: UserRole.ADMIN };
      await buildApp();
    });

    it('lists pending verifications', async () => {
      kycService.findPendingForAdmin.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const res = await request(app.getHttpServer())
        .get('/admin/kyc/pending')
        .expect(200);

      expect(res.body.total).toBe(0);
      expect(kycService.findPendingForAdmin).toHaveBeenCalled();
    });

    it('lists rejected verifications', async () => {
      kycService.findRejectedForAdmin.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      await request(app.getHttpServer()).get('/admin/kyc/rejected').expect(200);

      expect(kycService.findRejectedForAdmin).toHaveBeenCalled();
    });

    it('approves a verification', async () => {
      kycService.approveKyc.mockResolvedValue({
        id: 'kyc-1',
        status: KycStatus.APPROVED,
      });

      const res = await request(app.getHttpServer())
        .post('/admin/kyc/kyc-1/approve')
        .send({})
        .expect(201);

      expect(res.body.status).toBe(KycStatus.APPROVED);
      expect(kycService.approveKyc).toHaveBeenCalledWith(
        'kyc-1',
        'admin-1',
        undefined,
      );
    });

    it('rejects a verification with a reason', async () => {
      kycService.rejectKyc.mockResolvedValue({
        id: 'kyc-1',
        status: KycStatus.REJECTED,
        reason: 'Blurry document',
      });

      const res = await request(app.getHttpServer())
        .post('/admin/kyc/kyc-1/reject')
        .send({ reason: 'Blurry document' })
        .expect(201);

      expect(res.body.status).toBe(KycStatus.REJECTED);
      expect(kycService.rejectKyc).toHaveBeenCalledWith(
        'kyc-1',
        'admin-1',
        'Blurry document',
      );
    });

    it('gets a verification detail', async () => {
      kycService.findByIdForAdmin.mockResolvedValue({
        id: 'kyc-1',
        status: KycStatus.PENDING,
      });

      const res = await request(app.getHttpServer())
        .get('/admin/kyc/kyc-1')
        .expect(200);

      expect(res.body.id).toBe('kyc-1');
      expect(kycService.findByIdForAdmin).toHaveBeenCalledWith('kyc-1');
    });
  });
});
