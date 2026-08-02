import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import {
  DEPRECATION_METADATA_KEY,
  DeprecationOptions,
} from '../decorators/deprecated.decorator';

/**
 * Adds standard deprecation signaling to responses from routes annotated
 * with @Deprecated(), per the header contract defined in
 * `backend/docs/api/API-VERSIONING.md` section 5: `Deprecated`, `Sunset`
 * (HTTP-date), and a `Link` header pointing clients at the replacement
 * endpoint and/or migration docs.
 */
@Injectable()
export class DeprecationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(DeprecationInterceptor.name);

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options = this.reflector.getAllAndOverride<
      DeprecationOptions | undefined
    >(DEPRECATION_METADATA_KEY, [context.getHandler(), context.getClass()]);

    if (!options) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    this.applyHeaders(response, options);

    this.logger.warn(
      `Deprecated endpoint called: ${request.method} ${request.path}`,
      {
        sunsetDate: options.sunsetDate,
        migrationGuideUrl: options.migrationGuideUrl,
        replacementEndpoint: options.replacementEndpoint,
        message: options.message,
      },
    );

    return next.handle();
  }

  private applyHeaders(response: Response, options: DeprecationOptions): void {
    response.setHeader('Deprecated', 'true');

    if (options.sunsetDate) {
      const sunset = new Date(options.sunsetDate);
      if (!Number.isNaN(sunset.getTime())) {
        response.setHeader('Sunset', sunset.toUTCString());
      }
    }

    const links: string[] = [];
    if (options.replacementEndpoint) {
      links.push(`<${options.replacementEndpoint}>; rel="successor-version"`);
    }
    if (options.migrationGuideUrl) {
      links.push(`<${options.migrationGuideUrl}>; rel="deprecation"`);
    }
    if (links.length > 0) {
      response.setHeader('Link', links.join(', '));
    }
  }
}
