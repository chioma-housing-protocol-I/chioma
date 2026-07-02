/**
 * Centralized API client for frontend requests.
 * Adds timeout handling, retry backoff, typed error classification, and logging.
 * Supports mock API mode for frontend-only development.
 */

import {
  AppError,
  classifyUnknownError,
  createHttpError,
  logError,
  withRetry,
  globalCircuitBreaker,
} from '@/lib/errors';
import { cancellationManager, isCancellationError } from '@/lib/cancellation';
import { getMockData, shouldUseMockApi } from '@/mocks';
import { globalRateLimitTracker } from '@/lib/rate-limit';
import { getTimeoutForEndpoint } from '@/lib/config/timeouts';

type RequestConfig = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  cache?: RequestCache;
  credentials?: RequestCredentials;
  retries?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  cancellationKey?: string;
  disableTimeoutConfig?: boolean;
};

type ApiResponse<T> = {
  data: T;
  status: number;
  message?: string;
};

const AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: 'chioma_access_token',
  LEGACY_ACCESS_TOKEN: 'auth_token',
} as const;

function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const configured = process.env.NEXT_PUBLIC_API_URL;
    return configured && configured.length > 0 ? configured : '/api';
  }
  return (
    process.env.BACKEND_API_BASE_URL ??
    process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL ??
    'http://localhost:5000/api'
  );
}

class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor() {
    this.baseURL = getApiBaseUrl();
    this.defaultHeaders = {
      Accept: 'application/json',
    };
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;

    return (
      localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN) ||
      localStorage.getItem(AUTH_STORAGE_KEYS.LEGACY_ACCESS_TOKEN)
    );
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return (await response.json()) as T;
    }

    return (await response.text()) as T;
  }

  private clearAuthAndRedirectIfNeeded(status: number) {
    if (status !== 401 || typeof window === 'undefined') return;

    localStorage.removeItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(AUTH_STORAGE_KEYS.LEGACY_ACCESS_TOKEN);
  }

  private async request<T>(
    endpoint: string,
    config: RequestConfig = {},
  ): Promise<ApiResponse<T>> {
    if (shouldUseMockApi()) {
      const mockResponse = getMockData(endpoint);
      return {
        data: mockResponse as T,
        status: 200,
      };
    }

    const {
      method = 'GET',
      headers = {},
      body,
      cache = 'no-cache',
      credentials = 'include',
      retries = 3,
      timeoutMs,
      signal,
      cancellationKey,
      disableTimeoutConfig = false,
    } = config;

    // Calculate timeout based on endpoint if not explicitly provided
    const calculatedTimeout =
      timeoutMs ||
      (disableTimeoutConfig ? 12000 : getTimeoutForEndpoint(endpoint));
    const finalTimeout = disableTimeoutConfig
      ? timeoutMs || 12000
      : calculatedTimeout;

    const token = this.getAuthToken();
    const isFormData =
      typeof FormData !== 'undefined' && body instanceof FormData;
    const requestHeaders = {
      ...this.defaultHeaders,
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...headers,
    };

    if (isFormData && 'Content-Type' in requestHeaders) {
      delete requestHeaders['Content-Type'];
    }

    const url = `${this.baseURL}${endpoint}`;
    const breakerName = `${method}:${endpoint}`;

    const waitTimeMs = globalRateLimitTracker.getWaitTimeMs();
    if (waitTimeMs > 0) {
      const error = createHttpError(429, {
        source: 'lib/api-client.ts',
        action: `${method} ${endpoint}`,
        metadata: { waitTimeMs },
      });
      return Promise.reject(error);
    }

    return globalCircuitBreaker.execute(breakerName, () =>
      withRetry(
        async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), finalTimeout);

          if (signal) {
            if (signal.aborted) controller.abort();
            signal.addEventListener('abort', () => controller.abort(), {
              once: true,
            });
          }

          if (cancellationKey) {
            const cancelSignal =
              cancellationManager.createSignal(cancellationKey).signal;
            if (cancelSignal.aborted) controller.abort();
            cancelSignal.addEventListener('abort', () => controller.abort(), {
              once: true,
            });
          }

          try {
            const response = await fetch(url, {
              method,
              headers: requestHeaders,
              body: isFormData
                ? (body as FormData)
                : body
                  ? JSON.stringify(body)
                  : undefined,
              cache,
              credentials,
              signal: controller.signal,
            });

            globalRateLimitTracker.updateFromHeaders(
              response.headers,
              response.status,
            );

            if (!response.ok) {
              this.clearAuthAndRedirectIfNeeded(response.status);

              const errorBody = await response
                .json()
                .catch(() => ({ message: response.statusText }));
              const baseError = createHttpError(response.status, {
                source: 'lib/api-client.ts',
                action: `${method} ${endpoint}`,
              });

              throw new AppError({
                ...baseError,
                message: errorBody.message || baseError.message,
                userMessage: errorBody.message || baseError.userMessage,
                cause: errorBody,
              });
            }

            const data = await this.parseResponse<T>(response);
            return {
              data,
              status: response.status,
              message:
                data &&
                typeof data === 'object' &&
                'message' in (data as object)
                  ? String((data as { message?: string }).message)
                  : undefined,
            };
          } catch (error) {
            if (isCancellationError(error)) {
              clearTimeout(timeoutId);
              throw cancellationManager.classifyCancellationError(
                error,
                'lib/api-client.ts',
              );
            }

            const appError = classifyUnknownError(error, {
              source: 'lib/api-client.ts',
              action: `${method} ${endpoint}`,
            });

            logError(appError, appError.context);
            throw appError;
          } finally {
            clearTimeout(timeoutId);
          }
        },
        {
          maxAttempts: retries,
          endpoint: `${method}:${endpoint}`,
          shouldRetry: (error) => {
            if (isCancellationError(error)) return false;

            const appError = classifyUnknownError(error, {
              source: 'lib/api-client.ts',
              action: `retry-check ${method} ${endpoint}`,
            });

            if (appError.code === 'NETWORK_RATE_LIMIT') return false;
            if (appError.category === 'network') return true;
            if (typeof appError.status === 'number' && appError.status >= 500) {
              return true;
            }

            return false;
          },
        },
      ),
    );
  }

  async get<T>(
    endpoint: string,
    config?: RequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T>(
    endpoint: string,
    body?: unknown,
    config?: RequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'POST', body });
  }

  async put<T>(
    endpoint: string,
    body?: unknown,
    config?: RequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body });
  }

  async patch<T>(
    endpoint: string,
    body?: unknown,
    config?: RequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PATCH', body });
  }

  async delete<T>(
    endpoint: string,
    config?: RequestConfig,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
