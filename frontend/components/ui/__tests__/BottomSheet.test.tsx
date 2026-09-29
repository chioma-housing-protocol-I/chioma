import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { BottomSheet } from '../BottomSheet';

const noop = () => {};

function renderSheet(
  props: Partial<React.ComponentProps<typeof BottomSheet>> = {},
) {
  const { children, ...rest } = props;
  return render(
    <BottomSheet isOpen onClose={noop} {...rest}>
      {children ?? <p>Sheet content</p>}
    </BottomSheet>,
  );
}

describe('BottomSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders content when isOpen is true', () => {
    renderSheet();
    expect(screen.getByText('Sheet content')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    renderSheet({ isOpen: false });
    expect(screen.queryByText('Sheet content')).not.toBeInTheDocument();
  });

  it('renders the title when provided', () => {
    renderSheet({ title: 'Filters' });
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('has role="dialog" and aria-modal="true"', () => {
    renderSheet();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    renderSheet({ onClose });
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is tapped', async () => {
    const onClose = vi.fn();
    renderSheet({ onClose });
    await new Promise((resolve) => setTimeout(resolve, 0));
    fireEvent.pointerDown(screen.getByTestId('bottom-sheet-overlay'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when the sheet content is clicked', () => {
    const onClose = vi.fn();
    renderSheet({ onClose });
    fireEvent.pointerDown(screen.getByText('Sheet content'));
    fireEvent.click(screen.getByText('Sheet content'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
