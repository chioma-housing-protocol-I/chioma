/**
 * Tenant screening API client.
 *
 * Wraps the live backend routes under @Controller('screenings/tenant'):
 *   POST  /screenings/tenant/request         – submit a new screening request
 *   POST  /screenings/tenant/:id/consent     – grant tenant consent
 *   GET   /screenings/tenant/:id             – fetch screening status
 *   GET   /screenings/tenant/:id/report      – fetch the completed report
 *
 * Note: the webhook endpoint (POST /screenings/tenant/webhook) is a
 * server-to-server route and should never be called from the frontend.
 */

import { apiClient } from '../api-client';

// ---------------------------------------------------------------------------
// Enums (mirror backend screening.enums.ts)
// ---------------------------------------------------------------------------

export enum ScreeningProvider {
  TRANSUNION_SMARTMOVE = 'TRANSUNION_SMARTMOVE',
  EXPERIAN_CONNECT = 'EXPERIAN_CONNECT',
}

export enum ScreeningStatus {
  PENDING_CONSENT = 'PENDING_CONSENT',
  CONSENTED = 'CONSENTED',
  SUBMITTED = 'SUBMITTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

export enum ScreeningCheckType {
  CREDIT = 'CREDIT',
  BACKGROUND = 'BACKGROUND',
  RENTAL_HISTORY = 'RENTAL_HISTORY',
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  REVIEW = 'REVIEW',
}

// ---------------------------------------------------------------------------
// Request / response shapes
// ---------------------------------------------------------------------------

export interface CreateScreeningRequestPayload {
  tenantId: string;
  requestedChecks: ScreeningCheckType[];
  /**
   * PII payload collected under tenant consent, submitted only to the
   * screening provider. Never log or persist client-side.
   */
  applicantData: Record<string, unknown>;
  consentVersion: string;
  provider?: ScreeningProvider;
  propertyId?: string;
  notes?: string;
}

export interface GrantConsentPayload {
  consentTextVersion: string;
  expiresAt?: string;
}

/** Returned by POST /screenings/tenant/request and GET /screenings/tenant/:id */
export interface ScreeningRecord {
  id: string;
  tenantId: string;
  status: ScreeningStatus;
  requestedChecks: ScreeningCheckType[];
  provider?: ScreeningProvider;
  propertyId?: string;
  consentGranted: boolean;
  consentGrantedAt?: string;
  submittedAt?: string;
  completedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** Returned by GET /screenings/tenant/:id/report */
export interface ScreeningReport {
  id: string;
  screeningId: string;
  tenantId: string;
  riskLevel?: RiskLevel;
  creditScore?: number;
  backgroundClear?: boolean;
  rentalHistoryClear?: boolean;
  summary?: string;
  rawReport?: Record<string, unknown>;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Polling helpers
// ---------------------------------------------------------------------------

const TERMINAL_STATUSES: ScreeningStatus[] = [
  ScreeningStatus.COMPLETED,
  ScreeningStatus.FAILED,
  ScreeningStatus.EXPIRED,
  ScreeningStatus.REVOKED,
];

const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_ATTEMPTS = 60; // 5 min ceiling

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

export const tenantScreeningApi = {
  /**
   * Submit a new screening request.
   * Requires ADMIN or USER role on the backend (JwtAuthGuard + RolesGuard).
   */
  submitRequest: async (
    payload: CreateScreeningRequestPayload,
  ): Promise<ScreeningRecord> => {
    const res = await apiClient.post<ScreeningRecord>(
      '/screenings/tenant/request',
      payload,
    );
    return res.data;
  },

  /**
   * Grant tenant consent for a pending screening request.
   * Must be called by the tenant whose ID matches the request.
   */
  grantConsent: async (
    screeningId: string,
    payload: GrantConsentPayload,
  ): Promise<ScreeningRecord> => {
    const res = await apiClient.post<ScreeningRecord>(
      `/screenings/tenant/${encodeURIComponent(screeningId)}/consent`,
      payload,
    );
    return res.data;
  },

  /**
   * Fetch the current status of a screening request.
   */
  getScreening: async (screeningId: string): Promise<ScreeningRecord> => {
    const res = await apiClient.get<ScreeningRecord>(
      `/screenings/tenant/${encodeURIComponent(screeningId)}`,
    );
    return res.data;
  },

  /**
   * Fetch the completed screening report.
   * Only available once status is COMPLETED.
   */
  getReport: async (screeningId: string): Promise<ScreeningReport> => {
    const res = await apiClient.get<ScreeningReport>(
      `/screenings/tenant/${encodeURIComponent(screeningId)}/report`,
    );
    return res.data;
  },

  /**
   * Poll getScreening until a terminal status is reached, then return the
   * report. Throws if the polling window is exhausted before completion.
   */
  pollUntilComplete: async (
    screeningId: string,
    onProgress?: (status: ScreeningStatus) => void,
  ): Promise<ScreeningReport> => {
    let attempts = 0;

    while (attempts < MAX_POLL_ATTEMPTS) {
      const screening = await tenantScreeningApi.getScreening(screeningId);
      onProgress?.(screening.status);

      if (TERMINAL_STATUSES.includes(screening.status)) {
        return tenantScreeningApi.getReport(screeningId);
      }

      await new Promise<void>((resolve) =>
        setTimeout(resolve, POLL_INTERVAL_MS),
      );
      attempts++;
    }

    throw new Error(
      `Screening ${screeningId} did not reach a terminal status within the polling window.`,
    );
  },
};
