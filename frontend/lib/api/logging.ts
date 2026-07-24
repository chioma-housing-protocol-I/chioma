import { apiClient } from '../api-client';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface RequestLog {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  latencyMs: number;
  timestamp: string;
  correlationId: string;
  sensitiveDataMasked: boolean;
}

export interface LogFilter {
  level?: LogLevel;
  startDate?: string;
  endDate?: string;
  path?: string;
  minStatusCode?: number;
  maxStatusCode?: number;
  page?: number;
  limit?: number;
}

export interface LogsPage {
  logs: RequestLog[];
  total: number;
  page: number;
  limit: number;
}

export interface ErrorRate {
  windowMs: number;
  total: number;
  errors: number;
  rate: number;
}

export interface DebugReport {
  generatedAt: string;
  errorRate: ErrorRate;
  slowestEndpoints: Array<{ path: string; avgLatencyMs: number }>;
  topErrors: Array<{ statusCode: number; count: number }>;
}

const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'authorization',
  'creditCard',
];

export function maskSensitiveFields<T extends Record<string, unknown>>(
  data: T,
): T {
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [
      k,
      SENSITIVE_FIELDS.some((f) => k.toLowerCase().includes(f)) ? '***' : v,
    ]),
  ) as T;
}

export const loggingApi = {
  getLogs: async (filter: LogFilter = {}): Promise<LogsPage> => {
    const params = new URLSearchParams();
    if (filter.level) params.set('level', filter.level);
    if (filter.startDate) params.set('startDate', filter.startDate);
    if (filter.endDate) params.set('endDate', filter.endDate);
    if (filter.path) params.set('path', filter.path);
    if (filter.minStatusCode != null)
      params.set('minStatusCode', String(filter.minStatusCode));
    if (filter.maxStatusCode != null)
      params.set('maxStatusCode', String(filter.maxStatusCode));
    if (filter.page != null) params.set('page', String(filter.page));
    if (filter.limit != null) params.set('limit', String(filter.limit));

    const query = params.toString();
    const response = await apiClient.get<LogsPage>(
      `/logs${query ? `?${query}` : ''}`,
    );
    return response.data;
  },

  getErrorRate: async (windowMs = 60_000): Promise<ErrorRate> => {
    const response = await apiClient.get<ErrorRate>(
      `/logs/error-rate?windowMs=${windowMs}`,
    );
    return response.data;
  },

  getDebugReport: async (): Promise<DebugReport> => {
    const response = await apiClient.get<DebugReport>('/logs/debug-report');
    return response.data;
  },

  rotateLog: async (): Promise<{ rotatedAt: string }> => {
    const response = await apiClient.post<{ rotatedAt: string }>(
      '/logs/rotate',
    );
    return response.data;
  },
};
