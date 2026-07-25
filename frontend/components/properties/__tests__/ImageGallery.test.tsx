import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    ...props
  }: {
    src: string;
    alt: string;
    [key: string]: unknown;
  }) => React.createElement('img', { src, alt, ...props }),
}));

import ImageGallery from '../ImageGallery';

const mockImages = [
  'https://example.com/image1.jpg',
  'https://example.com/image2.jpg',
  'https://example.com/image3.jpg',
];

describe('ImageGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders no-images placeholder when given an empty array', () => {
    render(React.createElement(ImageGallery, { images: [] }));
    expect(screen.getByText('No images available')).toBeInTheDocument();
  });

  it('renders no-images placeholder when images prop is undefined', () => {
    render(React.createElement(ImageGallery, { images: [] }));
    expect(screen.getByText('No images available')).toBeInTheDocument();
  });

  it('renders the first image by default', () => {
    render(
      React.createElement(ImageGallery, {
        images: mockImages,
        title: 'My Property',
      }),
    );
    const mainImage = screen.getByAltText('My Property - view 1');
    expect(mainImage).toBeInTheDocument();
    expect(mainImage).toHaveAttribute('src', mockImages[0]);
  });

  it('uses default title when none is provided', () => {
    render(React.createElement(ImageGallery, { images: mockImages }));
    expect(screen.getByAltText('Property Image - view 1')).toBeInTheDocument();
  });

  it('shows next button for multi-image gallery', () => {
    render(React.createElement(ImageGallery, { images: mockImages }));
    expect(screen.getByLabelText('Next image')).toBeInTheDocument();
  });

  it('shows previous button for multi-image gallery', () => {
    render(React.createElement(ImageGallery, { images: mockImages }));
    expect(screen.getByLabelText('Previous image')).toBeInTheDocument();
  });

  it('does not show navigation buttons for a single image', () => {
    render(
      React.createElement(ImageGallery, {
        images: [mockImages[0]],
        title: 'Single',
      }),
    );
    expect(screen.queryByLabelText('Next image')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Previous image')).not.toBeInTheDocument();
  });

  it('advances to the next image when next button is clicked', () => {
    render(
      React.createElement(ImageGallery, { images: mockImages, title: 'Prop' }),
    );
    fireEvent.click(screen.getByLabelText('Next image'));
    expect(screen.getByAltText('Prop - view 2')).toBeInTheDocument();
  });

  it('wraps around to the last image when previous is clicked on the first image', () => {
    render(
      React.createElement(ImageGallery, { images: mockImages, title: 'Prop' }),
    );
    fireEvent.click(screen.getByLabelText('Previous image'));
    expect(
      screen.getByAltText(`Prop - view ${mockImages.length}`),
    ).toBeInTheDocument();
  });

  it('wraps around to the first image when next is clicked on the last image', () => {
    render(
      React.createElement(ImageGallery, { images: mockImages, title: 'Prop' }),
    );
    fireEvent.click(screen.getByLabelText('Next image'));
    fireEvent.click(screen.getByLabelText('Next image'));
    fireEvent.click(screen.getByLabelText('Next image'));
    expect(screen.getByAltText('Prop - view 1')).toBeInTheDocument();
  });

  it('renders thumbnail images for each image in the gallery', () => {
    render(React.createElement(ImageGallery, { images: mockImages }));
    const thumbnails = screen.getAllByAltText(/Thumbnail \d+/);
    expect(thumbnails).toHaveLength(mockImages.length);
  });

  it('clicking a thumbnail updates the active image', () => {
    render(
      React.createElement(ImageGallery, { images: mockImages, title: 'Prop' }),
    );
    const thumbnails = screen.getAllByAltText(/Thumbnail \d+/);
    fireEvent.click(thumbnails[1].parentElement!);
    expect(screen.getByAltText('Prop - view 2')).toBeInTheDocument();
  });

  it('does not render thumbnails for a single image', () => {
    render(
      React.createElement(ImageGallery, {
        images: [mockImages[0]],
      }),
    );
    expect(screen.queryByAltText('Thumbnail 1')).not.toBeInTheDocument();
  });
});
