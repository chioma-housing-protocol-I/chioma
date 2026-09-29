import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addDisputeComment,
  appealDispute,
  createDispute,
  getTenantDispute,
  listTenantDisputes,
  uploadDisputeEvidence,
} from '@/lib/disputes/api';
import { apiClient } from '@/lib/api-client';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

const mockedApiClient = vi.mocked(apiClient);

describe('disputes api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists tenant disputes with filters and normalizes the response', async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        disputes: [
          {
            id: 7,
            disputeId: '1d81dff0-6d59-4b01-b954-f14c779f89b8',
            agreementId: 'agreement-1',
            agreement: { agreementNumber: 'AGR-101' },
            disputeType: 'MAINTENANCE',
            description: 'Leaking roof over the kitchen sink',
            status: 'OPEN',
            requestedAmount: 5000,
            createdAt: '2026-06-01T10:00:00.000Z',
            updatedAt: '2026-06-02T10:00:00.000Z',
            evidence: [{ id: 1 }],
            comments: [{ id: 2 }],
          },
        ],
      },
      status: 200,
    });

    const result = await listTenantDisputes(
      {
        status: 'OPEN',
        search: 'kitchen',
        page: 2,
        limit: 5,
      },
      'user-1',
    );

    expect(mockedApiClient.get).toHaveBeenCalledWith(
      '/disputes?page=2&limit=5&sortBy=createdAt&sortOrder=DESC&status=OPEN&initiatedBy=user-1',
    );
    expect(result).toEqual([
      expect.objectContaining({
        id: '7',
        backendDisputeId: '1d81dff0-6d59-4b01-b954-f14c779f89b8',
        disputeId: 'DSP-1D81DFF0',
        agreementReference: 'AGR-101',
        evidenceCount: 1,
        commentCount: 1,
      }),
    ]);
  });

  it('fetches dispute details by numeric id and normalizes evidence and comments', async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        data: {
          id: 7,
          disputeId: 'dispute-uuid-7',
          agreementId: 'agreement-1',
          disputeType: 'OTHER',
          description: 'Follow-up requested',
          status: 'UNDER_REVIEW',
          createdAt: '2026-06-01T10:00:00.000Z',
          updatedAt: '2026-06-02T10:00:00.000Z',
          evidence: [
            {
              id: 1,
              fileName: 'receipt.pdf',
              fileUrl: '/uploads/receipt.pdf',
              createdAt: '2026-06-01T11:00:00.000Z',
            },
          ],
          comments: [
            {
              id: 2,
              content: 'We are reviewing this now.',
              createdAt: '2026-06-01T12:00:00.000Z',
              user: {
                firstName: 'Ada',
                lastName: 'Smith',
                role: 'admin',
              },
            },
          ],
          initiator: {
            firstName: 'John',
            lastName: 'Doe',
            role: 'user',
          },
        },
      },
      status: 200,
    });

    const result = await getTenantDispute('7');

    expect(mockedApiClient.get).toHaveBeenCalledWith('/disputes/7');
    expect(result).toEqual(
      expect.objectContaining({
        id: '7',
        backendDisputeId: 'dispute-uuid-7',
        disputeId: 'DSP-DISPUTEU',
        raisedBy: { name: 'John Doe', role: 'user' },
        evidence: [
          expect.objectContaining({
            id: '1',
            filename: 'receipt.pdf',
            fileUrl: '/uploads/receipt.pdf',
          }),
        ],
        comments: [
          expect.objectContaining({
            id: '2',
            content: 'We are reviewing this now.',
            author: { name: 'Ada Smith', role: 'admin' },
          }),
        ],
      }),
    );
  });

  it('creates a dispute, uploads evidence files, and refetches the created record', async () => {
    mockedApiClient.post
      .mockResolvedValueOnce({
        data: {
          id: 7,
          disputeId: 'dispute-uuid-7',
          agreementId: 'agreement-1',
          disputeType: 'MAINTENANCE',
          description: 'Roof leak',
          status: 'OPEN',
          createdAt: '2026-06-01T10:00:00.000Z',
          updatedAt: '2026-06-01T10:00:00.000Z',
          evidence: [],
          comments: [],
        },
        status: 201,
      })
      .mockResolvedValueOnce({ data: {}, status: 201 })
      .mockResolvedValueOnce({ data: {}, status: 201 });
    mockedApiClient.get.mockResolvedValue({
      data: {
        data: {
          id: 7,
          disputeId: 'dispute-uuid-7',
          agreementId: 'agreement-1',
          disputeType: 'MAINTENANCE',
          description: 'Roof leak',
          status: 'OPEN',
          createdAt: '2026-06-01T10:00:00.000Z',
          updatedAt: '2026-06-01T10:00:00.000Z',
          evidence: [
            { id: 1, fileName: 'photo-1.png' },
            { id: 2, fileName: 'photo-2.png' },
          ],
          comments: [],
        },
      },
      status: 200,
    });

    const firstFile = new File(['one'], 'photo-1.png', { type: 'image/png' });
    const secondFile = new File(['two'], 'photo-2.png', {
      type: 'image/png',
    });

    const result = await createDispute({
      agreementId: 'agreement-1',
      disputeType: 'MAINTENANCE',
      description: 'Roof leak',
      evidenceFiles: [firstFile, secondFile],
      evidenceDescription: 'Ceiling damage photos',
    });

    expect(mockedApiClient.post).toHaveBeenNthCalledWith(1, '/disputes', {
      agreementId: 'agreement-1',
      disputeType: 'MAINTENANCE',
      description: 'Roof leak',
    });

    const firstUploadBody = mockedApiClient.post.mock.calls[1][1];
    const secondUploadBody = mockedApiClient.post.mock.calls[2][1];

    expect(firstUploadBody).toBeInstanceOf(FormData);
    expect(secondUploadBody).toBeInstanceOf(FormData);
    expect((firstUploadBody as FormData).get('file')).toBe(firstFile);
    expect((firstUploadBody as FormData).get('description')).toBe(
      'Ceiling damage photos',
    );
    expect((secondUploadBody as FormData).get('file')).toBe(secondFile);

    expect(mockedApiClient.get).toHaveBeenCalledWith('/disputes/7');
    expect(result.evidence).toHaveLength(2);
  });

  it('uploads additional evidence files through the dispute evidence endpoint', async () => {
    mockedApiClient.post.mockResolvedValue({ data: {}, status: 201 });

    const file = new File(['receipt'], 'receipt.pdf', {
      type: 'application/pdf',
    });

    await uploadDisputeEvidence('dispute-uuid-7', [file], 'Receipt copy');

    expect(mockedApiClient.post).toHaveBeenCalledWith(
      '/disputes/dispute-uuid-7/evidence',
      expect.any(FormData),
    );
    const body = mockedApiClient.post.mock.calls[0][1] as FormData;
    expect(body.get('file')).toBe(file);
    expect(body.get('fileName')).toBe('receipt.pdf');
    expect(body.get('description')).toBe('Receipt copy');
  });

  it('submits comments and appeals using the backend dispute routes', async () => {
    mockedApiClient.post.mockResolvedValue({ data: {}, status: 201 });
    mockedApiClient.put.mockResolvedValue({ data: {}, status: 200 });

    await addDisputeComment('dispute-uuid-7', 'Please review the new invoice');
    await appealDispute('7');

    expect(mockedApiClient.post).toHaveBeenCalledWith(
      '/disputes/dispute-uuid-7/comment',
      { content: 'Please review the new invoice' },
    );
    expect(mockedApiClient.put).toHaveBeenCalledWith('/disputes/7', {
      status: 'OPEN',
    });
  });
});
