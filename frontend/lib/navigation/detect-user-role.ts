/**
 * Detect user role from wallet address
 * Used as fallback if backend doesn't provide role
 */

import { getUserByWalletAddress } from '@/mocks/entities/users';

export async function detectRoleFromWallet(
  walletAddress: string,
): Promise<string | null> {
  if (!walletAddress) return null;

  try {
    // Try to fetch from backend first
    const response = await fetch('/api/users/role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.role || null;
    }
  } catch (error) {
    console.warn('Failed to fetch role from backend:', error);
  }

  // Fallback to mock data (for development/testing)
  if (process.env.NODE_ENV !== 'production') {
    const user = getUserByWalletAddress(walletAddress);
    return user?.role.toLowerCase() || null;
  }

  return null;
}
