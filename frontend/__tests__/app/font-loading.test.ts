import { existsSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Font loading is configured at the Next layout boundary (#2157). The app
 * build is blocked by unrelated corrupted files on this branch, so these
 * assertions verify the source configuration and the vendored assets directly.
 */
const layout = readFileSync(
  path.resolve(process.cwd(), 'app/layout.tsx'),
  'utf8',
);
const globals = readFileSync(
  path.resolve(process.cwd(), 'app/globals.css'),
  'utf8',
);

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe('font loading optimization (#2157)', () => {
  it('uses two self-hosted local fonts instead of fontsource imports', () => {
    expect(layout).toContain("import localFont from 'next/font/local'");
    expect(layout).not.toContain('@fontsource-variable');
    expect(occurrences(layout, 'localFont({')).toBe(2);
    expect(layout).toContain("src: './fonts/inter-latin-wght-normal.woff2'");
    expect(layout).toContain("src: './fonts/fraunces-latin-wght-normal.woff2'");
  });

  it('requests swap and preload for both faces with fallback metric adjustment', () => {
    expect(occurrences(layout, "display: 'swap'")).toBe(2);
    expect(occurrences(layout, 'preload: true')).toBe(2);
    expect(layout).toContain("adjustFontFallback: 'Arial'");
    expect(layout).toContain("adjustFontFallback: 'Times New Roman'");
    expect(layout).toContain("variable: '--font-inter'");
    expect(layout).toContain("variable: '--font-fraunces'");
    expect(layout).toContain('interFont.variable');
    expect(layout).toContain('frauncesFont.variable');
  });

  it('maps the existing CSS font variables to the generated variables', () => {
    expect(globals).toContain('var(--font-inter)');
    expect(globals).toContain('var(--font-fraunces)');
  });

  it('ships the font binaries and their licenses', () => {
    for (const file of [
      'app/fonts/inter-latin-wght-normal.woff2',
      'app/fonts/fraunces-latin-wght-normal.woff2',
      'app/fonts/INTER-LICENSE.txt',
      'app/fonts/FRAUNCES-LICENSE.txt',
    ]) {
      const absolute = path.resolve(process.cwd(), file);
      expect(existsSync(absolute), `${file} is missing`).toBe(true);
      expect(statSync(absolute).size).toBeGreaterThan(0);
    }
  });
});
