'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '../keys';
import type {
  Payment,
  PaginatedResponse,
  PaymentMethod,
  PaymentSchedule,
  PaymentScheduleEntry,
  PaymentScheduleStatus,
  LateFeeCalculation,
} from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PaymentListParams {
  page?: number;
  limit?: number;
  status?: Payment['status'];
  agreementId?: string;
  startDate?: string;
  endDate?: string;
}

interface CreatePaymentPayload {
  agreementId: string;
  amount: number;
  currency: string;
  paymentMethod: Payment['paymentMethod'];
}

export interface CreateDepositPayload {
  sourcePublicKey: string;
  destinationPublicKey: string;
  amount: string;
  agreementId?: string;
  expirationDate?: string;
  idempotencyKey?: string;
}

export interface RequestDepositRefundPayload {
  escrowId?: number | string;
  paymentId?: string;
  reason?: string;
  amount?: number;
}

export interface DepositDeduction {
  id: string;
  label: string;
  amount: number;
  reason?: string;
  createdAt?: string;
}

export interface DepositReceipt {
  receipt?: unknown;
  fileName?: string;
  [key: string]: unknown;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildQueryString(params: PaymentListParams): string {
  const qs = new URLSearchParams();
  if (params.page) qs.append('page', String(params.page));
  if (params.limit) qs.append('limit', String(params.limit));
  if (params.status) qs.append('status', params.status);
  if (params.agreementId) qs.append('agreementId', params.agreementId);
  if (params.startDate) qs.append('startDate', params.startDate);
  if (params.endDate) qs.append('endDate', params.endDate);
  const str = qs.toString();
  return str ? `?${str}` : '';
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Fetch a paginated list of payments with optional filters.
 */
export function usePayments(params: PaymentListParams = {}) {
  return useQuery({
    queryKey: queryKeys.payments.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Payment>>(
        `/payments${buildQueryString(params)}`,
      );
      return data;
    },
  });
}

/**
 * Fetch a single payment by ID.
 */
export function usePayment(id: string | null) {
  return useQuery({
    queryKey: queryKeys.payments.detail(id ?? ''),
    queryFn: async () => {
      const { data } = await apiClient.get<Payment>(`/payments/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

/**
 * Fetch payments associated with a specific rental agreement.
 */
export function usePaymentsByAgreement(agreementId: string | null) {
  return useQuery({
    queryKey: queryKeys.payments.byAgreement(agreementId ?? ''),
    queryFn: async () => {
      const { data } = await apiClient.get<Payment[]>(
        `/payments?agreementId=${agreementId}`,
      );
      return data;
    },
    enabled: Boolean(agreementId),
  });
}

// ─── Rent Payment Schedule ─────────────────────────────────────────────────

/**
 * Fetch the rent payment schedule for an agreement.
 * GET /rent/agreements/:id/schedule
 */
export function useRentPaymentSchedule(agreementId: string | null) {
  return useQuery({
    queryKey: queryKeys.payments.rentSchedule(agreementId ?? ''),
    queryFn: async () => {
      const { data } = await apiClient.get<PaymentScheduleEntry[]>(
        `/rent/agreements/${agreementId}/schedule`,
      );
      return data;
    },
    enabled: Boolean(agreementId),
  });
}

/**
 * Fetch the rent payment history for an agreement.
 * GET /rent/agreements/:id/history
 */
export function useRentPaymentHistory(agreementId: string | null) {
  return useQuery({
    queryKey: queryKeys.payments.rentHistory(agreementId ?? ''),
    queryFn: async () => {
      const { data } = await apiClient.get<Payment[]>(
        `/rent/agreements/${agreementId}/history`,
      );
      return data;
    },
    enabled: Boolean(agreementId),
  });
}

// ─── Submit Stellar Rent Payment ───────────────────────────────────────────────

export interface SubmitRentPaymentPayload {
  userAddress: string;
  userSecret: string;
  agreementId: string;
  amount: string;
  idempotencyKey?: string;
}

/**
 * Submit a rent payment via Stellar blockchain.
 * POST /payments/stellar/rent
 */
export function useSubmitRentPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SubmitRentPaymentPayload) => {
      const { data } = await apiClient.post<Payment>(
        '/payments/stellar/rent',
        payload,
      );
      return data;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      if (created.agreementId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.payments.rentHistory(created.agreementId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.payments.rentSchedule(created.agreementId),
        });
      }
    },
  });
}

// ─── Download Payment Receipt ──────────────────────────────────────────────────

export interface DownloadReceiptPayload {
  paymentId: string;
}

/**
 * Download a receipt for any completed payment.
 * GET /payments/:id/receipt
 */
export function useDownloadPaymentReceipt() {
  return useMutation({
    mutationFn: async (paymentId: string) => {
      const { data } = await apiClient.get<{
        receipt: unknown;
        fileName?: string;
        data?: string;
      }>(`/payments/${paymentId}/receipt`);
      downloadPaymentReceiptFile(paymentId, data);
      return data;
    },
  });
}

function downloadPaymentReceiptFile(
  paymentId: string,
  receipt: { receipt?: unknown; fileName?: string; data?: string },
) {
  if (typeof window === 'undefined') return;

  const fileName =
    typeof receipt.fileName === 'string'
      ? receipt.fileName
      : `receipt-${paymentId}.txt`;

  if (receipt.data && typeof receipt.data === 'string') {
    const binaryStr = atob(receipt.data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  } else {
    const blob = new Blob(
      [JSON.stringify(receipt.receipt ?? receipt, null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }
}

// ─── Handle Late Payments ──────────────────────────────────────────────────────

export interface CalculateLateFeePayload {
  monthlyRent: number;
  daysLate: number;
  gracePeriodDays?: number;
  lateFeeRate?: number;
}

/**
 * Calculate a late fee for overdue payments.
 * POST /rent/calculate/late-fee
 */
export function useCalculateLateFee() {
  return useMutation({
    mutationFn: async (payload: CalculateLateFeePayload) => {
      const { data } = await apiClient.post<LateFeeCalculation>(
        '/rent/calculate/late-fee',
        payload,
      );
      return data;
    },
  });
}

// ─── Automatic Payments (Payment Schedules) ────────────────────────────────────

export interface PaymentScheduleListParams {
  agreementId?: string;
  status?: PaymentScheduleStatus;
}

export interface CreatePaymentSchedulePayload {
  agreementId?: string;
  amount: number;
  paymentMethodId: string;
  currency?: string;
  interval: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate?: string;
  maxRetries?: number;
}

export interface UpdatePaymentSchedulePayload {
  status?: PaymentScheduleStatus;
  nextRunAt?: string;
  maxRetries?: number;
}

/**
 * Fetch payment schedules with optional filters.
 * GET /payments/schedules
 */
export function usePaymentSchedules(filters: PaymentScheduleListParams = {}) {
  return useQuery({
    queryKey: queryKeys.payments.schedules.list(filters),
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (filters.agreementId) qs.append('agreementId', filters.agreementId);
      if (filters.status) qs.append('status', filters.status);
      const str = qs.toString();
      const { data } = await apiClient.get<PaymentSchedule[]>(
        `/payments/schedules${str ? `?${str}` : ''}`,
      );
      return data;
    },
  });
}

/**
 * Create a new automatic payment schedule.
 * POST /payments/schedules
 */
export function useCreatePaymentSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreatePaymentSchedulePayload) => {
      const { data } = await apiClient.post<PaymentSchedule>(
        '/payments/schedules',
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.payments.schedules.all,
      });
    },
  });
}

/**
 * Update an existing payment schedule (pause, cancel, modify).
 * PATCH /payments/schedules/:id
 */
export function useUpdatePaymentSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: UpdatePaymentSchedulePayload & { id: string }) => {
      const { data } = await apiClient.patch<PaymentSchedule>(
        `/payments/schedules/${id}`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.payments.schedules.all,
      });
    },
  });
}

/**
 * Manually trigger a payment schedule run.
 * POST /payments/schedules/:id/run
 */
export function useRunPaymentSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post<Payment>(
        `/payments/schedules/${id}/run`,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.payments.schedules.all,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
    },
  });
}

export function useDeposits() {
  return useQuery({
    queryKey: queryKeys.payments.deposits(),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Payment>>(
        '/payments?limit=100',
      );

      return {
        ...data,
        data: data.data.filter(isDepositPayment),
      };
    },
    refetchInterval: 30000,
  });
}

export function useDepositStatus(id: string | null) {
  return useQuery({
    queryKey: queryKeys.payments.deposit(id ?? ''),
    queryFn: async () => {
      const { data } = await apiClient.get<Payment>(`/payments/${id}`);
      return data;
    },
    enabled: Boolean(id),
    refetchInterval: (query) =>
      query.state.data && isFinalDepositStatus(query.state.data.status)
        ? false
        : 10000,
  });
}

export function useDepositDeductions(id: string | null) {
  return useQuery({
    queryKey: queryKeys.payments.depositDeductions(id ?? ''),
    queryFn: async () => {
      const { data } = await apiClient.get<Payment>(`/payments/${id}`);
      return readDepositDeductions(data);
    },
    enabled: Boolean(id),
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

/**
 * Initiate a new payment. Invalidates payments, agreements, and transactions
 * (cross-domain) via the cache invalidation dependency map.
 */
export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreatePaymentPayload) => {
      const { data } = await apiClient.post<Payment>('/payments', payload);
      return data;
    },
    onSuccess: (created) => {
      // Bust payments + cross-domain deps (agreements, transactions).
      [
        queryKeys.payments.all,
        queryKeys.agreements.all,
        queryKeys.transactions.all,
      ].forEach((key) => queryClient.invalidateQueries({ queryKey: key }));

      if (created.agreementId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.payments.byAgreement(created.agreementId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.agreements.detail(created.agreementId),
        });
      }
    },
  });
}

export function useCreateDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateDepositPayload) => {
      const { data } = await apiClient.post<Payment>(
        '/payments/stellar/escrow',
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
    },
  });
}

export function useRequestDepositRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: RequestDepositRefundPayload) => {
      if (payload.escrowId !== undefined && payload.escrowId !== null) {
        const { data } = await apiClient.post<Payment>(
          `/payments/stellar/escrow/${payload.escrowId}/refund`,
          { reason: payload.reason },
        );
        return data;
      }

      if (!payload.paymentId || payload.amount === undefined) {
        throw new Error('A payment ID and amount are required for refunds.');
      }

      const { data } = await apiClient.post<Payment>(
        `/payments/${payload.paymentId}/refund`,
        { amount: payload.amount, reason: payload.reason },
      );
      return data;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      if (updated?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.payments.deposit(updated.id),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.payments.depositDeductions(updated.id),
        });
      }
    },
  });
}

export function useDownloadDepositReceipt() {
  return useMutation({
    mutationFn: async (paymentId: string) => {
      const { data } = await apiClient.get<DepositReceipt>(
        `/payments/${paymentId}/receipt`,
      );
      downloadReceipt(paymentId, data);
      return data;
    },
  });
}

function isDepositPayment(payment: Payment): boolean {
  const metadata = payment.metadata ?? {};
  const flow = typeof metadata.flow === 'string' ? metadata.flow : '';
  const type = typeof metadata.type === 'string' ? metadata.type : '';
  const description =
    typeof metadata.description === 'string' ? metadata.description : '';

  return [flow, type, description].some((value) =>
    value.toLowerCase().includes('deposit'),
  );
}

function isFinalDepositStatus(status: Payment['status']): boolean {
  return ['completed', 'failed', 'refunded', 'partial_refund'].includes(status);
}

export function readDepositDeductions(payment: Payment): DepositDeduction[] {
  const raw = payment.metadata?.deductions;
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const deduction = item as Record<string, unknown>;
      const amount = Number(deduction.amount ?? 0);
      if (!Number.isFinite(amount) || amount <= 0) return null;

      return {
        id: String(deduction.id ?? `${payment.id}-deduction-${index}`),
        label: String(
          deduction.label ?? deduction.reason ?? 'Deposit deduction',
        ),
        amount,
        reason:
          deduction.reason === undefined ? undefined : String(deduction.reason),
        createdAt:
          deduction.createdAt === undefined
            ? undefined
            : String(deduction.createdAt),
      };
    })
    .filter((item) => item !== null) as DepositDeduction[];
}

function downloadReceipt(paymentId: string, receipt: DepositReceipt) {
  if (typeof window === 'undefined') return;

  const fileName =
    typeof receipt.fileName === 'string'
      ? receipt.fileName
      : `deposit-receipt-${paymentId}.json`;
  const blob = new Blob([JSON.stringify(receipt.receipt ?? receipt, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
// ─── Payment Methods Hooks ──────────────────────────────────────────────────

export interface CreatePaymentMethodPayload {
  paymentType: string;
  lastFour?: string;
  expiryDate?: string;
  isDefault?: boolean;
  metadata?: Record<string, unknown>;
  sensitiveMetadata?: Record<string, unknown>;
}

export function usePaymentMethods(params: { isDefault?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.paymentMethods.list(params),
    queryFn: async () => {
      const qs =
        params.isDefault !== undefined ? `?isDefault=${params.isDefault}` : '';
      const { data } = await apiClient.get<PaymentMethod[]>(
        `/payment-methods${qs}`,
      );
      return data;
    },
  });
}

export function useCreatePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreatePaymentMethodPayload) => {
      const { data } = await apiClient.post<PaymentMethod>(
        '/payment-methods',
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.all });
    },
  });
}

export function useDeletePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.delete<{ success: boolean }>(
        `/payment-methods/${id}`,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.all });
    },
  });
}
