import { apiClient } from '../api-client';

export type EscrowStatus =
  'created' | 'funded' | 'released' | 'refunded' | 'disputed' | 'resolved';

export interface Escrow {
  id: string;
  propertyId: string;
  tenantId: string;
  landlordId: string;
  amount: number;
  currency: string;
  status: EscrowStatus;
  createdAt: string;
  updatedAt: string;
  releasedAt: string | null;
  refundedAt: string | null;
}

export interface EscrowDispute {
  id: string;
  escrowId: string;
  initiatedBy: string;
  reason: string;
  status: 'open' | 'under_review' | 'resolved';
  createdAt: string;
  resolvedAt: string | null;
}

export interface CreateEscrowPayload {
  propertyId: string;
  tenantId: string;
  landlordId: string;
  amount: number;
  currency?: string;
}

export const escrowApi = {
  create: async (payload: CreateEscrowPayload): Promise<Escrow> => {
    const response = await apiClient.post<Escrow>('/escrow', payload);
    return response.data;
  },

  getDetails: async (escrowId: string): Promise<Escrow> => {
    const response = await apiClient.get<Escrow>(
      `/escrow/${encodeURIComponent(escrowId)}`,
    );
    return response.data;
  },

  releaseFunds: async (escrowId: string): Promise<Escrow> => {
    const response = await apiClient.post<Escrow>(
      `/escrow/${encodeURIComponent(escrowId)}/release`,
    );
    return response.data;
  },

  refund: async (escrowId: string): Promise<Escrow> => {
    const response = await apiClient.post<Escrow>(
      `/escrow/${encodeURIComponent(escrowId)}/refund`,
    );
    return response.data;
  },

  getStatus: async (escrowId: string): Promise<{ status: EscrowStatus }> => {
    const response = await apiClient.get<{ status: EscrowStatus }>(
      `/escrow/${encodeURIComponent(escrowId)}/status`,
    );
    return response.data;
  },

  openDispute: async (
    escrowId: string,
    reason: string,
  ): Promise<EscrowDispute> => {
    const response = await apiClient.post<EscrowDispute>(
      `/escrow/${encodeURIComponent(escrowId)}/dispute`,
      { reason },
    );
    return response.data;
  },

  getDispute: async (escrowId: string): Promise<EscrowDispute | null> => {
    try {
      const response = await apiClient.get<EscrowDispute>(
        `/escrow/${encodeURIComponent(escrowId)}/dispute`,
      );
      return response.data;
    } catch {
      return null;
    }
  },
};
