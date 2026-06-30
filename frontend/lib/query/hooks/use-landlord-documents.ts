'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export type DocumentStatus = 'ACTIVE' | 'ARCHIVED' | 'EXPIRED';
export type DocumentType =
  'LEASE' | 'INSPECTION' | 'RECEIPT' | 'CONTRACT' | 'OTHER';

export interface DocumentFilters {
  status?: DocumentStatus | 'ALL';
  type?: DocumentType | 'ALL';
  propertyId?: string;
  search?: string;
  sort?: 'uploadedAt' | 'name' | 'type';
  page?: number;
  limit?: number;
}

export interface DocumentRecord {
  id: string;
  name: string;
  type: DocumentType;
  status: DocumentStatus;
  propertyName: string;
  propertyId: string;
  tenantName?: string;
  tenantId?: string;
  fileSize: number;
  fileType: string;
  url: string;
  uploadedAt: string;
  expiresAt?: string;
  description?: string;
}

const LANDLORD_DOCUMENTS_QUERY_KEY = ['landlord-documents'] as const;

const mockDocuments: DocumentRecord[] = [
  {
    id: 'doc-001',
    name: 'Lease Agreement - Unit 4B',
    type: 'LEASE',
    status: 'ACTIVE',
    propertyName: 'Sunset Apartments, Unit 4B',
    propertyId: 'prop-001',
    tenantName: 'Chioma Okafor',
    tenantId: 'tenant-001',
    fileSize: 2458000,
    fileType: 'application/pdf',
    url: '/documents/lease-unit-4b.pdf',
    uploadedAt: '2026-01-15T10:00:00.000Z',
    expiresAt: '2027-01-15T10:00:00.000Z',
    description: 'Annual lease agreement for Unit 4B',
  },
  {
    id: 'doc-002',
    name: 'Move-in Inspection Report',
    type: 'INSPECTION',
    status: 'ACTIVE',
    propertyName: 'Sunset Apartments, Unit 4B',
    propertyId: 'prop-001',
    tenantName: 'Chioma Okafor',
    tenantId: 'tenant-001',
    fileSize: 1850000,
    fileType: 'application/pdf',
    url: '/documents/inspection-unit-4b.pdf',
    uploadedAt: '2026-01-15T11:00:00.000Z',
    description: 'Property condition report at move-in',
  },
  {
    id: 'doc-003',
    name: 'Rent Receipt - March 2026',
    type: 'RECEIPT',
    status: 'ACTIVE',
    propertyName: 'Sunset Apartments, Unit 4B',
    propertyId: 'prop-001',
    tenantName: 'Chioma Okafor',
    tenantId: 'tenant-001',
    fileSize: 450000,
    fileType: 'application/pdf',
    url: '/documents/receipt-march-2026.pdf',
    uploadedAt: '2026-03-01T09:00:00.000Z',
    description: 'Rent payment receipt for March 2026',
  },
  {
    id: 'doc-004',
    name: 'Lease Agreement - Unit 2A',
    type: 'LEASE',
    status: 'ACTIVE',
    propertyName: 'Sunset Apartments, Unit 2A',
    propertyId: 'prop-001',
    tenantName: 'Adebayo Mensah',
    tenantId: 'tenant-002',
    fileSize: 2380000,
    fileType: 'application/pdf',
    url: '/documents/lease-unit-2a.pdf',
    uploadedAt: '2026-02-01T10:00:00.000Z',
    expiresAt: '2027-02-01T10:00:00.000Z',
    description: 'Annual lease agreement for Unit 2A',
  },
  {
    id: 'doc-005',
    name: 'Property Insurance Certificate',
    type: 'CONTRACT',
    status: 'ACTIVE',
    propertyName: 'Sunset Apartments',
    propertyId: 'prop-001',
    fileSize: 1200000,
    fileType: 'application/pdf',
    url: '/documents/insurance-sunset.pdf',
    uploadedAt: '2026-01-01T10:00:00.000Z',
    expiresAt: '2027-01-01T10:00:00.000Z',
    description: 'Property insurance certificate',
  },
  {
    id: 'doc-006',
    name: 'Lease Agreement - Unit 7C',
    type: 'LEASE',
    status: 'ARCHIVED',
    propertyName: 'Lagos Heights, Unit 7C',
    propertyId: 'prop-002',
    tenantName: 'Ngozi Eze',
    tenantId: 'tenant-003',
    fileSize: 2420000,
    fileType: 'application/pdf',
    url: '/documents/lease-unit-7c.pdf',
    uploadedAt: '2025-06-01T10:00:00.000Z',
    description: 'Previous lease agreement for Unit 7C',
  },
];

