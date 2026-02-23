'use client';

import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'tenant' | 'landlord' | 'agent';
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

interface AuthActions {
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string, user: User) => void;
  hydrate: () => void;
}

export type AuthStore = AuthState & AuthActions;

// ─── Constants ───────────────────────────────────────────────────────────────

const AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: 'chioma_access_token',
  REFRESH_TOKEN: 'chioma_refresh_token',
  USER: 'chioma_user',
} as const;

const AUTH_COOKIE_NAME = 'chioma_auth_token';

// ─── Cookie Helpers ──────────────────────────────────────────────────────────

function setAuthCookie(token: string) {
  document.cookie = `${AUTH_COOKIE_NAME}=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

function removeAuthCookie() {
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

// ─── Storage Helpers ─────────────────────────────────────────────────────────

function readStoredAuth(): Omit<AuthState, 'loading'> {
  if (typeof window === 'undefined') {
    return {
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    };
  }

  try {
    const storedAccessToken = localStorage.getItem(
      AUTH_STORAGE_KEYS.ACCESS_TOKEN,
    );
    const storedRefreshToken = localStorage.getItem(
      AUTH_STORAGE_KEYS.REFRESH_TOKEN,
    );
    const storedUser = localStorage.getItem(AUTH_STORAGE_KEYS.USER);

    if (storedAccessToken && storedUser) {
      return {
        user: JSON.parse(storedUser) as User,
        accessToken: storedAccessToken,
        refreshToken: storedRefreshToken,
        isAuthenticated: true,
      };
    }
  } catch {
    // Corrupted storage — clear and start fresh
    localStorage.removeItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(AUTH_STORAGE_KEYS.USER);
    removeAuthCookie();
  }

  return {
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
  };
}

function clearStorage() {
  localStorage.removeItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(AUTH_STORAGE_KEYS.USER);
  removeAuthCookie();
}

function persistAuth(accessToken: string, refreshToken: string, user: User) {
  localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  localStorage.setItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  localStorage.setItem(AUTH_STORAGE_KEYS.USER, JSON.stringify(user));
  setAuthCookie(accessToken);
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthStore>()((set, get) => ({
  // Initial state — SSR-safe defaults; call hydrate() on client mount
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  loading: true,

  /**
   * Hydrate from localStorage on client mount.
   * Should be called once from the root layout/component.
   */
  hydrate: () => {
    const stored = readStoredAuth();
    set({ ...stored, loading: false });
  },

  /**
   * Directly set tokens & user (useful after registration or
   * when the backend response is already available).
   */
  setTokens: (accessToken: string, refreshToken: string, user: User) => {
    persistAuth(accessToken, refreshToken, user);
    set({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
      loading: false,
    });
  },

  /**
   * Login with email/password — calls the backend auth endpoint.
   */
  login: async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    // --- REAL AUTHENTICATION LOGIC (Commented out for development) ---
    /*
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.message || 'Invalid credentials. Please try again.',
        };
      }

      const data = await response.json();
      get().setTokens(data.accessToken, data.refreshToken, data.user);
      return { success: true };
    } catch {
      return {
        success: false,
        error: 'Network error. Please check your connection.',
      };
    }
    */

    // DEV BYPASS: instantly log in as landlord
    get().setTokens('mock-access-token', 'mock-refresh-token', {
      id: 'dev-123',
      email: email || 'dev@chioma.local',
      firstName: 'Dev',
      lastName: 'Landlord',
      role: 'landlord',
    });
    return { success: true };
  },

  /**
   * Logout — clears tokens from storage, cookie, and state.
   */
  logout: async () => {
    const token = localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);

    // Best-effort call to backend logout
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Silently fail — we still clear local state
      }
    }

    clearStorage();

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      loading: false,
    });
  },
}));

// ─── Convenience Hook (backward-compatible with old AuthContext) ─────────────

export const useAuth = useAuthStore;
