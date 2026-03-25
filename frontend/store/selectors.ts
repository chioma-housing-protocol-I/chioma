/**
 * Memoized selectors for domain stores.
 *
 * Each selector is a plain function compatible with Zustand's `useStore(selector)`
 * pattern. For derived values that involve filtering or mapping, the selector
 * itself is cheap — Zustand only triggers a re-render when the *result* changes
 * (via Object.is by default).
 */

import type { AuthStore } from './authStore';
import type { NotificationStore } from './notificationStore';
import type { PropertyStore } from './property-store';
import type { UIStore } from './ui-store';

// ─── Auth Selectors ──────────────────────────────────────────────────────────

export const selectUser = (state: AuthStore) => state.user;
export const selectIsAuthenticated = (state: AuthStore) =>
  state.isAuthenticated;
export const selectAuthLoading = (state: AuthStore) => state.loading;
export const selectUserRole = (state: AuthStore) => state.user?.role ?? null;
export const selectAccessToken = (state: AuthStore) => state.accessToken;

// ─── Notification Selectors ──────────────────────────────────────────────────

export const selectNotifications = (state: NotificationStore) =>
  state.notifications;
export const selectUnreadNotifications = (state: NotificationStore) =>
  state.notifications.filter((n) => !n.read);
export const selectNotificationsByType = (type: string) => {
  return (state: NotificationStore) =>
    state.notifications.filter((n) => n.type === type);
};

// ─── Property Selectors ──────────────────────────────────────────────────────

export const selectPropertyFilters = (state: PropertyStore) => state.filters;
export const selectPropertySort = (state: PropertyStore) => ({
  field: state.sortField,
  direction: state.sortDirection,
});
export const selectPropertyViewMode = (state: PropertyStore) => state.viewMode;
export const selectSelectedPropertyId = (state: PropertyStore) =>
  state.selectedPropertyId;
export const selectPropertySearchQuery = (state: PropertyStore) =>
  state.searchQuery;
export const selectHasActiveFilters = (state: PropertyStore) =>
  Object.values(state.filters).some(
    (v) => v !== undefined && v !== '' && v !== null,
  ) || state.searchQuery.length > 0;

// ─── UI Selectors ────────────────────────────────────────────────────────────

export const selectTheme = (state: UIStore) => state.theme;
export const selectSidebarOpen = (state: UIStore) => state.sidebarOpen;
export const selectSidebarCollapsed = (state: UIStore) =>
  state.sidebarCollapsed;
export const selectActiveModal = (state: UIStore) => state.activeModal;
export const selectToasts = (state: UIStore) => state.toasts;
export const selectGlobalLoading = (state: UIStore) => state.globalLoading;
export const selectIsOnline = (state: UIStore) => state.isOnline;
