/**
 * Centralized business-rule constants (issue #1381).
 *
 * Every value here previously existed as an inline numeric/string literal
 * scattered across services. Values that plausibly need to differ per
 * deployment (security thresholds, limits, timeouts) read an optional env
 * var override via `envInt`/`envFloat`; values that are effectively fixed
 * business rules (e.g. bcrypt salt rounds baked into existing password
 * hashes) stay as plain constants so they can't drift accidentally.
 */

import type { StringValue } from 'ms';

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function envFloat(name: string, fallback: number): number {
  return envInt(name, fallback);
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/** Failed login attempts before an account is locked out. */
export const MAX_FAILED_LOGIN_ATTEMPTS = envInt('MAX_FAILED_LOGIN_ATTEMPTS', 5);

/** How long an account stays locked out after MAX_FAILED_LOGIN_ATTEMPTS is hit. */
export const LOCKOUT_DURATION_MINUTES = envInt('LOCKOUT_DURATION_MINUTES', 30);

/** Password reset token validity window. */
export const PASSWORD_RESET_TOKEN_EXPIRY_HOURS = envInt(
  'PASSWORD_RESET_TOKEN_EXPIRY_HOURS',
  1,
);

/** OAuth2 `state` parameter validity window (CSRF protection for the OAuth flow). */
export const OAUTH_STATE_EXPIRY_MINUTES = envInt('OAUTH_STATE_EXPIRY_MINUTES', 10);

/** Stellar wallet-auth signed-challenge validity window. */
export const STELLAR_AUTH_CHALLENGE_EXPIRY_MINUTES = envInt(
  'STELLAR_AUTH_CHALLENGE_EXPIRY_MINUTES',
  5,
);

/**
 * JWT access/refresh token lifetimes (jsonwebtoken duration strings).
 * Previously duplicated as literal '15m'/'7d' in three separate services
 * instead of reading the already-documented JWT_EXPIRATION/
 * JWT_REFRESH_EXPIRATION env vars.
 */
export const JWT_ACCESS_TOKEN_EXPIRY = (process.env.JWT_EXPIRATION?.trim() ||
  '15m') as StringValue;
export const JWT_REFRESH_TOKEN_EXPIRY = (process.env.JWT_REFRESH_EXPIRATION?.trim() ||
  '7d') as StringValue;

/** MFA short-lived verification token validity window (jsonwebtoken duration string). */
export const MFA_TOKEN_EXPIRY: StringValue = '5m';

/** TOTP verification tolerance window, in 30s steps either side of "now". */
export const MFA_TOTP_WINDOW_STEPS = 2;

/** Number of MFA backup codes generated per user. */
export const MFA_BACKUP_CODES_COUNT = envInt('MFA_BACKUP_CODES_COUNT', 10);

/** bcrypt cost factor for password/refresh-token hashing. */
export const BCRYPT_SALT_ROUNDS = envInt('BCRYPT_SALT_ROUNDS', 12);

/** bcrypt cost factor for MFA backup codes (lower than BCRYPT_SALT_ROUNDS is
 * acceptable — backup codes are single-use and already high-entropy). */
export const MFA_BACKUP_CODE_SALT_ROUNDS = envInt('MFA_BACKUP_CODE_SALT_ROUNDS', 10);

// ---------------------------------------------------------------------------
// Threat detection
// ---------------------------------------------------------------------------

/** How long an IP stays blocked after tripping the rate-limit breach detector. */
export const IP_BLOCK_DURATION_MS = envInt('IP_BLOCK_DURATION_MS', 10 * 60 * 1000);

/** Sliding window used to detect brute-force login attempts. */
export const BRUTE_FORCE_WINDOW_MS = envInt('BRUTE_FORCE_WINDOW_MS', 15 * 60 * 1000);

/** Failed attempts within BRUTE_FORCE_WINDOW_MS that trigger a brute-force alert. */
export const BRUTE_FORCE_THRESHOLD = envInt('BRUTE_FORCE_THRESHOLD', 10);

/** Requests from a single IP within the detection window before it's flagged. */
export const PER_IP_RATE_THRESHOLD = envInt('PER_IP_RATE_THRESHOLD', 200);

/** Records read in a single window that triggers a data-exfiltration alert. */
export const DATA_EXFILTRATION_RECORD_THRESHOLD = envInt(
  'DATA_EXFILTRATION_RECORD_THRESHOLD',
  1000,
);

// ---------------------------------------------------------------------------
// Property drafts
// ---------------------------------------------------------------------------

/** Days an unpublished property listing draft is retained before expiry. */
export const PROPERTY_DRAFT_EXPIRY_DAYS = envInt('PROPERTY_DRAFT_EXPIRY_DAYS', 30);

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

/** Default page size when a list endpoint's caller doesn't specify one. */
export const DEFAULT_PAGE_SIZE = envInt('DEFAULT_PAGE_SIZE', 20);

/** Upper bound on page size regardless of what the caller requests. */
export const MAX_PAGE_SIZE = envInt('MAX_PAGE_SIZE', 100);

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------

/** Max size of a single dispute evidence file upload. */
export const DISPUTE_EVIDENCE_MAX_FILE_SIZE_BYTES = envInt(
  'DISPUTE_EVIDENCE_MAX_FILE_SIZE_BYTES',
  10 * 1024 * 1024,
);

/** Max size of a single general document upload (S3-backed storage). */
export const STORAGE_MAX_FILE_SIZE_BYTES = envInt(
  'STORAGE_MAX_FILE_SIZE_BYTES',
  50 * 1024 * 1024,
);

// ---------------------------------------------------------------------------
// Stellar transactions
// ---------------------------------------------------------------------------

/** Default Stellar TransactionBuilder timeout for standard contract calls. */
export const STELLAR_TX_TIMEOUT_SECONDS = envInt('STELLAR_TX_TIMEOUT_SECONDS', 30);

/** Extended timeout for slower Stellar operations (e.g. account setup, funding). */
export const STELLAR_TX_EXTENDED_TIMEOUT_SECONDS = envInt(
  'STELLAR_TX_EXTENDED_TIMEOUT_SECONDS',
  180,
);

// ---------------------------------------------------------------------------
// WebSocket sessions (messaging)
// ---------------------------------------------------------------------------

/** Absolute lifetime of a WebSocket session regardless of activity. */
export const WS_SESSION_ABSOLUTE_TTL_MS = envInt(
  'WS_SESSION_ABSOLUTE_TTL_MS',
  24 * 60 * 60 * 1000,
);

/** WebSocket session idle timeout. */
export const WS_SESSION_IDLE_TTL_MS = envInt('WS_SESSION_IDLE_TTL_MS', 30 * 60 * 1000);

/** Max concurrent WebSocket connections allowed per user. */
export const WS_MAX_CONNECTIONS_PER_USER = envInt('WS_MAX_CONNECTIONS_PER_USER', 5);

// ---------------------------------------------------------------------------
// Rent / late fees
// ---------------------------------------------------------------------------

/** Days after due date before a late fee starts accruing. */
export const RENT_LATE_FEE_GRACE_PERIOD_DAYS = envInt(
  'RENT_LATE_FEE_GRACE_PERIOD_DAYS',
  5,
);

/** Flat late fee as a fraction of rent (0.05 = 5%). */
export const RENT_LATE_FEE_FLAT_RATE = envFloat('RENT_LATE_FEE_FLAT_RATE', 0.05);

/** Additional daily penalty rate applied while rent remains unpaid (0.001 = 0.1%/day). */
export const RENT_LATE_FEE_DAILY_PENALTY_RATE = envFloat(
  'RENT_LATE_FEE_DAILY_PENALTY_RATE',
  0.001,
);

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

/** Default retry count for the distributed lock service. */
export const LOCK_SERVICE_DEFAULT_RETRIES = envInt('LOCK_SERVICE_DEFAULT_RETRIES', 3);

/** Default Bull job retry attempts for standard (non-blockchain) queues. */
export const QUEUE_DEFAULT_JOB_ATTEMPTS = envInt('QUEUE_DEFAULT_JOB_ATTEMPTS', 3);

/** Bull job retry attempts for blockchain-submission queues (higher — network flakiness). */
export const QUEUE_BLOCKCHAIN_JOB_ATTEMPTS = envInt('QUEUE_BLOCKCHAIN_JOB_ATTEMPTS', 5);
