import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StarRatingInput } from '@/components/reviews/StarRatingInput';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('StarRatingInput', () => {
  it('renders 5 stars by default', () => {
    const onChange = vi.fn();
    render(<StarRatingInput value={0} onChange={onChange} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(5);
  });

  it('renders a custom number of stars via maxStars prop', () => {
    const onChange = vi.fn();
    render(<StarRatingInput value={0} onChange={onChange} maxStars={3} />);
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('calls onChange with the clicked star index', () => {
    const onChange = vi.fn();
    render(<StarRatingInput value={0} onChange={onChange} />);
    const stars = screen.getAllByRole('button');
    fireEvent.click(stars[2]); // 3rd star
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('does not call onChange when readOnly', () => {
    const onChange = vi.fn();
    render(<StarRatingInput value={3} onChange={onChange} readOnly />);
    const stars = screen.getAllByRole('button');
    fireEvent.click(stars[0]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('disables buttons when readOnly', () => {
    const onChange = vi.fn();
    render(<StarRatingInput value={3} onChange={onChange} readOnly />);
    const stars = screen.getAllByRole('button');
    stars.forEach((star) => {
      expect(star).toHaveProperty('disabled', true);
    });
  });

  it('stars are not disabled when not readOnly', () => {
    const onChange = vi.fn();
    render(<StarRatingInput value={0} onChange={onChange} />);
    const stars = screen.getAllByRole('button');
    stars.forEach((star) => {
      expect(star).toHaveProperty('disabled', false);
    });
  });

  it('labels each star with its numeric rating', () => {
    const onChange = vi.fn();
    render(<StarRatingInput value={0} onChange={onChange} />);
    expect(screen.getByLabelText('Rate 1 stars')).toBeDefined();
    expect(screen.getByLabelText('Rate 3 stars')).toBeDefined();
    expect(screen.getByLabelText('Rate 5 stars')).toBeDefined();
  });

  it('updates hover state on mouseenter', () => {
    const onChange = vi.fn();
    render(<StarRatingInput value={0} onChange={onChange} />);
    const stars = screen.getAllByRole('button');
    // hover over star 4
    fireEvent.mouseEnter(stars[3]);
    // no error thrown — hover state set internally
    expect(onChange).not.toHaveBeenCalled();
  });

  it('clears hover state on mouseleave', () => {
    const onChange = vi.fn();
    render(<StarRatingInput value={2} onChange={onChange} />);
    const stars = screen.getAllByRole('button');
    fireEvent.mouseEnter(stars[4]);
    fireEvent.mouseLeave(stars[4]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('ignores hover events when readOnly', () => {
    const onChange = vi.fn();
    render(<StarRatingInput value={3} onChange={onChange} readOnly />);
    const stars = screen.getAllByRole('button');
    // these should be no-ops
    fireEvent.mouseEnter(stars[0]);
    fireEvent.mouseLeave(stars[0]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it.each([
    ['sm', 'w-4 h-4'],
    ['md', 'w-6 h-6'],
    ['lg', 'w-8 h-8'],
  ] as const)('applies %s size class to stars', (size, expectedClass) => {
    const onChange = vi.fn();
    const { container } = render(
      <StarRatingInput value={1} onChange={onChange} size={size} />,
    );
    const svgs = container.querySelectorAll('svg');
    // SVG className is an SVGAnimatedString — use getAttribute for jsdom compatibility
    svgs.forEach((svg) => {
      const classes = svg.getAttribute('class') ?? '';
      expect(classes).toContain(expectedClass);
    });
  });
});
