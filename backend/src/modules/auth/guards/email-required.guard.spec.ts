import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EmailRequiredGuard } from './email-required.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SKIP_EMAIL_CHECK_KEY } from '../decorators/skip-email-check.decorator';

function makeContext(
  user: { emailCollectedAt?: Date | null } | undefined,
  metadata: Record<string, boolean> = {},
): ExecutionContext {
  const mockReflector = {
    getAllAndOverride: (key: string) => metadata[key] ?? false,
  } as unknown as Reflector;

  const ctx = {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;

  return { _ctx: ctx, _reflector: mockReflector } as unknown as ExecutionContext;
}

// Helper that wires reflector + context together properly for the guard.
function buildGuardAndCtx(
  user: { emailCollectedAt?: Date | null } | undefined,
  metadata: Record<string, boolean> = {},
): { guard: EmailRequiredGuard; ctx: ExecutionContext } {
  const reflector = {
    getAllAndOverride: jest.fn((key: string) => metadata[key] ?? false),
  } as unknown as Reflector;

  const request = { user };
  const ctx = {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => 'handler',
    getClass: () => 'HandlerClass',
  } as unknown as ExecutionContext;

  const guard = new EmailRequiredGuard(reflector);
  return { guard, ctx };
}

describe('EmailRequiredGuard', () => {
  it('passes when user has emailCollectedAt set', () => {
    const { guard, ctx } = buildGuardAndCtx({
      emailCollectedAt: new Date('2024-01-01'),
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws ForbiddenException when emailCollectedAt is null', () => {
    const { guard, ctx } = buildGuardAndCtx({ emailCollectedAt: null });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when emailCollectedAt is undefined', () => {
    const { guard, ctx } = buildGuardAndCtx({});
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('skips check for @Public() endpoints', () => {
    const { guard, ctx } = buildGuardAndCtx(
      { emailCollectedAt: null },
      { [IS_PUBLIC_KEY]: true },
    );
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('skips check for @SkipEmailCheck() endpoints', () => {
    const { guard, ctx } = buildGuardAndCtx(
      { emailCollectedAt: null },
      { [SKIP_EMAIL_CHECK_KEY]: true },
    );
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('passes when no user is present on request (unauthenticated flow)', () => {
    const { guard, ctx } = buildGuardAndCtx(undefined);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws ForbiddenException with actionable message', () => {
    const { guard, ctx } = buildGuardAndCtx({ emailCollectedAt: null });
    try {
      guard.canActivate(ctx);
      fail('Expected ForbiddenException');
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenException);
      const exc = err as ForbiddenException;
      const response = exc.getResponse() as { message: string };
      expect(response.message).toContain('complete-profile');
    }
  });
});
