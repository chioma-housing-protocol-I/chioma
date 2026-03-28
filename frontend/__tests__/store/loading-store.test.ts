import { describe, it, expect, beforeEach } from 'vitest';
import { useLoadingStore } from '@/store/loading-store';

describe('useLoadingStore', () => {
  beforeEach(() => {
    useLoadingStore.getState().clearLoading();
  });

  it('defaults to no keys loading', () => {
    expect(useLoadingStore.getState().isLoading('any')).toBe(false);
  });

  it('setLoading true then isLoading reflects it', () => {
    useLoadingStore.getState().setLoading('page:test', true);
    expect(useLoadingStore.getState().isLoading('page:test')).toBe(true);
  });

  it('setLoading false removes key', () => {
    useLoadingStore.getState().setLoading('page:test', true);
    useLoadingStore.getState().setLoading('page:test', false);
    expect(useLoadingStore.getState().isLoading('page:test')).toBe(false);
  });

  it('clearLoading resets all keys', () => {
    useLoadingStore.getState().setLoading('a', true);
    useLoadingStore.getState().setLoading('b', true);
    useLoadingStore.getState().clearLoading();
    expect(useLoadingStore.getState().isLoading('a')).toBe(false);
    expect(useLoadingStore.getState().isLoading('b')).toBe(false);
  });
});
