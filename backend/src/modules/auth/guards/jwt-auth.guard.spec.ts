import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

function createContext(request: {
  method: string;
  path: string;
  route?: { path?: string };
  user?: { email?: string | null };
}): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}

describe('JwtAuthGuard email onboarding enforcement', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard(new Reflector());
  });

  it('rejects protected requests when the authenticated user has no email', () => {
    const context = createContext({
      method: 'POST',
      path: '/api/v1/payments',
      user: { email: null },
    });

    expect(() =>
      (
        guard as unknown as {
          enforceEmailOnboarding: (ctx: ExecutionContext) => void;
        }
      ).enforceEmailOnboarding(context),
    ).toThrow(ForbiddenException);
  });

  it('allows the complete-profile route for users missing email', () => {
    const context = createContext({
      method: 'POST',
      path: '/api/v1/auth/complete-profile',
      user: { email: null },
    });

    expect(() =>
      (
        guard as unknown as {
          enforceEmailOnboarding: (ctx: ExecutionContext) => void;
        }
      ).enforceEmailOnboarding(context),
    ).not.toThrow();
  });

  it('allows protected requests after email is collected', () => {
    const context = createContext({
      method: 'POST',
      path: '/api/v1/payments',
      user: { email: 'user@example.com' },
    });

    expect(() =>
      (
        guard as unknown as {
          enforceEmailOnboarding: (ctx: ExecutionContext) => void;
        }
      ).enforceEmailOnboarding(context),
    ).not.toThrow();
  });
});
