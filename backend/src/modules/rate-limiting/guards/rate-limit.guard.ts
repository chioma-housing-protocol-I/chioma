import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
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
    const skip = this.reflector.getAllAndOverride<boolean>(RATE_LIMIT_SKIP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skip) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const startTime = Date.now();

    try {
      const category = this.reflector.getAllAndOverride<EndpointCategory>(
        RATE_LIMIT_CATEGORY_KEY,
        [context.getHandler(), context.getClass()],
      ) || EndpointCategory.PUBLIC;

      const points = this.reflector.getAllAndOverride<number>(
        RATE_LIMIT_POINTS_KEY,
        [context.getHandler(), context.getClass()],
      ) || 1;

      const identifier = this.getIdentifier(request);
      const ipAddress = this.getClientIp(request);
      const tier = this.getUserTier(request);

      const isWhitelisted = await this.rateLimitService.isWhitelisted(identifier);
      if (isWhitelisted) {
        return true;
      }

      const isAbuseBlocked = await this.abuseDetectionService.isBlocked(identifier);
      if (isAbuseBlocked) {
        await this.analyticsService.recordRequest(identifier, true, Date.now() - startTime);
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
        await this.analyticsService.recordRequest(identifier, true, Date.now() - startTime);
        
        const retryAfter = abuseResult.blockUntil 
          ? Math.ceil((abuseResult.blockUntil.getTime() - Date.now()) / 1000)
          : 3600;

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many requests - abuse detected',
            retryAfter,
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

      this.setRateLimitHeaders(request, result, category);

      if (!result.success) {
        await this.analyticsService.recordRequest(identifier, true, Date.now() - startTime);
        
        const retryAfter = Math.ceil(result.msBeforeNext / 1000);
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many requests',
            retryAfter,
            remainingPoints: result.remainingPoints,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      await this.analyticsService.recordRequest(identifier, false, Date.now() - startTime);
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
    if (request.user?.id) {
      return `user:${request.user.id}`;
    }
    return `ip:${this.getClientIp(request)}`;
  }

  private getClientIp(request: Request): string {
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
        return UserTier.ENTERPRISE;
      case UserRole.LANDLORD:
        return UserTier.PREMIUM;
      case UserRole.TENANT:
        return UserTier.BASIC;
      default:
        return UserTier.FREE;
    }
  }

  private setRateLimitHeaders(request: any, result: any, category: EndpointCategory): void {
    request.rateLimitInfo = {
      limit: result.remainingPoints + (result.success ? 1 : 0),
      remaining: result.remainingPoints,
      reset: new Date(Date.now() + result.msBeforeNext),
      category,
    };
  }
}
