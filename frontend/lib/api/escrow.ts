/**
 * Stellar escrow API client.
 *
 * Wraps the live backend routes under @Controller('stellar'):
 *   POST   /stellar/escrow               – create a standard escrow
 *   POST   /stellar/escrow/release       – release funds to destination
 *   POST   /stellar/escrow/refund        – refund funds to source
 *   GET    /stellar/escrow/:id           – fetch one escrow by numeric ID
 *   GET    /stellar/escrows              – list escrows (filtered)
 *   POST   /stellar/escrow/multi-sig     – create multi-signature escrow
 *   POST   /stellar/escrow/signature     – add a signature to a multi-sig escrow
 *   POST   /stellar/escrow/release-with-signatures
 *   POST   /stellar/escrow/time-locked   – create a time-locked escrow
 *   GET    /stellar/escrow/:id/time-lock-status
 *   POST   /stellar/escrow/conditional   – create a conditional escrow
 *   GET    /stellar/escrow/:id/conditions
 *   POST   /stellar/escrow/integrate-dispute
 *   POST   /stellar/escrow/release-dispute-resolution
 */

import { apiClient } from '../api-client';

// ---------------------------------------------------------------------------
// Enums (mirror backend)
// ---------------------------------------------------------------------------

export type AssetType = 'native' | 'credit_alphanum4' | 'credit_alphanum12';

export type EscrowStatus =
  | 'created'
  | 'funded'
  | 'released'
  | 'refunded'
  | 'expired'
  | 'disputed';

// ---------------------------------------------------------------------------
// Shared condition shapes
// ---------------------------------------------------------------------------

export interface TimelockCondition {
  releaseAfter?: string;
  expireAfter?: string;
}

export interface MultiSigCondition {
  requiredSignatures: number;
  signers: string[]; // Stellar G... public keys
}

export interface EscrowCondition {
  type: string;
  description: string;
  fulfilled?: boolean;
  fulfilledAt?: string;
}

export interface ReleaseConditions {
  timelock?: TimelockCondition;
  multiSig?: MultiSigCondition;
  conditions?: EscrowCondition[];
}

// ---------------------------------------------------------------------------
// Request / response shapes
// ---------------------------------------------------------------------------

export interface CreateEscrowPayload {
  /** Stellar G... public key */
  sourcePublicKey: string;
  /** Stellar G... public key */
  destinationPublicKey: string;
  /** Decimal string, e.g. "500.0000000" */
  amount: string;
  assetType?: AssetType;
  /** Required when assetType is not native */
  assetCode?: string;
  /** Required when assetType is not native */
  assetIssuer?: string;
  releaseConditions?: ReleaseConditions;
  expirationDate?: string;
  rentAgreementId?: string;
}

export interface ReleaseEscrowPayload {
  escrowId: number;
  memo?: string;
}

export interface RefundEscrowPayload {
  escrowId: number;
  reason?: string;
}

export interface ListEscrowsQuery {
  /** Filter by a Stellar G... public key (source or destination) */
  publicKey?: string;
  status?: EscrowStatus;
  limit?: number;
  offset?: number;
}

