import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  API_VERSIONS,
  getConfiguredVersion,
  versionedPath,
  negotiateVersion,
  isDeprecated,
  withVersionFallback,
} from '@/lib/api/versioning';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('API_VERSIONS', () => {
  it('defines v1 and v2', () => {
    expect(API_VERSIONS.V1).toBe('v1');
    expect(API_VERSIONS.V2).toBe('v2');
  });
});

describe('getConfiguredVersion', () => {
  it('returns v1 when NEXT_PUBLIC_API_VERSION is not set', () => {
    vi.stubEnv('NEXT_PUBLIC_API_VERSION', '');
    expect(getConfiguredVersion()).toBe('v1');
  });

  it('returns v2 when NEXT_PUBLIC_API_VERSION is set to v2', () => {
    vi.stubEnv('NEXT_PUBLIC_API_VERSION', 'v2');
    expect(getConfiguredVersion()).toBe('v2');
  });

  it('falls back to v1 for unrecognised version values', () => {
    vi.stubEnv('NEXT_PUBLIC_API_VERSION', 'v99');
    expect(getConfiguredVersion()).toBe('v1');
  });
});

describe('versionedPath', () => {
  it('prefixes an unversioned path with the given version', () => {
    expect(versionedPath('/properties', 'v1')).toBe('/v1/properties');
  });

  it('adds a leading slash when the endpoint has no leading slash', () => {
    expect(versionedPath('properties', 'v1')).toBe('/v1/properties');
  });

  it('does not double-prefix an already-versioned path', () => {
    expect(versionedPath('/v1/properties', 'v1')).toBe('/v1/properties');
    expect(versionedPath('/v2/agreements', 'v1')).toBe('/v2/agreements');
  });

  it('uses getConfiguredVersion when no version argument is provided', () => {
    vi.stubEnv('NEXT_PUBLIC_API_VERSION', 'v2');
    expect(versionedPath('/payments')).toBe('/v2/payments');
  });
});

describe('negotiateVersion', () => {
  it('returns the version from the api-version header', () => {
    const headers = new Headers({ 'api-version': 'v2' });
    expect(negotiateVersion(headers)).toBe('v2');
  });

  it('returns the version from the x-api-version header', () => {
    const headers = new Headers({ 'x-api-version': 'v1' });
    expect(negotiateVersion(headers)).toBe('v1');
  });

  it('returns null when no version header is present', () => {
    const headers = new Headers();
    expect(negotiateVersion(headers)).toBeNull();
  });

  it('returns null for unrecognised version values', () => {
    const headers = new Headers({ 'api-version': 'v99' });
    expect(negotiateVersion(headers)).toBeNull();
  });

  it('prefers api-version over x-api-version', () => {
    const headers = new Headers({
      'api-version': 'v1',
      'x-api-version': 'v2',
    });
    expect(negotiateVersion(headers)).toBe('v1');
  });
});

describe('isDeprecated', () => {
  it('returns false for all endpoints by default', () => {
    expect(isDeprecated('/properties', 'v1')).toBe(false);
    expect(isDeprecated('/agreements', 'v2')).toBe(false);
  });
});

describe('withVersionFallback', () => {
  it('returns the primary result when the primary call succeeds', async () => {
    const primary = vi.fn().mockResolvedValue({ data: 'primary' });
    const fallback = vi.fn().mockResolvedValue({ data: 'fallback' });

    const result = await withVersionFallback(primary, fallback);

    expect(result).toEqual({ data: 'primary' });
    expect(fallback).not.toHaveBeenCalled();
  });

  it('calls fallback when primary throws a 404 error', async () => {
    const err = Object.assign(new Error('Not Found'), { status: 404 });
    const primary = vi.fn().mockRejectedValue(err);
    const fallback = vi.fn().mockResolvedValue({ data: 'fallback' });

    const result = await withVersionFallback(primary, fallback);

    expect(result).toEqual({ data: 'fallback' });
    expect(fallback).toHaveBeenCalledOnce();
  });

  it('calls fallback when primary throws a 410 error', async () => {
    const err = Object.assign(new Error('Gone'), { status: 410 });
    const primary = vi.fn().mockRejectedValue(err);
    const fallback = vi.fn().mockResolvedValue({ data: 'fallback' });

    const result = await withVersionFallback(primary, fallback);

    expect(result).toEqual({ data: 'fallback' });
  });

  it('rethrows errors that are not 404 or 410', async () => {
    const err = Object.assign(new Error('Server Error'), { status: 500 });
    const primary = vi.fn().mockRejectedValue(err);
    const fallback = vi.fn();

    await expect(withVersionFallback(primary, fallback)).rejects.toThrow(
      'Server Error',
    );
    expect(fallback).not.toHaveBeenCalled();
  });

  it('rethrows non-object errors without calling fallback', async () => {
    const primary = vi.fn().mockRejectedValue('plain string error');
    const fallback = vi.fn();

    await expect(withVersionFallback(primary, fallback)).rejects.toBe(
      'plain string error',
    );
  });
});
