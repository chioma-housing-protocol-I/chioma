/**
 * Role-based navigation utilities
 * Maps user roles to their respective dashboard routes
 */

export type UserRole = 'admin' | 'user' | 'agent' | 'super_admin';

/**
 * Dashboard route mapping for each role. There is no separate route for
 * agents — agent-specific views render inside /user based on user.role.
 */
export const DASHBOARD_ROUTES: Record<UserRole, string> = {
  admin: '/admin',
  super_admin: '/admin',
  user: '/user',
  agent: '/user',
};

/**
 * Get the dashboard route for a given user role
 */
export function getDashboardRoute(role: UserRole | null | undefined): string {
  if (!role) {
    return '/'; // Default to landing page if no role
  }

  return DASHBOARD_ROUTES[role] || '/';
}

/**
 * Navigate to the appropriate dashboard based on user role
 */
export function navigateToDashboard(role: UserRole | null | undefined): void {
  const route = getDashboardRoute(role);
  window.location.href = route;
}
