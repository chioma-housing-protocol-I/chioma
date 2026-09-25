import {
  ForbiddenException,
  Injectable,
  ExecutionContext,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { User } from '../../users/entities/user.entity';

const EMAIL_ONBOARDING_ALLOWED_PATHS = new Map<string, Set<string>>([
  ['GET', new Set(['/users/me'])],
  ['PUT', new Set(['/users/me'])],
  [
    'POST',
    new Set([
      '/users/me/email',
      '/auth/complete-profile',
      '/auth/refresh',
      '/auth/logout',
    ]),
  ],
]);

function normalizePath(path: string): string {
  return path
    .split('?')[0]
    .replace(/^\/api\/v\d+(?=\/)/, '')
    .replace(/\/+$/, '');
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const activated = super.canActivate(context);

    if (activated instanceof Promise) {
      return activated.then((allowed) => {
        this.enforceEmailOnboarding(context);
        return allowed;
      });
    }

    if (activated instanceof Observable) {
      return new Observable<boolean>((subscriber) => {
        const subscription = activated.subscribe({
          next: (allowed) => {
            this.enforceEmailOnboarding(context);
            subscriber.next(allowed);
          },
          error: (error) => subscriber.error(error),
          complete: () => subscriber.complete(),
        });
        return () => subscription.unsubscribe();
      });
    }

    this.enforceEmailOnboarding(context);
    return activated;
  }

  private enforceEmailOnboarding(context: ExecutionContext): void {
    const request = context.switchToHttp().getRequest<{
      method?: string;
      path?: string;
      originalUrl?: string;
      route?: { path?: string };
      user?: User;
    }>();
    const user = request.user;

    if (!user || user.email) {
      return;
    }

    const method = request.method ?? 'GET';
    const allowedPaths = EMAIL_ONBOARDING_ALLOWED_PATHS.get(method);
    const routePath = normalizePath(request.route?.path ?? '');
    const requestPath = normalizePath(request.path ?? request.originalUrl ?? '');
    if (allowedPaths?.has(routePath) || allowedPaths?.has(requestPath)) {
      return;
    }

    throw new ForbiddenException({
      code: 'EMAIL_ONBOARDING_REQUIRED',
      message: 'Email onboarding is required before this operation.',
    });
  }
}
