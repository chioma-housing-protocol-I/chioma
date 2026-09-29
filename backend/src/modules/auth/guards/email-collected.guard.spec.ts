import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EmailCollectedGuard } from './email-collected.guard';
import { REQUIRE_EMAIL_KEY } from '../decorators/require-email.decorator';
import { User } from '../../users/entities/user.entity';

function buildContext(user: Partial<User> | undefined, required: boolean) {
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(required) } as unknown as Reflector;
  const request = { user };
  const ctx = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { guard: new EmailCollectedGuard(reflector), ctx };
}

describe('EmailCollectedGuard', () => {
  it('passes when RequireEmail is not set', () => {
    const { guard, ctx } = buildContext(undefined, false);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws 403 when no user on request', () => {
    const { guard, ctx } = buildContext(undefined, true);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws 403 when emailCollectedAt is null', () => {
    const { guard, ctx } = buildContext({ emailCollectedAt: null } as User, true);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws 403 when emailCollectedAt is undefined', () => {
    const { guard, ctx } = buildContext({} as User, true);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('passes when emailCollectedAt is set', () => {
    const { guard, ctx } = buildContext(
      { emailCollectedAt: new Date() } as User,
      true,
    );
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
