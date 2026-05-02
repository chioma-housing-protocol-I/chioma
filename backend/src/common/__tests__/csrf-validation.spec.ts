import { CsrfMiddleware } from '../middleware/csrf.middleware';
import type { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

describe('CSRF Protection Validation Tests', () => {
  let middleware: CsrfMiddleware;
  let mockConfigService: Partial<ConfigService>;

  const createValidToken = (secret: string): string => {
    const randomBytes = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now().toString();
    const data = `${randomBytes}:${timestamp}`;
    const hmac = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');
    return `${data}:${hmac}`;
  };

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          SECURITY_CSRF_ENABLED: 'true',
          SECURITY_CSRF_TOKEN_LENGTH: '32',
          SECURITY_CSRF_COOKIE_NAME: 'csrf-token',
          JWT_SECRET: 'test-secret-key',
        };
        return config[key];
      }),
    };
    middleware = new CsrfMiddleware(mockConfigService as ConfigService);
  });

  describe('CSRF token validation', () => {
    it('should validate matching CSRF tokens in POST requests', () => {
      const token = createValidToken('test-secret-key');
      const next = jest.fn();

      const req = {
        method: 'POST',
        path: '/api/protected',
        headers: {
          'x-xsrf-token': token,
        },
        cookies: {
          'XSRF-TOKEN': token,
        },
      } as any;

      middleware.use(req, {} as any, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should reject mismatched CSRF tokens', () => {
      const next = jest.fn();

      const req = {
        method: 'POST',
        path: '/api/protected',
        headers: {
          'x-xsrf-token': 'token-from-header',
        },
        cookies: {
          'XSRF-TOKEN': 'token-from-cookie',
        },
      } as any;

      expect(() => {
        middleware.use(req, {} as any, next);
      }).toThrow();

      expect(next).not.toHaveBeenCalled();
    });

    it('should reject requests with missing CSRF token', () => {
      const next = jest.fn();

      const req = {
        method: 'POST',
        path: '/api/protected',
        headers: {},
        cookies: {},
      } as any;

      expect(() => {
        middleware.use(req, {} as any, next);
      }).toThrow();
    });

    it('should allow GET requests without CSRF validation', () => {
      const next = jest.fn();

      const req = {
        method: 'GET',
        path: '/api/public',
        headers: {},
        cookies: {},
      } as any;

      middleware.use(req, {} as any, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should allow OPTIONS requests without CSRF validation', () => {
      const next = jest.fn();

      const req = {
        method: 'OPTIONS',
        path: '/api/public',
        headers: {},
        cookies: {},
      } as any;

      middleware.use(req, {} as any, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should allow HEAD requests without CSRF validation', () => {
      const next = jest.fn();

      const req = {
        method: 'HEAD',
        path: '/api/public',
        headers: {},
        cookies: {},
      } as any;

      middleware.use(req, {} as any, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('CSRF token sources', () => {
    it('should accept CSRF token from x-csrf-token header', () => {
      const token = createValidToken('test-secret-key');
      const next = jest.fn();

      const req = {
        method: 'POST',
        path: '/api/protected',
        headers: {
          'x-xsrf-token': token,
        },
        cookies: {
          'XSRF-TOKEN': token,
        },
      } as any;

      middleware.use(req, {} as any, next);
      expect(next).toHaveBeenCalled();
    });

    it('should accept CSRF token from request body', () => {
      const token = createValidToken('test-secret-key');
      const next = jest.fn();

      const req = {
        method: 'POST',
        path: '/api/protected',
        headers: {
          'x-xsrf-token': token,
        },
        body: {
          _csrf: token,
        },
        cookies: {
          'XSRF-TOKEN': token,
        },
      } as any;

      middleware.use(req, {} as any, next);
      expect(next).toHaveBeenCalled();
    });

    it('should validate case-sensitive token comparison', () => {
      const token = createValidToken('test-secret-key');
      const next = jest.fn();

      const req = {
        method: 'POST',
        path: '/api/protected',
        headers: {
          'x-xsrf-token': token,
        },
        cookies: {
          'XSRF-TOKEN': token.toUpperCase(),
        },
      } as any;

      expect(() => {
        middleware.use(req, {} as any, next);
      }).toThrow();

      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('CSRF middleware configuration', () => {
    it('should skip CSRF validation when disabled', () => {
      const configService = {
        get: (key: string) => {
          if (key === 'SECURITY_CSRF_ENABLED') return 'false';
          return undefined;
        },
      } as unknown as ConfigService;

      const middleware = new CsrfMiddleware(configService);
      const next = jest.fn();

      const req = {
        method: 'POST',
        path: '/api/protected',
        headers: {},
        cookies: {},
      } as any;

      middleware.use(req, {} as any, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should use configured cookie name for CSRF token', () => {
      const customCookieName = 'custom-csrf-cookie';
      const token = 'token-value';
      const configService = {
        get: (key: string) => {
          if (key === 'SECURITY_CSRF_ENABLED') return 'true';
          if (key === 'SECURITY_CSRF_COOKIE_NAME') return customCookieName;
          return undefined;
        },
      } as unknown as ConfigService;

      const middleware = new CsrfMiddleware(configService);
      const next = jest.fn();

      const req = {
        method: 'POST',
        path: '/api/protected',
        headers: {
          'x-csrf-token': token,
        },
        cookies: {
          [customCookieName]: token,
        },
      } as any;

      middleware.use(req, {} as any, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('CSRF attack scenarios', () => {
    it('should prevent cross-origin form submission attacks', () => {
      const next = jest.fn();

      const req = {
        method: 'POST',
        path: '/api/transfer-funds',
        headers: {
          origin: 'https://attacker.com',
          referer: 'https://attacker.com/malicious',
        },
        cookies: {
          'csrf-token': 'legitimate-token',
        },
        // Attacker doesn't have the token
      } as any;

      expect(() => {
        middleware.use(req, {} as any, next);
      }).toThrow();

      expect(next).not.toHaveBeenCalled();
    });

    it('should prevent token fixation attacks', () => {
      const next = jest.fn();
      const fixedToken = 'known-token';

      const req = {
        method: 'POST',
        path: '/api/protected',
        headers: {
          'x-csrf-token': fixedToken,
        },
        cookies: {
          'csrf-token': 'different-new-token',
        },
      } as any;

      expect(() => {
        middleware.use(req, {} as any, next);
      }).toThrow();

      expect(next).not.toHaveBeenCalled();
    });

    it('should reject empty CSRF tokens', () => {
      const next = jest.fn();

      const req = {
        method: 'POST',
        path: '/api/protected',
        headers: {
          'x-csrf-token': '',
        },
        cookies: {
          'csrf-token': '',
        },
      } as any;

      expect(() => {
        middleware.use(req, {} as any, next);
      }).toThrow();
    });

    it('should reject tokens with invalid characters', () => {
      const next = jest.fn();
      const invalidToken = '<script>alert(1)</script>';

      const req = {
        method: 'POST',
        path: '/api/protected',
        headers: {
          'x-csrf-token': invalidToken,
        },
        cookies: {
          'csrf-token': invalidToken,
        },
      } as any;

      // Token validation should reject invalid characters
      expect(() => {
        middleware.use(req, {} as any, next);
      }).toThrow();
    });
  });

  describe('CSRF error handling', () => {
    it('should provide clear error messages for token mismatch', () => {
      const next = jest.fn();

      const req = {
        method: 'POST',
        path: '/api/protected',
        headers: {
          'x-csrf-token': 'wrong-token',
        },
        cookies: {
          'csrf-token': 'correct-token',
        },
      } as any;

      try {
        middleware.use(req, {} as any, next);
      } catch (error: any) {
        expect(error.message).toContain('CSRF');
      }

      expect(next).not.toHaveBeenCalled();
    });

    it('should log CSRF validation failures', () => {
      const next = jest.fn();
      const logSpy = jest.spyOn(console, 'error').mockImplementation();

      const req = {
        method: 'POST',
        path: '/api/protected',
        headers: {},
        cookies: {},
      } as any;

      try {
        middleware.use(req, {} as any, next);
      } catch {
        // Error expected
      }

      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });

  describe('HTTP method exemptions', () => {
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];

    safeMethods.forEach((method) => {
      it(`should allow ${method} requests without CSRF token`, () => {
        const next = jest.fn();

        const req = {
          method,
          path: '/api/data',
          headers: {},
          cookies: {},
        } as any;

        middleware.use(req, {} as any, next);
        expect(next).toHaveBeenCalledTimes(1);
      });
    });

    const unsafeMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];

    unsafeMethods.forEach((method) => {
      it(`should require CSRF token for ${method} requests`, () => {
        const next = jest.fn();

        const req = {
          method,
          path: '/api/data',
          headers: {},
          cookies: {},
        } as any;

        expect(() => {
          middleware.use(req, {} as any, next);
        }).toThrow();

        expect(next).not.toHaveBeenCalled();
      });
    });
  });
});
