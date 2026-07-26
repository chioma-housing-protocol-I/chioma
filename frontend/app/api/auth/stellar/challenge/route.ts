import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/stellar/challenge
 * Generate a challenge for wallet authentication
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

    // In production, this would generate a proper Stellar SEP-10 challenge
    // For now, return a mock challenge XDR
    const mockChallenge = `AAAAAQAAAAC7JAuE3XvquOnbsgv2SRztjuk4RoBVefQ0rlrFMMQvfAAAAAA=${Date.now()}`;

    return NextResponse.json({ challenge: mockChallenge });
  } catch (error) {
    console.error('Challenge generation error:', error);
    return NextResponse.json(
      { message: 'Failed to generate challenge' },
      { status: 500 },
    );
  }
}
