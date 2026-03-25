import { Global, Module } from '@nestjs/common';
import { I18nService } from './i18n.service';
import { LocalizedContentService } from './localized-content.service';
import { I18nResponseInterceptor } from './interceptors/i18n-response.interceptor';
import { I18nController } from './i18n.controller';

@Global()
@Module({
  controllers: [I18nController],
  providers: [I18nService, LocalizedContentService, I18nResponseInterceptor],
  exports: [I18nService, LocalizedContentService, I18nResponseInterceptor],
})
export class I18nModule {}
