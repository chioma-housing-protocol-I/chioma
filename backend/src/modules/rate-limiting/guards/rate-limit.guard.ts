import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { RateLimitService } from '../services/rate-limit.service';
import { AbuseDetectionService } from '../services/abuse-detection.service';
import { RateLimitAnalyticsService } from '../services/rate-limit-analytics.service';
import { UserTier, EndpointCategory } from '../types/rate-limit.types';
import { UserRole } from '../../users/entities/user.entity';
import {
  RATE_LIMIT_CATEGORY_KEY,
  RATE_LIMIT_POINTS_KEY,
  RATE_LIMIT_SKIP_KEY,
} from '../decorators/rate-limit.decorator';

interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: RateLimitService,
    private readonly abuseDetectionService: AbuseDetectionService,
    private readonly analyticsService: RateLimitAnalyticsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(
      RATE_LIMIT_SKIP_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skip) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    try {
      const category =
        this.reflector.getAllAndOverride<EndpointCategory>(
          RATE_LIMIT_CATEGORY_KEY,
          [context.getHandler(), context.getClass()],
        ) || EndpointCategory.PUBLIC;

      const points =
        this.reflector.getAllAndOverride<number>(RATE_LIMIT_POINTS_KEY, [
          context.getHandler(),
          context.getClass(),
        ]) || 1;

      const identifier = this.getIdentifier(request);
      const ipAddress = this.getClientIp(request);
      const tier = this.getUserTier(request);

      const isWhitelisted =
        await this.rateLimitService.isWhitelisted(identifier);
      if (isWhitelisted) {
        return true;
      }

      const isAbuseBlocked =
        await this.abuseDetectionService.isBlocked(identifier);
      if (isAbuseBlocked) {
        await this.analyticsService.recordRequest(
          identifier,
          true,
          Date.now() - startTime,
        );
        throw new HttpException(
          'Access temporarily blocked due to suspicious activity',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      await this.abuseDetectionService.recordRequest(identifier, ipAddress);

      const abuseResult = await this.abuseDetectionService.detectAbuse(
        identifier,
        ipAddress,
        request.path,
      );

      if (abuseResult.isAbuser) {
        await this.analyticsService.recordAbuseDetection(identifier);
        await this.analyticsService.recordRequest(
          identifier,
          true,
          Date.now() - startTime,
        );

        const retryAfter = abuseResult.blockUntil
          ? Math.ceil((abuseResult.blockUntil.getTime() - Date.now()) / 1000)
          : 3600;

        // Set Retry-After header
        request.res?.setHeader('Retry-After', retryAfter);

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many requests - abuse detected',
            violations: abuseResult.violations,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      const result = await this.rateLimitService.consumePoints(
        identifier,
        tier,
        category,
        points,
      );

      this.setRateLimitHeaders(request, response, result, category);

      if (!result.success) {
        await this.analyticsService.recordRequest(
          identifier,
          true,
          Date.now() - startTime,
        );

        const retryAfter = Math.ceil(result.msBeforeNext / 1000);

        // Set Retry-After header
        request.res?.setHeader('Retry-After', retryAfter);

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many requests',
            remainingPoints: result.remainingPoints,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      await this.analyticsService.recordRequest(
        identifier,
        false,
        Date.now() - startTime,
      );
      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Rate limit guard error: ${error.message}`);
      return true;
    }
  }

  private getIdentifier(request: RequestWithUser): string {
    // Authenticated users are always identified by their user ID.
    // This prevents bypass via IP spoofing / X-Forwarded-For manipulation.
    if (request.user?.id) {
      return `user:${request.user.id}`;
    }
    // Unauthenticated: use the socket-level IP only (ignore forwarded headers
    // for rate-limit keying to prevent header injection attacks).
    return `ip:${request.socket?.remoteAddress ?? request.ip ?? 'unknown'}`;
  }

  private getClientIp(request: Request): string {
    // For logging/analytics only — not used as the rate-limit key.
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return request.ip || 'unknown';
  }

  private getUserTier(request: RequestWithUser): UserTier {
    if (!request.user) {
      return UserTier.FREE;
    }

    switch (request.user.role) {
      case UserRole.ADMIN:
      case UserRole.SUPER_ADMIN:
        return UserTier.ENTERPRISE;
      case UserRole.AGENT:
        return UserTier.PREMIUM;
      case UserRole.USER:
        return UserTier.BASIC;
      default:
        return UserTier.FREE;
    }
  }

  private setRateLimitHeaders(
    request: any,
    response: Response,
    result: any,
    category: EndpointCategory,
  ): void {
    const limit = result.remainingPoints + (result.success ? 1 : 0);
    const remaining = result.remainingPoints;
    const reset = new Date(Date.now() + result.msBeforeNext);

    // Set directly on the response here, while the guard is still
    // running: a guard executes before the response is sent, so
    // res.setHeader actually takes effect. The previous approach stashed
    // this on request.rateLimitInfo for RateLimitHeadersMiddleware to
    // apply later on the response's 'finish' event (#2072) — but 'finish'
    // fires only after the response has already been flushed to the
    // client, so setHeader there is always a no-op; the headers were
    // never actually sent on any request.
    response.setHeader('X-RateLimit-Limit', limit);
    response.setHeader('X-RateLimit-Remaining', remaining);
    response.setHeader('X-RateLimit-Reset', reset.toISOString());
    response.setHeader('X-RateLimit-Category', category);

    // Kept for any other consumer that still reads request.rateLimitInfo
    // directly (none currently in this codebase, but removing it outright
    // risks silently breaking something that inspects it in an
    // interceptor or test rather than reading the response headers).
    request.rateLimitInfo = { limit, remaining, reset, category };
  }
}
