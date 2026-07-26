import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  usePayments,
  usePayment,
  usePaymentsByAgreement,
  useCreatePayment,
  usePaymentMethods,
  useCreatePaymentMethod,
  useDeletePaymentMethod,
  useRentPaymentSchedule,
  useRentPaymentHistory,
  useSubmitRentPayment,
  useDownloadPaymentReceipt,
  useCalculateLateFee,
  usePaymentSchedules,
  useCreatePaymentSchedule,
  useUpdatePaymentSchedule,
  useRunPaymentSchedule,
  readDepositDeductions,
  useDeposits,
  useDepositStatus,
  useDepositDeductions,
} from '@/lib/query/hooks/use-payments';
import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse, Payment, PaymentScheduleEntry } from '@/types';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: vi.fn(),
    }),
  };
});

function createMockPaginatedResponse<T>(items: T[]): PaginatedResponse<T> {
  return {
    data: items,
    total: items.length,
    page: 1,
    limit: 10,
    totalPages: 1,
  };
}

function createMockPayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'pay-1',
    agreementId: 'agreement-1',
    amount: 2500,
    currency: 'USDC',
    status: 'completed',
    paymentMethod: 'card',
    dueDate: '2025-06-01',
    paidAt: '2025-06-01T12:00:00Z',
    referenceNumber: 'REF-001',
    createdAt: '2025-06-01T12:00:00Z',
    metadata: {},
    ...overrides,
  };
}

// Helper to create a wrapper for React Query hooks
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  };
}

describe('usePayments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches paginated payments list', async () => {
    const mockResponse = createMockPaginatedResponse([createMockPayment()]);
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockResponse,
    });

    const { result } = renderHook(() => usePayments({ page: 1, limit: 10 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockResponse);
    expect(apiClient.get).toHaveBeenCalledWith('/payments?page=1&limit=10');
  });

  it('builds query string with all filters', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: createMockPaginatedResponse([]),
    });

    renderHook(
      () =>
        usePayments({
          page: 2,
          limit: 5,
          status: 'pending',
          agreementId: 'agr-1',
          startDate: '2025-01-01',
          endDate: '2025-12-31',
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(
        '/payments?page=2&limit=5&status=pending&agreementId=agr-1&startDate=2025-01-01&endDate=2025-12-31',
      );
    });
  });

  it('handles empty params gracefully', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: createMockPaginatedResponse([]),
    });

    renderHook(() => usePayments(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/payments');
    });
  });
});

describe('usePayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches a single payment by ID', async () => {
    const mockPayment = createMockPayment({ id: 'pay-1' });
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockPayment,
    });

    const { result } = renderHook(() => usePayment('pay-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPayment);
    expect(apiClient.get).toHaveBeenCalledWith('/payments/pay-1');
  });

  it('does not fetch when id is null', async () => {
    const { result } = renderHook(() => usePayment(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
  });
});

describe('usePaymentsByAgreement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches payments by agreement', async () => {
    const mockPayments = [createMockPayment()];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockPayments,
    });

    const { result } = renderHook(() => usePaymentsByAgreement('agreement-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPayments);
    expect(apiClient.get).toHaveBeenCalledWith(
      '/payments?agreementId=agreement-1',
    );
  });
});

describe('useCreatePayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a payment and invalidates caches', async () => {
    const createdPayment = createMockPayment({ id: 'pay-new' });
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: createdPayment,
    });

    const { result } = renderHook(() => useCreatePayment(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      agreementId: 'agreement-1',
      amount: 2500,
      currency: 'USDC',
      paymentMethod: 'card',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(createdPayment);
    expect(apiClient.post).toHaveBeenCalledWith('/payments', {
      agreementId: 'agreement-1',
      amount: 2500,
      currency: 'USDC',
      paymentMethod: 'card',
    });
  });
});

describe('usePaymentMethods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches payment methods', async () => {
    const mockMethods = [
      {
        id: 1,
        userId: 'user-1',
        paymentType: 'CREDIT_CARD',
        lastFour: '1234',
        isDefault: true,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockMethods,
    });

    const { result } = renderHook(() => usePaymentMethods(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockMethods);
    expect(apiClient.get).toHaveBeenCalledWith('/payment-methods');
  });

  it('passes isDefault filter when provided', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [],
    });

    renderHook(() => usePaymentMethods({ isDefault: true }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(
        '/payment-methods?isDefault=true',
      );
    });
  });
});

