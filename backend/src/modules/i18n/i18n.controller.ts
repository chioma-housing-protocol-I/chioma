import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { I18nService } from './i18n.service';
import { LocalizedContentService } from './localized-content.service';
import { I18nResponseInterceptor } from './interceptors/i18n-response.interceptor';

@ApiTags('I18n')
@Controller('i18n')
@UseInterceptors(I18nResponseInterceptor)
export class I18nController {
  constructor(
    private readonly i18nService: I18nService,
    private readonly localizedContentService: LocalizedContentService,
  ) {}

  @Get('languages')
  @ApiOperation({ summary: 'List supported languages and coverage' })
  getLanguages() {
    const languages = this.i18nService.getSupportedLanguages();
    return {
      languages,
      coverage: Object.fromEntries(
        languages.map((language) => [
          language,
          this.i18nService.translationCoverage(language),
        ]),
      ),
    };
  }

  @Get('translate')
  @ApiOperation({ summary: 'Translate a key for a given language' })
  translate(@Query('key') key: string, @Query('lang') lang?: string) {
    return {
      key,
      lang: this.i18nService.resolveLanguage(lang),
      value: this.i18nService.t(key, lang),
    };
  }

  @Get('format-demo')
  @ApiOperation({ summary: 'Show currency/date/number localization sample' })
  formatDemo(
    @Query('lang') lang?: string,
    @Query('currency') currency = 'USD',
  ) {
    const amount = 15432.78;
    const now = new Date();

    return {
      language: this.i18nService.resolveLanguage(lang),
      rtl: this.localizedContentService.isRtl(lang),
      currency: this.localizedContentService.formatCurrency(
        amount,
        currency,
        lang,
      ),
      date: this.localizedContentService.formatDate(now, lang),
      number: this.localizedContentService.formatNumber(amount, lang),
      message: 'i18n:common.ok',
    };
  }
}
