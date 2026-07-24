import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import * as request from 'supertest';
import { AdminUsersController } from './admin-users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditLogInterceptor } from '../audit/interceptors/audit-log.interceptor';
import { UserRole } from './entities/user.entity';

describe('AdminUsersController', () => {
  let app: INestApplication;
  let usersService: {
    findAllForAdmin: jest.Mock;
    adminDeactivateAccount: jest.Mock;
    adminVerifyAccount: jest.Mock;
    adminRestoreAccount: jest.Mock;
  };
  let currentUser: { id: string; role: UserRole };

  const buildApp = async () => {
    const mock = {
      findAllForAdmin: jest.fn(),
      adminDeactivateAccount: jest.fn(),
      adminVerifyAccount: jest.fn(),
      adminRestoreAccount: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AdminUsersController],
      providers: [{ provide: UsersService, useValue: mock }],
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
    usersService = moduleRef.get(UsersService);
  };

  afterEach(async () => {
    if (app) await app.close();
  });

  describe('as a non-admin user', () => {
    beforeEach(async () => {
      currentUser = { id: 'user-1', role: UserRole.USER };
      await buildApp();
    });

    it('denies listing users', async () => {
      await request(app.getHttpServer()).get('/admin/users').expect(403);
      expect(usersService.findAllForAdmin).not.toHaveBeenCalled();
    });

    it('denies suspending a user', async () => {
      await request(app.getHttpServer())
        .post('/admin/users/user-2/deactivate')
        .expect(403);
      expect(usersService.adminDeactivateAccount).not.toHaveBeenCalled();
    });

    it('denies verifying a user', async () => {
      await request(app.getHttpServer())
        .post('/admin/users/user-2/verify')
        .expect(403);
      expect(usersService.adminVerifyAccount).not.toHaveBeenCalled();
    });

    it('denies restoring a user', async () => {
      await request(app.getHttpServer())
        .post('/admin/users/user-2/restore')
        .expect(403);
      expect(usersService.adminRestoreAccount).not.toHaveBeenCalled();
    });
  });

  describe('as an admin user', () => {
    beforeEach(async () => {
      currentUser = { id: 'admin-1', role: UserRole.ADMIN };
      await buildApp();
    });

    it('lists users', async () => {
      usersService.findAllForAdmin.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const res = await request(app.getHttpServer())
        .get('/admin/users')
        .expect(200);

      expect(res.body.total).toBe(0);
      expect(usersService.findAllForAdmin).toHaveBeenCalled();
    });

    it('suspends a user', async () => {
      usersService.adminDeactivateAccount.mockResolvedValue({
        message: 'User suspended successfully',
      });

      const res = await request(app.getHttpServer())
        .post('/admin/users/user-2/deactivate')
        .expect(201);

      expect(res.body.message).toBe('User suspended successfully');
      expect(usersService.adminDeactivateAccount).toHaveBeenCalledWith(
        'user-2',
        'admin-1',
      );
    });

    it('verifies a user', async () => {
      usersService.adminVerifyAccount.mockResolvedValue({
        message: 'User verified successfully',
      });

      const res = await request(app.getHttpServer())
        .post('/admin/users/user-2/verify')
        .expect(201);

      expect(res.body.message).toBe('User verified successfully');
      expect(usersService.adminVerifyAccount).toHaveBeenCalledWith(
        'user-2',
        'admin-1',
      );
    });

    it('restores a user', async () => {
      usersService.adminRestoreAccount.mockResolvedValue({
        message: 'User restored successfully',
      });

      const res = await request(app.getHttpServer())
        .post('/admin/users/user-2/restore')
        .expect(201);

      expect(res.body.message).toBe('User restored successfully');
      expect(usersService.adminRestoreAccount).toHaveBeenCalledWith(
        'user-2',
        'admin-1',
      );
    });
  });
});
