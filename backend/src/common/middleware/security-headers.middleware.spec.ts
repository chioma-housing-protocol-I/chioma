import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SecurityHeadersMiddleware } from './security-headers.middleware';
import { Request, Response, NextFunction } from 'express';

describe('SecurityHeadersMiddleware', () => {
  let middleware: SecurityHeadersMiddleware;
  let _configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityHeadersMiddleware,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'NODE_ENV') return 'development';
              if (key === 'SECURITY_HSTS_MAX_AGE') return '31536000';
              if (key === 'SECURITY_CSP_ENABLED') return 'true';
              return null;
            }),
          },
        },
      ],
    }).compile();

    middleware = module.get<SecurityHeadersMiddleware>(
      SecurityHeadersMiddleware,
    );
    _configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should set security headers on response', (done) => {
    const req = {} as Request;
    const res = {
      setHeader: jest.fn(),
      removeHeader: jest.fn(),
    } as unknown as Response;

    const next: NextFunction = () => {
      // Helmet should have set multiple security headers
      expect(res.setHeader).toHaveBeenCalledWith(
        'X-Content-Type-Options',
        'nosniff',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'X-XSS-Protection',
        '0', // Helmet sets to 0 by default now, or based on config
      );
      done();
    };

    middleware.use(req, res, next);
  });

  async function buildMiddleware(
    overrides: Record<string, string | null> = {},
  ): Promise<SecurityHeadersMiddleware> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityHeadersMiddleware,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key in overrides) return overrides[key];
              if (key === 'NODE_ENV') return 'development';
              if (key === 'SECURITY_HSTS_MAX_AGE') return '31536000';
              return null;
            }),
          },
        },
      ],
    }).compile();

    return module.get<SecurityHeadersMiddleware>(SecurityHeadersMiddleware);
  }

  function captureCsp(
    mw: SecurityHeadersMiddleware,
    path: string,
  ): Promise<string> {
    return new Promise((resolve) => {
      const req = { path } as Request;
      const res = {
        setHeader: jest.fn(
          (name: string, value: string) =>
            name.toLowerCase() === 'content-security-policy' && resolve(value),
        ),
        removeHeader: jest.fn(),
      } as unknown as Response;

      mw.use(req, res, (() => {}) as NextFunction);
    });
  }

  it('enables CSP by default when SECURITY_CSP_ENABLED is unset', async () => {
    const mw = await buildMiddleware();
    const csp = await captureCsp(mw, '/api/payments');
    expect(csp).toBeDefined();
  });

  it('does not allow unsafe-inline/unsafe-eval scripts outside the docs page', async () => {
    const mw = await buildMiddleware();
    const csp = await captureCsp(mw, '/api/payments');
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain('unsafe-inline');
    expect(csp).not.toContain('unsafe-eval');
  });

  it('allows unsafe-inline/unsafe-eval scripts on the Swagger docs page', async () => {
    const mw = await buildMiddleware();
    const csp = await captureCsp(mw, '/api/docs');
    expect(csp).toContain("'unsafe-inline'");
    expect(csp).toContain("'unsafe-eval'");
  });

  it('omits CSP entirely when SECURITY_CSP_ENABLED=false', async () => {
    const mw = await buildMiddleware({ SECURITY_CSP_ENABLED: 'false' });
    const req = { path: '/api/payments' } as Request;
    const res = {
      setHeader: jest.fn(),
      removeHeader: jest.fn(),
    } as unknown as Response;

    await new Promise<void>((resolve) => {
      mw.use(req, res, (() => resolve()) as NextFunction);
    });

    const cspCall = (res.setHeader as jest.Mock).mock.calls.find(
      ([name]) => String(name).toLowerCase() === 'content-security-policy',
    );
    expect(cspCall).toBeUndefined();
  });
});
