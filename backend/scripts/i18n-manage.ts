import { Logger } from '@nestjs/common';
import { I18nService } from '../src/modules/i18n/i18n.service';

const CONTEXT = 'I18nManage';

function run(): void {
  const i18n = new I18nService();
  const languages = i18n.getSupportedLanguages();

  Logger.log('Starting I18n language coverage audit', CONTEXT);

  for (const language of languages) {
    const coverage = i18n.translationCoverage(language);
    Logger.log(
      `Coverage for ${language}: ${coverage.percent}% (${coverage.translated}/${coverage.total} keys)`,
      CONTEXT,
    );
  }

  Logger.log(
    `Sample translation checks: en=${i18n.t('common.ok', 'en')}, fr=${i18n.t('common.ok', 'fr')}, es=${i18n.t('auth.loginSuccess', 'es')}, ar=${i18n.t('security.accountLocked', 'ar')}`,
    CONTEXT,
  );
  Logger.log('I18n language coverage audit completed', CONTEXT);
}

run();
