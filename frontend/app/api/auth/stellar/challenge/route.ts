import { NextRequest, NextResponse } from 'next/server';
import { postToBackend } from '../backend';

/**
 * POST /api/auth/stellar/challenge
 * Generate a challenge for wallet authentication.
 *
 * Forwards to the backend's SEP-10 challenge endpoint; the local mock below is
 * only used when the backend is unreachable.
 */
export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json(
        { message: 'Wallet address is required' },
        { status: 400 },
      );
    }

    const backend = await postToBackend('auth/stellar/challenge', {
      walletAddress,
    });

    if (backend) {
      return NextResponse.json(backend.body, { status: backend.status });
    }

    // Backend unreachable — fall back to a mock challenge so a frontend-only
    // dev environment still exercises the full wallet flow.
    const mockChallenge = `AAAAAQAAAAC7JAuE3XvquOnbsgv2SRztjuk4RoBVefQ0rlrFMMQvfAAAAAA=${Date.now()}`;

    return NextResponse.json({
      challenge: mockChallenge,
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
    });
  } catch (error) {
    console.error('Challenge generation error:', error);
    return NextResponse.json(
      { message: 'Failed to generate challenge' },
      { status: 500 },
    );
  }
}
