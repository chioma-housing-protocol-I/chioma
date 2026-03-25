/**
 * Centralized API client for frontend requests.
 * Adds timeout handling, retry backoff, typed error classification, and logging.
 */

import {
  AppError,
  classifyUnknownError,
  createHttpError,
  logError,
  withRetry,
} from '@/lib/errors';

type RequestConfig = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  cache?: RequestCache;
  retries?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
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

class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor() {
    this.baseURL =
      (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
      'http://localhost:3001';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
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

    if (window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
  }

  private async request<T>(
    endpoint: string,
    config: RequestConfig = {},
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      cache = 'no-cache',
      retries = 3,
      timeoutMs = 12000,
      signal,
    } = config;

    const token = this.getAuthToken();
    const requestHeaders = {
      ...this.defaultHeaders,
      ...headers,
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    const url = `${this.baseURL}${endpoint}`;

    return withRetry(
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        if (signal) {
          if (signal.aborted) controller.abort();
          signal.addEventListener('abort', () => controller.abort(), {
            once: true,
          });
        }

        try {
          const response = await fetch(url, {
            method,
            headers: requestHeaders,
            body: body ? JSON.stringify(body) : undefined,
            cache,
            signal: controller.signal,
          });

          if (!response.ok) {
            this.clearAuthAndRedirectIfNeeded(response.status);

            const errorBody = await response
              .json()
              .catch(() => ({ message: response.statusText }));
            const baseError = createHttpError(response.status, {
              source: 'lib/api-client.ts',
              action: `${method} ${endpoint}`,
              metadata: { responseBody: errorBody },
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
              data && typeof data === 'object' && 'message' in (data as object)
                ? String((data as { message?: string }).message)
                : undefined,
          };
        } catch (error) {
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
        shouldRetry: (error) => {
          const appError = classifyUnknownError(error, {
            source: 'lib/api-client.ts',
            action: `retry-check ${method} ${endpoint}`,
          });

          if (appError.category === 'network') return true;
          if (typeof appError.status === 'number' && appError.status >= 500) {
            return true;
          }

          return false;
        },
      },
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
