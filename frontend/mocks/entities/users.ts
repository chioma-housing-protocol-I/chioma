/**
 * Mock User Data
 */

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'TENANT' | 'LANDLORD' | 'AGENT' | 'ADMIN';
  walletAddress?: string;
  isVerified?: boolean;
}

export const MOCK_USERS = {
  tenants: [
    {
      id: 'tenant-001',
      name: 'Chioma Okafor',
      email: 'chioma.okafor@email.com',
      phone: '+234 805 123 4567',
      role: 'TENANT' as const,
      walletAddress: 'GABWYJTOT5X5UZM77BAYRAADXACDWT3O57WYMDEOI5F4EBSFATIK6WAM',
      isVerified: true,
    },
    {
      id: 'tenant-002',
      name: 'Adebayo Mensah',
      email: 'adebayo.mensah@email.com',
      phone: '+234 806 234 5678',
      role: 'TENANT' as const,
      walletAddress: 'GCPDQRFMCJXVOEOJMXECBIU7NQBC5BTJNJLW4YVXQ3XVZUYQ9A1E',
      isVerified: true,
    },
    {
      id: 'tenant-003',
      name: 'Amina Hassan',
      email: 'amina.hassan@email.com',
      phone: '+234 807 345 6789',
      role: 'TENANT' as const,
      walletAddress: 'GDQFWVYTVWQ7IXVQVQVQVQVQVQVQVQVQVQVQVQVQVQVQVQVQVQ3B8C',
      isVerified: true,
    },
  ],
  landlords: [
    {
      id: 'landlord-001',
      name: 'James Adebayo',
      email: 'james.adebayo@email.com',
      phone: '+234 801 111 2222',
      role: 'LANDLORD' as const,
      walletAddress: 'GABWYJTOT5X5UZM77BAYRAADXACDWT3O57WYMDEOI5F4EBSFATIK6WAM',
      isVerified: true,
    },
    {
      id: 'landlord-002',
      name: 'Chief Emeka Okonkwo',
      email: 'emeka.okonkwo@email.com',
      phone: '+234 802 222 3333',
      role: 'LANDLORD' as const,
      walletAddress: 'GCPDQRFMCJXVOEOJMXECBIU7NQBC5BTJNJLW4YVXQ3XVZUYQ9A1E',
      isVerified: true,
    },
  ],
  agents: [
    {
      id: 'agent-001',
      name: 'Sarah Jenks',
      email: 'sarah.jenks@email.com',
      phone: '+234 803 333 4444',
      role: 'AGENT' as const,
      walletAddress: 'GABWYJTOT5X5UZM77BAYRAADXACDWT3O57WYMDEOI5F4EBSFATIK6WAM',
      isVerified: true,
    },
    {
      id: 'agent-002',
      name: 'Facility Ops Team',
      email: 'ops@facility.com',
      phone: '+234 804 444 5555',
      role: 'AGENT' as const,
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

  const allUsers = [
    ...MOCK_USERS.tenants,
    ...MOCK_USERS.landlords,
    ...MOCK_USERS.agents,
    ...MOCK_USERS.admins,
  ];

  return allUsers.find(
    (user) => user.walletAddress?.toLowerCase() === walletAddress.toLowerCase(),
  );
}
