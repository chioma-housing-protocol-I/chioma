import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

const useLandlordDocumentsMock = vi.fn();
const deleteMutateMock = vi.fn();
const archiveMutateMock = vi.fn();

vi.mock('@/lib/query/hooks/use-landlord-documents', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@/lib/query/hooks/use-landlord-documents')
    >();
  return {
    ...actual,
    useLandlordDocuments: (...args: unknown[]) =>
      useLandlordDocumentsMock(...args),
    useDeleteDocument: () => ({
      mutate: deleteMutateMock,
      isPending: false,
    }),
    useArchiveDocument: () => ({
      mutate: archiveMutateMock,
      isPending: false,
    }),
  };
});

import { DocumentsList } from '../DocumentsList';
import type { DocumentRecord } from '@/lib/query/hooks/use-landlord-documents';

const mockDocuments: DocumentRecord[] = [
  {
    id: 'doc-1',
    name: 'Lease Agreement.pdf',
    type: 'LEASE',
    status: 'ACTIVE',
    category: 'legal',
    propertyName: 'Sunset Apartments',
    propertyId: 'prop-1',
    tenantName: 'John Tenant',
    tenantId: 'tenant-1',
    fileSize: 204800,
    fileType: 'application/pdf',
    url: 'https://example.com/doc-1.pdf',
    uploadedAt: new Date().toISOString(),
    description: 'Signed lease',
  },
  {
    id: 'doc-2',
    name: 'Inspection Report.pdf',
    type: 'INSPECTION',
    status: 'ARCHIVED',
    category: 'inspection',
    propertyName: 'Ocean View',
    propertyId: 'prop-2',
    fileSize: 1048576,
    fileType: 'application/pdf',
    url: 'https://example.com/doc-2.pdf',
    uploadedAt: new Date().toISOString(),
  },
];

function mockHookState(
  overrides: Partial<ReturnType<typeof defaultState>> = {},
) {
  useLandlordDocumentsMock.mockReturnValue({ ...defaultState(), ...overrides });
}

function defaultState() {
  return { data: mockDocuments, isLoading: false, error: null };
}

describe('DocumentsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('shows a loading state while documents are being fetched', () => {
    mockHookState({ isLoading: true, data: [] });
    render(<DocumentsList />);

    expect(screen.getByText('Loading documents...')).toBeInTheDocument();
  });

  it('shows an error state when fetching fails', () => {
    mockHookState({ error: new Error('boom'), data: [] });
    render(<DocumentsList />);

    expect(screen.getByText('Failed to load documents')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows an empty state when there are no documents', () => {
    mockHookState({ data: [] });
    render(<DocumentsList />);

    expect(screen.getByText('No documents yet')).toBeInTheDocument();
  });

  it('renders document rows with names, badges, and file sizes', () => {
    mockHookState();
    render(<DocumentsList />);

    expect(screen.getByText('Lease Agreement.pdf')).toBeInTheDocument();
    expect(screen.getByText('Inspection Report.pdf')).toBeInTheDocument();
    expect(screen.getByText('Lease')).toBeInTheDocument();
    expect(screen.getByText('Inspection')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Archived')).toBeInTheDocument();
    expect(screen.getByText('200.00 KB')).toBeInTheDocument();
    expect(screen.getByText('2 documents')).toBeInTheDocument();
  });

  it('only shows the archive action for active documents', () => {
    mockHookState();
    render(<DocumentsList />);

    const archiveButtons = screen.getAllByText('Archive');
    expect(archiveButtons).toHaveLength(1);
  });

  it('updates the search filter as the user types', () => {
    mockHookState();
    render(<DocumentsList />);

    const searchInput = screen.getByPlaceholderText('Search documents...');
    fireEvent.change(searchInput, { target: { value: 'lease' } });

    expect(useLandlordDocumentsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'lease' }),
    );
  });

  it('confirms and deletes a document when the delete action is clicked', () => {
    mockHookState();
    render(<DocumentsList />);

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(deleteMutateMock).toHaveBeenCalledWith('doc-1');
  });

  it('confirms and archives an active document', () => {
    mockHookState();
    render(<DocumentsList />);

    fireEvent.click(screen.getByText('Archive'));

    expect(window.confirm).toHaveBeenCalled();
    expect(archiveMutateMock).toHaveBeenCalledWith('doc-1');
  });

  it('calls onViewDocument when provided instead of navigating via link', () => {
    mockHookState();
    const onViewDocument = vi.fn();
    render(<DocumentsList onViewDocument={onViewDocument} />);

    const viewButtons = screen.getAllByText('View');
    fireEvent.click(viewButtons[0]);

    expect(onViewDocument).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'doc-1' }),
    );
  });
});
