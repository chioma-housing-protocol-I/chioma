'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { withMiddleware } from './middleware';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ModalState {
  id: string;
  props?: Record<string, unknown>;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

interface UIState {
  theme: ThemeMode;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  activeModal: ModalState | null;
  toasts: Toast[];
  globalLoading: boolean;
  isOnline: boolean;
}

interface UIActions {
  setTheme: (theme: ThemeMode) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openModal: (id: string, props?: Record<string, unknown>) => void;
  closeModal: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  setGlobalLoading: (loading: boolean) => void;
  setOnlineStatus: (online: boolean) => void;
}

export type UIStore = UIState & UIActions;

// ─── Helpers ─────────────────────────────────────────────────────────────────

let toastCounter = 0;

function nextToastId(): string {
  toastCounter += 1;
  return `toast-${Date.now()}-${toastCounter}`;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useUIStore = create<UIStore>()(
  persist(
    withMiddleware(
      (set) => ({
        // — state
        theme: 'system',
        sidebarOpen: true,
        sidebarCollapsed: false,
        activeModal: null,
        toasts: [],
        globalLoading: false,
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,

        // — actions
        setTheme: (theme) => {
          set((state) => {
            state.theme = theme;
          });
        },

        toggleSidebar: () => {
          set((state) => {
            state.sidebarOpen = !state.sidebarOpen;
          });
        },

        setSidebarOpen: (open) => {
          set((state) => {
            state.sidebarOpen = open;
          });
        },

        setSidebarCollapsed: (collapsed) => {
          set((state) => {
            state.sidebarCollapsed = collapsed;
          });
        },

        openModal: (id, props) => {
          set((state) => {
            state.activeModal = { id, props };
          });
        },

        closeModal: () => {
          set((state) => {
            state.activeModal = null;
          });
        },

        addToast: (toast) => {
          set((state) => {
            state.toasts.push({ ...toast, id: nextToastId() });
          });
        },

        removeToast: (id) => {
          set((state) => {
            state.toasts = state.toasts.filter((t) => t.id !== id);
          });
        },

        setGlobalLoading: (loading) => {
          set((state) => {
            state.globalLoading = loading;
          });
        },

        setOnlineStatus: (online) => {
          set((state) => {
            state.isOnline = online;
          });
        },
      }),
      'ui',
    ),
    {
      name: 'chioma-ui',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    },
  ),
);