describe('useCreatePaymentMethod', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a payment method', async () => {
    const createdMethod = {
      id: 2,
      userId: 'user-1',
      paymentType: 'BANK_TRANSFER',
      lastFour: '5678',
      isDefault: true,
      createdAt: '2025-06-01T00:00:00Z',
      updatedAt: '2025-06-01T00:00:00Z',
    };
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: createdMethod,
    });

    const { result } = renderHook(() => useCreatePaymentMethod(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      paymentType: 'BANK_TRANSFER',
      lastFour: '5678',
      isDefault: true,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(createdMethod);
  });
});

describe('useDeletePaymentMethod', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes a payment method', async () => {
    (apiClient.delete as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { success: true },
    });

    const { result } = renderHook(() => useDeletePaymentMethod(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(1);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.delete).toHaveBeenCalledWith('/payment-methods/1');
  });
});

describe('useRentPaymentSchedule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches rent payment schedule for an agreement', async () => {
    const mockSchedule: PaymentScheduleEntry[] = [
      {
        paymentNumber: 1,
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        amount: 2500,
        agreementId: 'agreement-1',
      },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockSchedule,
    });

    const { result } = renderHook(() => useRentPaymentSchedule('agreement-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockSchedule);
    expect(apiClient.get).toHaveBeenCalledWith(
      '/rent/agreements/agreement-1/schedule',
    );
  });

  it('does not fetch when agreementId is null', async () => {
    const { result } = renderHook(() => useRentPaymentSchedule(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
  });
});

describe('useRentPaymentHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches rent payment history for an agreement', async () => {
    const mockHistory = [createMockPayment({ id: 'pay-hist-1' })];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockHistory,
    });

    const { result } = renderHook(() => useRentPaymentHistory('agreement-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockHistory);
    expect(apiClient.get).toHaveBeenCalledWith(
      '/rent/agreements/agreement-1/history',
    );
  });
});

describe('useSubmitRentPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits a stellar rent payment', async () => {
    const createdPayment = createMockPayment({ id: 'pay-stellar-1' });
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: createdPayment,
    });

    const { result } = renderHook(() => useSubmitRentPayment(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      userAddress: 'GABC123...',
      userSecret: 'SABC123...',
      agreementId: 'agreement-1',
      amount: '2500',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(createdPayment);
    expect(apiClient.post).toHaveBeenCalledWith('/payments/stellar/rent', {
      userAddress: 'GABC123...',
      userSecret: 'SABC123...',
      agreementId: 'agreement-1',
      amount: '2500',
    });
  });
});

describe('useDownloadPaymentReceipt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('downloads a payment receipt', async () => {
    const mockReceipt = {
      receipt: { paymentId: 'pay-1', amount: 2500 },
      fileName: 'receipt-pay-1.txt',
      data: btoa('test receipt content'),
    };
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockReceipt,
    });

    const { result } = renderHook(() => useDownloadPaymentReceipt(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('pay-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockReceipt);
    expect(apiClient.get).toHaveBeenCalledWith('/payments/pay-1/receipt');
  });
});

describe('useCalculateLateFee', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calculates late fee', async () => {
    const mockResult = { lateFee: 125 };
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockResult,
    });

    const { result } = renderHook(() => useCalculateLateFee(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      monthlyRent: 2500,
      daysLate: 10,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockResult);
    expect(apiClient.post).toHaveBeenCalledWith('/rent/calculate/late-fee', {
      monthlyRent: 2500,
      daysLate: 10,
    });
  });

  it('passes optional grace period and rate', async () => {
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { lateFee: 200 },
    });

    const { result } = renderHook(() => useCalculateLateFee(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      monthlyRent: 2500,
      daysLate: 15,
      gracePeriodDays: 7,
      lateFeeRate: 0.1,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.post).toHaveBeenCalledWith('/rent/calculate/late-fee', {
      monthlyRent: 2500,
      daysLate: 15,
      gracePeriodDays: 7,
      lateFeeRate: 0.1,
    });
  });
});

describe('usePaymentSchedules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches payment schedules', async () => {
    const mockSchedules = [
      {
        id: 'sched-1',
        userId: 'user-1',
        agreementId: 'agreement-1',
        paymentMethod: null,
        paymentMethodId: 1,
        amount: 2500,
        currency: 'USDC',
        interval: 'monthly' as const,
        nextRunAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        status: 'active' as const,
        retries: 0,
        maxRetries: 3,
        lastError: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockSchedules,
    });

    const { result } = renderHook(
      () => usePaymentSchedules({ agreementId: 'agreement-1' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockSchedules);
    expect(apiClient.get).toHaveBeenCalledWith(
      '/payments/schedules?agreementId=agreement-1',
    );
  });

  it('filters by status', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [],
    });

    renderHook(() => usePaymentSchedules({ status: 'active' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(
        '/payments/schedules?status=active',
      );
    });
  });

  it('fetches all schedules with no filters', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [],
    });

    renderHook(() => usePaymentSchedules(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/payments/schedules');
    });
  });
});

