import { NextRequest, NextResponse } from 'next/server';
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

    // ── Backend unreachable: wallet-only fallback authentication ─────────
    const id = `wallet_${walletAddress.slice(0, 8).toLowerCase()}`;

    return NextResponse.json({
      accessToken: `mock_access_${id}_${Date.now()}`,
      refreshToken: `mock_refresh_${id}_${Date.now()}`,
      user: {
        id,
        email: null,
        emailVerified: false,
        firstName: '',
        lastName: '',
        role: 'user',
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
