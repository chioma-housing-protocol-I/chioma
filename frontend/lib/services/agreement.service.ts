'use client';

import { apiClient } from '@/lib/api-client';

export interface CreateAgreementPayload {
  propertyId: string;
  adminId: string;
  userId: string;
  agentId?: string;
  adminStellarPubKey: string;
  userStellarPubKey: string;
  agentStellarPubKey?: string;
  escrowAccountPubKey?: string;
  monthlyRent: number;
  securityDeposit: number;
  agentCommissionRate?: number;
  startDate: string;
  endDate: string;
  termsAndConditions?: string;
  idempotencyKey?: string;
  renewalOption?: boolean;
  renewalNoticeDate?: string;
  moveInDate?: string;
  moveOutDate?: string;
  utilitiesIncluded?: boolean;
  maintenanceResponsibility?: string;
  earlyTerminationFee?: number;
  lateFeePercentage?: number;
  gracePeriodDays?: number;
}

export interface UpdateAgreementPayload {
  monthlyRent?: number;
  securityDeposit?: number;
  startDate?: string;
  endDate?: string;
  termsAndConditions?: string;
  status?: string;
  renewalOption?: boolean;
  renewalNoticeDate?: string;
  moveInDate?: string;
  moveOutDate?: string;
  utilitiesIncluded?: boolean;
  maintenanceResponsibility?: string;
  earlyTerminationFee?: number;
  lateFeePercentage?: number;
  gracePeriodDays?: number;
}

export interface TerminateAgreementPayload {
  terminationReason: string;
  terminationNotes?: string;
}

export interface RenewAgreementPayload {
  extendMonths?: number;
}

export interface RecordPaymentPayload {
  amount: number;
  paymentDate: string;
  paymentMethod?: string;
  referenceNumber?: string;
  notes?: string;
}

export interface AgreementFilters {
  status?: string;
  landlordId?: string;
  tenantId?: string;
  agentId?: string;
  propertyId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface AgreementTemplate {
  id: string;
  name: string;
  baseContent: string;
  jurisdiction: string;
  isActive: boolean;
  clauses: TemplateClause[];
  createdAt: string;
  updatedAt: string;
}

export interface TemplateClause {
  id: string;
  title: string;
  content: string;
  displayOrder: number;
  isMandatory: boolean;
}

export interface AgreementResponse {
  id: string;
  agreementNumber?: string;
  propertyId?: string;
  adminId?: string;
  userId?: string;
  agentId?: string;
  adminStellarPubKey?: string;
  userStellarPubKey?: string;
  agentStellarPubKey?: string;
  escrowAccountPubKey?: string;
  monthlyRent: number;
  securityDeposit: number;
  agentCommissionRate?: number;
  startDate?: string;
  endDate?: string;
  termsAndConditions?: string;
  status: string;
  renewalOption?: boolean;
  renewalNoticeDate?: string;
  moveInDate?: string;
  moveOutDate?: string;
  utilitiesIncluded?: boolean;
  maintenanceResponsibility?: string;
  earlyTerminationFee?: number;
  lateFeePercentage?: number;
  gracePeriodDays?: number;
  totalPaid?: number;
  lastPaymentDate?: string;
  terminationDate?: string;
  terminationReason?: string;
  createdAt: string;
  updatedAt: string;
  property?: { id?: string; title?: string; address?: string };
  tenant?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    email?: string;
  };
  landlord?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    email?: string;
  };
}

export interface AgreementFeeSnapshot {
  monthlyRent: number;
  earlyTerminationFee: number;
  lateFeePercentage: number;
  gracePeriodDays: number;
}

export interface SignaturePayload {
  signature: string;
  signerName: string;
  signedAt: string;
}

class AgreementService {
  private readonly baseEndpoint = '/agreements';

  async create(data: CreateAgreementPayload): Promise<AgreementResponse> {
    const { data: response } = await apiClient.post<AgreementResponse>(
      this.baseEndpoint,
      data,
    );
    return response;
  }

  async getAll(
    filters: AgreementFilters = {},
  ): Promise<{ data: AgreementResponse[]; meta?: { total: number } }> {
    const qs = this.buildQueryString(filters);
    const { data } = await apiClient.get<{
      data: AgreementResponse[];
      meta?: { total: number };
    }>(`${this.baseEndpoint}${qs}`);
    return data;
  }

  async getById(id: string): Promise<AgreementResponse> {
    const { data } = await apiClient.get<AgreementResponse>(
      `${this.baseEndpoint}/${id}`,
    );
    return data;
  }

  async update(
    id: string,
    payload: UpdateAgreementPayload,
  ): Promise<AgreementResponse> {
    const { data } = await apiClient.patch<AgreementResponse>(
      `${this.baseEndpoint}/${id}`,
      payload,
    );
    return data;
  }

  async terminate(
    id: string,
    payload: TerminateAgreementPayload,
  ): Promise<AgreementResponse> {
    const { data } = await apiClient.delete<AgreementResponse>(
      `${this.baseEndpoint}/${id}`,
      { body: payload },
    );
    return data;
  }

  async renew(
    id: string,
    payload: RenewAgreementPayload = {},
  ): Promise<AgreementResponse> {
    const { data } = await apiClient.post<AgreementResponse>(
      `${this.baseEndpoint}/${id}/renew`,
      payload,
    );
    return data;
  }

  async sign(
    id: string,
    payload: SignaturePayload,
  ): Promise<AgreementResponse> {
    const { data } = await apiClient.patch<AgreementResponse>(
      `${this.baseEndpoint}/${id}`,
      { status: 'signed', ...payload },
    );
    return data;
  }

  async downloadPdf(id: string): Promise<Blob> {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('chioma_access_token') ||
          localStorage.getItem('auth_token')
        : null;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const baseUrl =
      typeof window !== 'undefined'
        ? process.env.NEXT_PUBLIC_API_URL || '/api'
        : '/api';
    const response = await fetch(
      `${baseUrl}${this.baseEndpoint}/${id}/download`,
      { headers },
    );
    if (!response.ok) throw new Error('Failed to download agreement PDF');
    return response.blob();
  }

  async getFees(
    id: string,
    daysPastDue?: number,
  ): Promise<AgreementFeeSnapshot> {
    const qs = daysPastDue !== undefined ? `?daysPastDue=${daysPastDue}` : '';
    const { data } = await apiClient.get<AgreementFeeSnapshot>(
      `${this.baseEndpoint}/${id}/fees${qs}`,
    );
    return data;
  }

  async recordPayment(
    id: string,
    payload: RecordPaymentPayload,
  ): Promise<void> {
    await apiClient.post(`${this.baseEndpoint}/${id}/pay`, payload);
  }

  async getPayments(id: string): Promise<unknown[]> {
    const { data } = await apiClient.get<unknown[]>(
      `${this.baseEndpoint}/${id}/payments`,
    );
    return data;
  }

  private buildQueryString(filters: AgreementFilters): string {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.landlordId) params.append('landlordId', filters.landlordId);
    if (filters.tenantId) params.append('tenantId', filters.tenantId);
    if (filters.agentId) params.append('agentId', filters.agentId);
    if (filters.propertyId) params.append('propertyId', filters.propertyId);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    const str = params.toString();
    return str ? `?${str}` : '';
  }
}

export const agreementService = new AgreementService();
