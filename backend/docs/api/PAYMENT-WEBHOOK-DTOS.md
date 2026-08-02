# Payment & Refund Webhook DTOs

Explicit Zod-backed DTOs for gateway webhook validation
(`PaymentWebhookDto`, `RefundWebhookDto`).

## Why Zod DTOs?

Class-validator DTOs document the OpenAPI surface, but webhook handlers
also need a single reusable runtime schema for:

- rejecting malformed payloads before DB lookup
- sharing validation between controllers, services, and tests
- producing consistent 400 error messages

## PaymentWebhookDto

| Field             | Type   | Required | Notes                      |
| ----------------- | ------ | -------- | -------------------------- |
| `eventType`       | string | yes      | e.g. `payment.completed`   |
| `status`          | string | yes      | Gateway status string      |
| `paymentId`       | string | one of\* | Internal payment UUID      |
| `referenceNumber` | string | one of\* | Gateway / ledger reference |
| `transactionHash` | string | no       | On-chain / gateway tx id   |
| `error`           | string | no       | Failure detail             |

\* At least one of `paymentId` or `referenceNumber` must be present.

- Schema: `paymentWebhookSchema` in `payment-webhook.dto.ts`
- Parser: `parsePaymentWebhookDto(unknown)`

## RefundWebhookDto

| Field             | Type   | Required | Notes                   |
| ----------------- | ------ | -------- | ----------------------- |
| `eventType`       | string | yes      | e.g. `refund.completed` |
| `status`          | string | yes      | Gateway refund status   |
| `paymentId`       | string | one of\* | Internal payment UUID   |
| `referenceNumber` | string | one of\* | Gateway reference       |
| `refundId`        | string | no       | Gateway refund id       |
| `amount`          | number | no       | Positive refund amount  |
| `currency`        | string | no       | ISO currency code       |
| `reason`          | string | no       | Human-readable reason   |
| `error`           | string | no       | Failure detail          |

\* At least one of `paymentId` or `referenceNumber` must be present.

- Schema: `refundWebhookSchema` in `refund-webhook.dto.ts`
- Parser: `parseRefundWebhookDto(unknown)`

## Handler usage

```ts
const dto = parsePaymentWebhookDto(body);
await paymentWebhookService.handlePaymentGatewayWebhook(dto, secret);
```

Endpoints:

- `POST /payments/webhooks/gateway` — payment status events
- `POST /payments/webhooks/refund` — refund status events
