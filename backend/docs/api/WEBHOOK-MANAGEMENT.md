# Webhook Management

## Webhook Overview

A webhook is an HTTP callback that delivers event notifications from one system (the sender) to another (the receiver). When an event occurs, the sender makes an HTTP request (typically `POST`) to a receiver-controlled URL (the webhook endpoint).

Webhooks are used to:

- notify external systems about events in near real-time
- reduce polling
- decouple systems via an event-driven integration pattern

### Core properties

- **Delivery is best-effort**: deliveries can fail due to network issues, downtime, or misconfiguration.
- **Events can be duplicated**: receivers must be idempotent.
- **Events can arrive out of order**: receivers must not assume ordering.
- **Security is critical**: endpoints must verify authenticity and protect against replay.

---

## Registration

Webhook registration is the process of associating a receiver URL with one or more events.

### Registration data model

At minimum, store the following per webhook subscription:

- **`url`**: the destination URL to call
- **`events`**: list of subscribed event types
- **`secret`**: shared secret used to sign requests (never store in plaintext if avoidable)
- **`status`**: `active` | `disabled`
- **`createdAt` / `updatedAt`**
- **`lastDeliveredAt` / `lastFailureAt`** (optional but recommended)

### Registration best practices

- validate webhook URLs (HTTPS, no localhost/private ranges unless explicitly allowed)
- confirm ownership of the endpoint
- support enabling/disabling without deleting
- support secret rotation

### Endpoint ownership verification (recommended)

Use a challenge/response handshake before marking a webhook active:

- receiver registers URL
- sender generates a random `challenge`
- sender sends `POST` to the URL with the `challenge`
- receiver returns `200` with the same `challenge`

If you do not implement handshake, require the receiver to verify signatures and provide a way to test deliveries.

---

## Events

### Event naming

Use stable, versionable, dot-delimited event names.

Examples (also listed in `api-documentation.md`):

- `agreement.created`
- `agreement.terminated`
- `payment.completed`
- `payment.failed`

### Event handling rules

- do not assume delivery order
- treat deliveries as at-least-once
- design handlers to be idempotent

---

## Payload

Webhook deliveries should be sent with:

- `Content-Type: application/json`
- a stable envelope shape
- explicit event metadata

### Recommended envelope format

```json
{
  "id": "evt_01J0X0ABCDEF1234567890",
  "type": "payment.completed",
  "createdAt": "2026-03-29T15:12:45.000Z",
  "data": {
    "paymentId": "payment-uuid",
    "agreementId": "agreement-uuid",
    "amount": 1500.0,
    "currency": "XLM",
    "status": "COMPLETED"
  }
}
```

### Receiver response guidelines

- return `2xx` only after the event is accepted for processing
- return `4xx` for permanent failures (bad signature, invalid payload)
- return `5xx` for transient failures (downstream outage, temporary dependency failures)

---

## Security

Webhook endpoints are public by design. Implement layered controls.

### Signature verification

Chioma’s signature scheme is documented in:

- `WEBHOOK_SIGNATURE_VERIFICATION.md`

Inbound webhook requests must include:

- `X-Webhook-Timestamp`
- `X-Webhook-Signature`

Signature verification requirements:

- compute expected signature from `<timestamp>.<raw-request-body>` using HMAC-SHA256
- constant-time compare signatures
- reject timestamps older than the allowed window (recommended: 5 minutes)
- reject missing/invalid signature headers

### Replay protection

- enforce a timestamp window
- optionally store processed `event.id` values for a TTL to reject duplicates beyond normal idempotency

### Raw body requirement

Signature verification must use the **raw request body**, not a re-serialized JSON object.

### Secret management

- keep secrets out of source control
- rotate secrets periodically and on suspicion of compromise
- during rotation, support multiple active secrets for a grace period

### Endpoint hardening

- require HTTPS
- rate limit webhook endpoints
- consider IP allowlisting when feasible
- return minimal error detail to callers (log details internally)

---

## Retries

Webhook delivery must assume transient failures.

### Retry rules (recommended)

- retry on network errors and `5xx`
- do not retry on `2xx`
- treat most `4xx` as non-retryable (signature failures, validation errors)

### Backoff policy

Use exponential backoff with jitter.

Example schedule:

- attempt 1: immediate
- attempt 2: +1 minute
- attempt 3: +5 minutes
- attempt 4: +15 minutes
- attempt 5: +1 hour
- attempt 6: +6 hours

Stop retrying after a maximum delivery window (for example: 24 hours) and mark the delivery as failed.

### Idempotency

Receivers must deduplicate by `event.id`:

- store processed event IDs with TTL (or permanently, depending on requirements)
- if a duplicate arrives, return `2xx` without re-processing

Senders must keep the same `event.id` across retries.

---

## Monitoring

Monitoring should cover both sender-side delivery health and receiver-side processing health.

### Sender-side metrics (recommended)

- total deliveries
- success rate (2xx)
- retry rate
- permanent failure rate
- delivery latency (time to first success)

### Receiver-side metrics (recommended)

- signature verification failures
- 4xx vs 5xx response rates
- processing duration
- queue depth (if async processing)

### Logging

Log with a correlation identifier:

- `event.id`
- webhook subscription id (if applicable)
- request id

Do not log secrets or full payloads containing sensitive data.

### Alerting (recommended)

Alert on:

- sustained spike in failures
- repeated signature verification failures
- rising retry backlog
- webhook endpoint latency increases

---

## Testing

### Receiver testing

- use a local tunnel to expose a dev webhook endpoint
- verify raw body handling and signature verification
- simulate duplicates and out-of-order deliveries

### Sender test delivery (recommended)

Provide a “send test event” capability that:

- sends a known payload to a registered webhook
- records the delivery attempt
- shows response status and timing

---

## Debugging

When debugging webhook issues:

- confirm the webhook is registered and active
- confirm the URL is reachable from the sender
- check signature verification failures (timestamp drift, wrong secret, raw body mismatch)
- confirm idempotency logic is not incorrectly treating the first delivery as a duplicate

---

## Troubleshooting

### Frequent signature failures

Common causes:

- using parsed JSON instead of raw body
- timestamp outside allowed window due to clock drift
- wrong secret selected during rotation

### Repeated retries / duplicate events

Common causes:

- receiver returns non-2xx while doing async work
- receiver times out before responding
- receiver does not deduplicate by `event.id`

### Out-of-order events

Handle by:

- retrieving current resource state from the API when needed
- designing handlers to be state-aware (ignore stale transitions)

---

## Webhook Checklist

### Registration

- [ ] URL validated (HTTPS, no private IP ranges unless allowed)
- [ ] Event subscriptions documented and stable
- [ ] Endpoint ownership verified (handshake) or test delivery available
- [ ] Secret generated securely and stored safely

### Receiver implementation

- [ ] Raw body available for signature verification
- [ ] Signature verification implemented per `WEBHOOK_SIGNATURE_VERIFICATION.md`
- [ ] Replay protection enforced (timestamp window, optional cache)
- [ ] Idempotency by `event.id` implemented
- [ ] Handler tolerant to out-of-order events
- [ ] Responds `2xx` only when accepted for processing

### Reliability

- [ ] Retries configured (5xx/network only)
- [ ] Exponential backoff with jitter
- [ ] Max retry window and failure state defined

### Security

- [ ] Secrets rotated and not logged
- [ ] Rate limiting enabled on webhook endpoints
- [ ] Minimal error detail returned to caller

### Observability

- [ ] Delivery attempts logged with `event.id`
- [ ] Metrics and alerts configured for failure rates and signature failures
