# Anchor Integration Guide

## Quick Start

### 1. Environment Setup

Copy the anchor configuration to your `.env` file:

```bash
# Anchor Configuration
ANCHOR_API_URL=https://api.anchor-provider.com
ANCHOR_API_KEY=your_api_key
ANCHOR_USDC_ASSET=USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN
SUPPORTED_FIAT_CURRENCIES=USD,EUR,GBP,NGN
```

### 2. Run Database Migration

```bash
npm run migration:run
```

This creates the `anchor_transactions` and `supported_currencies` tables.

### 3. Seed Supported Currencies

```sql
INSERT INTO supported_currencies (code, name, anchor_url, stellar_asset_code, stellar_asset_issuer, is_active)
VALUES 
  ('USD', 'US Dollar', 'https://api.anchor-provider.com', 'USDC', 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN', true),
  ('EUR', 'Euro', 'https://api.anchor-provider.com', 'USDC', 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN', true),
  ('GBP', 'British Pound', 'https://api.anchor-provider.com', 'USDC', 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN', true),
  ('NGN', 'Nigerian Naira', 'https://api.anchor-provider.com', 'USDC', 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN', true);
```

### 4. Start the Server

```bash
npm run start:dev
```

## Usage Examples

### Deposit Flow (Fiat → USDC)

```bash
curl -X POST http://localhost:3000/api/v1/anchor/deposit \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "currency": "USD",
    "walletAddress": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "type": "ACH"
  }'
```

### Withdrawal Flow (USDC → Fiat)

```bash
curl -X POST http://localhost:3000/api/v1/anchor/withdraw \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "currency": "USD",
    "destination": "bank-account-details",
    "walletAddress": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  }'
```

### Check Transaction Status

```bash
curl -X GET http://localhost:3000/api/v1/anchor/transactions/TRANSACTION_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Anchor Provider Setup

### Recommended Anchor Providers

1. **MoneyGram Access** (Global)
   - URL: https://api.moneygram.com
   - Supports: USD, EUR, GBP, and 100+ currencies
   - SEP-24 compliant

2. **Vibrant** (Africa)
   - URL: https://api.vibrantapp.com
   - Supports: NGN, KES, GHS, ZAR
   - SEP-24 compliant

3. **AnchorUSD** (US)
   - URL: https://api.anchorusd.com
   - Supports: USD
   - SEP-24 compliant

### Webhook Configuration

Configure your anchor provider to send webhooks to:

```
POST https://your-domain.com/api/v1/anchor/webhook
```

Webhook events to subscribe to:
- Transaction status updates
- Deposit confirmations
- Withdrawal completions
- Error notifications

## Testing

### Unit Tests

```bash
npm test anchor.service.spec.ts
```

### E2E Tests

```bash
npm run test:e2e anchor.e2e-spec.ts
```

### Manual Testing with Mock Anchor

For development, you can use a mock anchor server:

```bash
# Install mock server
npm install -g json-server

# Create mock data
echo '{
  "transactions": []
}' > anchor-mock.json

# Start mock server
json-server --watch anchor-mock.json --port 4000
```

Update `.env`:
```
ANCHOR_API_URL=http://localhost:4000
```

## Error Handling

### Common Issues

**Issue:** "Currency not supported"
- **Solution:** Add currency to `SUPPORTED_FIAT_CURRENCIES` in `.env`

**Issue:** "Currency not configured"
- **Solution:** Insert currency into `supported_currencies` table

**Issue:** "Failed to initiate deposit"
- **Solution:** Check anchor API credentials and network connectivity

**Issue:** "Transaction not found"
- **Solution:** Verify transaction ID is correct

### Retry Logic

The service includes automatic retry logic for:
- Network timeouts (3 retries)
- 5xx server errors (3 retries)
- Rate limiting (exponential backoff)

## Monitoring

### Key Metrics

Monitor these metrics in production:

1. **Transaction Success Rate**
   ```sql
   SELECT 
     status,
     COUNT(*) as count,
     COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
   FROM anchor_transactions
   GROUP BY status;
   ```

2. **Average Completion Time**
   ```sql
   SELECT 
     AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_seconds
   FROM anchor_transactions
   WHERE status = 'completed';
   ```

3. **Failed Transactions**
   ```sql
   SELECT *
   FROM anchor_transactions
   WHERE status = 'failed'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

### Logging

The service logs:
- All deposit/withdrawal initiations
- Transaction status updates
- Webhook receipts
- API errors

Log level can be configured via `LOG_LEVEL` environment variable.

## Security Best Practices

1. **API Key Rotation**
   - Rotate `ANCHOR_API_KEY` every 90 days
   - Use different keys for dev/staging/production

2. **Wallet Verification**
   - Always verify user owns the wallet address
   - Implement challenge-response authentication

3. **Rate Limiting**
   - Limit deposits/withdrawals per user per day
   - Implement IP-based rate limiting

4. **Amount Limits**
   - Set minimum/maximum transaction amounts
   - Implement daily/monthly limits per user

5. **Webhook Security**
   - Verify webhook signatures
   - Use HTTPS only
   - Implement replay attack prevention

## Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Supported currencies seeded
- [ ] Anchor provider API key obtained
- [ ] Webhook endpoint configured with anchor
- [ ] Rate limiting enabled
- [ ] Monitoring and alerting set up
- [ ] Error tracking configured (e.g., Sentry)
- [ ] Load testing completed
- [ ] Security audit performed

## Support

For issues or questions:
- GitHub Issues: https://github.com/chioma/chioma/issues
- Telegram: https://t.me/chiomagroup
- Documentation: See `/docs/anchor-integration.md`

## References

- [SEP-24 Specification](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md)
- [Stellar Anchor Directory](https://anchors.stellar.org/)
- [Chioma API Documentation](./api-documentation.md)
