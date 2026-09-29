import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BulkConfirmDialog } from '../BulkConfirmDialog';

describe('BulkConfirmDialog', () => {
  it('renders the title and message', () => {
    render(
      <BulkConfirmDialog
        title="Resolve 3 disputes?"
        message="This will mark them resolved."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        isLoading={false}
        variant="warning"
      />,
    );

    expect(screen.getByText('Resolve 3 disputes?')).toBeInTheDocument();
    expect(
      screen.getByText('This will mark them resolved.'),
    ).toBeInTheDocument();
  });

  it('calls onConfirm when the confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(
      <BulkConfirmDialog
        title="t"
        message="m"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
        isLoading={false}
        variant="danger"
      />,
    );

    fireEvent.click(screen.getByText('Confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when the cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(
      <BulkConfirmDialog
        title="t"
        message="m"
        onConfirm={vi.fn()}
        onCancel={onCancel}
        isLoading={false}
        variant="danger"
      />,
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when the backdrop is clicked', () => {
    const onCancel = vi.fn();
    const { container } = render(
      <BulkConfirmDialog
        title="t"
        message="m"
        onConfirm={vi.fn()}
        onCancel={onCancel}
        isLoading={false}
        variant="danger"
      />,
    );

    fireEvent.click(container.querySelector('.absolute.inset-0')!);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables both buttons while loading', () => {
    render(
      <BulkConfirmDialog
        title="t"
        message="m"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        isLoading={true}
        variant="danger"
      />,
    );

    expect(screen.getByText('Cancel')).toBeDisabled();
    expect(screen.getByText('Confirm').closest('button')).toBeDisabled();
  });
});
