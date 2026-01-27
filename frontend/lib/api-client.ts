/**
 * Secure API Client
 * Handles authentication, CSRF tokens, and error handling
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

/**
 * Token storage keys
 */
const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const CSRF_TOKEN_KEY = "csrf-token";

/**
 * API Error class
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Get stored tokens
 */
function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function getCsrfToken(): string | null {
  if (typeof window === "undefined") return null;
  // Try to get from cookie first
  const cookieMatch = document.cookie.match(
    new RegExp(`(^| )${CSRF_TOKEN_KEY}=([^;]+)`)
  );
  if (cookieMatch) return cookieMatch[2];
  return localStorage.getItem(CSRF_TOKEN_KEY);
}

/**
 * Store tokens
 */
export function setTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

  // Also set as cookie for middleware access
  document.cookie = `${ACCESS_TOKEN_KEY}=${accessToken}; path=/; max-age=${15 * 60}; SameSite=Strict`;
}

/**
 * Clear tokens (logout)
 */
export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  document.cookie = `${ACCESS_TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  const token = getAccessToken();
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

/**
 * Refresh access token
 */
async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      clearTokens();
      return false;
    }

    const data = await response.json();
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

/**
 * Request options type
 */
interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  skipAuth?: boolean;
  timeout?: number;
}

/**
 * Make an authenticated API request
 */
async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, skipAuth = false, timeout = 30000, ...init } = options;

  // Build headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };

  // Add auth token
  if (!skipAuth) {
    const accessToken = getAccessToken();
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }
  }

  // Add CSRF token for state-changing requests
  const method = init.method?.toUpperCase() || "GET";
  if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }
  }

  // Add request ID for tracing
  headers["X-Request-ID"] = crypto.randomUUID();

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...init,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      credentials: "include", // Include cookies
    });

    clearTimeout(timeoutId);

    // Handle 401 - try to refresh token
    if (response.status === 401 && !skipAuth) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Retry the request with new token
        return request(endpoint, options);
      }
      // Redirect to login if refresh failed
      if (typeof window !== "undefined") {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      }
      throw new ApiError(401, "Session expired. Please log in again.");
    }

    // Parse response
    const contentType = response.headers.get("Content-Type");
    let data: unknown;

    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Handle errors
    if (!response.ok) {
      const errorMessage =
        (data && typeof data === "object" && "message" in data && typeof data.message === "string")
          ? data.message
          : "An error occurred";
      throw new ApiError(
        response.status,
        errorMessage,
        data
      );
    }

    return data as T;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new ApiError(408, "Request timeout");
      }
      throw new ApiError(500, error.message);
    }

    throw new ApiError(500, "An unexpected error occurred");
  }
}

/**
 * API client with typed methods
 */
export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "POST", body }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "PUT", body }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "PATCH", body }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),
};

/**
 * Auth API methods
 */
export const authApi = {
  login: async (email: string, password: string) => {
    const data = await apiClient.post<{
      user: Record<string, unknown>;
      accessToken: string;
      refreshToken: string;
    }>("/auth/login", { email, password }, { skipAuth: true });

    setTokens(data.accessToken, data.refreshToken);
    return data;
  },

  register: async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => {
    const data = await apiClient.post<{
      user: Record<string, unknown>;
      accessToken: string;
      refreshToken: string;
    }>("/auth/register", userData, { skipAuth: true });

    setTokens(data.accessToken, data.refreshToken);
    return data;
  },

  logout: async () => {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      clearTokens();
    }
  },

  forgotPassword: (email: string) =>
    apiClient.post("/auth/forgot-password", { email }, { skipAuth: true }),

  resetPassword: (token: string, newPassword: string) =>
    apiClient.post(
      "/auth/reset-password",
      { token, newPassword },
      { skipAuth: true }
    ),

  verifyEmail: (token: string) =>
    apiClient.get(`/auth/verify-email?token=${token}`, { skipAuth: true }),

  getProfile: () => apiClient.get<Record<string, unknown>>("/users/me"),

  updateProfile: (data: Record<string, unknown>) => apiClient.put("/users/me", data),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.post("/users/me/password", { currentPassword, newPassword }),

  // MFA
  setupMfa: () => apiClient.post("/auth/mfa/setup"),
  enableMfa: (code: string) => apiClient.post("/auth/mfa/enable", { code }),
  disableMfa: (code: string) => apiClient.post("/auth/mfa/disable", { code }),
  getMfaStatus: () => apiClient.get<{ mfaEnabled: boolean }>("/auth/mfa/status"),
};

/**
 * Agreements API methods
 */
export const agreementsApi = {
  list: (params?: Record<string, string>) => {
    const queryString = params
      ? "?" + new URLSearchParams(params).toString()
      : "";
    return apiClient.get<Record<string, unknown>[]>(`/agreements${queryString}`);
  },

  get: (id: string) => apiClient.get<Record<string, unknown>>(`/agreements/${id}`),

  create: (data: Record<string, unknown>) => apiClient.post("/agreements", data),

  update: (id: string, data: Record<string, unknown>) => apiClient.put(`/agreements/${id}`, data),

  terminate: (id: string, reason: string) =>
    apiClient.delete(`/agreements/${id}`, { body: { reason } } as RequestOptions),

  recordPayment: (id: string, paymentData: Record<string, unknown>) =>
    apiClient.post(`/agreements/${id}/pay`, paymentData),

  getPayments: (id: string) => apiClient.get<Record<string, unknown>[]>(`/agreements/${id}/payments`),
};

/**
 * API Keys API methods
 */
export const apiKeysApi = {
  list: () => apiClient.get<Record<string, unknown>[]>("/api-keys"),

  create: (data: { name: string; description?: string; scopes?: string[] }) =>
    apiClient.post("/api-keys", data),

  revoke: (id: string) => apiClient.post(`/api-keys/${id}/revoke`),

  delete: (id: string) => apiClient.delete(`/api-keys/${id}`),
};

export default apiClient;
