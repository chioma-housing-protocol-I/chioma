import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const getUploadUrl = vi.fn();
const uploadToS3 = vi.fn();

vi.mock('../../../lib/api/storage', () => ({
  storageApi: {
    getUploadUrl: (...args: unknown[]) => getUploadUrl(...args),
    uploadToS3: (...args: unknown[]) => uploadToS3(...args),
  },
}));

import { FileUpload } from '../FileUpload';

function makeFile(name: string, size = 1024, type = 'text/plain') {
  const file = new File(['a'.repeat(size)], name, { type });
  return file;
}

describe('FileUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <FileUpload isOpen={false} onClose={vi.fn()} onUploadSuccess={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the upload dialog when open', () => {
    render(<FileUpload isOpen onClose={vi.fn()} onUploadSuccess={vi.fn()} />);

    expect(screen.getByText('Upload Files')).toBeInTheDocument();
    expect(screen.getByText('Drag & drop files here')).toBeInTheDocument();
  });

  it('disables the Start Upload button when no files are selected', () => {
    render(<FileUpload isOpen onClose={vi.fn()} onUploadSuccess={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Start Upload' })).toBeDisabled();
  });

  it('adds a file via the file input and enables the Start Upload button', () => {
    const { container } = render(
      <FileUpload isOpen onClose={vi.fn()} onUploadSuccess={vi.fn()} />,
    );

    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = makeFile('lease.pdf');
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText('lease.pdf')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Start Upload' }),
    ).not.toBeDisabled();
  });

  it('removes a file from the list when its remove button is clicked', () => {
    const { container } = render(
      <FileUpload isOpen onClose={vi.fn()} onUploadSuccess={vi.fn()} />,
    );

    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile('lease.pdf')] } });

    expect(screen.getByText('lease.pdf')).toBeInTheDocument();

    const removeButton = screen
      .getByText('lease.pdf')
      .closest('div.p-4')!
      .querySelector('button')!;
    fireEvent.click(removeButton);

    expect(screen.queryByText('lease.pdf')).not.toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<FileUpload isOpen onClose={onClose} onUploadSuccess={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('uploads selected files and calls onUploadSuccess and onClose on completion', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getUploadUrl.mockResolvedValue({
      url: 'https://s3.example.com/put',
      key: 'k1',
    });
    uploadToS3.mockResolvedValue(undefined);

    const onUploadSuccess = vi.fn();
    const onClose = vi.fn();
    const { container } = render(
      <FileUpload isOpen onClose={onClose} onUploadSuccess={onUploadSuccess} />,
    );

    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile('lease.pdf')] } });

    fireEvent.click(screen.getByRole('button', { name: 'Start Upload' }));

    await waitFor(() =>
      expect(getUploadUrl).toHaveBeenCalledWith(
        'lease.pdf',
        expect.any(Number),
        'text/plain',
      ),
    );
    await waitFor(() => expect(uploadToS3).toHaveBeenCalled());

    await vi.advanceTimersByTimeAsync(1500);

    expect(onUploadSuccess).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it('shows an error indicator when the upload fails', async () => {
    getUploadUrl.mockRejectedValue(new Error('network error'));
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const { container } = render(
      <FileUpload isOpen onClose={vi.fn()} onUploadSuccess={vi.fn()} />,
    );

    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile('lease.pdf')] } });

    fireEvent.click(screen.getByRole('button', { name: 'Start Upload' }));

    await waitFor(() => {
      expect(container.querySelector('[title="Upload failed"]')).toBeTruthy();
    });

    consoleErrorSpy.mockRestore();
  });
});