export interface EscrowResponse {
  id: number;
  escrowPublicKey: string;
  sourcePublicKey: string;
  destinationPublicKey: string;
  amount: string;
  assetType: AssetType;
  assetCode?: string;
  assetIssuer?: string;
  status: EscrowStatus;
  releaseConditions?: ReleaseConditions;
  expirationDate?: string;
  releasedAt?: string;
  refundedAt?: string;
  releaseTransactionHash?: string;
  refundTransactionHash?: string;
  rentAgreementId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EscrowListResponse {
  escrows: EscrowResponse[];
  total: number;
  limit: number;
  offset: number;
}

// Enhanced escrow types

export interface CreateMultiSigEscrowPayload {
  /** Stellar G... public key */
  sourcePublicKey: string;
  /** Stellar G... public key */
  destinationPublicKey: string;
  amount: string;
  participants: string[];
  requiredSignatures: number;
  assetType?: AssetType;
  assetCode?: string;
  assetIssuer?: string;
  expirationDate?: string;
  rentAgreementId?: string;
}

export interface AddSignaturePayload {
  escrowId: string;
  signerPublicKey: string;
  signature: string;
}

export interface ReleaseWithSignaturesPayload {
  escrowId: string;
  signatures: string[];
}

export interface CreateTimeLockedEscrowPayload {
  sourcePublicKey: string;
  destinationPublicKey: string;
  amount: string;
  /** Unix timestamp (seconds) after which funds become releasable */
  releaseTime: number;
  assetType?: AssetType;
  assetCode?: string;
  assetIssuer?: string;
  rentAgreementId?: string;
}

export interface CreateConditionalEscrowPayload {
  sourcePublicKey: string;
  destinationPublicKey: string;
  amount: string;
  conditions: EscrowCondition[];
  assetType?: AssetType;
  assetCode?: string;
  assetIssuer?: string;
  rentAgreementId?: string;
}

export interface IntegrateDisputePayload {
  escrowId: string;
  disputeId: string;
}

export interface ReleaseDisputeResolutionPayload {
  escrowId: string;
  disputeOutcome: string;
}

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

export const escrowApi = {
  // ── Standard escrow ──────────────────────────────────────────────────────

  create: async (payload: CreateEscrowPayload): Promise<EscrowResponse> => {
    const res = await apiClient.post<EscrowResponse>(
      '/stellar/escrow',
      payload,
    );
    return res.data;
  },

  release: async (payload: ReleaseEscrowPayload): Promise<EscrowResponse> => {
    const res = await apiClient.post<EscrowResponse>(
      '/stellar/escrow/release',
      payload,
    );
    return res.data;
  },

  refund: async (payload: RefundEscrowPayload): Promise<EscrowResponse> => {
    const res = await apiClient.post<EscrowResponse>(
      '/stellar/escrow/refund',
      payload,
    );
    return res.data;
  },

  getById: async (id: number): Promise<EscrowResponse> => {
    const res = await apiClient.get<EscrowResponse>(`/stellar/escrow/${id}`);
    return res.data;
  },

  list: async (query: ListEscrowsQuery = {}): Promise<EscrowListResponse> => {
    const params = new URLSearchParams();
    if (query.publicKey) params.set('publicKey', query.publicKey);
    if (query.status) params.set('status', query.status);
    if (query.limit != null) params.set('limit', String(query.limit));
    if (query.offset != null) params.set('offset', String(query.offset));
    const qs = params.toString();
    const res = await apiClient.get<EscrowListResponse>(
      `/stellar/escrows${qs ? `?${qs}` : ''}`,
    );
    return res.data;
  },

  // ── Multi-signature escrow ───────────────────────────────────────────────

  createMultiSig: async (
    payload: CreateMultiSigEscrowPayload,
  ): Promise<{ escrowId: string; message: string }> => {
    const res = await apiClient.post<{ escrowId: string; message: string }>(
      '/stellar/escrow/multi-sig',
      payload,
    );
    return res.data;
  },

  addSignature: async (
    payload: AddSignaturePayload,
  ): Promise<{ message: string }> => {
    const res = await apiClient.post<{ message: string }>(
      '/stellar/escrow/signature',
      payload,
    );
    return res.data;
  },

  releaseWithSignatures: async (
    payload: ReleaseWithSignaturesPayload,
  ): Promise<{ transactionHash: string; message: string }> => {
    const res = await apiClient.post<{
      transactionHash: string;
      message: string;
    }>('/stellar/escrow/release-with-signatures', payload);
    return res.data;
  },

  // ── Time-locked escrow ───────────────────────────────────────────────────

  createTimeLocked: async (
    payload: CreateTimeLockedEscrowPayload,
  ): Promise<{ escrowId: string; releaseTime: number; message: string }> => {
    const res = await apiClient.post<{
      escrowId: string;
      releaseTime: number;
      message: string;
    }>('/stellar/escrow/time-locked', payload);
    return res.data;
  },

  getTimeLockStatus: async (
    escrowId: string,
  ): Promise<{ isUnlocked: boolean; message: string }> => {
    const res = await apiClient.get<{ isUnlocked: boolean; message: string }>(
      `/stellar/escrow/${encodeURIComponent(escrowId)}/time-lock-status`,
    );
    return res.data;
  },

  // ── Conditional escrow ───────────────────────────────────────────────────

  createConditional: async (
    payload: CreateConditionalEscrowPayload,
  ): Promise<{ escrowId: string; conditions: number; message: string }> => {
    const res = await apiClient.post<{
      escrowId: string;
      conditions: number;
      message: string;
    }>('/stellar/escrow/conditional', payload);
    return res.data;
  },

  validateConditions: async (escrowId: string): Promise<unknown> => {
    const res = await apiClient.get<unknown>(
      `/stellar/escrow/${encodeURIComponent(escrowId)}/conditions`,
    );
    return res.data;
  },

  // ── Dispute integration ──────────────────────────────────────────────────

  integrateDispute: async (
    payload: IntegrateDisputePayload,
  ): Promise<{ message: string }> => {
    const res = await apiClient.post<{ message: string }>(
      '/stellar/escrow/integrate-dispute',
      payload,
    );
    return res.data;
  },

  releaseOnDisputeResolution: async (
    payload: ReleaseDisputeResolutionPayload,
  ): Promise<{ transactionHash: string; message: string }> => {
    const res = await apiClient.post<{
      transactionHash: string;
      message: string;
    }>('/stellar/escrow/release-dispute-resolution', payload);
    return res.data;
  },
};
