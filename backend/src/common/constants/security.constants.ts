/**
 * Security Constants
 * Centralized security configuration values
 */

// Request size limits
export const REQUEST_SIZE_LIMITS = {
  JSON_LIMIT: '10kb',
  URL_ENCODED_LIMIT: '10kb',
  FILE_UPLOAD_LIMIT: 5 * 1024 * 1024, // 5MB
};

// Rate limiting defaults
export const RATE_LIMIT_DEFAULTS = {
  GLOBAL_TTL: 60000, // 1 minute
  GLOBAL_LIMIT: 20,
  AUTH_TTL: 900000, // 15 minutes
  AUTH_LIMIT: 5,
};

// Password policy
export const PASSWORD_POLICY = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL: true,
  HISTORY_COUNT: 5, // Prevent reuse of last 5 passwords
  EXPIRY_DAYS: 90, // Password expiry notification
};

// Account lockout settings
export const ACCOUNT_LOCKOUT = {
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 30,
};

// JWT settings
export const JWT_SETTINGS = {
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  ALGORITHM: 'HS256' as const,
};

// Session settings
export const SESSION_SETTINGS = {
  COOKIE_MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
  COOKIE_SECURE: process.env.NODE_ENV === 'production',
  COOKIE_HTTP_ONLY: true,
  COOKIE_SAME_SITE: 'strict' as const,
};

// CSRF settings
export const CSRF_SETTINGS = {
  TOKEN_LENGTH: 32,
  HEADER_NAME: 'x-csrf-token',
  COOKIE_NAME: 'csrf-token',
};

// MFA settings
export const MFA_SETTINGS = {
  TOTP_WINDOW: 1, // Allow 1 step drift
  BACKUP_CODES_COUNT: 10,
  ISSUER: 'Chioma',
};

// Sensitive fields to redact in logs
export const SENSITIVE_LOG_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'api_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'authorization',
  'cookie',
  'mfaSecret',
  'mfa_secret',
  'backupCodes',
  'backup_codes',
];

// Sensitive headers to redact in logs
export const SENSITIVE_HEADERS = [
  'authorization',
  'cookie',
  'x-api-key',
  'x-csrf-token',
];

// SQL injection patterns to detect
export const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE|UNION|DECLARE)\b)/i,
  /(--)/, // SQL comment
  /(;)/, // Statement terminator
  /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i, // OR 1=1 pattern
  /(['"`])\s*(OR|AND)\s*(['"`])/i, // Quote-based injection
  /(\bSLEEP\s*\()/i, // Time-based injection
  /(\bBENCHMARK\s*\()/i, // MySQL benchmark
  /(\bWAITFOR\s+DELAY\b)/i, // SQL Server delay
];

// XSS patterns to detect
export const XSS_PATTERNS = [
  /<script\b/gi, // Match opening script tag
  /<\/script\s*>/gi, // Match closing script tag with optional whitespace
  /javascript:/gi,
  /on\w+\s*=/gi, // onclick=, onerror=, etc.
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<link/gi,
  /<style/gi,
  /expression\s*\(/gi, // CSS expression
  /url\s*\(/gi, // CSS url()
  /data:/gi, // data: URIs
  /vbscript:/gi, // vbscript: URIs
];

// File upload allowed extensions
export const ALLOWED_FILE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.pdf',
  '.doc',
  '.docx',
];

// File upload allowed MIME types
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// Content Security Policy directives
export const CSP_DIRECTIVES = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:', 'https:'],
  fontSrc: ["'self'", 'https:', 'data:'],
  connectSrc: ["'self'"],
  frameSrc: ["'none'"],
  objectSrc: ["'none'"],
  mediaSrc: ["'self'"],
  workerSrc: ["'self'"],
  formAction: ["'self'"],
  frameAncestors: ["'none'"],
  baseUri: ["'self'"],
  upgradeInsecureRequests: [],
};

// Security headers configuration
export const SECURITY_HEADERS = {
  HSTS_MAX_AGE: 31536000, // 1 year
  HSTS_INCLUDE_SUBDOMAINS: true,
  HSTS_PRELOAD: true,
};

// API key settings
export const API_KEY_SETTINGS = {
  KEY_LENGTH: 32,
  PREFIX: 'chioma_',
  HASH_ALGORITHM: 'sha256',
};

// Request signing settings
export const REQUEST_SIGNING = {
  ALGORITHM: 'sha256',
  HEADER_NAME: 'x-signature',
  TIMESTAMP_HEADER: 'x-timestamp',
  MAX_TIMESTAMP_DRIFT: 300000, // 5 minutes
};
