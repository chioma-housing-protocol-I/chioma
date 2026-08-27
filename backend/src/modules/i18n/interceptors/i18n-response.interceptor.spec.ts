import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { I18nService } from '../i18n.service';
import { I18nResponseInterceptor } from './i18n-response.interceptor';

describe('I18nResponseInterceptor', () => {
  let interceptor: I18nResponseInterceptor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [I18nResponseInterceptor, I18nService],
    }).compile();

    interceptor = module.get<I18nResponseInterceptor>(I18nResponseInterceptor);
  });

  function buildContext(locale?: string): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ locale }),
      }),
    } as unknown as ExecutionContext;
  }

  function buildHandler(payload: unknown): CallHandler {
    return { handle: () => of(payload) };
  }

  it('translates a top-level "i18n:" prefixed string payload', (done) => {
    interceptor
      .intercept(buildContext('fr'), buildHandler('i18n:common.ok'))
      .subscribe((result) => {
        expect(result).toBe("D'accord");
        done();
      });
  });

  it('leaves a plain string payload untouched', (done) => {
    interceptor
      .intercept(buildContext('fr'), buildHandler('just a string'))
      .subscribe((result) => {
        expect(result).toBe('just a string');
        done();
      });
  });

  it('recursively translates i18n keys nested inside an object', (done) => {
    const payload = {
      message: 'i18n:common.ok',
      nested: { deep: 'i18n:auth.loginSuccess' },
      untouched: 'plain value',
    };

    interceptor
      .intercept(buildContext('es'), buildHandler(payload))
      .subscribe((result) => {
        expect(result).toEqual({
          message: 'Creado correctamente',
          nested: { deep: 'Inicio de sesion exitoso' },
          untouched: 'plain value',
        });
        done();
      });
  });

  it('recursively translates i18n keys inside arrays', (done) => {
    const payload = ['i18n:common.ok', 'i18n:auth.loginSuccess', 'plain'];

    interceptor
      .intercept(buildContext('en'), buildHandler(payload))
      .subscribe((result) => {
        expect(result).toEqual(['OK', 'Login successful', 'plain']);
        done();
      });
  });

  it('passes through null and undefined payloads unchanged', (done) => {
    interceptor
      .intercept(buildContext('en'), buildHandler(null))
      .subscribe((result) => {
        expect(result).toBeNull();
        done();
      });
  });

  it('passes through numeric and boolean payloads unchanged', (done) => {
    interceptor
      .intercept(buildContext('en'), buildHandler(42))
      .subscribe((result) => {
        expect(result).toBe(42);
        done();
      });
  });

  it('defaults to English when the request has no resolved locale', (done) => {
    interceptor
      .intercept(buildContext(undefined), buildHandler('i18n:common.ok'))
      .subscribe((result) => {
        expect(result).toBe('OK');
        done();
      });
  });
});
