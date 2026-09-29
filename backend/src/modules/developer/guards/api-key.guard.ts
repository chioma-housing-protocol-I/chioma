import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DeveloperService } from '../developer.service';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator';
import { API_SCOPES_KEY } from '../decorators/api-scopes.decorator';

export const API_KEY_HEADER = 'x-api-key';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly developerService: DeveloperService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const apiKey =
      request.headers[API_KEY_HEADER] ?? request.headers['x-api-key'];
    if (!apiKey || typeof apiKey !== 'string') return false;

    const key = await this.developerService.validateKey(apiKey.trim());
    if (!key) {
      throw new UnauthorizedException({
        message: 'Invalid, expired, or revoked API key',
        code: 'API_KEY_INVALID',
      });
    }

    const requiredScopes =
      this.reflector.getAllAndOverride<string[] | undefined>(API_SCOPES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    if (requiredScopes.length > 0) {
      const granted = new Set(key.permissions ?? []);
      const missing = requiredScopes.filter((scope) => !granted.has(scope));
      if (missing.length > 0) {
        throw new ForbiddenException({
          message: `API key is missing required scope(s): ${missing.join(', ')}`,
          code: 'API_KEY_SCOPE_INSUFFICIENT',
        });
      }
    }

    request.user = { id: key.userId, apiKeyId: key.id };
    request.apiKeyScopes = key.permissions ?? [];
    return true;
  }
}