function matchesFilter(doc: DocumentRecord, filters: DocumentFilters): boolean {
  if (
    filters.status &&
    filters.status !== 'ALL' &&
    doc.status !== filters.status
  ) {
    return false;
  }
  if (filters.type && filters.type !== 'ALL' && doc.type !== filters.type) {
    return false;
  }
  if (filters.propertyId && doc.propertyId !== filters.propertyId) {
    return false;
  }
  const normalizedSearch = filters.search?.trim().toLowerCase() || '';
  if (normalizedSearch) {
    const searchable = [
      doc.name,
      doc.propertyName,
      doc.tenantName || '',
      doc.description || '',
    ]
      .join(' ')
      .toLowerCase();
    if (!searchable.includes(normalizedSearch)) return false;
  }
  return true;
}

export function useLandlordDocuments(filters: DocumentFilters = {}) {
  return useQuery({
    queryKey: [...LANDLORD_DOCUMENTS_QUERY_KEY, filters],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({
          role: 'landlord',
          ...(filters.status &&
            filters.status !== 'ALL' && { status: filters.status }),
          ...(filters.type && filters.type !== 'ALL' && { type: filters.type }),
          ...(filters.propertyId && { propertyId: filters.propertyId }),
          ...(filters.search && { search: filters.search }),
          limit: (filters.limit || 20).toString(),
          page: (filters.page || 0).toString(),
        });
        const responseData = await apiClient.get<{
          data?: DocumentRecord[] | { documents?: DocumentRecord[] };
        }>(`/documents?${params}`);
        const apiData = responseData.data;
        // Normalize API response to DocumentRecord
        const documents: DocumentRecord[] = (
          (apiData?.data as DocumentRecord[] | undefined) ||
          (apiData as { documents?: DocumentRecord[] })?.documents ||
          []
        ).map((d: DocumentRecord) => ({
          id: String(d.id),
          name: d.name || '',
          type: (d.type as DocumentType) || 'OTHER',
          status: (d.status as DocumentStatus) || 'ACTIVE',
          propertyName: d.propertyName || 'Rental Property',
          propertyId: String(d.propertyId || ''),
          tenantName: d.tenantName,
          tenantId: d.tenantId ? String(d.tenantId) : undefined,
          fileSize: d.fileSize || 0,
          fileType: d.fileType || 'application/octet-stream',
          url: d.url || '',
          uploadedAt: d.uploadedAt || new Date().toISOString(),
          expiresAt: d.expiresAt,
          description: d.description,
        }));
        return documents.length > 0 ? documents : mockDocuments;
      } catch {
        return mockDocuments;
      }
    },
    select: (documents) => documents.filter((d) => matchesFilter(d, filters)),
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      metadata,
    }: {
      file: File;
      metadata: Partial<DocumentRecord>;
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      Object.entries(metadata).forEach(([key, value]) => {
        if (value !== undefined) {
          formData.append(key, String(value));
        }
      });
      await apiClient.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LANDLORD_DOCUMENTS_QUERY_KEY });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (documentId: string) => {
      await apiClient.delete(`/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LANDLORD_DOCUMENTS_QUERY_KEY });
    },
  });
}

export function useArchiveDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (documentId: string) => {
      await apiClient.patch(`/documents/${documentId}`, { status: 'ARCHIVED' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LANDLORD_DOCUMENTS_QUERY_KEY });
    },
  });
}

export function useShareDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      documentId,
      tenantId,
    }: {
      documentId: string;
      tenantId: string;
    }) => {
      await apiClient.post(`/documents/${documentId}/share`, { tenantId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LANDLORD_DOCUMENTS_QUERY_KEY });
    },
  });
}
