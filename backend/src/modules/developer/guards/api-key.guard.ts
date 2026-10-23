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

/**
 * Extracts an API key from either the dedicated `x-api-key` header or
 * `Authorization: Bearer <key>` (#2056). Supporting both lets a
 * server-to-server client use whichever convention its HTTP client
 * library makes easiest, without requiring it to know this API's
 * specific header name.
 *
 * Safe to combine with JWT Bearer auth on a shared route: a JWT is
 * three dot-separated base64url segments, never DeveloperService's own
 * `chioma_sk_...`-prefixed format, so `validateKey` already rejects a
 * JWT passed in this way (see its `rawKey.startsWith(PREFIX)` check) —
 * this guard doesn't need its own extra check to avoid misreading one
 * credential type as the other.
 */
function extractApiKey(request: {
  headers: Record<string, string | string[] | undefined>;
}): string | undefined {
  const headerKey = request.headers[API_KEY_HEADER];
  if (typeof headerKey === 'string' && headerKey.trim()) {
    return headerKey.trim();
  }

  const authHeader = request.headers['authorization'];
  if (typeof authHeader === 'string') {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match) {
      return match[1].trim();
    }
  }

  return undefined;
}

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
    const apiKey = extractApiKey(request);
    if (!apiKey) return false;

    const key = await this.developerService.validateKey(apiKey);
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
