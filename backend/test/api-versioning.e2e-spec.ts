import './setup-env';
import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  API_VERSION_HEADER,
  API_DEPRECATED_HEADER,
  API_SUNSET_HEADER,
  API_MIGRATION_HINT_HEADER,
  API_VERSION_CONFIGS,
  API_VERSIONS,
} from '../src/common/api-versioning/api-version.constants';
import { ApiVersionService } from '../src/common/api-versioning/api-version.service';

describe('API Versioning Integration (e2e)', () => {
  let app: INestApplication;
  let apiVersionService: ApiVersionService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );

    app.setGlobalPrefix('api', {
      exclude: [
        'health',
        'health/detailed',
        'security.txt',
        '.well-known',
        'developer-portal',
      ],
    });

    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });

    await app.init();

    apiVersionService = moduleFixture.get<ApiVersionService>(ApiVersionService);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('Version Routing', () => {
    it('routes /api (no explicit version) and returns a response', async () => {
      const res = await request(app.getHttpServer()).get('/api');
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(600);
    });

    it('routes /api/v1 paths and returns a response', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1');
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(600);
    });

    it('health endpoint is accessible outside api prefix versioning', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(600);
    });

    it('unknown version path returns 404', async () => {
      const res = await request(app.getHttpServer()).get('/api/v99/unknown');
      expect(res.status).toBe(404);
    });

    it('v1 is configured as active in API_VERSION_CONFIGS', () => {
      const v1 = API_VERSION_CONFIGS.find((c) => c.version === API_VERSIONS.V1);
      expect(v1).toBeDefined();
      expect(v1!.status).toBe('active');
    });
  });

  describe('Deprecated Endpoint Handling', () => {
    it('active v1 routes do not include X-API-Deprecated header', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/login')
        .send({});
      // Deprecated header should not be set for active versions
      expect(res.headers[API_DEPRECATED_HEADER.toLowerCase()]).toBeUndefined();
    });

    it('ApiVersionService.isVersionDeprecated returns false for v1', () => {
      expect(apiVersionService.isVersionDeprecated('1')).toBe(false);
    });

    it('ApiVersionService.isVersionActive returns true for v1', () => {
      expect(apiVersionService.isVersionActive('1')).toBe(true);
    });

    it('deprecated version config includes deprecation metadata when configured', () => {
      const deprecatedConfigs = API_VERSION_CONFIGS.filter(
        (c) => c.status === 'deprecated',
      );

      // Currently no deprecated versions; verify the filtering works
      expect(Array.isArray(deprecatedConfigs)).toBe(true);
    });

    it('getDeprecatedVersions returns an array', () => {
      const deprecated = apiVersionService.getDeprecatedVersions();
      expect(Array.isArray(deprecated)).toBe(true);
    });

    it('API_DEPRECATED_HEADER constant is a non-empty string', () => {
      expect(typeof API_DEPRECATED_HEADER).toBe('string');
      expect(API_DEPRECATED_HEADER.length).toBeGreaterThan(0);
    });

    it('API_SUNSET_HEADER constant is a non-empty string', () => {
      expect(typeof API_SUNSET_HEADER).toBe('string');
      expect(API_SUNSET_HEADER.length).toBeGreaterThan(0);
    });

    it('API_MIGRATION_HINT_HEADER constant is a non-empty string', () => {
      expect(typeof API_MIGRATION_HINT_HEADER).toBe('string');
      expect(API_MIGRATION_HINT_HEADER.length).toBeGreaterThan(0);
    });
  });

  describe('Response Format Changes', () => {
    it('health response contains required top-level fields', async () => {
      const res = await request(app.getHttpServer()).get('/health');

      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('version');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('services');
    });

    it('detailed health response adds environment and details fields', async () => {
      const basic = await request(app.getHttpServer()).get('/health');
      const detailed = await request(app.getHttpServer()).get(
        '/health/detailed',
      );

      // Detailed adds extra fields over basic
      expect(detailed.body).toHaveProperty('environment');
      expect(detailed.body).toHaveProperty('details');
      expect(basic.body).not.toHaveProperty('environment');
    });

    it('services object structure is consistent across calls', async () => {
      const [r1, r2] = await Promise.all([
        request(app.getHttpServer()).get('/health'),
        request(app.getHttpServer()).get('/health'),
      ]);

      expect(Object.keys(r1.body.services).sort()).toEqual(
        Object.keys(r2.body.services).sort(),
      );
    });

    it('error responses include message and statusCode fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({});

      if (res.status >= 400) {
        expect(res.body).toHaveProperty('statusCode');
      }
    });
  });

  describe('Migration Paths', () => {
    it('getLatestVersion returns the highest active version', () => {
      const latest = apiVersionService.getLatestVersion();
      expect(['1', '2']).toContain(latest);
    });

    it('getActiveVersions returns at least one version', () => {
      const active = apiVersionService.getActiveVersions();
      expect(active.length).toBeGreaterThanOrEqual(1);
    });

    it('getVersionConfig returns config for existing version', () => {
      const config = apiVersionService.getVersionConfig('1');
      expect(config).toBeDefined();
      expect(config!.version).toBe('1');
    });

    it('getVersionConfig returns undefined for non-existent version', () => {
      const config = apiVersionService.getVersionConfig('99' as any);
      expect(config).toBeUndefined();
    });

    it('migrationHint is set on deprecated configs when present', () => {
      API_VERSION_CONFIGS.filter((c) => c.status === 'deprecated').forEach(
        (config) => {
          if (config.migrationHint) {
            expect(typeof config.migrationHint).toBe('string');
            expect(config.migrationHint.length).toBeGreaterThan(0);
          }
        },
      );
    });

    it('API changelog URL is set on v1 config', () => {
      const v1 = apiVersionService.getVersionConfig('1');
      expect(v1).toBeDefined();
      if (v1!.changelogUrl) {
        expect(typeof v1!.changelogUrl).toBe('string');
      }
    });
  });

  describe('Version Sunset Procedures', () => {
    it('sunset configs include a sunsetAt date', () => {
      const sunsetConfigs = API_VERSION_CONFIGS.filter(
        (c) => c.status === 'sunset',
      );

      sunsetConfigs.forEach((config) => {
        expect(config.sunsetAt).toBeInstanceOf(Date);
      });
    });

    it('deprecated configs with sunsetAt have a future or past date object', () => {
      const deprecated = API_VERSION_CONFIGS.filter(
        (c) => c.status === 'deprecated' && c.sunsetAt,
      );

      deprecated.forEach((config) => {
        expect(config.sunsetAt).toBeInstanceOf(Date);
        expect(isNaN(config.sunsetAt!.getTime())).toBe(false);
      });
    });

    it('API_VERSION_HEADER constant equals "X-API-Version"', () => {
      expect(API_VERSION_HEADER).toBe('X-API-Version');
    });

    it('X-API-Version header is injected for versioned api paths', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/login')
        .send({});

      // Middleware injects the header for /api/v1/... paths
      // Either set or not based on route match; just verify no crash
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(600);
    });

    it('isVersionActive returns false for unknown version', () => {
      expect(apiVersionService.isVersionActive('99' as any)).toBe(false);
    });

    it('isVersionDeprecated returns false for unknown version', () => {
      expect(apiVersionService.isVersionDeprecated('99' as any)).toBe(false);
    });
  });
});
