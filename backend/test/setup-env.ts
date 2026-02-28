// Polyfill global crypto for Jest (TypeORM uses crypto.randomUUID())
if (typeof globalThis.crypto === 'undefined') {
  const nodeCrypto = require('node:crypto');
  (globalThis as typeof globalThis & { crypto: Crypto }).crypto =
    nodeCrypto.webcrypto ?? nodeCrypto;
}

// Rate limiting configuration
process.env.RATE_LIMIT_TTL = '60000';
process.env.RATE_LIMIT_MAX = '100';
process.env.RATE_LIMIT_AUTH_TTL = '60000';
process.env.RATE_LIMIT_AUTH_MAX = '5';
process.env.RATE_LIMIT_STRICT_TTL = '60000';
process.env.RATE_LIMIT_STRICT_MAX = '10';

// JWT configuration
process.env.JWT_SECRET =
  'test-jwt-secret-key-minimum-32-characters-long-for-testing';
process.env.JWT_REFRESH_SECRET =
  'test-refresh-secret-key-minimum-32-characters-long-for-testing';
process.env.JWT_EXPIRATION = '15m';
process.env.JWT_REFRESH_EXPIRATION = '7d';

// Database configuration
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_USERNAME = 'postgres';
process.env.DB_PASSWORD = 'password';
process.env.DB_NAME = 'chioma_test';

// Stellar configuration
process.env.STELLAR_NETWORK = 'testnet';
process.env.STELLAR_HORIZON_URL = 'https://horizon-testnet.stellar.org';

// Other required configs
process.env.FRONTEND_URL = 'http://localhost:3001';
process.env.SECURITY_ENCRYPTION_KEY =
  'c50c9fe2f3272ae5f275dc9b875712ee41cf931475b615fe6aa8588b8332d062';
process.env.PAYMENT_METADATA_SECRET = 'test-payment-secret';

// Use PostgreSQL for E2E tests
// The GitHub Actions workflow provides a PostgreSQL service
process.env.NODE_ENV = 'test';

// Required by AuthModule (JWT strategy / auth service)
if (!process.env.JWT_SECRET)
  process.env.JWT_SECRET = 'e2e-jwt-secret-min-32-chars-long';
if (!process.env.JWT_REFRESH_SECRET)
  process.env.JWT_REFRESH_SECRET = 'e2e-jwt-refresh-secret-min-32-chars';

// Required by EncryptionService (SecurityModule) - 64 hex chars minimum
if (!process.env.SECURITY_ENCRYPTION_KEY) {
  process.env.SECURITY_ENCRYPTION_KEY =
    'e2e0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
}

// Stellar/Soroban: valid 56-char contract ID so contract services (and Contract ctor) don't throw in E2E
const E2E_CONTRACT_ID =
  'CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE';
if (!process.env.CHIOMA_CONTRACT_ID)
  process.env.CHIOMA_CONTRACT_ID = E2E_CONTRACT_ID;
if (!process.env.ESCROW_CONTRACT_ID)
  process.env.ESCROW_CONTRACT_ID = E2E_CONTRACT_ID;
if (!process.env.RENT_OBLIGATION_CONTRACT_ID)
  process.env.RENT_OBLIGATION_CONTRACT_ID = E2E_CONTRACT_ID;
if (!process.env.DISPUTE_CONTRACT_ID)
  process.env.DISPUTE_CONTRACT_ID = E2E_CONTRACT_ID;
if (!process.env.AGENT_REGISTRY_CONTRACT_ID)
  process.env.AGENT_REGISTRY_CONTRACT_ID = E2E_CONTRACT_ID;
if (!process.env.SOROBAN_RPC_URL)
  process.env.SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';
