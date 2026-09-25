import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// SubletEarningsChart lazy-loads BarChartWrapper via next/dynamic; resolve it
// synchronously to a stub so tests don't depend on recharts' layout
// measurement, which jsdom doesn't provide (see SystemAnalytics.test.tsx).
vi.mock('next/dynamic', () => ({
  default: () => {
    const DynamicChartStub = () =>
      React.createElement('div', { 'data-testid': 'chart-stub' });
    DynamicChartStub.displayName = 'DynamicChartStub';
    return DynamicChartStub;
  },
}));

import { SubletEarningsChart } from '../SubletEarningsChart';
import type { SubletEarningsSummary } from '@/lib/query/hooks/use-sublets';

const earnings: SubletEarningsSummary = {
  totalEarnings: 1500,
  pendingEarnings: 500,
  paidEarnings: 1000,
  bookingCount: 3,
};

describe('SubletEarningsChart', () => {
  it('renders the total, pending, and paid earnings from real data', () => {
    render(<SubletEarningsChart earnings={earnings} />);

    expect(screen.getByText('$1500.00')).toBeInTheDocument();
    expect(screen.getByText('$500.00')).toBeInTheDocument();
    expect(screen.getByText('$1000.00')).toBeInTheDocument();
  });

  it('renders the chart component', () => {
    render(<SubletEarningsChart earnings={earnings} />);

    expect(screen.getByTestId('chart-stub')).toBeInTheDocument();
  });

  it('renders zero earnings without crashing', () => {
    render(
      <SubletEarningsChart
        earnings={{
          totalEarnings: 0,
          pendingEarnings: 0,
          paidEarnings: 0,
          bookingCount: 0,
        }}
      />,
    );

    expect(screen.getAllByText('$0.00')).toHaveLength(3);
  });
});
