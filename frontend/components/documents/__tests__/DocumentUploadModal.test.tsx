import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

import toast from 'react-hot-toast';
import { DocumentUploadModal } from '../DocumentUploadModal';

function makeFile(name = 'lease.pdf', type = 'application/pdf') {
  return new File(['dummy content'], name, { type });
}

function selectFiles(container: HTMLElement, files: File[]) {
  const input = container.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement;
  fireEvent.change(input, { target: { files } });
}

describe('DocumentUploadModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <DocumentUploadModal
        isOpen={false}
        onClose={vi.fn()}
        onUpload={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the modal title, category select, and description field', () => {
    render(<DocumentUploadModal isOpen onClose={vi.fn()} onUpload={vi.fn()} />);
    expect(screen.getByText('Upload Documents')).toBeInTheDocument();
    expect(screen.getByText('Document Category')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        'Add a brief description of the document(s)...',
      ),
    ).toBeInTheDocument();
  });

  it('renders a custom title when provided', () => {
    render(
      <DocumentUploadModal
        isOpen
        onClose={vi.fn()}
        onUpload={vi.fn()}
        title="Lease Uploads"
      />,
    );
    expect(screen.getByText('Lease Uploads')).toBeInTheDocument();
  });

  it('disables the upload button until a file is selected', () => {
    const { container } = render(
      <DocumentUploadModal isOpen onClose={vi.fn()} onUpload={vi.fn()} />,
    );
    const uploadButton = screen.getByRole('button', { name: /^Upload/i });
    expect(uploadButton).toBeDisabled();

    selectFiles(container, [makeFile()]);

    expect(uploadButton).not.toBeDisabled();
    expect(screen.getByText('1 file selected')).toBeInTheDocument();
  });

  it('shows the plural file count once multiple files are selected', () => {
    const { container } = render(
      <DocumentUploadModal isOpen onClose={vi.fn()} onUpload={vi.fn()} />,
    );
    selectFiles(container, [makeFile('a.pdf'), makeFile('b.pdf')]);
    expect(screen.getByText('2 files selected')).toBeInTheDocument();
  });

  it('updates the description character counter as text is typed', () => {
    render(<DocumentUploadModal isOpen onClose={vi.fn()} onUpload={vi.fn()} />);
    const textarea = screen.getByPlaceholderText(
      'Add a brief description of the document(s)...',
    );
    fireEvent.change(textarea, { target: { value: 'Signed lease copy' } });
    expect(screen.getByText('17/500')).toBeInTheDocument();
  });

  it('changes the selected document category', () => {
    render(<DocumentUploadModal isOpen onClose={vi.fn()} onUpload={vi.fn()} />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('other');
    fireEvent.change(select, { target: { value: 'lease' } });
    expect(select.value).toBe('lease');
  });

  it('uploads the selected files with metadata and closes on success', async () => {
    const onUpload = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const { container } = render(
      <DocumentUploadModal isOpen onClose={onClose} onUpload={onUpload} />,
    );

    selectFiles(container, [makeFile('lease.pdf')]);
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'lease' },
    });
    fireEvent.change(
      screen.getByPlaceholderText(
        'Add a brief description of the document(s)...',
      ),
      { target: { value: 'Signed copy' } },
    );

    fireEvent.click(screen.getByRole('button', { name: /^Upload/i }));

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith(
        [expect.objectContaining({ name: 'lease.pdf' })],
        { category: 'lease', description: 'Signed copy' },
      );
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Successfully uploaded 1 file',
      );
    });

    await waitFor(
      () => {
        expect(onClose).toHaveBeenCalledTimes(1);
      },
      { timeout: 2000 },
    );
  });

  it('shows an error toast when onUpload rejects', async () => {
    const onUpload = vi.fn().mockRejectedValue(new Error('Upload failed'));
    const { container } = render(
      <DocumentUploadModal isOpen onClose={vi.fn()} onUpload={onUpload} />,
    );

    selectFiles(container, [makeFile()]);
    fireEvent.click(screen.getByRole('button', { name: /^Upload/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Upload failed');
    });
  });

  it('calls onClose directly when cancel is clicked while idle', () => {
    const onClose = vi.fn();
    render(<DocumentUploadModal isOpen onClose={onClose} onUpload={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('disables the cancel and close buttons while an upload is in progress', async () => {
    let resolveUpload: () => void = () => {};
    const onUpload = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveUpload = resolve;
        }),
    );
    const onClose = vi.fn();
    const { container } = render(
      <DocumentUploadModal isOpen onClose={onClose} onUpload={onUpload} />,
    );

    selectFiles(container, [makeFile()]);
    fireEvent.click(screen.getByRole('button', { name: /^Upload/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Uploading...').length).toBeGreaterThan(0);
    });

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(onClose).not.toHaveBeenCalled();

    resolveUpload();
  });
});
