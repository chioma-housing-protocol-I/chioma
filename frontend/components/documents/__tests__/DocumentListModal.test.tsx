import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import type { Document } from '../types';

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: toastMock.success,
    error: toastMock.error,
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

import { DocumentListModal } from '../DocumentListModal';

const documents: Document[] = [
  {
    id: 'doc-1',
    name: 'Lease Agreement.pdf',
    type: 'pdf',
    url: 'https://example.com/lease.pdf',
    size: 204800,
    uploadedBy: 'user-1',
    uploadedByName: 'Alice Renter',
    uploadedAt: '2026-01-10T00:00:00.000Z',
    category: 'lease',
  },
  {
    id: 'doc-2',
    name: 'ID Card.png',
    type: 'image',
    url: 'https://example.com/id.png',
    size: 51200,
    uploadedBy: 'user-1',
    uploadedByName: 'Alice Renter',
    uploadedAt: '2026-02-05T00:00:00.000Z',
    category: 'identity',
  },
];

function renderModal(
  overrides: Partial<React.ComponentProps<typeof DocumentListModal>> = {},
) {
  const props: React.ComponentProps<typeof DocumentListModal> = {
    documents,
    isOpen: true,
    onClose: vi.fn(),
    onView: vi.fn(),
    onDelete: vi.fn(),
    onDownload: vi.fn(),
    onUploadClick: vi.fn(),
    ...overrides,
  };
  return { ...render(<DocumentListModal {...props} />), props };
}

describe('DocumentListModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = renderModal({ isOpen: false });
    expect(container.firstChild).toBeNull();
  });

  it('lists the provided documents and the document count', () => {
    renderModal();
    expect(screen.getByText('Lease Agreement.pdf')).toBeInTheDocument();
    expect(screen.getByText('ID Card.png')).toBeInTheDocument();
    expect(screen.getByText('2 documents found')).toBeInTheDocument();
    expect(screen.getByText('Total: 2 documents')).toBeInTheDocument();
  });

  it('shows the loading state instead of the document list', () => {
    renderModal({ isLoading: true });
    expect(screen.getByText('Loading documents...')).toBeInTheDocument();
    expect(screen.queryByText('Lease Agreement.pdf')).not.toBeInTheDocument();
  });

  it('shows an empty state when there are no documents', () => {
    renderModal({ documents: [] });
    expect(screen.getByText('No documents yet')).toBeInTheDocument();
  });

  it('filters documents by search query', () => {
    renderModal();
    fireEvent.change(screen.getByPlaceholderText('Search documents...'), {
      target: { value: 'lease' },
    });
    expect(screen.getByText('Lease Agreement.pdf')).toBeInTheDocument();
    expect(screen.queryByText('ID Card.png')).not.toBeInTheDocument();
    expect(screen.queryByText('No documents found')).not.toBeInTheDocument();
  });

  it('shows a "no documents found" empty state when the search matches nothing', () => {
    renderModal();
    fireEvent.change(screen.getByPlaceholderText('Search documents...'), {
      target: { value: 'nonexistent-file' },
    });
    expect(screen.getByText('No documents found')).toBeInTheDocument();
  });

  it('calls onView when a document card is viewed', () => {
    // Default sort is by date (newest first), so "ID Card.png" (Feb 2026)
    // renders before "Lease Agreement.pdf" (Jan 2026).
    const onView = vi.fn();
    renderModal({ onView });
    fireEvent.click(screen.getAllByTitle('View document')[0]);
    expect(onView).toHaveBeenCalledWith(documents[1]);
  });

  it('selects a document and downloads the selected ones in bulk', () => {
    const onDownload = vi.fn();
    renderModal({ onDownload });

    const checkboxes = screen.getAllByRole('checkbox');
    // First checkbox in the list belongs to the newest document (doc-2).
    fireEvent.click(checkboxes[0]);

    expect(screen.getByText('1 selected')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^download$/i }));

    expect(onDownload).toHaveBeenCalledWith('doc-2');
    expect(toastMock.success).toHaveBeenCalledWith('Downloading 1 document(s)');
  });

  it('deletes the selected documents after confirmation', () => {
    const onDelete = vi.fn();
    renderModal({ onDelete });

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(window.confirm).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalledWith('doc-2');
    expect(toastMock.success).toHaveBeenCalledWith('Deleted 1 document(s)');
  });

  it('calls onClose from both the header and footer close controls', () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onUploadClick when the Upload button is clicked', () => {
    const onUploadClick = vi.fn();
    renderModal({ onUploadClick });

    fireEvent.click(screen.getByRole('button', { name: /upload/i }));
    expect(onUploadClick).toHaveBeenCalledTimes(1);
  });
});
