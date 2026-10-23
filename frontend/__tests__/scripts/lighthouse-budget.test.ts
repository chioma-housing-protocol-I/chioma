import { describe, it, expect } from 'vitest';
import lighthouseConfig from '../../lighthouserc.js';

describe('lighthouserc.js performance budget (#2079)', () => {
  const assertions = lighthouseConfig.ci.assert.assertions;

  it('enforces First Contentful Paint under 2000ms', () => {
    const [level, options] = assertions['first-contentful-paint'];
    expect(level).toBe('error');
    expect(options.maxNumericValue).toBe(2000);
  });

  it('enforces Largest Contentful Paint under 2500ms', () => {
    const [level, options] = assertions['largest-contentful-paint'];
    expect(level).toBe('error');
    expect(options.maxNumericValue).toBe(2500);
  });

  it('enforces Cumulative Layout Shift under 0.1', () => {
    const [level, options] = assertions['cumulative-layout-shift'];
    expect(level).toBe('error');
    expect(options.maxNumericValue).toBe(0.1);
  });

  it('runs against a production server (next start), never next dev', () => {
    expect(lighthouseConfig.ci.collect.startServerCommand).toContain(
      'pnpm run start',
    );
    expect(lighthouseConfig.ci.collect.startServerCommand).not.toContain(
      'next dev',
    );
  });

  it('checks every route the bundle-size budget also tracks', () => {
    const urls = lighthouseConfig.ci.collect.url;
    expect(urls.some((u: string) => u.endsWith('/'))).toBe(true);
    expect(urls.some((u: string) => u.endsWith('/properties'))).toBe(true);
  });
});
