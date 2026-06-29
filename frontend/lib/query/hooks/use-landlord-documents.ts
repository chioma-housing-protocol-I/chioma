'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '../keys';
import { storageApi } from '@/lib/api/storage';

export type DocumentStatus = 'ACTIVE' | 'ARCHIVED' | 'EXPIRED';
export type DocumentType =
  'LEASE' | 'INSPECTION' | 'RECEIPT' | 'CONTRACT' | 'OTHER';

export interface DocumentFilters {
  status?: DocumentStatus | 'ALL';
  type?: DocumentType | 'ALL';
  category?: string;
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
  category: string;
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

interface ApiDocumentResponse {
  id: string;
  name: string;
  type: string;
  status: string;
  category: string;
  fileKey: string;
  fileSize: number;
  fileType: string;
  propertyId: string | null;
  tenantId: string | null;
  ownerId: string;
  description: string | null;
  sharedWith: string[] | null;
  createdAt: string;
  updatedAt: string;
}

function mapApiDoc(doc: ApiDocumentResponse): DocumentRecord {
  return {
    id: doc.id,
    name: doc.name,
    type: (doc.type as DocumentType) || 'OTHER',
    status: (doc.status as DocumentStatus) || 'ACTIVE',
    category: doc.category || 'other',
    propertyName: '',
    propertyId: doc.propertyId || '',
    tenantName: undefined,
    tenantId: doc.tenantId || undefined,
    fileSize: doc.fileSize,
    fileType: doc.fileType,
    url: `${process.env.NEXT_PUBLIC_API_URL || '/api'}/documents/${doc.id}/download?key=${encodeURIComponent(doc.fileKey)}`,
    uploadedAt: doc.createdAt,
    description: doc.description || undefined,
  };
}

export function useLandlordDocuments(filters: DocumentFilters = {}) {
  return useQuery({
    queryKey: queryKeys.documents.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status && filters.status !== 'ALL')
        params.append('status', filters.status);
      if (filters.type && filters.type !== 'ALL')
        params.append('type', filters.type);
      if (filters.category) params.append('category', filters.category);
      if (filters.propertyId) params.append('propertyId', filters.propertyId);
      if (filters.search) params.append('search', filters.search);
      params.append('limit', String(filters.limit || 20));
      params.append('page', String(filters.page || 0));

      const response = await apiClient.get<{
        data: ApiDocumentResponse[];
        total: number;
      }>(`/documents?${params}`);

      const data = response.data;
      const apiDocs = Array.isArray(data) ? data : data?.data || [];
      return (apiDocs as ApiDocumentResponse[]).map(mapApiDoc);
    },
  });
}

export function useSharedDocuments() {
  return useQuery({
    queryKey: queryKeys.documents.shared(),
    queryFn: async () => {
      const response = await apiClient.get<{
        data: ApiDocumentResponse[];
        total: number;
      }>('/documents?role=shared');
      const data = response.data;
      const apiDocs = Array.isArray(data) ? data : data?.data || [];
      return (apiDocs as ApiDocumentResponse[]).map(mapApiDoc);
    },
  });
}

export function useDocument(id: string | null) {
  return useQuery({
    queryKey: queryKeys.documents.detail(id ?? ''),
    queryFn: async () => {
      const response = await apiClient.get<ApiDocumentResponse>(
        `/documents/${id}`,
      );
      return mapApiDoc(response.data);
    },
    enabled: Boolean(id),
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
      const { url: uploadUrl, key } = await storageApi.getUploadUrl(
        file.name,
        file.size,
        file.type,
      );
      await storageApi.uploadToS3(uploadUrl, file);
      await apiClient.post('/documents', {
        name: metadata.name || file.name,
        type: metadata.type || 'OTHER',
        category: metadata.category || 'other',
        fileKey: key,
        fileSize: file.size,
        fileType: file.type,
        propertyId: metadata.propertyId || undefined,
        tenantId: metadata.tenantId || undefined,
        description: metadata.description || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      documentId,
      ...data
    }: {
      documentId: string;
      name?: string;
      status?: DocumentStatus;
      description?: string;
    }) => {
      await apiClient.patch(`/documents/${documentId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
    },
  });
}
