import { describe, expect, it, vi, beforeEach } from 'vitest';
import { apiClient } from '@/lib/api-client';
import { agreementService } from '@/lib/services/agreement.service';
import type { AgreementResponse } from '@/lib/services/agreement.service';

const mockAgreement: AgreementResponse = {
  id: 'agr-1',
  monthlyRent: 1200,
  securityDeposit: 2400,
  startDate: '2026-01-01T00:00:00.000Z',
  endDate: '2027-01-01T00:00:00.000Z',
  termsAndConditions: 'Standard lease terms',
  status: 'pending',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    baseURL: '/api',
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('agreementService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should POST to /agreements with the payload', async () => {
      apiClient.post.mockResolvedValue({ data: mockAgreement, status: 201 });

      const payload = {
        propertyId: 'prop-1',
        adminId: 'admin-1',
        userId: 'user-1',
        adminStellarPubKey: 'GABC123',
        userStellarPubKey: 'GDEF456',
        monthlyRent: 1200,
        securityDeposit: 2400,
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2027-01-01T00:00:00.000Z',
      };

      const result = await agreementService.create(payload);

      expect(apiClient.post).toHaveBeenCalledWith('/agreements', payload);
      expect(result).toEqual(mockAgreement);
    });
  });

  describe('getAll', () => {
    it('should GET /agreements with query string from filters', async () => {
      apiClient.get.mockResolvedValue({
        data: { data: [mockAgreement], meta: { total: 1 } },
        status: 200,
      });

      const result = await agreementService.getAll({
        status: 'pending',
        limit: 20,
      });

      expect(apiClient.get).toHaveBeenCalledWith(
        '/agreements?status=pending&limit=20',
      );
      expect(result.data).toHaveLength(1);
      expect(result.meta?.total).toBe(1);
    });

    it('should omit filters that are undefined', async () => {
      apiClient.get.mockResolvedValue({
        data: { data: [], meta: { total: 0 } },
        status: 200,
      });

      await agreementService.getAll({});

      expect(apiClient.get).toHaveBeenCalledWith('/agreements');
    });
  });

  describe('getById', () => {
    it('should GET /agreements/:id', async () => {
      apiClient.get.mockResolvedValue({ data: mockAgreement, status: 200 });

      const result = await agreementService.getById('agr-1');

      expect(apiClient.get).toHaveBeenCalledWith('/agreements/agr-1');
      expect(result).toEqual(mockAgreement);
    });
  });

  describe('update', () => {
    it('should PATCH /agreements/:id with the payload', async () => {
      apiClient.patch.mockResolvedValue({ data: mockAgreement, status: 200 });

      const result = await agreementService.update('agr-1', {
        monthlyRent: 1400,
      });

      expect(apiClient.patch).toHaveBeenCalledWith('/agreements/agr-1', {
        monthlyRent: 1400,
      });
      expect(result).toEqual(mockAgreement);
    });
  });

  describe('terminate', () => {
    it('should DELETE /agreements/:id with body payload', async () => {
      apiClient.delete.mockResolvedValue({
        data: { ...mockAgreement, status: 'terminated' },
        status: 200,
      });

      const result = await agreementService.terminate('agr-1', {
        terminationReason: 'Mutual agreement',
      });

      expect(apiClient.delete).toHaveBeenCalledWith('/agreements/agr-1', {
        body: { terminationReason: 'Mutual agreement' },
      });
      expect(result.status).toBe('terminated');
    });
  });

  describe('renew', () => {
    it('should POST /agreements/:id/renew with the payload', async () => {
      const renewed = { ...mockAgreement, endDate: '2028-01-01T00:00:00.000Z' };
      apiClient.post.mockResolvedValue({ data: renewed, status: 200 });

      const result = await agreementService.renew('agr-1', {
        extendMonths: 12,
      });

      expect(apiClient.post).toHaveBeenCalledWith('/agreements/agr-1/renew', {
        extendMonths: 12,
      });
      expect(result.endDate).toBe('2028-01-01T00:00:00.000Z');
    });
  });

  describe('sign', () => {
    it('should PATCH /agreements/:id with status=signed and signature', async () => {
      const signed = { ...mockAgreement, status: 'signed' };
      apiClient.patch.mockResolvedValue({ data: signed, status: 200 });

      const result = await agreementService.sign('agr-1', {
        signature: 'data:image/png;base64,sig123',
        signerName: 'Alice',
        signedAt: '2026-06-01T00:00:00.000Z',
      });

      expect(apiClient.patch).toHaveBeenCalledWith('/agreements/agr-1', {
        status: 'signed',
        signature: 'data:image/png;base64,sig123',
        signerName: 'Alice',
        signedAt: '2026-06-01T00:00:00.000Z',
      });
      expect(result.status).toBe('signed');
    });
  });

  describe('downloadPdf', () => {
    it('should fetch the PDF as a Blob', async () => {
      const fakeBlob = new Blob(['%PDF'], { type: 'application/pdf' });
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(fakeBlob),
      });

      const result = await agreementService.downloadPdf('agr-1');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/agreements/agr-1/download',
        {
          headers: {},
        },
      );
      expect(result).toBe(fakeBlob);
    });

    it('should throw when the fetch fails', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false });

      await expect(agreementService.downloadPdf('agr-1')).rejects.toThrow(
        'Failed to download agreement PDF',
      );
    });
  });

  describe('getFees', () => {
    it('should GET /agreements/:id/fees', async () => {
      apiClient.get.mockResolvedValue({
        data: {
          monthlyRent: 1200,
          earlyTerminationFee: 1200,
          lateFeePercentage: 5,
          gracePeriodDays: 5,
        },
        status: 200,
      });

      const result = await agreementService.getFees('agr-1');

      expect(apiClient.get).toHaveBeenCalledWith('/agreements/agr-1/fees');
      expect(result.monthlyRent).toBe(1200);
    });

    it('should include daysPastDue when provided', async () => {
      apiClient.get.mockResolvedValue({
        data: {
          monthlyRent: 1200,
          earlyTerminationFee: 1200,
          lateFeePercentage: 5,
          gracePeriodDays: 5,
        },
        status: 200,
      });

      await agreementService.getFees('agr-1', 10);

      expect(apiClient.get).toHaveBeenCalledWith(
        '/agreements/agr-1/fees?daysPastDue=10',
      );
    });
  });

  describe('recordPayment', () => {
    it('should POST /agreements/:id/pay', async () => {
      apiClient.post.mockResolvedValue({ data: null, status: 201 });

      await agreementService.recordPayment('agr-1', {
        amount: 1200,
        paymentDate: '2026-06-01T00:00:00.000Z',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/agreements/agr-1/pay', {
        amount: 1200,
        paymentDate: '2026-06-01T00:00:00.000Z',
      });
    });
  });

  describe('getPayments', () => {
    it('should GET /agreements/:id/payments', async () => {
      apiClient.get.mockResolvedValue({
        data: [{ id: 'pmt-1', amount: 1200 }],
        status: 200,
      });

      const result = await agreementService.getPayments('agr-1');

      expect(apiClient.get).toHaveBeenCalledWith('/agreements/agr-1/payments');
      expect(result).toHaveLength(1);
    });
  });
});
