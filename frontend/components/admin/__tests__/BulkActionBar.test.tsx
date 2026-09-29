import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BulkActionBar } from '../BulkActionBar';

describe('BulkActionBar', () => {
  it('renders nothing when nothing is selected', () => {
    const { container } = render(
      <BulkActionBar
        selectedCount={0}
        itemLabel="item"
        actions={[]}
        onClear={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the selection count with correct pluralization', () => {
    render(
      <BulkActionBar
        selectedCount={1}
        itemLabel="dispute"
        actions={[]}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByText('1 dispute selected')).toBeInTheDocument();
  });

  it('pluralizes the item label for more than one selection', () => {
    render(
      <BulkActionBar
        selectedCount={3}
        itemLabel="dispute"
        actions={[]}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByText('3 disputes selected')).toBeInTheDocument();
  });

  it('renders each action and calls its onClick', () => {
    const onApprove = vi.fn();
    render(
      <BulkActionBar
        selectedCount={2}
        itemLabel="refund"
        actions={[
          { key: 'approve', label: 'Approve', icon: null, onClick: onApprove },
        ]}
        onClear={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Approve'));
    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it('calls onClear when the clear button is clicked', () => {
    const onClear = vi.fn();
    render(
      <BulkActionBar
        selectedCount={2}
        itemLabel="refund"
        actions={[]}
        onClear={onClear}
      />,
    );

    fireEvent.click(screen.getByLabelText('Clear selection'));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
