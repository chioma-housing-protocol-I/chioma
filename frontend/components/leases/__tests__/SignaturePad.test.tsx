import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { SignaturePad } from '../SignaturePad';

// jsdom does not implement canvas rendering contexts. Stub just enough of
// CanvasRenderingContext2D for the component's drawing handlers to run so
// the "user actually draws a signature" path can be exercised.
const fakeContext = {
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  clearRect: vi.fn(),
  strokeStyle: '',
  lineWidth: 0,
  lineCap: '',
  lineJoin: '',
};

describe('SignaturePad', () => {
  const onSign = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    HTMLCanvasElement.prototype.getContext = vi
      .fn()
      .mockReturnValue(
        fakeContext,
      ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  });

  it('renders the placeholder prompt before any drawing happens', () => {
    render(<SignaturePad onSign={onSign} onCancel={onCancel} />);

    expect(screen.getByText('Draw your signature here')).toBeInTheDocument();
  });

  it('renders Cancel and Sign Agreement buttons', () => {
    render(<SignaturePad onSign={onSign} onCancel={onCancel} />);

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Sign Agreement' }),
    ).toBeInTheDocument();
  });

  it('disables the sign button until the user has drawn a signature', () => {
    render(<SignaturePad onSign={onSign} onCancel={onCancel} />);

    const signButton = screen.getByRole('button', { name: 'Sign Agreement' });
    expect(signButton).toBeDisabled();

    fireEvent.click(signButton);
    expect(onSign).not.toHaveBeenCalled();
  });

  it('calls onCancel when Cancel is clicked', () => {
    render(<SignaturePad onSign={onSign} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('enables the sign button and calls onSign after drawing on the canvas', () => {
    const { container } = render(
      <SignaturePad onSign={onSign} onCancel={onCancel} />,
    );

    const canvas = container.querySelector('canvas')!;
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });

    expect(
      screen.queryByText('Draw your signature here'),
    ).not.toBeInTheDocument();

    const signButton = screen.getByRole('button', { name: 'Sign Agreement' });
    expect(signButton).not.toBeDisabled();

    fireEvent.click(signButton);
    expect(onSign).toHaveBeenCalledWith('SIGNED_DATA');
  });

  it('shows a clear (eraser) button once signed and resets state when clicked', () => {
    const { container } = render(
      <SignaturePad onSign={onSign} onCancel={onCancel} />,
    );

    const canvas = container.querySelector('canvas')!;
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });

    const clearButton = screen.getByTitle('Clear signature');
    expect(clearButton).toBeInTheDocument();

    fireEvent.click(clearButton);

    expect(screen.getByText('Draw your signature here')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Sign Agreement' }),
    ).toBeDisabled();
  });

  it('disables both buttons and shows a submitting label when isSubmitting is true', () => {
    render(<SignaturePad onSign={onSign} onCancel={onCancel} isSubmitting />);

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByText('Signing...')).toBeInTheDocument();
  });
});
