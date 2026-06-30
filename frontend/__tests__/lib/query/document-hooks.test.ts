import { describe, it, expect, vi, beforeEach } from 'vitest';
import { queryKeys } from '@/lib/query/keys';

describe('document query keys', () => {
  it('all is a stable tuple', () => {
    expect(queryKeys.documents.all).toEqual(['documents']);
  });

  it('lists extends all', () => {
    expect(queryKeys.documents.lists()).toEqual(['documents', 'list']);
  });

  it('list includes filters', () => {
    const key = queryKeys.documents.list({ status: 'ACTIVE' });
    expect(key).toEqual(['documents', 'list', { status: 'ACTIVE' }]);
  });

  it('detail includes the id', () => {
    expect(queryKeys.documents.detail('doc-1')).toEqual([
      'documents',
      'detail',
      'doc-1',
    ]);
  });

  it('shared is a stable key', () => {
    expect(queryKeys.documents.shared()).toEqual(['documents', 'shared']);
  });
});

describe('document hooks API mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps API response to DocumentRecord correctly', async () => {
    const apiResponse = {
      id: 'doc-1',
      name: 'Test Document.pdf',
      type: 'LEASE',
      status: 'ACTIVE',
      category: 'lease',
      fileKey: 'docs/user/test.pdf',
      fileSize: 1024000,
      fileType: 'application/pdf',
      propertyId: 'prop-1',
      tenantId: null,
      ownerId: 'user-1',
      description: 'A test document',
      sharedWith: null,
      createdAt: '2026-01-15T10:00:00.000Z',
      updatedAt: '2026-01-15T10:00:00.000Z',
    };

    const { DocumentRecord } =
      await import('@/lib/query/hooks/use-landlord-documents');

    const mapped: DocumentRecord = {
      id: apiResponse.id,
      name: apiResponse.name,
      type: apiResponse.type as any,
      status: apiResponse.status as any,
      category: apiResponse.category,
      fileSize: apiResponse.fileSize,
      fileType: apiResponse.fileType,
      propertyId: apiResponse.propertyId || '',
      tenantId: apiResponse.tenantId || undefined,
      url: `/api/documents/${apiResponse.id}/download?key=${encodeURIComponent(apiResponse.fileKey)}`,
      uploadedAt: apiResponse.createdAt,
      description: apiResponse.description || undefined,
      propertyName: '',
    } as DocumentRecord;

    expect(mapped.id).toBe('doc-1');
    expect(mapped.name).toBe('Test Document.pdf');
    expect(mapped.type).toBe('LEASE');
    expect(mapped.status).toBe('ACTIVE');
    expect(mapped.category).toBe('lease');
    expect(mapped.fileSize).toBe(1024000);
    expect(mapped.fileType).toBe('application/pdf');
    expect(mapped.propertyId).toBe('prop-1');
    expect(mapped.uploadedAt).toBe('2026-01-15T10:00:00.000Z');
    expect(mapped.description).toBe('A test document');
  });

  it('handles nullable fields in API response', async () => {
    const apiResponse = {
      id: 'doc-2',
      name: 'Minimal Doc.txt',
      type: 'OTHER',
      status: 'ACTIVE',
      category: 'other',
      fileKey: 'docs/user/minimal.txt',
      fileSize: 1000,
      fileType: 'text/plain',
      propertyId: null,
      tenantId: null,
      ownerId: 'user-2',
      description: null,
      sharedWith: null,
      createdAt: '2026-02-01T10:00:00.000Z',
      updatedAt: '2026-02-01T10:00:00.000Z',
    };

    const { DocumentRecord } =
      await import('@/lib/query/hooks/use-landlord-documents');

    const mapped: DocumentRecord = {
      id: apiResponse.id,
      name: apiResponse.name,
      type: (apiResponse.type as any) || 'OTHER',
      status: (apiResponse.status as any) || 'ACTIVE',
      category: apiResponse.category || 'other',
      fileSize: apiResponse.fileSize,
      fileType: apiResponse.fileType,
      propertyId: apiResponse.propertyId || '',
      tenantId: undefined,
      url: `/api/documents/${apiResponse.id}/download?key=${encodeURIComponent(apiResponse.fileKey)}`,
      uploadedAt: apiResponse.createdAt,
      description: undefined,
      propertyName: '',
    } as DocumentRecord;

    expect(mapped.id).toBe('doc-2');
    expect(mapped.propertyId).toBe('');
    expect(mapped.tenantId).toBeUndefined();
    expect(mapped.description).toBeUndefined();
  });
});
