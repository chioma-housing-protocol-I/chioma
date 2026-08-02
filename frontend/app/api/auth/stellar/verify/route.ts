import { NextRequest, NextResponse } from 'next/server';
import { getUserByWalletAddress } from '@/mocks/entities/users';
import { postToBackend } from '../backend';

/**
 * POST /api/auth/stellar/verify
 * Verify signed challenge and authenticate user.
 *
 * Forwards to the backend, which verifies the signature and does find-or-create
 * on the wallet address. The local mock below is only used when the backend is
 * unreachable.
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

    const backend = await postToBackend('auth/stellar/verify', {
      walletAddress,
      challenge,
      signature,
    });

    if (backend) {
      return NextResponse.json(backend.body, { status: backend.status });
    }

    // ── Backend unreachable: mock authentication ──────────────────────────
    // Owning the wallet is the credential, so an unrecognised address is a
    // brand-new account rather than an error. Mirror the backend and mint a
    // wallet-only user with no email — the client then routes it into the
    // complete-profile step to collect one.
    const user = getUserByWalletAddress(walletAddress);

    const roleMap = {
      USER: 'user',
      ADMIN: 'admin',
    } as const;

    const id = user?.id ?? `wallet_${walletAddress.slice(0, 8).toLowerCase()}`;

    return NextResponse.json({
      accessToken: `mock_access_${id}_${Date.now()}`,
      refreshToken: `mock_refresh_${id}_${Date.now()}`,
      user: {
        id,
        email: user?.email ?? null,
        emailVerified: Boolean(user?.email),
        firstName: user ? user.name.split(' ')[0] : '',
        lastName: user ? user.name.split(' ').slice(1).join(' ') : '',
        role: user ? roleMap[user.role] : 'user',
        walletAddress,
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
