import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DeveloperService } from '../developer.service';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator';

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
    if (key) {
      request.user = { id: key.userId, apiKeyId: key.id };
      return true;
    }
    return false;
  }
}
