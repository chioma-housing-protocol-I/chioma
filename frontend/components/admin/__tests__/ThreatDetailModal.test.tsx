import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThreatDetailModal } from '../ThreatDetailModal';
import { ThreatLevel, ThreatStatus, ThreatType } from '@/types/security';
import type { ThreatEvent } from '@/types/security';

const threat: ThreatEvent = {
  id: 'threat-1',
  userId: 'user-9',
  ipAddress: '203.0.113.5',
  userAgent: 'Mozilla/5.0 Test',
  requestPath: '/api/login',
  requestMethod: 'POST',
  threatType: ThreatType.BRUTE_FORCE,
  threatLevel: ThreatLevel.HIGH,
  status: ThreatStatus.DETECTED,
  evidence: { attempts: 12 },
  description: 'Repeated failed login attempts',
  blocked: true,
  autoMitigated: false,
  mitigationAction: null,
  createdAt: '2026-02-01T08:00:00.000Z',
  updatedAt: '2026-02-01T08:00:00.000Z',
};

describe('ThreatDetailModal', () => {
  it('renders nothing when threat is null', () => {
    const { container } = render(
      <ThreatDetailModal threat={null} onClose={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the threat type, id, and description', () => {
    render(<ThreatDetailModal threat={threat} onClose={vi.fn()} />);

    expect(screen.getByText('brute force')).toBeInTheDocument();
    expect(screen.getByText('Threat ID: threat-1')).toBeInTheDocument();
    expect(
      screen.getByText('Repeated failed login attempts'),
    ).toBeInTheDocument();
  });

  it('shows the Start Investigation action only for DETECTED threats', () => {
    render(<ThreatDetailModal threat={threat} onClose={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: 'Start Investigation' }),
    ).toBeInTheDocument();
  });

  it('hides the Start Investigation action for non-DETECTED threats', () => {
    render(
      <ThreatDetailModal
        threat={{ ...threat, status: ThreatStatus.MITIGATED }}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole('button', { name: 'Start Investigation' }),
    ).not.toBeInTheDocument();
  });

  it('falls back to Anonymous and Unknown for missing userId/ipAddress', () => {
    render(
      <ThreatDetailModal
        threat={{ ...threat, userId: null, ipAddress: null }}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Anonymous')).toBeInTheDocument();
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('renders evidence as formatted JSON', () => {
    render(<ThreatDetailModal threat={threat} onClose={vi.fn()} />);
    expect(screen.getByText(/"attempts": 12/)).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<ThreatDetailModal threat={threat} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<ThreatDetailModal threat={threat} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
