import { beforeEach, describe, expect, it, vi } from 'vitest';

const { postMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    post: postMock,
  },
}));

import { useAuth, useAuthStore } from '@/store/authStore';

// --- Helpers -----------------------------------------------------------------

function resetStore() {
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    loading: true,
  });
}

const mockUser = {
  id: 'u-1',
  email: 'alice@chioma.local',
  emailVerified: true,
  firstName: 'Alice',
  lastName: 'Smith',
  role: 'user' as const,
};

// --- Tests -------------------------------------------------------------------

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = '';
    postMock.mockReset();
    resetStore();
  });

  it('starts with SSR-safe defaults', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.loading).toBe(true);
  });

  it('setTokens persists auth to state and localStorage', () => {
    useAuthStore.getState().setTokens('at-1', null, mockUser);

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.accessToken).toBe('at-1');
    expect(state.refreshToken).toBeNull();
    expect(state.isAuthenticated).toBe(true);
    expect(state.loading).toBe(false);

    expect(localStorage.getItem('chioma_access_token')).toBe('at-1');
    expect(localStorage.getItem('chioma_refresh_token')).toBeNull();
    expect(localStorage.getItem('chioma_user')).toBe(JSON.stringify(mockUser));
  });

  it('hydrate restores state from localStorage', () => {
    localStorage.setItem('chioma_access_token', 'at-2');
    localStorage.setItem('chioma_refresh_token', 'rt-2');
    localStorage.setItem('chioma_user', JSON.stringify(mockUser));

    useAuthStore.getState().hydrate();

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.accessToken).toBe('at-2');
    expect(state.isAuthenticated).toBe(true);
    expect(state.loading).toBe(false);
  });

  it('hydrate handles missing localStorage gracefully', () => {
    useAuthStore.getState().hydrate();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.loading).toBe(false);
  });

  it('hydrate clears corrupted localStorage data', () => {
    localStorage.setItem('chioma_access_token', 'at-3');
    localStorage.setItem('chioma_user', '{invalid-json');

    useAuthStore.getState().hydrate();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(localStorage.getItem('chioma_access_token')).toBeNull();
  });

  it('login authenticates against the backend response', async () => {
    postMock.mockResolvedValueOnce({
      data: {
        accessToken: 'at-login',
        user: mockUser,
      },
      status: 200,
    });

    const result = await useAuthStore
      .getState()
      .login('test@chioma.local', 'pass');

    expect(result.success).toBe(true);
    expect(postMock).toHaveBeenCalledWith('/auth/login', {
      email: 'test@chioma.local',
      password: 'pass',
    });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual({
      ...mockUser,
      avatar: undefined,
    });
    expect(state.accessToken).toBe('at-login');
  });

  it('returns an actionable message when MFA is required', async () => {
    postMock.mockResolvedValueOnce({
      data: {
        mfaRequired: true,
        mfaToken: 'mfa-token',
        user: mockUser,
      },
      status: 200,
    });

    const result = await useAuthStore.getState().login(mockUser.email, 'pass');

    expect(result).toEqual({
      success: false,
      error: 'Multi-factor authentication is required to finish signing in.',
    });
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('rejects authentication if an invalid role is provided', async () => {
    postMock.mockResolvedValueOnce({
      data: {
        accessToken: 'at-login-invalid',
        user: { ...mockUser, role: 'superuser' },
      },
      status: 200,
    });

    const result = await useAuthStore
      .getState()
      .login('test@chioma.local', 'pass');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid role assigned: superuser');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('refreshSession updates the stored access token', async () => {
    useAuthStore.getState().setTokens('at-old', null, mockUser);
    postMock.mockResolvedValueOnce({
      data: {
        accessToken: 'at-refreshed',
      },
      status: 200,
    });

    const result = await useAuthStore.getState().refreshSession();

    expect(result.success).toBe(true);
    expect(postMock).toHaveBeenCalledWith('/auth/refresh', {}, { retries: 0 });
    expect(useAuthStore.getState().accessToken).toBe('at-refreshed');
    expect(localStorage.getItem('chioma_access_token')).toBe('at-refreshed');
  });

  it('logout clears state and localStorage', async () => {
    useAuthStore.getState().setTokens('at-4', null, mockUser);
    postMock.mockResolvedValueOnce({
      data: { message: 'Logged out successfully' },
      status: 200,
    });

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(localStorage.getItem('chioma_access_token')).toBeNull();
    expect(postMock).toHaveBeenCalledWith('/auth/logout', {}, { retries: 0 });
  });

  it('useAuth alias points to the same store', () => {
    expect(useAuth).toBe(useAuthStore);
  });
});
