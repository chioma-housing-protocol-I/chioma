import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '@/store/ui-store';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resetStore() {
  useUIStore.setState({
    theme: 'system',
    sidebarOpen: true,
    sidebarCollapsed: false,
    activeModal: null,
    toasts: [],
    globalLoading: false,
    isOnline: true,
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('uiStore', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
  });

  it('starts with sensible defaults', () => {
    const state = useUIStore.getState();
    expect(state.theme).toBe('system');
    expect(state.sidebarOpen).toBe(true);
    expect(state.sidebarCollapsed).toBe(false);
    expect(state.activeModal).toBeNull();
    expect(state.toasts).toHaveLength(0);
    expect(state.globalLoading).toBe(false);
    expect(state.isOnline).toBe(true);
  });

  it('setTheme updates the current theme', () => {
    useUIStore.getState().setTheme('dark');
    expect(useUIStore.getState().theme).toBe('dark');

    useUIStore.getState().setTheme('light');
    expect(useUIStore.getState().theme).toBe('light');
  });

  it('toggleSidebar flips sidebarOpen', () => {
    expect(useUIStore.getState().sidebarOpen).toBe(true);

    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(false);

    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(true);
  });

  it('setSidebarOpen directly sets the value', () => {
    useUIStore.getState().setSidebarOpen(false);
    expect(useUIStore.getState().sidebarOpen).toBe(false);
  });

  it('setSidebarCollapsed persists the collapsed state', () => {
    useUIStore.getState().setSidebarCollapsed(true);
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);
  });

  it('openModal / closeModal manage the active modal', () => {
    useUIStore.getState().openModal('confirm-delete', { itemId: '42' });

    const modal = useUIStore.getState().activeModal;
    expect(modal).toEqual({ id: 'confirm-delete', props: { itemId: '42' } });

    useUIStore.getState().closeModal();
    expect(useUIStore.getState().activeModal).toBeNull();
  });

  it('addToast appends and removeToast removes', () => {
    useUIStore.getState().addToast({
      type: 'success',
      title: 'Saved',
      message: 'Changes saved successfully',
    });

    const toasts = useUIStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].title).toBe('Saved');
    expect(toasts[0].type).toBe('success');
    expect(toasts[0].id).toMatch(/^toast-/);

    useUIStore.getState().removeToast(toasts[0].id);
    expect(useUIStore.getState().toasts).toHaveLength(0);
  });

  it('multiple toasts accumulate in order', () => {
    useUIStore.getState().addToast({ type: 'info', title: 'First' });
    useUIStore.getState().addToast({ type: 'error', title: 'Second' });

    const toasts = useUIStore.getState().toasts;
    expect(toasts).toHaveLength(2);
    expect(toasts[0].title).toBe('First');
    expect(toasts[1].title).toBe('Second');
  });

  it('setGlobalLoading toggles loading flag', () => {
    useUIStore.getState().setGlobalLoading(true);
    expect(useUIStore.getState().globalLoading).toBe(true);

    useUIStore.getState().setGlobalLoading(false);
    expect(useUIStore.getState().globalLoading).toBe(false);
  });

  it('setOnlineStatus tracks connectivity', () => {
    useUIStore.getState().setOnlineStatus(false);
    expect(useUIStore.getState().isOnline).toBe(false);

    useUIStore.getState().setOnlineStatus(true);
    expect(useUIStore.getState().isOnline).toBe(true);
  });
});
