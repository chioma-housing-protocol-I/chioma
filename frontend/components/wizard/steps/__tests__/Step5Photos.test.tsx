import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

const axiosPostMock = vi.fn();
vi.mock('axios', () => ({
  default: {
    post: (...args: unknown[]) => axiosPostMock(...args),
  },
}));

import toast from 'react-hot-toast';
import { Step5Photos } from '../Step5Photos';
import type { PropertyData } from '@/store/wizard-store';

function makeFile(name: string, size: number, type = 'image/png') {
  const file = new File(['x'.repeat(Math.min(size, 10))], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('Step5Photos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the required-photos count and hint', () => {
    render(
      <Step5Photos data={{ photos: [] }} onChange={vi.fn()} errors={{}} />,
    );

    expect(screen.getByText('0 / 20 Photos')).toBeInTheDocument();
    expect(screen.getByText('At least 3 required')).toBeInTheDocument();
  });

  it('shows the required-photos error message when errors.photos is set', () => {
    render(
      <Step5Photos
        data={{ photos: [] }}
        onChange={vi.fn()}
        errors={{ photos: 'Required' }}
      />,
    );

    expect(screen.getByText('Required Photos')).toBeInTheDocument();
    expect(
      screen.getByText(
        'You need to upload at least 3 photos of the property to continue.',
      ),
    ).toBeInTheDocument();
  });

  it('does not show the required-photos error when there is no error', () => {
    render(
      <Step5Photos data={{ photos: [] }} onChange={vi.fn()} errors={{}} />,
    );

    expect(screen.queryByText('Required Photos')).not.toBeInTheDocument();
  });

  it('renders existing photos with a Cover Photo badge on the first image', () => {
    const data: PropertyData = {
      photos: [
        { url: 'https://example.com/1.jpg', caption: 'Front', order: 0 },
        { url: 'https://example.com/2.jpg', caption: '', order: 1 },
      ],
    };
    render(<Step5Photos data={data} onChange={vi.fn()} errors={{}} />);

    expect(screen.getByText('2 / 20 Photos')).toBeInTheDocument();
    expect(screen.getByText('Cover Photo')).toBeInTheDocument();
    expect(screen.getByAltText('Photo 1')).toHaveAttribute(
      'src',
      'https://example.com/1.jpg',
    );
    expect(screen.getByDisplayValue('Front')).toBeInTheDocument();
  });

  it('removes a photo when its remove button is clicked', () => {
    const onChange = vi.fn();
    const data: PropertyData = {
      photos: [
        { url: 'https://example.com/1.jpg', caption: 'Front', order: 0 },
        { url: 'https://example.com/2.jpg', caption: 'Back', order: 1 },
      ],
    };
    render(<Step5Photos data={data} onChange={onChange} errors={{}} />);

    const removeButtons = screen
      .getAllByRole('button')
      .filter((btn) => btn.querySelector('svg.lucide-x'));
    fireEvent.click(removeButtons[0]);

    expect(onChange).toHaveBeenCalledWith({
      photos: [{ url: 'https://example.com/2.jpg', caption: 'Back', order: 0 }],
    });
  });

  it('updates a photo caption as the user types', () => {
    const onChange = vi.fn();
    const data: PropertyData = {
      photos: [{ url: 'https://example.com/1.jpg', caption: '', order: 0 }],
    };
    render(<Step5Photos data={data} onChange={onChange} errors={{}} />);

    const captionInput = screen.getByPlaceholderText('Add caption...');
    fireEvent.change(captionInput, { target: { value: 'New caption' } });

    expect(onChange).toHaveBeenCalledWith({
      photos: [
        { url: 'https://example.com/1.jpg', caption: 'New caption', order: 0 },
      ],
    });
  });

  it('uploads a selected file and appends it to photos', async () => {
    axiosPostMock.mockResolvedValue({
      data: { url: 'https://example.com/uploaded.jpg' },
    });
    const onChange = vi.fn();
    const { container } = render(
      <Step5Photos data={{ photos: [] }} onChange={onChange} errors={{}} />,
    );

    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = makeFile('photo.png', 1024);

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        photos: [
          { url: 'https://example.com/uploaded.jpg', caption: '', order: 0 },
        ],
      });
    });
  });

  it('rejects a file that exceeds the 10MB limit', async () => {
    const onChange = vi.fn();
    const { container } = render(
      <Step5Photos data={{ photos: [] }} onChange={onChange} errors={{}} />,
    );

    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const bigFile = makeFile('big.png', 11 * 1024 * 1024);

    fireEvent.change(fileInput, { target: { files: [bigFile] } });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('big.png exceeds 10MB limit');
    });
    expect(axiosPostMock).not.toHaveBeenCalled();
  });

  it('rejects uploads that would exceed the 20 photo maximum', () => {
    const existingPhotos = Array.from({ length: 20 }, (_, i) => ({
      url: `https://example.com/${i}.jpg`,
      caption: '',
      order: i,
    }));
    const onChange = vi.fn();
    const { container } = render(
      <Step5Photos
        data={{ photos: existingPhotos }}
        onChange={onChange}
        errors={{}}
      />,
    );

    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = makeFile('one-more.png', 1024);

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(toast.error).toHaveBeenCalledWith('Maximum 20 photos allowed');
    expect(onChange).not.toHaveBeenCalled();
  });
});
