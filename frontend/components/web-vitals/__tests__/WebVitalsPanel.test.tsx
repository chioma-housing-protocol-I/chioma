import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';

import { WebVitalsPanel } from '../WebVitalsPanel';
import { useWebVitalsStore } from '@/store/webVitalsStore';
import type { WebVitalPayload } from '@/lib/web-vitals';

// jsdom doesn't implement IntersectionObserver; framer-motion's
// `whileInView` prop needs it to mount `motion.*` elements.
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
}

function makeMetric(overrides: Partial<WebVitalPayload> = {}): WebVitalPayload {
  return {
    name: 'LCP',
    value: 1800,
    rating: 'good',
    delta: 1800,
    id: 'v1-1',
    navigationType: 'navigate',
    route: '/properties',
    timestamp: new Date('2026-01-01T12:00:00.000Z').toISOString(),
    ...overrides,
  };
}

function mockFetchOnce(body: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  });
}

describe('WebVitalsPanel', () => {
  let unmount: (() => void) | undefined;

  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    useWebVitalsStore.getState().clear();
  });

  afterEach(() => {
    unmount?.();
    unmount = undefined;
    vi.unstubAllGlobals();
    useWebVitalsStore.getState().clear();
  });

  it('renders the intro heading and metric tiles', () => {
    vi.stubGlobal('fetch', mockFetchOnce({ metrics: [], latest: {} }));

    const result = render(<WebVitalsPanel />);
    unmount = result.unmount;

    expect(screen.getByTestId('web-vitals-panel')).toBeInTheDocument();
    expect(screen.getByText(/Real-user monitoring/i)).toBeInTheDocument();
    expect(screen.getByTestId('web-vital-card-LCP')).toBeInTheDocument();
    expect(screen.getByTestId('web-vital-card-CLS')).toBeInTheDocument();
    expect(screen.getByTestId('web-vital-card-INP')).toBeInTheDocument();
  });

  it('shows the empty state when there is no history', async () => {
    vi.stubGlobal('fetch', mockFetchOnce({ metrics: [], latest: {} }));

    const result = render(<WebVitalsPanel />);
    unmount = result.unmount;

    await waitFor(() => {
      expect(screen.getByText('No samples yet')).toBeInTheDocument();
    });
  });

  it('fetches and displays server metrics after mount', async () => {
    const metric = makeMetric();
    vi.stubGlobal(
      'fetch',
      mockFetchOnce({ metrics: [metric], latest: { LCP: metric } }),
    );

    const result = render(<WebVitalsPanel />);
    unmount = result.unmount;

    await waitFor(() => {
      expect(screen.getAllByText('1800ms').length).toBeGreaterThan(0);
    });
    expect(screen.queryByText('No samples yet')).not.toBeInTheDocument();
    expect(screen.getAllByText('/properties').length).toBeGreaterThan(0);
  });

  it('shows an error message when the fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      }),
    );

    const result = render(<WebVitalsPanel />);
    unmount = result.unmount;

    await waitFor(() => {
      expect(
        screen.getByText('Could not load aggregated vitals from the API sink.'),
      ).toBeInTheDocument();
    });
  });

  it('refetches when the refresh sink button is clicked', async () => {
    const fetchMock = mockFetchOnce({ metrics: [], latest: {} });
    vi.stubGlobal('fetch', fetchMock);

    const result = render(<WebVitalsPanel />);
    unmount = result.unmount;

    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThan(0);
    });
    const callsBefore = fetchMock.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: /Refresh sink/i }));

    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  it('renders a CLS value with three decimal places from the session store', async () => {
    vi.stubGlobal('fetch', mockFetchOnce({ metrics: [], latest: {} }));

    const result = render(<WebVitalsPanel />);
    unmount = result.unmount;

    await waitFor(() => {
      expect(screen.getByText('No samples yet')).toBeInTheDocument();
    });

    useWebVitalsStore
      .getState()
      .addMetric(makeMetric({ name: 'CLS', value: 0.123, id: 'cls-1' }));

    await waitFor(() => {
      expect(screen.getAllByText('0.123').length).toBeGreaterThan(0);
    });
  });

  it('clears session metrics when Clear session is clicked', async () => {
    vi.stubGlobal('fetch', mockFetchOnce({ metrics: [], latest: {} }));

    const result = render(<WebVitalsPanel />);
    unmount = result.unmount;

    await waitFor(() => {
      expect(screen.getByText('No samples yet')).toBeInTheDocument();
    });

    useWebVitalsStore.getState().addMetric(makeMetric({ id: 'clear-me' }));

    await waitFor(() => {
      expect(screen.getAllByText('1800ms').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole('button', { name: /Clear session/i }));

    expect(useWebVitalsStore.getState().metrics).toHaveLength(0);
  });
});
