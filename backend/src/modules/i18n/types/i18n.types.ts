export enum SupportedLanguage {
  ENGLISH = 'en',
  SPANISH = 'es',
  FRENCH = 'fr',
  GERMAN = 'de',
  ITALIAN = 'it',
  PORTUGUESE = 'pt',
  RUSSIAN = 'ru',
  CHINESE_SIMPLIFIED = 'zh-CN',
  CHINESE_TRADITIONAL = 'zh-TW',
  JAPANESE = 'ja',
  KOREAN = 'ko',
  ARABIC = 'ar',
  HEBREW = 'he',
  HINDI = 'hi',
  TURKISH = 'tr',
}

export enum SupportedRegion {
  US = 'US',
  UK = 'GB',
  EU = 'EU',
  CANADA = 'CA',
  AUSTRALIA = 'AU',
  BRAZIL = 'BR',
  MEXICO = 'MX',
  RUSSIA = 'RU',
  CHINA = 'CN',
  JAPAN = 'JP',
  KOREA = 'KR',
  INDIA = 'IN',
  MIDDLE_EAST = 'AE',
}

export enum TextDirection {
  LTR = 'ltr',
  RTL = 'rtl',
}

export enum CurrencyFormat {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  JPY = 'JPY',
  CNY = 'CNY',
  INR = 'INR',
  BRL = 'BRL',
  RUB = 'RUB',
  AED = 'AED',
  CAD = 'CAD',
  AUD = 'AUD',
}

export interface LocaleConfig {
  language: SupportedLanguage;
  region: SupportedRegion;
  timezone: string;
  currency: CurrencyFormat;
  dateFormat: string;
  timeFormat: string;
  numberFormat: {
    decimal: string;
    thousands: string;
    precision: number;
  };
  rtl: boolean;
}

export interface TranslationKey {
  key: string;
  namespace?: string;
  defaultValue?: string;
  interpolation?: Record<string, any>;
}

export interface Translation {
  key: string;
  value: string;
  language: SupportedLanguage;
  namespace: string;
  metadata?: {
    context?: string;
    description?: string;
    lastUpdated?: number;
    translator?: string;
  };
}

export interface TranslationFile {
  language: SupportedLanguage;
  namespace: string;
  translations: Record<string, string>;
  metadata?: {
    version: string;
    lastUpdated: number;
    completeness: number;
  };
}

export interface LocalizedContent {
  contentId: string;
  contentType: 'text' | 'html' | 'markdown' | 'json';
  translations: Map<SupportedLanguage, string>;
  defaultLanguage: SupportedLanguage;
  metadata?: {
    category?: string;
    tags?: string[];
    createdAt?: number;
    updatedAt?: number;
  };
}

export interface FormatOptions {
  type: 'currency' | 'date' | 'number' | 'relative-time' | 'list';
  locale: string;
  options?: Intl.NumberFormatOptions | Intl.DateTimeFormatOptions | any;
}

export interface I18nContext {
  language: SupportedLanguage;
  region: SupportedRegion;
  timezone: string;
  locale: string;
  direction: TextDirection;
  currency: CurrencyFormat;
}

export interface TranslationStats {
  language: SupportedLanguage;
  totalKeys: number;
  translatedKeys: number;
  missingKeys: number;
  completeness: number;
  lastUpdated: number;
}

export interface LocalizationPreference {
  userId: string;
  language: SupportedLanguage;
  region: SupportedRegion;
  timezone: string;
  currency?: CurrencyFormat;
  dateFormat?: string;
  timeFormat?: string;
  autoDetect: boolean;
}

export const DEFAULT_LOCALE_CONFIG: LocaleConfig = {
  language: SupportedLanguage.ENGLISH,
  region: SupportedRegion.US,
  timezone: 'UTC',
  currency: CurrencyFormat.USD,
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
  numberFormat: {
    decimal: '.',
    thousands: ',',
    precision: 2,
  },
  rtl: false,
};

export const RTL_LANGUAGES = [
  SupportedLanguage.ARABIC,
  SupportedLanguage.HEBREW,
];

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  [SupportedLanguage.ENGLISH]: 'English',
  [SupportedLanguage.SPANISH]: 'Español',
  [SupportedLanguage.FRENCH]: 'Français',
  [SupportedLanguage.GERMAN]: 'Deutsch',
  [SupportedLanguage.ITALIAN]: 'Italiano',
  [SupportedLanguage.PORTUGUESE]: 'Português',
  [SupportedLanguage.RUSSIAN]: 'Русский',
  [SupportedLanguage.CHINESE_SIMPLIFIED]: '简体中文',
  [SupportedLanguage.CHINESE_TRADITIONAL]: '繁體中文',
  [SupportedLanguage.JAPANESE]: '日本語',
  [SupportedLanguage.KOREAN]: '한국어',
  [SupportedLanguage.ARABIC]: 'العربية',
  [SupportedLanguage.HEBREW]: 'עברית',
  [SupportedLanguage.HINDI]: 'हिन्दी',
  [SupportedLanguage.TURKISH]: 'Türkçe',
};

export const LOCALE_TO_LANGUAGE_MAP: Record<string, SupportedLanguage> = {
  'en': SupportedLanguage.ENGLISH,
  'en-US': SupportedLanguage.ENGLISH,
  'en-GB': SupportedLanguage.ENGLISH,
  'es': SupportedLanguage.SPANISH,
  'es-ES': SupportedLanguage.SPANISH,
  'es-MX': SupportedLanguage.SPANISH,
  'fr': SupportedLanguage.FRENCH,
  'fr-FR': SupportedLanguage.FRENCH,
  'de': SupportedLanguage.GERMAN,
  'de-DE': SupportedLanguage.GERMAN,
  'it': SupportedLanguage.ITALIAN,
  'it-IT': SupportedLanguage.ITALIAN,
  'pt': SupportedLanguage.PORTUGUESE,
  'pt-BR': SupportedLanguage.PORTUGUESE,
  'pt-PT': SupportedLanguage.PORTUGUESE,
  'ru': SupportedLanguage.RUSSIAN,
  'ru-RU': SupportedLanguage.RUSSIAN,
  'zh': SupportedLanguage.CHINESE_SIMPLIFIED,
  'zh-CN': SupportedLanguage.CHINESE_SIMPLIFIED,
  'zh-TW': SupportedLanguage.CHINESE_TRADITIONAL,
  'ja': SupportedLanguage.JAPANESE,
  'ja-JP': SupportedLanguage.JAPANESE,
  'ko': SupportedLanguage.KOREAN,
  'ko-KR': SupportedLanguage.KOREAN,
  'ar': SupportedLanguage.ARABIC,
  'ar-SA': SupportedLanguage.ARABIC,
  'he': SupportedLanguage.HEBREW,
  'he-IL': SupportedLanguage.HEBREW,
  'hi': SupportedLanguage.HINDI,
  'hi-IN': SupportedLanguage.HINDI,
  'tr': SupportedLanguage.TURKISH,
  'tr-TR': SupportedLanguage.TURKISH,
};
