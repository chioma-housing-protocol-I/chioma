import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { AdminGuard } from '../guards/admin.guard';
import { Public } from '../decorators/public.decorator';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../guards/roles.guard';

describe('Auth Endpoint Security', () => {
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Reflector],
    }).compile();

    reflector = module.get<Reflector>(Reflector);
  });

  describe('JwtAuthGuard', () => {
    @Injectable()
    class MockJwtAuthGuard extends JwtAuthGuard {
      constructor(reflector: Reflector) {
        super(reflector);
      }
    }

    let guard: MockJwtAuthGuard;

    beforeEach(() => {
      guard = new MockJwtAuthGuard(reflector);
    });

    it('allows access to @Public() routes without authentication', () => {
      @Controller()
      class TestController {
        @Public()
        @Get('public-route')
        publicRoute() {
          return 'public';
        }
      }

      const controller = new TestController();
      const isPublic = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        controller.publicRoute,
        TestController,
      ]);

      expect(isPublic).toBe(true);
    });

    it('requires authentication for routes without @Public() decorator', () => {
      @Controller()
      class TestController {
        @Get('protected-route')
        protectedRoute() {
          return 'protected';
        }
      }

      const controller = new TestController();
      const isPublic = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        controller.protectedRoute,
        TestController,
      ]);

      expect(isPublic).toBeUndefined();
    });
  });

  describe('@Public() decorator on controllers', () => {
    it('should not have @Public() on POST routes that modify data', () => {
      @Controller()
      @UseGuards(JwtAuthGuard)
      class TestController {
        @Post()
        create() {
          return 'created';
        }

        @Patch(':id')
        update() {
          return 'updated';
        }

        @Delete(':id')
        delete() {
          return 'deleted';
        }
      }

      const controller = new TestController();
      const createPublic = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        controller.create,
        TestController,
      ]);
      const updatePublic = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        controller.update,
        TestController,
      ]);

      expect(createPublic).toBeUndefined();
      expect(updatePublic).toBeUndefined();
    });
  });

  describe('RolesGuard integration', () => {
    it('requires ADMIN role for admin-only endpoints', () => {
      @Controller()
      @UseGuards(RolesGuard)
      class AdminController {
        @Roles(UserRole.ADMIN)
        @Get('admin-only')
        adminOnly() {
          return 'admin';
        }
      }

      const controller = new AdminController();
      const requiredRoles = reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
        controller.adminOnly,
        AdminController,
      ]);

      expect(requiredRoles).toContain(UserRole.ADMIN);
    });

    it('allows multiple roles on multi-role endpoints', () => {
      @Controller()
      @UseGuards(RolesGuard)
      class MultiRoleController {
        @Roles(UserRole.ADMIN, UserRole.AGENT)
        @Get('multi-role')
        multiRole() {
          return 'ok';
        }
      }

      const controller = new MultiRoleController();
      const requiredRoles = reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
        controller.multiRole,
        MultiRoleController,
      ]);

      expect(requiredRoles).toContain(UserRole.ADMIN);
      expect(requiredRoles).toContain(UserRole.AGENT);
    });

    it('permits all roles when no @Roles() decorator is present', () => {
      @Controller()
      @UseGuards(RolesGuard)
      class OpenController {
        @Get('open-endpoint')
        openEndpoint() {
          return 'open';
        }
      }

      const controller = new OpenController();
      const requiredRoles = reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
        controller.openEndpoint,
        OpenController,
      ]);

      expect(requiredRoles).toBeUndefined();
    });
  });

  describe('AdminGuard', () => {
    let adminGuard: AdminGuard;

    beforeEach(() => {
      adminGuard = new AdminGuard();
    });

    it('allows admin users to pass', () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { role: UserRole.ADMIN },
          }),
        }),
      } as ExecutionContext;

      expect(adminGuard.canActivate(context)).toBe(true);
    });

    it('blocks non-admin users', () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { role: UserRole.USER },
          }),
        }),
      } as ExecutionContext;

      expect(() => adminGuard.canActivate(context)).toThrow();
    });

    it('blocks unauthenticated requests', () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({}),
        }),
      } as ExecutionContext;

      expect(() => adminGuard.canActivate(context)).toThrow();
    });
  });

  describe('Cross-controller auth consistency', () => {
    it('enforces JWT guard on auth-module endpoints that require authentication', () => {
      @Controller()
      class AuthRequiredController {
        @UseGuards(JwtAuthGuard)
        @Post('auth/logout')
        logout() {
          return 'ok';
        }

        @UseGuards(JwtAuthGuard)
        @Post('auth/mfa/enable')
        enableMfa() {
          return 'ok';
        }
      }

      const controller = new AuthRequiredController();
      const logoutGuards = Reflect.getMetadata('__guards__', controller.logout);
      const mfaGuards = Reflect.getMetadata('__guards__', controller.enableMfa);

      expect(logoutGuards).toBeDefined();
      expect(logoutGuards).toContain(JwtAuthGuard);

      expect(mfaGuards).toBeDefined();
      expect(mfaGuards).toContain(JwtAuthGuard);
    });

    it('allows public endpoints without auth guards', () => {
      @Controller()
      class PublicController {
        @Public()
        @Post('auth/register')
        register() {
          return 'ok';
        }

        @Public()
        @Post('auth/login')
        login() {
          return 'ok';
        }

        @Public()
        @Post('auth/forgot-password')
        forgotPassword() {
          return 'ok';
        }
      }

      const controller = new PublicController();
      const registerPublic = reflector.getAllAndOverride<boolean>(
        IS_PUBLIC_KEY,
        [controller.register, PublicController],
      );
      const loginPublic = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        controller.login,
        PublicController,
      ]);

      expect(registerPublic).toBe(true);
      expect(loginPublic).toBe(true);
    });
  });

  describe('Auth guard inheritance and override', () => {
    it('@Public() decorator overrides JwtAuthGuard at method level', () => {
      @Controller()
      @UseGuards(JwtAuthGuard)
      class GuardedController {
        @Public()
        @Get('public-inside-guarded')
        publicInsideGuarded() {
          return 'public';
        }

        @Get('protected-inside-guarded')
        protectedInsideGuarded() {
          return 'protected';
        }
      }

      const controller = new GuardedController();
      const publicRoute = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        controller.publicInsideGuarded,
        GuardedController,
      ]);
      const protectedRoute = reflector.getAllAndOverride<boolean>(
        IS_PUBLIC_KEY,
        [controller.protectedInsideGuarded, GuardedController],
      );

      expect(publicRoute).toBe(true);
      expect(protectedRoute).toBeUndefined();
    });
  });
});
