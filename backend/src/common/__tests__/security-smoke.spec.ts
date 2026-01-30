import { CsrfMiddleware } from '../middleware/csrf.middleware';
import { SanitizePipe } from '../pipes/sanitize.pipe';
import type { ConfigService } from '@nestjs/config';

describe('Security smoke tests (no env required)', () => {
  it('SanitizePipe sanitizes strings', () => {
    const pipe = new SanitizePipe();
    const out = pipe.transform('<script>alert(1)</script> hi', {
      type: 'body',
      metatype: String,
      data: '',
    });
    expect(typeof out).toBe('string');
    expect(String(out)).not.toContain('<script');
  });

  it('CsrfMiddleware does nothing when disabled', () => {
    const configService = {
      get: (key: string) => {
        if (key === 'SECURITY_CSRF_ENABLED') return 'false';
        return undefined;
      },
    } as unknown as ConfigService;

    const middleware = new CsrfMiddleware(configService);

    const next = jest.fn();
    middleware.use(
      {
        method: 'POST',
        path: '/api/test',
        headers: {},
        cookies: {},
      } as any,
      {} as any,
      next,
    );

    expect(next).toHaveBeenCalledTimes(1);
  });
});
