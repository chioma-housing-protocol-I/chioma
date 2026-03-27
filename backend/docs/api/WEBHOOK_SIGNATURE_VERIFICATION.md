# Webhook Signature Verification

## Headers

Inbound webhook requests must include:

- `X-Webhook-Timestamp`
- `X-Webhook-Signature`

## Signature Algorithm

- algorithm: `HMAC-SHA256`
- signing input: `<timestamp>.<raw-request-body>`
- encoding: lowercase hex digest

## Validation Rules

- reject missing signature headers
- reject invalid signatures
- reject timestamps older than 5 minutes
- reject requests when the configured secret is missing

## Protected Endpoints

- `/api/v1/anchor/webhook`
- `/api/kyc/webhook`
- `/api/api/alerts/webhook`
- `/api/screenings/tenant/webhook`

## Example

```ts
import crypto from 'crypto';

const payload = JSON.stringify(body);
const timestamp = Date.now().toString();
const signature = crypto
  .createHmac('sha256', process.env.WEBHOOK_SECRET!)
  .update(`${timestamp}.${payload}`)
  .digest('hex');
```
