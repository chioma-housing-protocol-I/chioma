# Stellar Module

This module integrates the Stellar blockchain for payment processing, escrow management, and transaction tracking in the rental platform.

## Features

- **Stellar Account Management**: Create and manage Stellar accounts with encrypted secret keys
- **Payment Processing**: Send XLM and custom asset payments
- **Escrow Management**: Create, release, and refund escrow accounts
- **Transaction Tracking**: Full audit trail of all blockchain transactions
- **Secure Key Storage**: Secret keys encrypted at rest using NaCl secretbox

## Configuration

Add the following environment variables to your `.env` file:

```env
# Stellar Network Configuration
STELLAR_NETWORK=testnet                           # 'testnet' or 'mainnet'
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_BASE_FEE=100                              # Base fee in stroops
STELLAR_ENCRYPTION_KEY=your-secure-encryption-key # Used to encrypt secret keys

# Optional: Friendbot for testnet funding
STELLAR_FRIENDBOT_URL=https://friendbot.stellar.org

# Optional: Platform account for fee collection
STELLAR_PLATFORM_PUBLIC_KEY=GXXXXXXXX...
STELLAR_PLATFORM_SECRET_KEY=SXXXXXXXX...
```

## API Endpoints

### Account Management

#### Create Account
```http
POST /api/stellar/accounts
Content-Type: application/json

{
  "userId": "uuid-optional",
  "accountType": "USER" // USER, ESCROW, FEE, PLATFORM
}
```

#### Get Account by ID
```http
GET /api/stellar/accounts/:id
```

#### Get Account by Public Key
```http
GET /api/stellar/accounts/public-key/:publicKey
```

#### Get User's Accounts
```http
GET /api/stellar/accounts/user/:userId
```

#### Fund Account (Testnet Only)
```http
POST /api/stellar/accounts/fund
Content-Type: application/json

{
  "publicKey": "GABCDEF..."
}
```

#### Sync Account from Network
```http
POST /api/stellar/accounts/:publicKey/sync
```

#### Get Network Account Info
```http
GET /api/stellar/accounts/:publicKey/network
```

### Payment Processing

#### Send Payment
```http
POST /api/stellar/payments
Content-Type: application/json

{
  "sourcePublicKey": "GABCDEF...",
  "destinationPublicKey": "GXYZ...",
  "amount": "100.0000000",
  "asset": {
    "type": "NATIVE"  // or CREDIT_ALPHANUM4, CREDIT_ALPHANUM12
    // "code": "USDC",  // Required for non-native assets
    // "issuer": "GXXX..."  // Required for non-native assets
  },
  "memo": "Rent payment",
  "memoType": "TEXT",
  "idempotencyKey": "unique-key-for-retry"
}
```

#### List Transactions
```http
GET /api/stellar/transactions?publicKey=GABCDEF...&status=COMPLETED&limit=20&offset=0
```

#### Get Transaction by ID
```http
GET /api/stellar/transactions/:id
```

#### Get Transaction by Hash
```http
GET /api/stellar/transactions/hash/:hash
```

### Escrow Management

#### Create Escrow
```http
POST /api/stellar/escrow
Content-Type: application/json

{
  "sourcePublicKey": "GABCDEF...",
  "destinationPublicKey": "GXYZ...",
  "amount": "1000.0000000",
  "assetType": "NATIVE",
  "releaseConditions": {
    "timelock": {
      "releaseAfter": "2026-02-01T00:00:00Z",
      "expireAfter": "2026-03-01T00:00:00Z"
    },
    "conditions": [
      {
        "type": "INSPECTION",
        "description": "Property inspection completed",
        "fulfilled": false
      }
    ]
  },
  "expirationDate": "2026-03-01T00:00:00Z",
  "rentAgreementId": "uuid-optional"
}
```

#### Release Escrow
```http
POST /api/stellar/escrow/release
Content-Type: application/json

{
  "escrowId": 1,
  "memo": "Release reason"
}
```

#### Refund Escrow
```http
POST /api/stellar/escrow/refund
Content-Type: application/json

{
  "escrowId": 1,
  "reason": "Refund reason"
}
```

