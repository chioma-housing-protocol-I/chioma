import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SecurityHeadersMiddleware } from './security-headers.middleware';
import { Request, Response, NextFunction } from 'express';

describe('SecurityHeadersMiddleware', () => {
  let middleware: SecurityHeadersMiddleware;
  let configService: ConfigService;

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
    configService = module.get<ConfigService>(ConfigService);
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
});
