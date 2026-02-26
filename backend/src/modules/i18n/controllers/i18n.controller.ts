import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InternationalizationService } from '../services/internationalization.service';
import { LocalizationService } from '../services/localization.service';
import { LocalizedContentService } from '../services/localized-content.service';
import { I18n, Language } from '../decorators/i18n.decorator';
import {
  SupportedLanguage,
  Translation,
  TranslationFile,
  LocalizedContent,
  I18nContext,
  CurrencyFormat,
} from '../types/i18n.types';

@ApiTags('Internationalization')
@Controller('i18n')
@ApiBearerAuth()
export class I18nController {
  constructor(
    private i18nService: InternationalizationService,
    private localizationService: LocalizationService,
    private contentService: LocalizedContentService,
  ) {}

  @Get('languages')
  @ApiOperation({ summary: 'Get all supported languages' })
  getSupportedLanguages() {
    return {
      languages: this.i18nService.getSupportedLanguages(),
      count: this.i18nService.getSupportedLanguages().length,
    };
  }

  @Get('context')
  @ApiOperation({ summary: 'Get current i18n context' })
  getI18nContext(@I18n() context: I18nContext) {
    return context;
  }

  @Get('translate/:key')
  @ApiOperation({ summary: 'Translate a key' })
  translate(
    @Param('key') key: string,
    @Language() language: SupportedLanguage,
    @Query('namespace') namespace: string = 'common',
    @Query('interpolation') interpolation?: string,
  ) {
    const interpolationObj = interpolation ? JSON.parse(interpolation) : undefined;
    return {
      key,
      language,
      translation: this.i18nService.translate(
        key,
        language,
        namespace,
        interpolationObj,
      ),
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get translation statistics for all languages' })
  async getTranslationStats() {
    return this.i18nService.getAllTranslationStats();
  }

  @Get('stats/:language')
  @ApiOperation({ summary: 'Get translation statistics for specific language' })
  async getLanguageStats(@Param('language') language: SupportedLanguage) {
    return this.i18nService.getTranslationStats(language);
  }

  @Get('missing/:language')
  @ApiOperation({ summary: 'Get missing translations for a language' })
  async getMissingTranslations(
    @Param('language') language: SupportedLanguage,
    @Query('namespace') namespace: string = 'common',
  ) {
    return {
      language,
      namespace,
      missing: await this.i18nService.getMissingTranslations(language, namespace),
    };
  }

  @Post('translation')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new translation' })
  async addTranslation(@Body() translation: Translation) {
    await this.i18nService.addTranslation(translation);
    return {
      message: 'Translation added successfully',
      translation,
    };
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Import translation file' })
  async importTranslations(@Body() file: TranslationFile) {
    await this.i18nService.importTranslations(file);
    return {
      message: 'Translations imported successfully',
      language: file.language,
      namespace: file.namespace,
      count: Object.keys(file.translations).length,
    };
  }

  @Get('export/:language')
  @ApiOperation({ summary: 'Export translations for a language' })
  async exportTranslations(
    @Param('language') language: SupportedLanguage,
    @Query('namespace') namespace: string = 'common',
  ) {
    return this.i18nService.exportTranslations(language, namespace);
  }

  @Get('format/currency')
  @ApiOperation({ summary: 'Format currency' })
  formatCurrency(
    @Query('amount') amount: number,
    @Query('currency') currency: CurrencyFormat,
    @Language() language: SupportedLanguage,
  ) {
    return {
      amount,
      currency,
      formatted: this.localizationService.formatCurrency(amount, currency, language),
    };
  }

  @Get('format/date')
  @ApiOperation({ summary: 'Format date' })
  formatDate(
    @Query('timestamp') timestamp: number,
    @Language() language: SupportedLanguage,
  ) {
    return {
      timestamp,
      formatted: this.localizationService.formatDate(timestamp, language),
      relative: this.localizationService.formatRelativeTime(timestamp, language),
    };
  }

  @Get('format/number')
  @ApiOperation({ summary: 'Format number' })
  formatNumber(
    @Query('value') value: number,
    @Language() language: SupportedLanguage,
  ) {
    return {
      value,
      formatted: this.localizationService.formatNumber(value, language),
    };
  }

  @Get('locale-config')
  @ApiOperation({ summary: 'Get locale configuration' })
  getLocaleConfig(@Language() language: SupportedLanguage) {
    return this.localizationService.getLocaleConfig(language);
  }

  @Post('content')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create localized content' })
  async createContent(@Body() content: LocalizedContent) {
    await this.contentService.createContent(content);
    return {
      message: 'Content created successfully',
      contentId: content.contentId,
    };
  }

  @Get('content/:contentId')
  @ApiOperation({ summary: 'Get localized content' })
  async getContent(
    @Param('contentId') contentId: string,
    @Language() language: SupportedLanguage,
  ) {
    const content = await this.contentService.getContent(contentId, language);
    return {
      contentId,
      language,
      content,
    };
  }

  @Put('content/:contentId/:language')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update localized content' })
  async updateContent(
    @Param('contentId') contentId: string,
    @Param('language') language: SupportedLanguage,
    @Body('text') text: string,
  ) {
    await this.contentService.updateContent(contentId, language, text);
    return {
      message: 'Content updated successfully',
      contentId,
      language,
    };
  }

  @Delete('content/:contentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete localized content' })
  async deleteContent(@Param('contentId') contentId: string) {
    await this.contentService.deleteContent(contentId);
  }

  @Get('content/:contentId/languages')
  @ApiOperation({ summary: 'Get available languages for content' })
  async getAvailableLanguages(@Param('contentId') contentId: string) {
    return {
      contentId,
      languages: await this.contentService.getAvailableLanguages(contentId),
    };
  }

  @Get('content/:contentId/missing')
  @ApiOperation({ summary: 'Get missing translations for content' })
  async getMissingContentTranslations(@Param('contentId') contentId: string) {
    return {
      contentId,
      missing: await this.contentService.getMissingTranslations(contentId),
    };
  }

  @Get('content/:contentId/validate')
  @ApiOperation({ summary: 'Validate localized content' })
  async validateContent(@Param('contentId') contentId: string) {
    return this.contentService.validateContent(contentId);
  }

  @Post('content/bulk-import')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk import localized content' })
  async bulkImportContent(@Body() contents: LocalizedContent[]) {
    return this.contentService.bulkImportContent(contents);
  }

  @Get('content/export')
  @ApiOperation({ summary: 'Export localized content' })
  async exportContent(@Query('contentIds') contentIds?: string) {
    const ids = contentIds ? contentIds.split(',') : undefined;
    return this.contentService.exportContent(ids);
  }

  @Delete('cache')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear translation cache' })
  async clearCache(
    @Query('language') language?: SupportedLanguage,
    @Query('namespace') namespace?: string,
  ) {
    await this.i18nService.clearCache(language, namespace);
  }

  @Get('namespaces')
  @ApiOperation({ summary: 'Get loaded namespaces' })
  getLoadedNamespaces() {
    return {
      namespaces: this.i18nService.getLoadedNamespaces(),
    };
  }
}