describe('useCreatePaymentSchedule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a payment schedule', async () => {
    const created = {
      id: 'sched-new',
      userId: 'user-1',
      agreementId: 'agreement-1',
      paymentMethod: null,
      paymentMethodId: 1,
      amount: 2500,
      currency: 'USDC',
      interval: 'monthly' as const,
      nextRunAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      status: 'active' as const,
      retries: 0,
      maxRetries: 3,
      lastError: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: created,
    });

    const { result } = renderHook(() => useCreatePaymentSchedule(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      amount: 2500,
      paymentMethodId: '1',
      interval: 'monthly',
      agreementId: 'agreement-1',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(created);
    expect(apiClient.post).toHaveBeenCalledWith('/payments/schedules', {
      amount: 2500,
      paymentMethodId: '1',
      interval: 'monthly',
      agreementId: 'agreement-1',
    });
  });
});

describe('useUpdatePaymentSchedule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates a payment schedule (pause)', async () => {
    const updated = {
      id: 'sched-1',
      status: 'paused' as const,
    };
    (apiClient.patch as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: updated,
    });

    const { result } = renderHook(() => useUpdatePaymentSchedule(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: 'sched-1', status: 'paused' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(updated);
    expect(apiClient.patch).toHaveBeenCalledWith(
      '/payments/schedules/sched-1',
      {
        status: 'paused',
      },
    );
  });

  it('updates nextRunAt and maxRetries', async () => {
    (apiClient.patch as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: 'sched-1' },
    });

    const { result } = renderHook(() => useUpdatePaymentSchedule(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: 'sched-1',
      nextRunAt: '2025-07-01T00:00:00Z',
      maxRetries: 5,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.patch).toHaveBeenCalledWith(
      '/payments/schedules/sched-1',
      {
        nextRunAt: '2025-07-01T00:00:00Z',
        maxRetries: 5,
      },
    );
  });
});

describe('useRunPaymentSchedule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs a payment schedule', async () => {
    const mockPayment = createMockPayment({ id: 'pay-from-schedule' });
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockPayment,
    });

    const { result } = renderHook(() => useRunPaymentSchedule(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('sched-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPayment);
    expect(apiClient.post).toHaveBeenCalledWith(
      '/payments/schedules/sched-1/run',
    );
  });
});

describe('readDepositDeductions', () => {
  it('returns empty array when deductions is missing or not an array', () => {
    expect(readDepositDeductions({ metadata: {} } as any)).toEqual([]);
    expect(
      readDepositDeductions({ metadata: { deductions: 'not-array' } } as any),
    ).toEqual([]);
  });

  it('correctly maps and filters valid deductions', () => {
    const mockPayment = {
      id: 'pay-1',
      metadata: {
        deductions: [
          {
            id: 'd-1',
            label: 'Cleaning',
            amount: 150,
            reason: 'Dirty kitchen',
            createdAt: '2025-05-01',
          },
          { label: 'Repairs', amount: 250 },
          { label: 'Free', amount: 0 },
          { label: 'Invalid', amount: 'abc' },
          null,
        ],
      },
    } as any;

    const results = readDepositDeductions(mockPayment);

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      id: 'd-1',
      label: 'Cleaning',
      amount: 150,
      reason: 'Dirty kitchen',
      createdAt: '2025-05-01',
    });
    expect(results[1]).toEqual({
      id: 'pay-1-deduction-1',
      label: 'Repairs',
      amount: 250,
      reason: undefined,
      createdAt: undefined,
    });
  });
});

describe('useDeposits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and filters deposits', async () => {
    const nonDepositPayment = createMockPayment({
      id: 'pay-regular',
      metadata: {},
    });
    const depositPayment = createMockPayment({
      id: 'pay-deposit',
      metadata: { flow: 'deposit', type: 'security_deposit' },
    });

    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: createMockPaginatedResponse([nonDepositPayment, depositPayment]),
    });

    const { result } = renderHook(() => useDeposits(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data[0].id).toBe('pay-deposit');
  });
});

describe('useDepositStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches deposit status', async () => {
    const mockPayment = createMockPayment({ id: 'pay-deposit' });
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockPayment,
    });

    const { result } = renderHook(() => useDepositStatus('pay-deposit'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPayment);
  });
});

describe('useDepositDeductions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches deposit deductions', async () => {
    const mockPayment = {
      id: 'pay-deposit',
      metadata: {
        deductions: [{ id: 'd-1', label: 'Cleaning', amount: 150 }],
      },
    };
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockPayment,
    });

    const { result } = renderHook(() => useDepositDeductions('pay-deposit'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].label).toBe('Cleaning');
  });
});
