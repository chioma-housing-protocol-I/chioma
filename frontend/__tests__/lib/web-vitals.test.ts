import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sanitizeRoute,
  toWebVitalPayload,
  reportWebVital,
  flushWebVitals,
  setWebVitalSink,
} from '@/lib/web-vitals';

describe('sanitizeRoute', () => {
  it('keeps pathname only', () => {
    expect(sanitizeRoute('/properties?q=secret@email.com')).toBe('/properties');
  });

  it('strips hash and normalizes trailing slash', () => {
    expect(sanitizeRoute('/user/analytics/#section')).toBe('/user/analytics');
  });

  it('extracts pathname from absolute URLs', () => {
    expect(sanitizeRoute('https://chioma.app/user?wallet=GABCDEF')).toBe(
      '/user',
    );
  });

  it('falls back to / for empty input', () => {
    expect(sanitizeRoute('')).toBe('/');
    expect(sanitizeRoute(null)).toBe('/');
  });
});

describe('toWebVitalPayload', () => {
  it('builds a PII-safe payload and omits entries', () => {
    const payload = toWebVitalPayload(
      {
        name: 'LCP',
        value: 1234.5,
        rating: 'good',
        delta: 10,
        id: 'v1-abc',
        navigationType: 'navigate',
        entries: [{ name: 'should-not-appear' }],
      },
      '/properties?token=abc',
    );

    expect(payload).toEqual({
      name: 'LCP',
      value: 1234.5,
      rating: 'good',
      delta: 10,
      id: 'v1-abc',
      navigationType: 'navigate',
      route: '/properties',
      timestamp: expect.any(String),
    });
    expect(payload).not.toHaveProperty('entries');
    expect(JSON.stringify(payload)).not.toContain('should-not-appear');
    expect(JSON.stringify(payload)).not.toContain('token=');
  });

  it('maps unknown ratings safely', () => {
    const payload = toWebVitalPayload(
      { name: 'CLS', value: 0.05, id: 'x', rating: 'weird' },
      '/',
    );
    expect(payload.rating).toBe('unknown');
  });
});

describe('reportWebVital', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setWebVitalSink(null);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 202 }),
    );
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      value: vi.fn().mockReturnValue(true),
    });
  });

  afterEach(() => {
    flushWebVitals();
    vi.useRealTimers();
    setWebVitalSink(null);
    vi.unstubAllGlobals();
    delete window.__CHIOMA_WEB_VITALS_REPORTER__;
  });

  it('forwards to sink and optional window reporter synchronously', () => {
    const sink = vi.fn();
    const external = vi.fn();
    setWebVitalSink(sink);
    window.__CHIOMA_WEB_VITALS_REPORTER__ = external;

    const result = reportWebVital(
      {
        name: 'INP',
        value: 80,
        rating: 'good',
        id: 'inp-1',
        navigationType: 'navigate',
      },
      '/vitals?user=secret',
    );

    expect(result.route).toBe('/vitals');
    expect(sink).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'INP', route: '/vitals' }),
    );
    expect(external).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'INP', route: '/vitals' }),
    );
    // Queued for batching, not sent to the network yet.
    expect(navigator.sendBeacon).not.toHaveBeenCalled();
  });

  it('batches metrics reported close together into a single request', async () => {
    reportWebVital({ name: 'LCP', value: 2000, id: 'lcp-1' }, '/a');
    reportWebVital({ name: 'CLS', value: 0.05, id: 'cls-1' }, '/a');
    reportWebVital({ name: 'TTFB', value: 300, id: 'ttfb-1' }, '/a');

    expect(navigator.sendBeacon).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(300);

    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
    const [url, blob] = (navigator.sendBeacon as ReturnType<typeof vi.fn>)
      .mock.calls[0] as [string, Blob];
    expect(url).toBe('/api/web-vitals');
    expect(blob.type).toBe('application/json');

    const sent = JSON.parse(await blob.text());
    expect(sent).toHaveLength(3);
    expect(sent.map((m: { name: string }) => m.name)).toEqual([
      'LCP',
      'CLS',
      'TTFB',
    ]);
  });

  it('flushes immediately when the page becomes hidden', () => {
    reportWebVital({ name: 'LCP', value: 2000, id: 'lcp-2' }, '/b');
    expect(navigator.sendBeacon).not.toHaveBeenCalled();

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
  });

  it('flushes immediately once the batch hits its size cap, without waiting for the timer', async () => {
    for (let i = 0; i < 10; i++) {
      reportWebVital({ name: 'CLS', value: 0.01 * i, id: `cls-${i}` }, '/c');
    }

    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
    const blob = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock
      .calls[0][1] as Blob;
    const sent = JSON.parse(await blob.text());
    expect(sent).toHaveLength(10);
  });
});