#### Get Escrow by ID
```http
GET /api/stellar/escrow/:id
```

#### List Escrows
```http
GET /api/stellar/escrows?publicKey=GABCDEF...&status=ACTIVE&limit=20&offset=0
```

## Database Schema

### stellar_accounts
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | UUID | Foreign key to users table |
| public_key | VARCHAR(56) | Stellar public key |
| secret_key_encrypted | TEXT | Encrypted secret key |
| sequence_number | BIGINT | Account sequence number |
| account_type | VARCHAR(20) | USER, ESCROW, FEE, PLATFORM |
| is_active | BOOLEAN | Whether account is active |
| balance | DECIMAL(20,7) | Current XLM balance |

### stellar_transactions
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| transaction_hash | VARCHAR(64) | Stellar transaction hash |
| from_account_id | INTEGER | Source account reference |
| to_account_id | INTEGER | Destination account reference |
| asset_type | VARCHAR(16) | NATIVE or CREDIT_ALPHANUM |
| asset_code | VARCHAR(12) | Asset code for non-native |
| asset_issuer | VARCHAR(56) | Asset issuer for non-native |
| amount | DECIMAL(20,7) | Transaction amount |
| fee_paid | INTEGER | Fee paid in stroops |
| memo | TEXT | Transaction memo |
| memo_type | VARCHAR(10) | NONE, TEXT, ID, HASH, RETURN |
| status | VARCHAR(20) | PENDING, COMPLETED, FAILED |
| idempotency_key | VARCHAR(64) | For idempotent requests |

### stellar_escrows
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| escrow_account_id | INTEGER | Escrow account reference |
| source_account_id | INTEGER | Depositor account |
| destination_account_id | INTEGER | Recipient account |
| amount | DECIMAL(20,7) | Escrow amount |
| status | VARCHAR(20) | PENDING, ACTIVE, RELEASED, REFUNDED |
| release_conditions | JSONB | Conditions for release |
| expiration_date | TIMESTAMP | Auto-refund date |
| rent_agreement_id | UUID | Optional rental agreement link |

## Security Considerations

1. **Secret Key Encryption**: All secret keys are encrypted using NaCl secretbox before storage
2. **Key Rotation**: The encryption key should be rotated periodically
3. **Network Isolation**: Use testnet for development, mainnet only for production
4. **Input Validation**: All inputs are validated using class-validator
5. **Audit Logging**: All operations are logged for audit purposes
6. **Rate Limiting**: API endpoints are protected by rate limiting

## Error Handling

The module handles common Stellar errors:
- Network timeouts
- Insufficient funds
- Invalid transactions
- Account not found
- Invalid signatures

All errors return appropriate HTTP status codes and messages.

## Testing

Run tests:
```bash
pnpm test -- src/modules/stellar
```

## Usage Example

### Create and Fund Account (Testnet)
```typescript
// Create account
const account = await stellarService.createAccount({
  userId: 'user-uuid',
  accountType: StellarAccountType.USER,
});

// Fund via Friendbot (testnet only)
await stellarService.fundAccountTestnet(account.publicKey);
```

### Send Payment
```typescript
const payment = await stellarService.sendPayment({
  sourcePublicKey: 'GABCDEF...',
  destinationPublicKey: 'GXYZ...',
  amount: '100',
  memo: 'Monthly rent',
  idempotencyKey: `rent-${agreementId}-${month}`,
});
```

### Create Escrow for Security Deposit
```typescript
const escrow = await stellarService.createEscrow({
  sourcePublicKey: tenantAccount.publicKey,
  destinationPublicKey: landlordAccount.publicKey,
  amount: '1000',
  releaseConditions: {
    timelock: {
      releaseAfter: leaseEndDate.toISOString(),
    },
    conditions: [
      {
        type: 'INSPECTION',
        description: 'Property inspection completed',
        fulfilled: false,
      },
    ],
  },
  expirationDate: refundDeadline.toISOString(),
  rentAgreementId: agreement.id,
});
```

### Release Escrow After Lease End
```typescript
await stellarService.releaseEscrow({
  escrowId: escrow.id,
  memo: 'Security deposit returned',
});
```
