import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CancelButton } from '@/components/ui/CancelButton';

function getButton() {
  return screen.getByRole('button');
}

describe('CancelButton', () => {
  it('renders with default label', () => {
    render(<CancelButton onCancel={() => {}} />);
    expect(getButton()).toBeDefined();
  });

  it('renders with custom label', () => {
    render(<CancelButton onCancel={() => {}} label="Stop" />);
    expect(getButton()).toHaveTextContent('Stop');
  });

  it('calls onCancel when clicked', () => {
    const onCancel = vi.fn();
    render(<CancelButton onCancel={onCancel} />);
    fireEvent.click(getButton());
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('is enabled when isInFlight is true', () => {
    render(<CancelButton onCancel={() => {}} isInFlight={true} />);
    expect(getButton()).not.toBeDisabled();
  });

  it('is disabled when isInFlight is false', () => {
    render(<CancelButton onCancel={() => {}} isInFlight={false} />);
    expect(getButton()).toBeDisabled();
  });
});
