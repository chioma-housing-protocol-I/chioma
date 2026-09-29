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
- compare signatures in constant time
- record rejected attempts as HIGH-severity security events

## Payment Webhooks

The payment endpoints protected by the same HMAC guard are:

- `/api/payments/webhooks/gateway`
- `/api/payments/webhooks/refund`

They use `PAYMENT_WEBHOOK_SECRET` and the same timestamp/signature headers as
the endpoints below. `PAYMENT_WEBHOOK_SECRET` is required in deployed
environments; unsigned or invalid requests are rejected before payment logic
runs.

Refund webhook payloads must include a UUID `idempotencyKey` and an ISO-8601
`timestamp` within five minutes of receipt. Successfully processed keys are
retained for seven days. A repeated key, including a simultaneous delivery,
returns `409 Conflict` and does not apply the refund again.

## Key Storage and Rotation

Store webhook secrets in the deployment platform's secret manager, never in
source control or application logs. Use a high-entropy secret and restrict
read access to the webhook service and the payment provider configuration.

To rotate the payment key without an outage, set `PAYMENT_WEBHOOK_SECRET` to
the new key and temporarily set `PAYMENT_WEBHOOK_SECRET_PREVIOUS` to the old
key. Deploy both values while the provider is switched to the new key, then
remove `PAYMENT_WEBHOOK_SECRET_PREVIOUS` after the provider confirms the
change. The previous key is accepted only during this overlap window. Rotate
immediately and remove the compromised key if a key is suspected to be
exposed. Restart or redeploy the service after updating secret-manager values.

Rejected attempts are written to the structured application log and persisted
in `security_events` as HIGH-severity `suspicious_activity` records. Events
contain endpoint/request metadata, but never the raw payload or configured
signing keys.

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
