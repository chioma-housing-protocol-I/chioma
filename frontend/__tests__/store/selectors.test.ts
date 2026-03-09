import { describe, it, expect } from 'vitest';
import {
  selectUser,
  selectIsAuthenticated,
  selectAuthLoading,
  selectUserRole,
  selectUnreadNotifications,
  selectNotificationsByType,
  selectPropertyFilters,
  selectPropertySort,
  selectHasActiveFilters,
  selectTheme,
  selectSidebarOpen,
  selectActiveModal,
  selectToasts,
  selectGlobalLoading,
  selectIsOnline,
} from '@/store/selectors';
import type { AuthStore } from '@/store/authStore';
import type { NotificationStore } from '@/store/notificationStore';
import type { PropertyStore } from '@/store/property-store';
import type { UIStore } from '@/store/ui-store';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const authState: AuthStore = {
  user: {
    id: 'u-1',
    email: 'a@b.com',
    firstName: 'A',
    lastName: 'B',
    role: 'landlord',
  },
  accessToken: 'tok',
  refreshToken: 'ref',
  isAuthenticated: true,
  loading: false,
  login: async () => ({ success: true }),
  logout: async () => {},
  setTokens: () => {},
  hydrate: () => {},
};

const notificationState: NotificationStore = {
  notifications: [
    {
      id: 'n-1',
      type: 'payment',
      title: 'Rent',
      body: 'Paid',
      read: false,
      createdAt: '2024-01-01',
    },
    {
      id: 'n-2',
      type: 'maintenance',
      title: 'Fix',
      body: 'Done',
      read: true,
      createdAt: '2024-01-02',
    },
    {
      id: 'n-3',
      type: 'payment',
      title: 'Deposit',
      body: 'Locked',
      read: false,
      createdAt: '2024-01-03',
    },
  ],
  isLoaded: true,
  fetchNotifications: () => {},
  markAsRead: () => {},
  markAsUnread: () => {},
  markAllAsRead: () => {},
  addNotification: () => {},
};

const propertyState: PropertyStore = {
  filters: { city: 'Lagos' },
  sortField: 'price',
  sortDirection: 'asc',
  selectedPropertyId: null,
  viewMode: 'grid',
  searchQuery: '',
  setFilters: () => {},
  resetFilters: () => {},
  setSort: () => {},
  selectProperty: () => {},
  setViewMode: () => {},
  setSearchQuery: () => {},
};

const uiState: UIStore = {
  theme: 'dark',
  sidebarOpen: false,
  sidebarCollapsed: true,
  activeModal: { id: 'delete', props: { x: 1 } },
  toasts: [{ id: 't-1', type: 'info', title: 'Hi' }],
  globalLoading: true,
  isOnline: false,
  setTheme: () => {},
  toggleSidebar: () => {},
  setSidebarOpen: () => {},
  setSidebarCollapsed: () => {},
  openModal: () => {},
  closeModal: () => {},
  addToast: () => {},
  removeToast: () => {},
  setGlobalLoading: () => {},
  setOnlineStatus: () => {},
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('selectors', () => {
  describe('auth selectors', () => {
    it('selectUser returns the user object', () => {
      expect(selectUser(authState)).toEqual(authState.user);
    });

    it('selectIsAuthenticated returns boolean', () => {
      expect(selectIsAuthenticated(authState)).toBe(true);
    });

    it('selectAuthLoading returns loading state', () => {
      expect(selectAuthLoading(authState)).toBe(false);
    });

    it('selectUserRole returns the role string', () => {
      expect(selectUserRole(authState)).toBe('landlord');
    });

    it('selectUserRole returns null when no user', () => {
      expect(selectUserRole({ ...authState, user: null })).toBeNull();
    });
  });

  describe('notification selectors', () => {
    it('selectUnreadNotifications filters unread items', () => {
      const unread = selectUnreadNotifications(notificationState);
      expect(unread).toHaveLength(2);
      expect(unread.every((n) => !n.read)).toBe(true);
    });

    it('selectNotificationsByType filters by type', () => {
      const payments = selectNotificationsByType('payment')(notificationState);
      expect(payments).toHaveLength(2);
      expect(payments.every((n) => n.type === 'payment')).toBe(true);
    });
  });

  describe('property selectors', () => {
    it('selectPropertyFilters returns current filters', () => {
      expect(selectPropertyFilters(propertyState)).toEqual({ city: 'Lagos' });
    });

    it('selectPropertySort returns field and direction', () => {
      expect(selectPropertySort(propertyState)).toEqual({
        field: 'price',
        direction: 'asc',
      });
    });

    it('selectHasActiveFilters detects active filters', () => {
      expect(selectHasActiveFilters(propertyState)).toBe(true);
    });

    it('selectHasActiveFilters returns false when empty', () => {
      expect(selectHasActiveFilters({ ...propertyState, filters: {} })).toBe(
        false,
      );
    });
  });

  describe('UI selectors', () => {
    it('selectTheme returns theme mode', () => {
      expect(selectTheme(uiState)).toBe('dark');
    });

    it('selectSidebarOpen returns sidebar state', () => {
      expect(selectSidebarOpen(uiState)).toBe(false);
    });

    it('selectActiveModal returns modal state', () => {
      expect(selectActiveModal(uiState)).toEqual({
        id: 'delete',
        props: { x: 1 },
      });
    });

    it('selectToasts returns toast array', () => {
      expect(selectToasts(uiState)).toHaveLength(1);
    });

    it('selectGlobalLoading returns loading flag', () => {
      expect(selectGlobalLoading(uiState)).toBe(true);
    });

    it('selectIsOnline returns connectivity status', () => {
      expect(selectIsOnline(uiState)).toBe(false);
    });
  });
});
