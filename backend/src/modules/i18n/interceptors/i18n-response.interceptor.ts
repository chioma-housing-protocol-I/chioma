import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { I18nService } from '../i18n.service';

@Injectable()
export class I18nResponseInterceptor implements NestInterceptor {
  constructor(private readonly i18nService: I18nService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ locale?: string }>();
    const locale = request.locale;

    return next
      .handle()
      .pipe(map((payload) => this.translatePayload(payload, locale)));
  }

  private translatePayload(payload: unknown, locale?: string): unknown {
    if (!payload) {
      return payload;
    }

    if (typeof payload === 'string') {
      return payload.startsWith('i18n:')
        ? this.i18nService.t(payload.replace('i18n:', ''), locale)
        : payload;
    }

    if (Array.isArray(payload)) {
      return payload.map((item) => this.translatePayload(item, locale));
    }

    if (typeof payload === 'object') {
      const record = payload as Record<string, unknown>;
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(record)) {
        result[key] = this.translatePayload(value, locale);
      }
      return result;
    }

    return payload;
  }
}
