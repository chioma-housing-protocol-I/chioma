import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SKIP_EMAIL_CHECK_KEY } from '../decorators/skip-email-check.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

interface RequestUser {
  id?: string;
  email?: string | null;
  emailCollectedAt?: Date | null;
}

/**
 * Server-side enforcement of the email-onboarding gate (issue #1832).
 *
 * Wallet-only users are minted with no email address and can postpone
 * collection via a client-side `sessionStorage` flag.  That flag lives only
 * in the browser — it cannot stop a user from calling the API directly.
 *
 * This guard blocks sensitive endpoints with HTTP 403 when the authenticated
 * user's `emailCollectedAt` is null, ensuring:
 * - Email collection cannot be bypassed indefinitely.
 * - API calls without a valid email are rejected server-side.
 * - Compliance obligations (receipts, account recovery) are met before
 *   any financially or legally significant operation proceeds.
 *
 * Opt-out on individual endpoints with `@SkipEmailCheck()`. Public endpoints
 * (decorated with `@Public()`) are automatically skipped.
 */
@Injectable()
export class EmailRequiredGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Public routes bypass authentication entirely — skip this check too.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // Endpoints decorated with @SkipEmailCheck() are explicitly exempt.
    const skipEmailCheck = this.reflector.getAllAndOverride<boolean>(
      SKIP_EMAIL_CHECK_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skipEmailCheck) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: RequestUser }>();

    // Guard only applies to authenticated requests.  Unauthenticated requests
    // are caught upstream by JwtAuthGuard before this guard runs.
    if (!request.user) {
      return true;
    }

    if (!request.user.emailCollectedAt) {
      throw new ForbiddenException(
        'Email address required. Please complete your profile at /complete-profile before continuing.',
      );
    }

    return true;
  }
}
