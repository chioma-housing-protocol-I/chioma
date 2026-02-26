import { Module } from '@nestjs/common';
import { InternationalizationService } from './services/internationalization.service';
import { LocalizationService } from './services/localization.service';
import { LocalizedContentService } from './services/localized-content.service';
import { I18nController } from './controllers/i18n.controller';
import { LocalizationMiddleware } from './middleware/localization.middleware';
import { I18nResponseInterceptor } from './interceptors/i18n-response.interceptor';

@Module({
  controllers: [I18nController],
  providers: [
    InternationalizationService,
    LocalizationService,
    LocalizedContentService,
    LocalizationMiddleware,
    I18nResponseInterceptor,
  ],
  exports: [
    InternationalizationService,
    LocalizationService,
    LocalizedContentService,
    LocalizationMiddleware,
    I18nResponseInterceptor,
  ],
})
export class I18nModule {}
