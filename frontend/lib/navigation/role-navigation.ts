/**
 * Role-based navigation utilities
 * Maps user roles to their respective dashboard routes
 */

export type UserRole =
  | 'tenant'
  | 'landlord'
  | 'agent'
  | 'admin'
  | 'support'
  | 'auditor';

/**
 * Dashboard route mapping for each role
 */
export const DASHBOARD_ROUTES: Record<UserRole, string> = {
  tenant: '/tenant',
  landlord: '/landlords',
  agent: '/agents',
  admin: '/admin',
  support: '/admin', // Support users go to admin dashboard
  auditor: '/admin', // Auditors go to admin dashboard
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
