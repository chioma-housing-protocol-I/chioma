import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore, useAuth } from '@/store/authStore';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  firstName: 'Alice',
  lastName: 'Smith',
  role: 'tenant' as const,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = '';
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
    useAuthStore.getState().setTokens('at-1', 'rt-1', mockUser);

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.accessToken).toBe('at-1');
    expect(state.refreshToken).toBe('rt-1');
    expect(state.isAuthenticated).toBe(true);
    expect(state.loading).toBe(false);

    expect(localStorage.getItem('chioma_access_token')).toBe('at-1');
    expect(localStorage.getItem('chioma_refresh_token')).toBe('rt-1');
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

  it('login sets tokens via dev bypass', async () => {
    const result = await useAuthStore
      .getState()
      .login('test@chioma.local', 'pass');

    expect(result.success).toBe(true);

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.email).toBe('test@chioma.local');
  });

  it('logout clears state and localStorage', async () => {
    useAuthStore.getState().setTokens('at-4', 'rt-4', mockUser);

    // Stub fetch to prevent network call
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 200 })),
    );

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(localStorage.getItem('chioma_access_token')).toBeNull();

    vi.unstubAllGlobals();
  });

  it('useAuth alias points to the same store', () => {
    expect(useAuth).toBe(useAuthStore);
  });
});
