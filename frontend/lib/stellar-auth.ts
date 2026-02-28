import {
  isAllowed,
  setAllowed,
  requestAccess,
  signTransaction,
} from '@stellar/freighter-api';

const getEnvNetwork = () =>
  process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'TESTNET';

export async function getFreighterPublicKey(): Promise<string> {
  const allowed = await isAllowed();

  if (!allowed) {
    try {
      await setAllowed();
    } catch {
      throw new Error('Please allow access to Freighter to continue.');
    }
  }

  const publicKey = await requestAccess();
  if (typeof publicKey === 'string') {
    return publicKey;
  }

  if (publicKey && typeof publicKey === 'object' && 'error' in publicKey) {
    throw new Error((publicKey as { error: string }).error);
  }

  throw new Error('Could not get public key from Freighter');
}

export async function requestChallenge(walletAddress: string): Promise<string> {
  const res = await fetch('/api/auth/stellar/challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to request challenge');
  }

  const data = await res.json();
  return data.challenge;
}

export async function signChallengeXdr(challengeXdr: string): Promise<string> {
  const network = getEnvNetwork();

  try {
    const signedResponse = await signTransaction(challengeXdr, {
      networkPassphrase:
        network === 'PUBLIC'
          ? 'Public Global Stellar Network ; September 2015'
          : 'Test SDF Network ; September 2015',
    });

    if (typeof signedResponse === 'string') {
      return signedResponse;
    }

    if (
      signedResponse &&
      typeof signedResponse === 'object' &&
      'error' in signedResponse
    ) {
      throw new Error((signedResponse as { error: string }).error);
    }

    return String(signedResponse);
  } catch (error: unknown) {
    // If the user rejects the request, Freighter typically throws an error
    throw error;
  }
}

export interface AuthResponse {
  accessToken?: string;
  refreshToken?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user?: any;
}

export async function verifySignature(
  walletAddress: string,
  challenge: string,
  signature: string,
): Promise<AuthResponse> {
  const res = await fetch('/api/auth/stellar/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress, challenge, signature }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Signature verification failed');
  }

  return await res.json();
}
