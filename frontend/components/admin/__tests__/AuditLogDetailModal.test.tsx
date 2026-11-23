import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuditLogDetailModal } from '../AuditLogDetailModal';
import type { AuditLog } from '@/types';

const log: AuditLog = {
  id: 42,
  performedBy: 'admin@example.com',
  action: 'UPDATE_PROPERTY',
  entityType: 'Property',
  entityId: 'prop-1',
  newValues: { price: 200 },
  ipAddress: '10.0.0.1',
  userAgent: 'Mozilla/5.0 Test',
  performedAt: '2026-01-15T10:30:00.000Z',
};

describe('AuditLogDetailModal', () => {
  it('renders nothing when log is null', () => {
    const { container } = render(
      <AuditLogDetailModal log={null} onClose={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders log details when a log is provided', () => {
    render(<AuditLogDetailModal log={log} onClose={vi.fn()} />);

    expect(screen.getByText('Log ID: 42')).toBeInTheDocument();
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByText('Property (prop-1)')).toBeInTheDocument();
  });

  it('falls back to "System Action" when performedBy is missing', () => {
    render(
      <AuditLogDetailModal
        log={{ ...log, performedBy: undefined }}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('System Action')).toBeInTheDocument();
  });

  it('renders the change metadata as formatted JSON', () => {
    render(<AuditLogDetailModal log={log} onClose={vi.fn()} />);
    expect(screen.getByText(/"price": 200/)).toBeInTheDocument();
  });

  it('calls onClose when the header close button is clicked', () => {
    const onClose = vi.fn();
    render(<AuditLogDetailModal log={log} onClose={onClose} />);

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the footer Close button is clicked', () => {
    const onClose = vi.fn();
    render(<AuditLogDetailModal log={log} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<AuditLogDetailModal log={log} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not attach keyboard handling when log is null', () => {
    const onClose = vi.fn();
    render(<AuditLogDetailModal log={null} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});
