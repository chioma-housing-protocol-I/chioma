import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { ApiKeyService } from './api-key.service';
import { ApiKey, ApiKeyScope } from './api-key.entity';

/**
 * Extended Request with API key and user
 */
interface ApiKeyRequest extends Request {
  apiKey?: ApiKey;
  user?: { id: string; [key: string]: unknown };
}

export const API_KEY_SCOPE_KEY = 'apiKeyScope';
export const RequireApiKeyScope = (scope: ApiKeyScope) =>
  SetMetadata(API_KEY_SCOPE_KEY, scope);

/**
 * Guard for API key authentication
 * Use on routes that should accept API key authentication
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private apiKeyService: ApiKeyService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ApiKeyRequest>();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException('API key required');
    }

    const validationResult = await this.apiKeyService.validateApiKey(apiKey);

    if (!validationResult.valid) {
      throw new UnauthorizedException(validationResult.error);
    }

    // Check required scope
    const requiredScope = this.reflector.get<ApiKeyScope>(
      API_KEY_SCOPE_KEY,
      context.getHandler(),
    );

    if (
      requiredScope &&
      !this.apiKeyService.hasScope(validationResult.apiKey!, requiredScope)
    ) {
      throw new ForbiddenException('Insufficient API key permissions');
    }

    // Record usage
    const forwarded = request.headers['x-forwarded-for'];
    const forwardedIp =
      typeof forwarded === 'string' ? forwarded.split(',')[0] : undefined;
    const ip = forwardedIp || request.socket?.remoteAddress || 'unknown';
    await this.apiKeyService.recordUsage(validationResult.apiKey!.id, ip);

    // Attach API key info to request
    request.apiKey = validationResult.apiKey;
    request.user = validationResult.apiKey!.user as {
      id: string;
      [key: string]: unknown;
    };

    return true;
  }

  private extractApiKey(request: ApiKeyRequest): string | null {
    // Check X-API-Key header
    const headerKey = request.headers['x-api-key'];
    if (typeof headerKey === 'string') {
      return headerKey;
    }

    // Check Authorization header with ApiKey scheme
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('ApiKey ')) {
      return authHeader.substring(7);
    }

    // Check query parameter (less secure, but sometimes needed)
    const queryKey = request.query?.api_key;
    if (typeof queryKey === 'string') {
      return queryKey;
    }

    return null;
  }
}

/**
 * Combined guard that accepts either JWT or API key authentication
 */
@Injectable()
export class JwtOrApiKeyGuard implements CanActivate {
  constructor(
    private apiKeyService: ApiKeyService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ApiKeyRequest>();

    // Check if already authenticated via JWT
    if (request.user) {
      return true;
    }

    // Try API key authentication
    const apiKey = this.extractApiKey(request);
    if (apiKey) {
      const validationResult = await this.apiKeyService.validateApiKey(apiKey);

      if (validationResult.valid) {
        const requiredScope = this.reflector.get<ApiKeyScope>(
          API_KEY_SCOPE_KEY,
          context.getHandler(),
        );

        if (
          requiredScope &&
          !this.apiKeyService.hasScope(validationResult.apiKey!, requiredScope)
        ) {
          throw new ForbiddenException('Insufficient API key permissions');
        }

        const forwarded = request.headers['x-forwarded-for'];
        const forwardedIp =
          typeof forwarded === 'string' ? forwarded.split(',')[0] : undefined;
        const ip = forwardedIp || request.socket?.remoteAddress || 'unknown';
        await this.apiKeyService.recordUsage(validationResult.apiKey!.id, ip);

        request.apiKey = validationResult.apiKey;
        request.user = validationResult.apiKey!.user as {
          id: string;
          [key: string]: unknown;
        };

        return true;
      }
    }

    throw new UnauthorizedException('Authentication required');
  }

  private extractApiKey(request: ApiKeyRequest): string | null {
    const headerKey = request.headers['x-api-key'];
    if (typeof headerKey === 'string') return headerKey;

    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('ApiKey ')) return authHeader.substring(7);

    return null;
  }
}
