'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const LOADING_KEYS = {
  pageProperties: 'page:properties',
  pagePropertiesMap: 'page:properties:map',
  modalDefault: 'modal:default',
  formDefault: 'form:default',
  listDefault: 'list:default',
  buttonDefault: 'button:default',
} as const;

export type LoadingKey = string;

export interface LoadingStore {
  loading: Map<LoadingKey, boolean>;
  setLoading: (key: LoadingKey, value: boolean) => void;
  isLoading: (key: LoadingKey) => boolean;
  clearLoading: () => void;
}

export const useLoadingStore = create<LoadingStore>()(
  devtools(
    (set, get) => ({
      loading: new Map(),
      setLoading: (key, value) =>
        set(
          (state) => {
            const next = new Map(state.loading);
            if (value) next.set(key, true);
            else next.delete(key);
            return { loading: next };
          },
          false,
          `setLoading/${key}`,
        ),
      isLoading: (key) => get().loading.get(key) ?? false,
      clearLoading: () => set({ loading: new Map() }, false, 'clearLoading'),
    }),
    { name: 'chioma/loading', enabled: process.env.NODE_ENV !== 'production' },
  ),
);
