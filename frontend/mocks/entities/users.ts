/**
 * Mock User Data
 */

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'USER' | 'ADMIN';
  walletAddress?: string;
  isVerified?: boolean;
}

export const MOCK_USERS = {
  users: [
    {
      id: 'user-001',
      name: 'Chioma Okafor',
      email: 'chioma.okafor@email.com',
      phone: '+234 805 123 4567',
      role: 'USER' as const,
      walletAddress: 'GABWYJTOT5X5UZM77BAYRAADXACDWT3O57WYMDEOI5F4EBSFATIK6WAM',
      isVerified: true,
    },
    {
      id: 'user-002',
      name: 'Adebayo Mensah',
      email: 'adebayo.mensah@email.com',
      phone: '+234 806 234 5678',
      role: 'USER' as const,
      walletAddress: 'GCPDQRFMCJXVOEOJMXECBIU7NQBC5BTJNJLW4YVXQ3XVZUYQ9A1E',
      isVerified: true,
    },
    {
      id: 'user-003',
      name: 'Amina Hassan',
      email: 'amina.hassan@email.com',
      phone: '+234 807 345 6789',
      role: 'USER' as const,
      walletAddress: 'GDQFWVYTVWQ7IXVQVQVQVQVQVQVQVQVQVQVQVQVQVQVQVQVQVQ3B8C',
      isVerified: true,
    },
    {
      id: 'user-004',
      name: 'James Adebayo',
      email: 'james.adebayo@email.com',
      phone: '+234 801 111 2222',
      role: 'USER' as const,
      walletAddress: 'GABWYJTOT5X5UZM77BAYRAADXACDWT3O57WYMDEOI5F4EBSFATIK6WAM',
      isVerified: true,
    },
    {
      id: 'user-005',
      name: 'Chief Emeka Okonkwo',
      email: 'emeka.okonkwo@email.com',
      phone: '+234 802 222 3333',
      role: 'USER' as const,
      walletAddress: 'GCPDQRFMCJXVOEOJMXECBIU7NQBC5BTJNJLW4YVXQ3XVZUYQ9A1E',
      isVerified: true,
    },
    {
      id: 'user-006',
      name: 'Sarah Jenks',
      email: 'sarah.jenks@email.com',
      phone: '+234 803 333 4444',
      role: 'USER' as const,
      walletAddress: 'GABWYJTOT5X5UZM77BAYRAADXACDWT3O57WYMDEOI5F4EBSFATIK6WAM',
      isVerified: true,
    },
    {
      id: 'user-007',
      name: 'Facility Ops Team',
      email: 'ops@facility.com',
      phone: '+234 804 444 5555',
      role: 'USER' as const,
      walletAddress: 'GDZST3XVICJD5DBNRMODE4DMV47GQJVJ53BCTNYWYTYVZQQZ572XL7DQ',
      isVerified: true,
    },
  ],
  admins: [
    {
      id: 'admin-001',
      name: 'Admin User',
      email: 'admin@chioma.local',
      phone: '+234 800 000 0000',
      role: 'ADMIN' as const,
      walletAddress: 'GABWYJTOT5X5UZM77BAYRAADXACDWT3O57WYMDEOI5F4EBSFATIK6WAM',
      isVerified: true,
    },
  ],
};

/**
 * Get user by wallet address
 */
export function getUserByWalletAddress(
  walletAddress: string | null,
): User | undefined {
  if (!walletAddress) return undefined;

  const allUsers = [...MOCK_USERS.users, ...MOCK_USERS.admins];

  return allUsers.find(
    (user) => user.walletAddress?.toLowerCase() === walletAddress.toLowerCase(),
  );
}
