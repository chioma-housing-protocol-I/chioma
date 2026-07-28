'use client';

import { AppError } from '@/lib/errors';
import { apiClient, setApiClientToken } from '@/lib/api-client';
import { create } from 'zustand';
import { withMiddleware } from './middleware';
import { useUIStore } from './ui-store';

// --- Types -------------------------------------------------------------------

export type Role = 'admin' | 'user' | 'agent';

export interface BaseUser {
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  avatar?: string;
  locale?: string;
}

export type AdminUser = BaseUser & { role: 'admin' };
export type RegularUser = BaseUser & { role: 'user' };
export type AgentUser = BaseUser & { role: 'agent' };

export type User = AdminUser | RegularUser | AgentUser;

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  walletAddress: string | null;
}

interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  /** Backend requires an explicit role; public signup only offers non-admin roles. */
  role: 'user' | 'agent';
}

interface AuthApiUser {
  id: string;
  email: string | null;
  emailVerified?: boolean;
  firstName: string | null;
  lastName: string | null;
  role: string;
  avatar?: string;
}

interface AuthSuccessResponse {
  accessToken: string;
  refreshToken?: string | null;
  user: AuthApiUser;
  mfaRequired?: false;
}

interface MfaRequiredResponse {
  mfaRequired: true;
  mfaToken: string;
  user: AuthApiUser;
}

interface RefreshResponse {
  accessToken: string;
}

interface MessageResponse {
  message: string;
}

type AuthResult = { success: boolean; error?: string };

interface AuthActions {
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (payload: RegisterPayload) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<AuthResult>;
  setTokens: (
    accessToken: string,
    refreshToken: string | null,
    user: User,
  ) => void;
  setWalletAddress: (address: string | null) => void;
  completeProfile: (payload: {
    email: string;
    firstName?: string;
    lastName?: string;
  }) => Promise<AuthResult>;
  updatePreferences: (preferences: { locale: string }) => Promise<void>;
  hydrate: (forceRefresh?: boolean) => void;
}

export type AuthStore = AuthState & AuthActions;

// --- Constants ---------------------------------------------------------------

const AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: 'chioma_access_token',
  REFRESH_TOKEN: 'chioma_refresh_token',
  USER: 'chioma_user',
  WALLET_ADDRESS: 'chioma_wallet_address',
} as const;

const AUTH_COOKIE_NAME = 'chioma_auth_token';

// --- Cookie Helpers ----------------------------------------------------------

