import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { I18nRequest } from '../middleware/localization.middleware';
import { InternationalizationService } from '../services/internationalization.service';
import { LocalizationService } from '../services/localization.service';
import { SupportedLanguage } from '../types/i18n.types';

@Injectable()
export class I18nResponseInterceptor implements NestInterceptor {
  constructor(
    private i18nService: InternationalizationService,
    private localizationService: LocalizationService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<I18nRequest>();
    const language = request.i18n?.language || SupportedLanguage.ENGLISH;

    return next.handle().pipe(
      map((data) => {
        // Only process if data exists and has translatable content
        if (!data || typeof data !== 'object') {
          return data;
        }

        return this.processResponse(data, language);
      }),
    );
  }

  private processResponse(data: any, language: SupportedLanguage): any {
    if (Array.isArray(data)) {
      return data.map((item) => this.processResponse(item, language));
    }

    if (data && typeof data === 'object') {
      const processed: any = { ...data };

      // Process common translatable fields
      if (data.message && typeof data.message === 'string') {
        processed.message = this.translateIfNeeded(data.message, language);
      }

      if (data.error && typeof data.error === 'string') {
        processed.error = this.translateIfNeeded(data.error, language);
      }

      if (data.description && typeof data.description === 'string') {
        processed.description = this.translateIfNeeded(data.description, language);
      }

      // Process nested objects
      Object.keys(processed).forEach((key) => {
        if (typeof processed[key] === 'object' && processed[key] !== null) {
          processed[key] = this.processResponse(processed[key], language);
        }
      });

      return processed;
    }

    return data;
  }

  private translateIfNeeded(text: string, language: SupportedLanguage): string {
    // Check if text looks like a translation key (e.g., 'errors.notFound')
    if (text.includes('.') && !text.includes(' ')) {
      return this.i18nService.translate(text, language);
    }

    return text;
  }
}
