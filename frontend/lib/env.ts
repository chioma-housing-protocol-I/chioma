import { z } from 'zod';

/**
 * Type-safe, validated access to environment variables.
 *
 * Next.js only inlines `NEXT_PUBLIC_*` values into the browser bundle when
 * they're referenced as a static `process.env.NEXT_PUBLIC_X` property access,
 * so those keys are read individually below rather than via `process.env`
 * as a whole (which is empty/partial in the browser).
 *
 * Validation is environment-specific: vars required to reach production are
 * enforced only when `NODE_ENV === 'production'`, so local/dev/test runs
 * aren't forced to set them, while a misconfigured production build fails
 * fast at startup instead of breaking silently at runtime.
 */

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProduction = nodeEnv === 'production';

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_API_URL: z.string().optional(),
  NEXT_PUBLIC_BACKEND_API_BASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_STELLAR_NETWORK: z.enum(['TESTNET', 'PUBLIC']).optional(),
  NEXT_PUBLIC_SOROBAN_RPC_URL: z.string().url().optional(),
  NEXT_PUBLIC_STELLAR_HORIZON_URL: z.string().url().optional(),
  NEXT_PUBLIC_USE_MOCK_API: z.enum(['true', 'false']).optional(),
});

// NEXT_PUBLIC_* vars must be referenced as static property accesses so
// Next.js's webpack DefinePlugin can inline them into the client bundle.
const rawPublicEnv = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_BACKEND_API_BASE_URL:
    process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL,
  NEXT_PUBLIC_STELLAR_NETWORK: process.env.NEXT_PUBLIC_STELLAR_NETWORK,
  NEXT_PUBLIC_SOROBAN_RPC_URL: process.env.NEXT_PUBLIC_SOROBAN_RPC_URL,
  NEXT_PUBLIC_STELLAR_HORIZON_URL: process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL,
  NEXT_PUBLIC_USE_MOCK_API: process.env.NEXT_PUBLIC_USE_MOCK_API,
};

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
}

function parsePublicEnv() {
  const result = publicEnvSchema.safeParse(rawPublicEnv);
  if (!result.success) {
    throw new Error(
      `Invalid public environment variables:\n${formatZodError(result.error)}`,
    );
  }
  return result.data;
}

const publicEnv = parsePublicEnv();

// Environment-specific validation: these are optional in development/test
// (sensible fallbacks exist throughout the app) but required once deployed
// to production, so a missing var is caught at startup rather than surfacing
// as a broken canonical URL or a failed API call in front of a real user.
if (isProduction) {
  const missing: string[] = [];
  if (!publicEnv.NEXT_PUBLIC_APP_URL) missing.push('NEXT_PUBLIC_APP_URL');
  if (
    !publicEnv.NEXT_PUBLIC_API_URL &&
    !publicEnv.NEXT_PUBLIC_BACKEND_API_BASE_URL
  ) {
    missing.push('NEXT_PUBLIC_API_URL or NEXT_PUBLIC_BACKEND_API_BASE_URL');
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing required production environment variables: ${missing.join(', ')}`,
    );
  }
}

const serverEnvSchema = z.object({
  BACKEND_API_BASE_URL: z.string().url().optional(),
  CHIOMA_SECRET_KEY: z.string().optional(),
  CHIOMA_WEBHOOK_SECRET: z.string().optional(),
});

function parseServerEnv(): z.infer<typeof serverEnvSchema> {
  // Server-only vars must never be evaluated in a browser bundle.
  if (typeof window !== 'undefined') {
    return {};
  }
  const result = serverEnvSchema.safeParse({
    BACKEND_API_BASE_URL: process.env.BACKEND_API_BASE_URL,
    CHIOMA_SECRET_KEY: process.env.CHIOMA_SECRET_KEY,
    CHIOMA_WEBHOOK_SECRET: process.env.CHIOMA_WEBHOOK_SECRET,
  });
  if (!result.success) {
    throw new Error(
      `Invalid server environment variables:\n${formatZodError(result.error)}`,
    );
  }
  return result.data;
}

export const env = {
  NODE_ENV: nodeEnv,
  ...publicEnv,
  ...parseServerEnv(),
};

export type Env = typeof env;
