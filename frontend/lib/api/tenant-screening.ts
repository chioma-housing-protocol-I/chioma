import { apiClient } from '../api-client';

export type ScreeningStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'error';

export interface ScreeningRequest {
  tenantId: string;
  propertyId: string;
  consentGranted: boolean;
}

export interface ScreeningSubmission {
  screeningId: string;
  status: ScreeningStatus;
  estimatedCompletionMs: number;
  createdAt: string;
}

export interface ScreeningResult {
  screeningId: string;
  tenantId: string;
  status: ScreeningStatus;
  creditScore: number | null;
  incomeVerified: boolean;
  backgroundClear: boolean;
  recommendation: 'approve' | 'decline' | 'review';
  completedAt: string | null;
  expiresAt: string | null;
}

const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_ATTEMPTS = 60;

export const tenantScreeningApi = {
  submitRequest: async (
    payload: ScreeningRequest,
  ): Promise<ScreeningSubmission> => {
    const response = await apiClient.post<ScreeningSubmission>(
      '/screening/requests',
      payload,
    );
    return response.data;
  },

  getStatus: async (screeningId: string): Promise<ScreeningSubmission> => {
    const response = await apiClient.get<ScreeningSubmission>(
      `/screening/requests/${encodeURIComponent(screeningId)}/status`,
    );
    return response.data;
  },

  getResults: async (screeningId: string): Promise<ScreeningResult> => {
    const response = await apiClient.get<ScreeningResult>(
      `/screening/requests/${encodeURIComponent(screeningId)}/results`,
    );
    return response.data;
  },

  /** Poll until status is terminal or MAX_POLL_ATTEMPTS is reached. */
  pollUntilComplete: async (
    screeningId: string,
    onProgress?: (status: ScreeningStatus) => void,
  ): Promise<ScreeningResult> => {
    const TERMINAL: ScreeningStatus[] = ['completed', 'failed', 'error'];
    let attempts = 0;

    while (attempts < MAX_POLL_ATTEMPTS) {
      const submission = await tenantScreeningApi.getStatus(screeningId);
      onProgress?.(submission.status);

      if (TERMINAL.includes(submission.status)) {
        return tenantScreeningApi.getResults(screeningId);
      }

      await new Promise<void>((r) => setTimeout(r, POLL_INTERVAL_MS));
      attempts++;
    }

    throw new Error(
      `Screening ${screeningId} did not complete within the polling window`,
    );
  },

  getCache: async (tenantId: string): Promise<ScreeningResult | null> => {
    try {
      const response = await apiClient.get<ScreeningResult>(
        `/screening/cache/${encodeURIComponent(tenantId)}`,
      );
      return response.data;
    } catch {
      return null;
    }
  },
};