function setAuthCookie(token: string) {
  if (typeof document === 'undefined') return;

  document.cookie = `${AUTH_COOKIE_NAME}=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

function removeAuthCookie() {
  if (typeof document === 'undefined') return;

  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

// --- Storage Helpers ---------------------------------------------------------

/**
 * Closure cache for the parsed localStorage snapshot. localStorage.getItem()
 * is synchronous and blocks the main thread, so repeat reads within the same
 * page session (e.g. a re-mounted hydrator) reuse this instead of hitting
 * storage again. Only refreshed when readStoredAuth is called with
 * `forceRefresh: true`, which `hydrate()` does not do by default.
 */
let cachedAuthSnapshot: Omit<AuthState, 'loading'> | null = null;

function emptyAuthSnapshot(): Omit<AuthState, 'loading'> {
  return {
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    walletAddress: null,
  };
}

function readStoredAuth(forceRefresh = false): Omit<AuthState, 'loading'> {
  if (cachedAuthSnapshot && !forceRefresh) {
    return cachedAuthSnapshot;
  }

  if (typeof window === 'undefined') {
    return emptyAuthSnapshot();
  }

  try {
    const storedAccessToken = localStorage.getItem(
      AUTH_STORAGE_KEYS.ACCESS_TOKEN,
    );
    const storedRefreshToken = localStorage.getItem(
      AUTH_STORAGE_KEYS.REFRESH_TOKEN,
    );
    const storedUser = localStorage.getItem(AUTH_STORAGE_KEYS.USER);
    const storedWalletAddress = localStorage.getItem(
      AUTH_STORAGE_KEYS.WALLET_ADDRESS,
    );

    if (storedAccessToken && storedUser) {
      cachedAuthSnapshot = {
        user: JSON.parse(storedUser) as User,
        accessToken: storedAccessToken,
        refreshToken: storedRefreshToken,
        isAuthenticated: true,
        walletAddress: storedWalletAddress,
      };
      return cachedAuthSnapshot;
    }
  } catch (error) {
    console.error('[authStore] Failed to parse auth storage:', error);
    
    const storedWalletAddress = localStorage.getItem(AUTH_STORAGE_KEYS.WALLET_ADDRESS);

    localStorage.removeItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(AUTH_STORAGE_KEYS.USER);
    // Partial recovery: preserve wallet address if it exists
    removeAuthCookie();

    useUIStore.getState().addToast({
      type: 'error',
      title: 'Session Corrupted',
      message: 'Your local session data was corrupted. You have been safely logged out.',
    });

    cachedAuthSnapshot = {
      ...emptyAuthSnapshot(),
      walletAddress: storedWalletAddress,
    };
    return cachedAuthSnapshot;
  }

  // If no stored token and user found
  const storedWalletAddressFallback = localStorage.getItem(AUTH_STORAGE_KEYS.WALLET_ADDRESS);
  cachedAuthSnapshot = {
    ...emptyAuthSnapshot(),
    walletAddress: storedWalletAddressFallback,
  };
  return cachedAuthSnapshot;
}

/** Test-only escape hatch to reset the closure cache between test cases. */
export function __resetAuthStorageCacheForTests(): void {
  cachedAuthSnapshot = null;
}

function clearStorage() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(AUTH_STORAGE_KEYS.USER);
  localStorage.removeItem(AUTH_STORAGE_KEYS.WALLET_ADDRESS);
  removeAuthCookie();

  cachedAuthSnapshot = emptyAuthSnapshot();
}

function persistAuth(
  accessToken: string,
  refreshToken: string | null,
  user: User,
) {
  localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, accessToken);

  if (refreshToken) {
    localStorage.setItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
  }

  localStorage.setItem(AUTH_STORAGE_KEYS.USER, JSON.stringify(user));
  setAuthCookie(accessToken);

  // Keep the closure cache in sync so subsequent reads skip localStorage
  cachedAuthSnapshot = {
    user,
    accessToken,
    refreshToken,
    isAuthenticated: true,
    walletAddress: cachedAuthSnapshot?.walletAddress ?? null,
  };
}

function normalizeUser(user: AuthApiUser): User {
  if (user.role !== 'admin' && user.role !== 'user' && user.role !== 'agent') {
    throw new Error(`Invalid role assigned: ${user.role}`);
  }

  return {
    id: user.id,
    email: user.email ?? '',
    emailVerified: user.emailVerified ?? false,
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    role: user.role,
    avatar: user.avatar,
    locale: (user as any).locale,
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AppError) {
    return error.userMessage || error.message || fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

// --- Store -------------------------------------------------------------------

export const useAuthStore = create<AuthStore>()(
  withMiddleware(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      loading: true,
      walletAddress: null,

      hydrate: (forceRefresh = false) => {
        const stored = readStoredAuth(forceRefresh);
        setApiClientToken(stored.accessToken);
        set((state) => {
          state.user = stored.user;
          state.accessToken = stored.accessToken;
          state.refreshToken = stored.refreshToken;
          state.isAuthenticated = stored.isAuthenticated;
          state.walletAddress = stored.walletAddress;
          state.loading = false;
        });
      },

      setTokens: (
        accessToken: string,
        refreshToken: string | null,
        user: User,
      ) => {
        persistAuth(accessToken, refreshToken, user);
        setApiClientToken(accessToken);
        set((state) => {
          state.user = user;
          state.accessToken = accessToken;
          state.refreshToken = refreshToken;
          state.isAuthenticated = true;
          state.loading = false;
        });
      },

      setWalletAddress: (address: string | null) => {
        if (address) {
          localStorage.setItem(AUTH_STORAGE_KEYS.WALLET_ADDRESS, address);
        } else {
          localStorage.removeItem(AUTH_STORAGE_KEYS.WALLET_ADDRESS);
        }

        // Keep closure cache in sync
        if (cachedAuthSnapshot) {
          cachedAuthSnapshot = {
            ...cachedAuthSnapshot,
            walletAddress: address,
          };
        }

        set((state) => {
          state.walletAddress = address;
        });
      },

      completeProfile: async (payload): Promise<AuthResult> => {
        try {
          await apiClient.post<MessageResponse>(
            '/auth/complete-profile',
            payload,
          );

          const currentUser = get().user;
          if (currentUser) {
            const updatedUser: User = {
              ...currentUser,
              email: payload.email,
              emailVerified: false,
              firstName: payload.firstName || currentUser.firstName,
              lastName: payload.lastName || currentUser.lastName,
            };
            localStorage.setItem(
              AUTH_STORAGE_KEYS.USER,
              JSON.stringify(updatedUser),
            );
            if (cachedAuthSnapshot) {
              cachedAuthSnapshot = { ...cachedAuthSnapshot, user: updatedUser };
            }
            set((state) => {
              state.user = updatedUser;
            });
          }

          return { success: true };
        } catch (error) {
          return {
            success: false,
            error: getErrorMessage(
              error,
              'Could not save your profile. Please try again.',
            ),
          };
        }
      },

      updatePreferences: async (preferences) => {
        try {
          // Attempt to update backend if API exists. We gracefully fail if it doesn't.
          await apiClient.post('/auth/preferences', preferences);
        } catch {
          // Silent catch for mock environments or missing endpoint
        }

        const currentUser = get().user;
        if (currentUser) {
          const updatedUser: User = {
            ...currentUser,
            ...preferences,
          };
          localStorage.setItem(
            AUTH_STORAGE_KEYS.USER,
            JSON.stringify(updatedUser),
          );
          if (cachedAuthSnapshot) {
            cachedAuthSnapshot = { ...cachedAuthSnapshot, user: updatedUser };
          }
          set((state) => {
            state.user = updatedUser;
          });
        }
      },

      login: async (email: string, password: string): Promise<AuthResult> => {
        try {
          const response = await apiClient.post<
            AuthSuccessResponse | MfaRequiredResponse
          >('/auth/login', {
            email,
            password,
          });

          if ('mfaRequired' in response.data && response.data.mfaRequired) {
            return {
              success: false,
              error:
                'Multi-factor authentication is required to finish signing in.',
            };
          }

          get().setTokens(
            response.data.accessToken,
            response.data.refreshToken ?? null,
            normalizeUser(response.data.user),
          );

          return { success: true };
        } catch (error) {
          return {
            success: false,
            error: getErrorMessage(
              error,
              'Invalid credentials. Please try again.',
            ),
          };
        }
      },

      register: async (payload: RegisterPayload): Promise<AuthResult> => {
        try {
          const response = await apiClient.post<AuthSuccessResponse>(
            '/auth/register',
            payload,
          );

          get().setTokens(
            response.data.accessToken,
            response.data.refreshToken ?? null,
            normalizeUser(response.data.user),
          );

          return { success: true };
        } catch (error) {
          return {
            success: false,
            error: getErrorMessage(
              error,
              'Registration failed. Please try again.',
            ),
          };
        }
      },

      refreshSession: async (): Promise<AuthResult> => {
        const currentUser = get().user;

        if (!currentUser) {
          return { success: false, error: 'No authenticated user to refresh.' };
        }

        try {
          const response = await apiClient.post<RefreshResponse>(
            '/auth/refresh',
            {},
            { retries: 0 },
          );

          get().setTokens(
            response.data.accessToken,
            get().refreshToken,
            currentUser,
          );

          return { success: true };
        } catch (error) {
          clearStorage();
          set((state) => {
            state.user = null;
            state.accessToken = null;
            state.refreshToken = null;
            state.isAuthenticated = false;
            state.walletAddress = null;
            state.loading = false;
          });

          return {
            success: false,
            error: getErrorMessage(
              error,
              'Your session expired. Please sign in again.',
            ),
          };
        }
      },

      logout: async () => {
        try {
          await apiClient.post<MessageResponse>(
            '/auth/logout',
            {},
            { retries: 0 },
          );
        } catch {
          // Best-effort logout: always clear the local session.
        }

        clearStorage();
        setApiClientToken(null);

        set((state) => {
          state.user = null;
          state.accessToken = null;
          state.refreshToken = null;
          state.isAuthenticated = false;
          state.walletAddress = null;
          state.loading = false;
        });
      },
    }),
    'auth',
  ),
);

// --- Convenience Hook (backward-compatible with old AuthContext) -------------

export const useAuth = useAuthStore;
