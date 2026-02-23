# Stellar Anchor Integration (SEP-24)

## Overview

This module implements SEP-24 protocol for fiat on/off ramps through Stellar Anchors, enabling users to convert between fiat currencies and USDC on the Stellar network.

## Architecture

```
User → API Endpoint → AnchorService → Anchor Provider → Stellar Network
                           ↓
                    Database (Transaction Tracking)
```

## API Endpoints

### 1. Initiate Deposit (Fiat → USDC)

**Endpoint:** `POST /api/v1/anchor/deposit`

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "amount": 100.00,
  "currency": "USD",
  "walletAddress": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "type": "ACH"
}
```

**Response:**
```json
{
  "id": "uuid",
  "anchorTransactionId": "anchor-tx-123",
  "type": "deposit",
  "status": "pending",
  "amount": 100.00,
  "currency": "USD",
  "walletAddress": "GXXXXXXX...",
  "paymentMethod": "ACH",
  "metadata": {
    "how": "Bank transfer instructions...",
    "eta": 3600,
    "fee_fixed": 1.00,
    "fee_percent": 0.5
  },
  "createdAt": "2026-02-20T05:00:00.000Z",
  "updatedAt": "2026-02-20T05:00:00.000Z"
}
```

### 2. Initiate Withdrawal (USDC → Fiat)

**Endpoint:** `POST /api/v1/anchor/withdraw`

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "amount": 100.00,
  "currency": "USD",
  "destination": "bank-account-details",
  "walletAddress": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
}
```

**Response:**
```json
{
  "id": "uuid",
  "anchorTransactionId": "anchor-tx-456",
  "type": "withdrawal",
  "status": "pending",
  "amount": 100.00,
  "currency": "USD",
  "walletAddress": "GXXXXXXX...",
  "destination": "bank-account-details",
  "metadata": {
    "account_id": "GXXXXXXX...",
    "memo_type": "text",
    "memo": "withdrawal-123",
    "eta": 7200,
    "fee_fixed": 2.00,
    "fee_percent": 1.0
  },
  "createdAt": "2026-02-20T05:00:00.000Z",
  "updatedAt": "2026-02-20T05:00:00.000Z"
}
```

### 3. Get Transaction Status

**Endpoint:** `GET /api/v1/anchor/transactions/:id`

**Authentication:** Required (JWT)

**Response:**
```json
{
  "id": "uuid",
  "anchorTransactionId": "anchor-tx-123",
  "type": "deposit",
  "status": "completed",
  "amount": 100.00,
  "currency": "USD",
  "walletAddress": "GXXXXXXX...",
  "stellarTransactionId": "stellar-tx-hash",
  "metadata": {
    "amount_in": "100.00",
    "amount_out": "98.50",
    "amount_fee": "1.50",
    "external_transaction_id": "bank-ref-123"
  },
  "createdAt": "2026-02-20T05:00:00.000Z",
  "updatedAt": "2026-02-20T05:10:00.000Z"
}
```

### 4. Webhook Endpoint

**Endpoint:** `POST /api/v1/anchor/webhook`

**Authentication:** None (validated by signature)

**Request Body:**
```json
{
  "id": "anchor-tx-123",
  "status": "completed",
  "stellar_transaction_id": "stellar-tx-hash",
  "amount_in": "100.00",
  "amount_out": "98.50",
  "amount_fee": "1.50"
}
```

## Transaction Status Flow

```
Deposit Flow:
pending → processing → completed

Withdrawal Flow:
pending → processing → completed

Error Flow:
pending → failed
```

## Status Mapping

| Anchor Status | Chioma Status |
|--------------|---------------|
| pending_user_transfer_start | pending |
| pending_anchor | processing |
| pending_stellar | processing |
| pending_external | processing |
| pending_trust | processing |
| pending_user | processing |
| completed | completed |
| refunded | refunded |
| expired | failed |
| error | failed |

## Supported Payment Methods

- **ACH** - Automated Clearing House (US)
- **SEPA** - Single Euro Payments Area (EU)
- **SWIFT** - International wire transfer

## Supported Currencies

Configured via `SUPPORTED_FIAT_CURRENCIES` environment variable:
- USD (US Dollar)
- EUR (Euro)
- GBP (British Pound)
- NGN (Nigerian Naira)

## Configuration

Add to `.env`:

```env
ANCHOR_API_URL=https://api.anchor-provider.com
ANCHOR_API_KEY=your_api_key
ANCHOR_USDC_ASSET=USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN
SUPPORTED_FIAT_CURRENCIES=USD,EUR,GBP,NGN
```

## Database Schema

### anchor_transactions

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| anchor_transaction_id | varchar | Anchor provider transaction ID |
| type | enum | deposit or withdrawal |
| status | enum | Transaction status |
| amount | decimal(20,7) | Transaction amount |
| currency | varchar(10) | Fiat currency code |
| wallet_address | varchar | User's Stellar wallet |
| payment_method | varchar | Payment method type |
| destination | text | Withdrawal destination |
| stellar_transaction_id | varchar | Stellar blockchain tx hash |
| memo | text | Transaction memo |
| metadata | jsonb | Additional data |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |

### supported_currencies

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| code | varchar(10) | Currency code (USD, EUR, etc) |
| name | varchar | Currency name |
| is_active | boolean | Active status |
| anchor_url | varchar | Anchor provider URL |
| stellar_asset_code | varchar | Stellar asset code |
| stellar_asset_issuer | varchar | Stellar asset issuer |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |

## Error Handling

### Common Errors

| Error | Status Code | Description |
|-------|-------------|-------------|
| Currency not supported | 400 | Currency not in SUPPORTED_FIAT_CURRENCIES |
| Currency not configured | 400 | Currency not in database |
| Transaction not found | 400 | Invalid transaction ID |
| Failed to initiate deposit | 400 | Anchor API error |
| Failed to initiate withdrawal | 400 | Anchor API error |

## Security Considerations

1. **Wallet Ownership Verification**: Verify user owns the wallet address before processing
2. **Rate Limiting**: Implement rate limiting on deposit/withdrawal endpoints
3. **API Key Security**: Store ANCHOR_API_KEY securely, never commit to version control
4. **Transaction Signing**: Verify webhook signatures from anchor provider
5. **Amount Validation**: Validate min/max amounts from anchor response

## Testing

Run tests:
```bash
npm test anchor.service.spec.ts
```

### Mock Anchor Responses

The service includes comprehensive tests with mocked anchor API responses for:
- Successful deposits
- Successful withdrawals
- Failed transactions
- Status updates
- Webhook handling

## Integration Guide

### Adding a New Anchor Provider

1. Add currency to database:
```sql
INSERT INTO supported_currencies (code, name, anchor_url, stellar_asset_code, stellar_asset_issuer, is_active)
VALUES ('USD', 'US Dollar', 'https://anchor.example.com', 'USDC', 'GXXXXXXX...', true);
```

2. Update environment variables:
```env
SUPPORTED_FIAT_CURRENCIES=USD,EUR,GBP,NGN,NEW_CURRENCY
```

3. Configure webhook endpoint with anchor provider:
```
POST https://your-domain.com/api/v1/anchor/webhook
```

## Monitoring

Key metrics to monitor:
- Transaction success rate
- Average transaction completion time
- Failed transaction reasons
- Webhook delivery success rate
- API response times

## References

- [SEP-0024 Specification](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md)
- [USDC on Stellar](https://www.circle.com/en/usdc-multichain/stellar)
- [Stellar Anchor Directory](https://anchors.stellar.org/)
