import { describe, it, expect, beforeEach } from 'vitest';
import { POST, GET } from '@/app/api/web-vitals/route';
import { NextRequest } from 'next/server';

function jsonRequest(url: string, body?: unknown, method = 'POST') {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe('/api/web-vitals', () => {
  beforeEach(async () => {
    // Seed via POST so GET has something deterministic for this process
  });

  it('rejects invalid payloads', async () => {
    const res = await POST(
      jsonRequest('http://localhost/api/web-vitals', { name: 'LCP' }),
    );
    expect(res.status).toBe(400);
  });

  it('accepts sanitizes and stores core vitals', async () => {
    const res = await POST(
      jsonRequest('http://localhost/api/web-vitals', {
        name: 'LCP',
        value: 2100,
        rating: 'needs-improvement',
        id: 'lcp-test-1',
        navigationType: 'navigate',
        route: '/properties?email=a@b.com',
        entries: [{ dangerous: true }],
      }),
    );
    expect(res.status).toBe(202);

    const getRes = await GET(
      new NextRequest('http://localhost/api/web-vitals?name=LCP&limit=5'),
    );
    expect(getRes.status).toBe(200);
    const data = await getRes.json();
    expect(data.metrics.length).toBeGreaterThan(0);
    expect(data.metrics[0].route).toBe('/properties');
    expect(JSON.stringify(data)).not.toContain('email=');
    expect(JSON.stringify(data)).not.toContain('dangerous');
    expect(data.latest.LCP).toBeDefined();
  });
});
