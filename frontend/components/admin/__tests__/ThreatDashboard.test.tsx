import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ThreatLevel, ThreatStatus, ThreatType } from '@/types/security';
import type {
  ThreatEvent,
  ThreatStats as IThreatStats,
} from '@/types/security';

const getMock = vi.fn();
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
  },
}));

vi.mock('../ThreatStats', () => ({
  ThreatStats: ({ loading }: { loading: boolean }) =>
    React.createElement(
      'div',
      { 'data-testid': 'threat-stats' },
      loading ? 'stats-loading' : 'stats-loaded',
    ),
}));

vi.mock('../ThreatTimeline', () => ({
  ThreatTimeline: () =>
    React.createElement('div', { 'data-testid': 'threat-timeline' }),
}));

vi.mock('../ThreatList', () => ({
  ThreatList: ({
    threats,
    filters,
  }: {
    threats: ThreatEvent[];
    filters: { search: string };
  }) =>
    React.createElement(
      'div',
      { 'data-testid': 'threat-list' },
      `count:${threats.length} search:${filters.search}`,
    ),
}));

vi.mock('../ThreatDetailModal', () => ({
  ThreatDetailModal: ({ threat }: { threat: ThreatEvent | null }) =>
    React.createElement(
      'div',
      { 'data-testid': 'threat-detail-modal' },
      threat ? `selected:${threat.id}` : 'no-selection',
    ),
}));

vi.mock('../ThreatAnalysis', () => ({
  ThreatAnalysis: () =>
    React.createElement('div', { 'data-testid': 'threat-analysis' }),
}));

import { ThreatDashboard } from '../ThreatDashboard';

function makeThreat(overrides: Partial<ThreatEvent> = {}): ThreatEvent {
  return {
    id: 't-1',
    userId: null,
    ipAddress: '10.0.0.1',
    userAgent: null,
    requestPath: '/api/login',
    requestMethod: 'POST',
    threatType: ThreatType.BRUTE_FORCE,
    threatLevel: ThreatLevel.CRITICAL,
    status: ThreatStatus.DETECTED,
    evidence: {},
    description: 'Repeated failed logins',
    blocked: true,
    autoMitigated: false,
    mitigationAction: null,
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    ...overrides,
  };
}

const mockStats: IThreatStats = {
  totalThreats: 2,
  threatsByType: {} as IThreatStats['threatsByType'],
  threatsByLevel: {} as IThreatStats['threatsByLevel'],
  threatsByStatus: {} as IThreatStats['threatsByStatus'],
  threatsOverTime: [],
  topOffendingIps: [],
  mitigationRate: 0.5,
};

describe('ThreatDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMock.mockImplementation((url: string) => {
      if (url.includes('/stats')) {
        return Promise.resolve({ data: mockStats });
      }
      return Promise.resolve({
        data: [
          makeThreat({ id: 't-1' }),
          makeThreat({
            id: 't-2',
            threatType: ThreatType.XSS_ATTEMPT,
            threatLevel: ThreatLevel.HIGH,
            ipAddress: '10.0.0.2',
          }),
        ],
      });
    });
  });

  it('renders the heading and fetches threats and stats on mount', async () => {
    render(<ThreatDashboard />);

    expect(screen.getByText('Threat Monitoring')).toBeInTheDocument();

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/security/threats?limit=100'),
      );
    });
    expect(getMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/security/threats/stats?hours=24'),
    );
  });

  it('shows the overview tab with stats and recent alerts by default', async () => {
    render(<ThreatDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('threat-stats')).toHaveTextContent(
        'stats-loaded',
      );
    });
    expect(screen.getByText('Recent Alerts')).toBeInTheDocument();
    expect(screen.getAllByText(/brute force/i).length).toBeGreaterThan(0);
  });

  it('opens the threat detail modal when a recent alert is clicked', async () => {
    render(<ThreatDashboard />);

    await waitFor(() => {
      expect(screen.getAllByText(/brute force/i).length).toBeGreaterThan(0);
    });

    expect(screen.getByTestId('threat-detail-modal')).toHaveTextContent(
      'no-selection',
    );

    fireEvent.click(screen.getByText(/10\.0\.0\.1/));

    expect(screen.getByTestId('threat-detail-modal')).toHaveTextContent(
      'selected:t-1',
    );
  });

  it('switches to the threat list tab and shows a search input', async () => {
    render(<ThreatDashboard />);
    await waitFor(() => {
      expect(getMock).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Threat List' }));

    expect(
      screen.getByPlaceholderText('Search by IP, path, or description...'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('threat-list')).toHaveTextContent('count:2');
    });
  });

  it('filters the threat list as the search input changes', async () => {
    render(<ThreatDashboard />);
    await waitFor(() => {
      expect(getMock).toHaveBeenCalled();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Threat List' }));

    const searchInput = screen.getByPlaceholderText(
      'Search by IP, path, or description...',
    );
    fireEvent.change(searchInput, { target: { value: '10.0.0.2' } });

    await waitFor(() => {
      expect(screen.getByTestId('threat-list')).toHaveTextContent(
        'search:10.0.0.2',
      );
    });
  });

  it('switches to the deep analysis tab', async () => {
    render(<ThreatDashboard />);
    await waitFor(() => {
      expect(getMock).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Deep Analysis' }));
    expect(screen.getByTestId('threat-analysis')).toBeInTheDocument();
  });

  it('refetches threat data when the refresh button is clicked', async () => {
    render(<ThreatDashboard />);
    await waitFor(() => {
      expect(getMock).toHaveBeenCalledTimes(2);
    });

    fireEvent.click(screen.getByRole('button', { name: /Refresh/i }));

    await waitFor(() => {
      expect(getMock.mock.calls.length).toBeGreaterThan(2);
    });
  });

  it('triggers a CSV export when the export button is clicked', async () => {
    render(<ThreatDashboard />);
    await waitFor(() => {
      expect(getMock).toHaveBeenCalled();
    });

    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    fireEvent.click(screen.getByRole('button', { name: /Export Data/i }));

    expect(clickSpy).toHaveBeenCalledTimes(1);
    clickSpy.mockRestore();
  });
});
