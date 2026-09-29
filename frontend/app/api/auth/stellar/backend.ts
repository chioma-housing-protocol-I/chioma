/**
 * Shared plumbing for the two Stellar auth routes.
 *
 * These routes exist so the browser can talk to same-origin /api. The real
 * implementation lives in the Nest backend (auth/stellar/*), which does proper
 * SEP-10 challenge generation, signature verification, and find-or-create of
 * the wallet's user. We forward to it whenever it is reachable and only fall
 * back to the local mock when it is not, so a dev running frontend-only still
 * gets a working wallet flow.
 */

function backendBaseUrl(): string {
  return (
    process.env.BACKEND_API_BASE_URL ??
    process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL ??
    'http://localhost:5000/api/v1'
  );
}

export interface BackendResult {
  ok: boolean;
  status: number;
  body: unknown;
}

/**
 * POST to the backend. Returns null when the backend cannot be reached at all
 * (connection refused, DNS failure, timeout) — that is the only case callers
 * should treat as "fall back to the mock". A backend that responds with an
 * error status is a real answer and must be surfaced to the client as-is.
 */
export async function postToBackend(
  path: string,
  payload: unknown,
): Promise<BackendResult | null> {
  try {
    const response = await fetch(`${backendBaseUrl()}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });

    const body = await response.json().catch(() => ({}));

    return { ok: response.ok, status: response.status, body };
  } catch {
    return null;
  }
}
