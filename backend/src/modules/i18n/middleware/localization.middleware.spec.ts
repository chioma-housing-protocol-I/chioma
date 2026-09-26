import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { I18nService } from '../i18n.service';
import {
  LocalizationMiddleware,
  LocalizedRequest,
} from './localization.middleware';

describe('LocalizationMiddleware', () => {
  let middleware: LocalizationMiddleware;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LocalizationMiddleware, I18nService],
    }).compile();

    middleware = module.get<LocalizationMiddleware>(LocalizationMiddleware);
  });

  function buildRequest(headers: Record<string, string | undefined>) {
    return {
      header: (name: string) => headers[name.toLowerCase()],
    } as unknown as LocalizedRequest;
  }

  it('resolves the locale from the accept-language header', () => {
    const req = buildRequest({ 'accept-language': 'fr-CA' });
    const next = jest.fn();

    middleware.use(req, {} as Response, next);

    expect(req.locale).toBe('fr');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('falls back to the x-language header when accept-language is absent', () => {
    const req = buildRequest({ 'x-language': 'es' });
    const next = jest.fn();

    middleware.use(req, {} as Response, next);

    expect(req.locale).toBe('es');
  });

  it('prefers accept-language over x-language when both are present', () => {
    const req = buildRequest({
      'accept-language': 'ar',
      'x-language': 'es',
    });
    const next = jest.fn();

    middleware.use(req, {} as Response, next);

    expect(req.locale).toBe('ar');
  });

  it('resolves to the default language when no locale header is present', () => {
    const req = buildRequest({});
    const next = jest.fn();

    middleware.use(req, {} as Response, next);

    expect(req.locale).toBe('en');
  });

  it('resolves to the default language for an unsupported locale header', () => {
    const req = buildRequest({ 'accept-language': 'de-DE' });
    const next = jest.fn();

    middleware.use(req, {} as Response, next);

    expect(req.locale).toBe('en');
  });

  it('uses the x-timezone header when present', () => {
    const req = buildRequest({ 'x-timezone': 'America/New_York' });
    const next = jest.fn();

    middleware.use(req, {} as Response, next);

    expect(req.timezone).toBe('America/New_York');
  });

  it('defaults the timezone to UTC when the header is absent', () => {
    const req = buildRequest({});
    const next = jest.fn();

    middleware.use(req, {} as Response, next);

    expect(req.timezone).toBe('UTC');
  });

  it('always calls next exactly once', () => {
    const req = buildRequest({});
    const next = jest.fn();

    middleware.use(req, {} as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });
});
