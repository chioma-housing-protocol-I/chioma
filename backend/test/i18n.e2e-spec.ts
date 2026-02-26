import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { CacheModule } from '@nestjs/cache-manager';
import { I18nModule } from '../i18n.module';
import { SupportedLanguage, CurrencyFormat } from '../types/i18n.types';

describe('I18n E2E Tests', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        I18nModule,
        CacheModule.register({
          isGlobal: true,
          ttl: 3600000,
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/i18n/languages (GET)', () => {
    it('should return all supported languages', () => {
      return request(app.getHttpServer())
        .get('/i18n/languages')
        .expect(200)
        .expect((res) => {
          expect(res.body.languages).toBeDefined();
          expect(Array.isArray(res.body.languages)).toBe(true);
          expect(res.body.count).toBeGreaterThan(10);
          expect(res.body.languages).toContain(SupportedLanguage.ENGLISH);
          expect(res.body.languages).toContain(SupportedLanguage.SPANISH);
        });
    });
  });

  describe('/i18n/context (GET)', () => {
    it('should return default context without language header', () => {
      return request(app.getHttpServer())
        .get('/i18n/context')
        .expect(200)
        .expect((res) => {
          expect(res.body.language).toBe(SupportedLanguage.ENGLISH);
          expect(res.body.direction).toBe('ltr');
        });
    });

    it('should detect language from header', () => {
      return request(app.getHttpServer())
        .get('/i18n/context')
        .set('Accept-Language', 'es-ES')
        .expect(200)
        .expect((res) => {
          expect(res.body.language).toBe(SupportedLanguage.SPANISH);
        });
    });

    it('should detect RTL for Arabic', () => {
      return request(app.getHttpServer())
        .get('/i18n/context')
        .set('Accept-Language', 'ar')
        .expect(200)
        .expect((res) => {
          expect(res.body.language).toBe(SupportedLanguage.ARABIC);
          expect(res.body.direction).toBe('rtl');
        });
    });
  });

  describe('/i18n/translate/:key (GET)', () => {
    it('should translate a key', () => {
      return request(app.getHttpServer())
        .get('/i18n/translate/common.hello')
        .expect(200)
        .expect((res) => {
          expect(res.body.key).toBe('common.hello');
          expect(res.body.translation).toBeDefined();
        });
    });

    it('should translate with different language', () => {
      return request(app.getHttpServer())
        .get('/i18n/translate/common.hello')
        .set('Accept-Language', 'es')
        .expect(200)
        .expect((res) => {
          expect(res.body.language).toBe(SupportedLanguage.SPANISH);
        });
    });
  });

  describe('/i18n/stats (GET)', () => {
    it('should return translation statistics', () => {
      return request(app.getHttpServer())
        .get('/i18n/stats')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('/i18n/stats/:language (GET)', () => {
    it('should return statistics for specific language', () => {
      return request(app.getHttpServer())
        .get(`/i18n/stats/${SupportedLanguage.ENGLISH}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.language).toBe(SupportedLanguage.ENGLISH);
          expect(res.body.totalKeys).toBeDefined();
          expect(res.body.translatedKeys).toBeDefined();
          expect(res.body.completeness).toBeDefined();
        });
    });
  });

  describe('/i18n/translation (POST)', () => {
    it('should add a new translation', () => {
      const translation = {
        language: SupportedLanguage.ENGLISH,
        namespace: 'test',
        key: 'newKey',
        value: 'New Value',
      };

      return request(app.getHttpServer())
        .post('/i18n/translation')
        .send(translation)
        .expect(201)
        .expect((res) => {
          expect(res.body.message).toContain('successfully');
          expect(res.body.translation).toEqual(translation);
        });
    });
  });

  describe('/i18n/format/currency (GET)', () => {
    it('should format currency', () => {
      return request(app.getHttpServer())
        .get('/i18n/format/currency')
        .query({ amount: 1234.56, currency: CurrencyFormat.USD })
        .expect(200)
        .expect((res) => {
          expect(res.body.formatted).toContain('1,234.56');
        });
    });

    it('should format currency in different locale', () => {
      return request(app.getHttpServer())
        .get('/i18n/format/currency')
        .query({ amount: 1234.56, currency: CurrencyFormat.EUR })
        .set('Accept-Language', 'fr')
        .expect(200)
        .expect((res) => {
          expect(res.body.formatted).toBeDefined();
        });
    });
  });

  describe('/i18n/format/date (GET)', () => {
    it('should format date', () => {
      const timestamp = Date.now();
      return request(app.getHttpServer())
        .get('/i18n/format/date')
        .query({ timestamp })
        .expect(200)
        .expect((res) => {
          expect(res.body.formatted).toBeDefined();
          expect(res.body.relative).toBeDefined();
        });
    });
  });

  describe('/i18n/format/number (GET)', () => {
    it('should format number', () => {
      return request(app.getHttpServer())
        .get('/i18n/format/number')
        .query({ value: 1234567.89 })
        .expect(200)
        .expect((res) => {
          expect(res.body.formatted).toContain('1,234,567');
        });
    });
  });

  describe('/i18n/content (POST)', () => {
    it('should create localized content', () => {
      const content = {
        contentId: 'test-content-' + Date.now(),
        defaultLanguage: SupportedLanguage.ENGLISH,
        translations: {
          [SupportedLanguage.ENGLISH]: 'Test Content',
          [SupportedLanguage.SPANISH]: 'Contenido de Prueba',
        },
        metadata: {
          category: 'test',
          tags: ['e2e'],
        },
      };

      return request(app.getHttpServer())
        .post('/i18n/content')
        .send(content)
        .expect(201)
        .expect((res) => {
          expect(res.body.message).toContain('successfully');
          expect(res.body.contentId).toBe(content.contentId);
        });
    });
  });

  describe('/i18n/content/:contentId (GET)', () => {
    const contentId = 'e2e-test-content-' + Date.now();

    beforeEach(() => {
      const content = {
        contentId,
        defaultLanguage: SupportedLanguage.ENGLISH,
        translations: {
          [SupportedLanguage.ENGLISH]: 'English Content',
          [SupportedLanguage.SPANISH]: 'Contenido Español',
        },
      };

      return request(app.getHttpServer())
        .post('/i18n/content')
        .send(content)
        .expect(201);
    });

    it('should get localized content', () => {
      return request(app.getHttpServer())
        .get(`/i18n/content/${contentId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.contentId).toBe(contentId);
          expect(res.body.content).toBe('English Content');
        });
    });

    it('should get content in different language', () => {
      return request(app.getHttpServer())
        .get(`/i18n/content/${contentId}`)
        .set('Accept-Language', 'es')
        .expect(200)
        .expect((res) => {
          expect(res.body.content).toBe('Contenido Español');
        });
    });
  });

  describe('/i18n/content/:contentId/:language (PUT)', () => {
    const contentId = 'e2e-update-content-' + Date.now();

    beforeEach(() => {
      const content = {
        contentId,
        defaultLanguage: SupportedLanguage.ENGLISH,
        translations: {
          [SupportedLanguage.ENGLISH]: 'Original',
        },
      };

      return request(app.getHttpServer())
        .post('/i18n/content')
        .send(content)
        .expect(201);
    });

    it('should update content translation', () => {
      return request(app.getHttpServer())
        .put(`/i18n/content/${contentId}/${SupportedLanguage.ENGLISH}`)
        .send({ text: 'Updated Content' })
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toContain('successfully');
        });
    });
  });

  describe('/i18n/content/:contentId (DELETE)', () => {
    const contentId = 'e2e-delete-content-' + Date.now();

    beforeEach(() => {
      const content = {
        contentId,
        defaultLanguage: SupportedLanguage.ENGLISH,
        translations: {
          [SupportedLanguage.ENGLISH]: 'To Delete',
        },
      };

      return request(app.getHttpServer())
        .post('/i18n/content')
        .send(content)
        .expect(201);
    });

    it('should delete content', () => {
      return request(app.getHttpServer())
        .delete(`/i18n/content/${contentId}`)
        .expect(204);
    });
  });

  describe('/i18n/locale-config (GET)', () => {
    it('should return locale configuration', () => {
      return request(app.getHttpServer())
        .get('/i18n/locale-config')
        .expect(200)
        .expect((res) => {
          expect(res.body.language).toBe(SupportedLanguage.ENGLISH);
          expect(res.body.locale).toBeDefined();
          expect(res.body.direction).toBe('ltr');
          expect(res.body.currency).toBeDefined();
        });
    });

    it('should return RTL config for Arabic', () => {
      return request(app.getHttpServer())
        .get('/i18n/locale-config')
        .set('Accept-Language', 'ar')
        .expect(200)
        .expect((res) => {
          expect(res.body.direction).toBe('rtl');
        });
    });
  });

  describe('/i18n/namespaces (GET)', () => {
    it('should return loaded namespaces', () => {
      return request(app.getHttpServer())
        .get('/i18n/namespaces')
        .expect(200)
        .expect((res) => {
          expect(res.body.namespaces).toBeDefined();
          expect(Array.isArray(res.body.namespaces)).toBe(true);
        });
    });
  });

  describe('Language Detection Priority', () => {
    it('should prioritize query parameter', () => {
      return request(app.getHttpServer())
        .get('/i18n/context?lang=fr')
        .set('Accept-Language', 'es')
        .expect(200)
        .expect((res) => {
          expect(res.body.language).toBe(SupportedLanguage.FRENCH);
        });
    });

    it('should use Accept-Language as fallback', () => {
      return request(app.getHttpServer())
        .get('/i18n/context')
        .set('Accept-Language', 'de')
        .expect(200)
        .expect((res) => {
          expect(res.body.language).toBe(SupportedLanguage.GERMAN);
        });
    });
  });
});
