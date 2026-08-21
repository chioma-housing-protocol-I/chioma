import { describe, it, expect, vi, beforeAll } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SignaturePad } from '../SignaturePad';

// jsdom doesn't support canvas getContext; mock it
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    clearRect: vi.fn(),
  })) as any;
});

describe('SignaturePad', () => {
  it('renders the canvas and placeholder text', () => {
    render(
      <SignaturePad
        onSign={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText('Draw your signature here')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Sign Agreement')).toBeInTheDocument();
  });

  it('has the Sign Agreement button disabled initially', () => {
    render(
      <SignaturePad
        onSign={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const signButton = screen.getByText('Sign Agreement');
    expect(signButton).toBeDisabled();
  });

  it('calls onCancel when Cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(
      <SignaturePad
        onSign={vi.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows "Signing..." when isSubmitting is true', () => {
    render(
      <SignaturePad
        onSign={vi.fn()}
        onCancel={vi.fn()}
        isSubmitting={true}
      />,
    );

    expect(screen.getByText('Signing...')).toBeInTheDocument();
    expect(screen.getByText('Signing...')).toBeDisabled();
  });

  it('disables Cancel button when isSubmitting is true', () => {
    render(
      <SignaturePad
        onSign={vi.fn()}
        onCancel={vi.fn()}
        isSubmitting={true}
      />,
    );

    expect(screen.getByText('Cancel')).toBeDisabled();
  });

  it('has a canvas element for drawing', () => {
    const { container } = render(
      <SignaturePad
        onSign={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(canvas?.getAttribute('width')).toBe('500');
    expect(canvas?.getAttribute('height')).toBe('200');
  });

  it('calls onSign with "SIGNED_DATA" when Sign Agreement is clicked after drawing', () => {
    const onSign = vi.fn();
    const { container } = render(
      <SignaturePad
        onSign={onSign}
        onCancel={vi.fn()}
      />,
    );

    const canvas = container.querySelector('canvas')!;

    // Simulate drawing on the canvas (mouseDown → mouseMove → mouseUp)
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.mouseMove(canvas, { clientX: 50, clientY: 50 });
    fireEvent.mouseUp(canvas);

    // The Sign Agreement button should now be enabled
    const signButton = screen.getByText('Sign Agreement');
    expect(signButton).not.toBeDisabled();

    fireEvent.click(signButton);
    expect(onSign).toHaveBeenCalledWith('SIGNED_DATA');
  });

  it('shows the clear (eraser) button after drawing', () => {
    const { container } = render(
      <SignaturePad
        onSign={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const canvas = container.querySelector('canvas')!;
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.mouseUp(canvas);

    // Eraser button should appear (title="Clear signature")
    const clearButton = screen.getByTitle('Clear signature');
    expect(clearButton).toBeInTheDocument();
  });

  it('clears signature and disables Sign Agreement when clear button is clicked', () => {
    const onSign = vi.fn();
    const { container } = render(
      <SignaturePad
        onSign={onSign}
        onCancel={vi.fn()}
      />,
    );

    const canvas = container.querySelector('canvas')!;

    // Draw
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.mouseUp(canvas);

    // Sign button should be enabled
    expect(screen.getByText('Sign Agreement')).not.toBeDisabled();

    // Clear
    fireEvent.click(screen.getByTitle('Clear signature'));

    // Sign button should be disabled again
    expect(screen.getByText('Sign Agreement')).toBeDisabled();
  });

  it('handles touch events for mobile drawing', () => {
    const onSign = vi.fn();
    const { container } = render(
      <SignaturePad
        onSign={onSign}
        onCancel={vi.fn()}
      />,
    );

    const canvas = container.querySelector('canvas')!;

    // Simulate touch drawing
    fireEvent.touchStart(canvas, {
      touches: [{ clientX: 30, clientY: 30 }],
    });
    fireEvent.touchMove(canvas, {
      touches: [{ clientX: 60, clientY: 60 }],
    });
    fireEvent.touchEnd(canvas);

    // Sign button should be enabled after drawing
    const signButton = screen.getByText('Sign Agreement');
    expect(signButton).not.toBeDisabled();

    fireEvent.click(signButton);
    expect(onSign).toHaveBeenCalledWith('SIGNED_DATA');
  });
});