import { I18nService } from '../src/modules/i18n/i18n.service';

function run(): void {
  const i18n = new I18nService();
  const languages = i18n.getSupportedLanguages();

  console.log('I18n Language Coverage Report');
  console.log('============================');

  for (const language of languages) {
    const coverage = i18n.translationCoverage(language);
    console.log(
      `${language}: ${coverage.percent}% (${coverage.translated}/${coverage.total})`,
    );
  }

  console.log('');
  console.log('Sample translation checks');
  console.log(`en common.ok: ${i18n.t('common.ok', 'en')}`);
  console.log(`fr common.ok: ${i18n.t('common.ok', 'fr')}`);
  console.log(`es auth.loginSuccess: ${i18n.t('auth.loginSuccess', 'es')}`);
  console.log(`ar security.accountLocked: ${i18n.t('security.accountLocked', 'ar')}`);
}

run();
