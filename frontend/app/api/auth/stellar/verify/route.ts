import { NextRequest, NextResponse } from 'next/server';
import { getUserByWalletAddress } from '@/mocks/entities/users';

/**
 * POST /api/auth/stellar/verify
 * Verify signed challenge and authenticate user
 */
export async function POST(request: NextRequest) {
  try {
    const { walletAddress, challenge, signature } = await request.json();

    if (!walletAddress || !challenge || !signature) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 },
      );
    }

    // Find user by wallet address from mock data
    const user = getUserByWalletAddress(walletAddress);

    if (!user) {
      return NextResponse.json(
        { message: 'Wallet address not registered. Please sign up first.' },
        { status: 404 },
      );
    }

    // In production, verify the signature here
    // For mock: just return success with user data

    // Generate mock tokens
    const accessToken = `mock_access_${user.id}_${Date.now()}`;
    const refreshToken = `mock_refresh_${user.id}_${Date.now()}`;

    // Map role to match authStore format
    const roleMap = {
      USER: 'user',
      ADMIN: 'admin',
    } as const;

    return NextResponse.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.name.split(' ')[0],
        lastName: user.name.split(' ').slice(1).join(' '),
        role: roleMap[user.role],
      },
    });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { message: 'Signature verification failed' },
      { status: 500 },
    );
  }
}
