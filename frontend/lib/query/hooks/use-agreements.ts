'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../keys';
import { agreementService } from '@/lib/services/agreement.service';
import type {
  AgreementResponse,
  AgreementFilters,
  CreateAgreementPayload,
  UpdateAgreementPayload,
  TerminateAgreementPayload,
  RenewAgreementPayload,
  SignaturePayload,
  RecordPaymentPayload,
  AgreementFeeSnapshot,
} from '@/lib/services/agreement.service';

export interface AgreementSummary extends AgreementResponse {
  displayTitle?: string;
  tenantName?: string;
  landlordName?: string;
}

function formatPersonName(person?: {
  firstName?: string;
  lastName?: string;
  name?: string;
}) {
  if (!person) return 'Unknown';
  if (person.name) return person.name;
  return (
    [person.firstName, person.lastName].filter(Boolean).join(' ') || 'Unknown'
  );
}

function enrichAgreement(a: AgreementResponse): AgreementSummary {
  return {
    ...a,
    displayTitle:
      a.property?.title ??
      a.property?.address ??
      `Agreement ${a.id.slice(0, 8)}`,
    tenantName: formatPersonName(a.tenant),
    landlordName: formatPersonName(a.landlord),
  };
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useAgreements(filters: AgreementFilters = {}) {
  return useQuery({
    queryKey: queryKeys.agreements.list(filters),
    queryFn: async () => {
      const res = await agreementService.getAll(filters);
      const list = (res.data ?? []).map(enrichAgreement);
      return { data: list, meta: res.meta };
    },
    staleTime: 60_000,
  });
}

export function useUserAgreements(filters: AgreementFilters = { limit: 50 }) {
  return useQuery({
    queryKey: queryKeys.agreements.list(filters),
    queryFn: async () => {
      const res = await agreementService.getAll(filters);
      const list = (res.data ?? []).map(enrichAgreement);
      return { data: list, meta: res.meta };
    },
    staleTime: 60_000,
  });
}

export function useAgreement(agreementId: string | null) {
  return useQuery({
    queryKey: queryKeys.agreements.detail(agreementId ?? ''),
    enabled: Boolean(agreementId),
    queryFn: async () => {
      const agreement = await agreementService.getById(agreementId!);
      return enrichAgreement(agreement);
    },
  });
}

export function useAgreementFees(
  agreementId: string | null,
  daysPastDue?: number,
) {
  return useQuery({
    queryKey: [...queryKeys.agreements.detail(agreementId ?? ''), 'fees', daysPastDue],
    enabled: Boolean(agreementId),
    queryFn: async () => {
      const fees = await agreementService.getFees(agreementId!, daysPastDue);
      return fees;
    },
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useCreateAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateAgreementPayload) => {
      return agreementService.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.agreements.all,
      });
    },
  });
}

export function useUpdateAgreement(agreementId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateAgreementPayload) => {
      return agreementService.update(agreementId, payload);
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.agreements.detail(updated.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.agreements.all,
      });
    },
  });
}

export function useSignAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      agreementId,
      ...payload
    }: SignaturePayload & { agreementId: string }) => {
      return agreementService.sign(agreementId, payload);
    },
    onSuccess: (signed) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.agreements.detail(signed.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.agreements.all,
      });
    },
  });
}

export function useTerminateAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      agreementId,
      ...payload
    }: TerminateAgreementPayload & { agreementId: string }) => {
      return agreementService.terminate(agreementId, payload);
    },
    onSuccess: (terminated) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.agreements.detail(terminated.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.agreements.all,
      });
    },
  });
}

export function useRenewAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      agreementId,
      ...payload
    }: RenewAgreementPayload & { agreementId: string }) => {
      return agreementService.renew(agreementId, payload);
    },
    onSuccess: (renewed) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.agreements.detail(renewed.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.agreements.all,
      });
    },
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      agreementId,
      ...payload
    }: RecordPaymentPayload & { agreementId: string }) => {
      await agreementService.recordPayment(agreementId, payload);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.agreements.detail(variables.agreementId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.agreements.all,
      });
    },
  });
}

export type { AgreementResponse };
