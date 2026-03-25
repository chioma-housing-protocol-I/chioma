# Stellar Web Authentication (SEP-0010) API Documentation

## Overview

This document describes the Stellar Web Authentication implementation following SEP-0010 standard. The API allows users to authenticate using their Stellar wallet addresses, providing a secure and Web3-native authentication experience alongside the existing email/password system.

## Authentication Flow

### 1. Challenge Generation
The client requests a challenge transaction from the server for their Stellar wallet address.

### 2. Client Signing
The client signs the challenge transaction using their Stellar wallet.

### 3. Signature Verification
The client submits the signed challenge back to the server for verification.

### 4. Token Issuance
Upon successful verification, the server issues JWT tokens for authenticated sessions.

## API Endpoints

### Generate Authentication Challenge

**Endpoint:** `POST /auth/stellar/challenge`

**Description:** Generates a challenge transaction for the client to sign with their Stellar wallet.

**Request Body:**
```json
{
  "walletAddress": "GD5DJ3B6A2KHWGFPJGBM4D7J23G5QJY6XQFQKXQ2Q2Q2Q2Q2Q2Q2Q2Q"
}
```

**Response:**
```json
{
  "challenge": "AAAAAgAAAABAAAAAAAAAAA...",
  "expiresAt": "2024-01-26T17:32:00.000Z"
}
```

**Rate Limiting:** 5 requests per minute per IP address

**Error Responses:**
- `400 Bad Request`: Invalid wallet address format
- `429 Too Many Requests`: Rate limit exceeded

### Verify Signature and Authenticate

**Endpoint:** `POST /auth/stellar/verify`

**Description:** Verifies the signed challenge and authenticates the user.

**Request Body:**
```json
{
  "walletAddress": "GD5DJ3B6A2KHWGFPJGBM4D7J23G5QJY6XQFQKXQ2Q2Q2Q2Q2Q2Q2Q2Q",
  "signature": "304402207...",
  "challenge": "AAAAAgAAAABAAAAAAAAAAA..."
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid-string",
    "walletAddress": "GD5DJ3B6A2KHWGFPJGBM4D7J23G5QJY6XQFQKXQ2Q2Q2Q2Q2Q2Q2Q2Q",
    "authMethod": "stellar",
    "role": "user",
    "emailVerified": true,
    "isActive": true,
    "createdAt": "2024-01-26T17:27:00.000Z",
    "updatedAt": "2024-01-26T17:32:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Rate Limiting:** 10 requests per minute per IP address

**Error Responses:**
- `400 Bad Request`: Invalid wallet address format or missing required fields
- `401 Unauthorized`: Invalid signature, expired challenge, or verification failed
- `429 Too Many Requests`: Rate limit exceeded

## Data Models

### StellarAuthChallengeDto

```typescript
interface StellarAuthChallengeDto {
  walletAddress: string; // Valid Stellar public key (56 characters, starts with 'G')
}
```

### StellarAuthVerifyDto

```typescript
interface StellarAuthVerifyDto {
  walletAddress: string; // Valid Stellar public key
  signature: string;     // Signature of the challenge transaction
  challenge: string;     // Challenge transaction XDR
}
```

### StellarAuthResponseDto

```typescript
interface StellarAuthResponseDto {
  challenge: string;    // Challenge transaction XDR
  expiresAt: string;   // ISO 8601 timestamp when challenge expires
}
```

## Security Considerations

### Challenge Expiration
- Challenges expire after 5 minutes
- Expired challenges are automatically cleaned up
- Clients must request new challenges after expiration

### Rate Limiting
- Challenge generation: 5 requests per minute
- Signature verification: 10 requests per minute
- Applied per IP address to prevent abuse

### Input Validation
- Stellar addresses are validated using regex pattern
- All required fields are validated for presence and format
- Malformed requests are rejected with appropriate error messages

### Replay Attack Prevention
- Each challenge contains a unique nonce
- Challenges are single-use and invalidated after verification
- Server-side challenge storage prevents reuse

## Error Handling

### Standard Error Format

```json
{
  "message": "Error description",
  "error": "ErrorType",
  "statusCode": 400
}
```

### Common Error Scenarios

1. **Invalid Wallet Address**
   - Error: `400 Bad Request`
   - Message: "Invalid Stellar address format"

2. **Challenge Already Exists**
   - Error: `400 Bad Request`
   - Message: "Challenge already requested. Please wait for the current challenge to expire."

3. **Challenge Expired**
   - Error: `401 Unauthorized`
   - Message: "Challenge has expired"

4. **Invalid Signature**
   - Error: `401 Unauthorized`
   - Message: "Invalid signature"

5. **Rate Limit Exceeded**
   - Error: `429 Too Many Requests`
   - Message: "Too many requests"

## Integration Examples

### JavaScript/TypeScript Client Example

```typescript
// 1. Request challenge
const challengeResponse = await fetch('/auth/stellar/challenge', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    walletAddress: 'GD5DJ3B6A2KHWGFPJGBM4D7J23G5QJY6XQFQKXQ2Q2Q2Q2Q2Q2Q2Q2Q'
  })
});

const { challenge, expiresAt } = await challengeResponse.json();

// 2. Sign challenge with Stellar wallet (using stellar-sdk)
const { Keypair, Transaction } = require('@stellar/stellar-sdk');
const transaction = TransactionBuilder.fromXDR(challenge, 'Test SDF Network ; September 2015');
const keypair = Keypair.fromSecret('your-secret-key');
transaction.sign(keypair);
const signature = transaction.toXDR();

// 3. Verify signature and authenticate
const authResponse = await fetch('/auth/stellar/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    walletAddress: 'GD5DJ3B6A2KHWGFPJGBM4D7J23G5QJY6XQFQKXQ2Q2Q2Q2Q2Q2Q2Q2Q',
    signature,
    challenge
  })
});

const { user, accessToken, refreshToken } = await authResponse.json();
```

## Configuration

### Environment Variables

```bash
# Stellar Configuration
STELLAR_SERVER_SECRET_KEY=your-server-secret-key
STELLAR_NETWORK=testnet  # or 'mainnet' for production

# JWT Configuration (shared with existing auth)
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
```

### Network Configuration

- **Testnet**: Uses Stellar Test Network for development/testing
- **Mainnet**: Uses Stellar Public Network for production
- Default: Testnet (safe for development)

## Testing

### Unit Tests
- Service layer tests for challenge generation and verification
- Address validation tests
- Error handling tests

### E2E Tests
- Full authentication flow tests
- Rate limiting tests
- Security validation tests
- Error scenario tests

### Running Tests

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Run with coverage
npm run test:cov
```

## Migration from Email/Password

The Stellar authentication system is designed to work alongside the existing email/password system:

1. **Existing Users**: Can continue using email/password authentication
2. **New Users**: Can choose either email/password or Stellar wallet authentication
3. **Hybrid Approach**: Users can potentially link both methods to the same account (future enhancement)

## Compliance

This implementation follows:
- **SEP-0010**: Stellar Web Authentication standard
- **RFC 7519**: JWT token specification
- **OWASP Guidelines**: Security best practices for authentication

## Support

For issues related to Stellar authentication:
1. Check the error messages for specific guidance
2. Verify Stellar address format and network connectivity
3. Ensure proper time synchronization for challenge expiration
4. Review rate limiting status if receiving 429 errors
