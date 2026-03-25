/**
 * Barrel export for all domain stores and selectors.
 *
 * Import from `@/store` instead of reaching into individual files:
 *   import { useAuthStore, useUIStore, selectUser } from '@/store';
 */

// ── Stores ───────────────────────────────────────────────────────────────────
export { useAuthStore, useAuth } from './authStore';
export type { AuthStore, User } from './authStore';

export { useNotificationStore, selectUnreadCount } from './notificationStore';
export type { NotificationStore } from './notificationStore';

export { usePropertyStore } from './property-store';
export type {
  PropertyStore,
  PropertyFilter,
  SortField,
  SortDirection,
} from './property-store';

export { useUIStore } from './ui-store';
export type { UIStore, ThemeMode, ModalState, Toast } from './ui-store';

// ── Selectors ────────────────────────────────────────────────────────────────
export {
  selectUser,
  selectIsAuthenticated,
  selectAuthLoading,
  selectUserRole,
  selectAccessToken,
  selectNotifications,
  selectUnreadNotifications,
  selectNotificationsByType,
  selectPropertyFilters,
  selectPropertySort,
  selectPropertyViewMode,
  selectSelectedPropertyId,
  selectPropertySearchQuery,
  selectHasActiveFilters,
  selectTheme,
  selectSidebarOpen,
  selectSidebarCollapsed,
  selectActiveModal,
  selectToasts,
  selectGlobalLoading,
  selectIsOnline,
} from './selectors';

// ── Middleware ────────────────────────────────────────────────────────────────
export { withMiddleware } from './middleware';
