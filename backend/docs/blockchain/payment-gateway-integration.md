# Payment Gateway Integration

This backend now exposes a payments orchestration layer that bridges the generic payments module with the existing Stellar payment-processing and escrow services.

## Implemented flows

- Stellar rent payments via `POST /payments/stellar/rent`
- Stellar escrow deposit creation via `POST /payments/stellar/escrow`
- Escrow release via `POST /payments/stellar/escrow/:escrowId/release`
- Escrow refund via `POST /payments/stellar/escrow/:escrowId/refund`
- Payment reconciliation via `POST /payments/reconciliation/run`
- Failed-payment retry via `POST /payments/retry-failed`
- Gateway webhook ingestion via `POST /payments/webhooks/gateway`
- Payment analytics summary via `GET /payments/analytics/summary`

## Operational assumptions

- Stellar rent payments require the caller to provide a valid tenant secret for transaction signing.
- Stellar escrow creation assumes the source and destination Stellar accounts are already registered in Chioma.
- If `PAYMENT_WEBHOOK_SECRET` is configured, webhook callers must provide it in `x-chioma-payment-secret`.
- Escrow-backed payments are stored as `pending` until reconciliation observes `RELEASED` or `REFUNDED`.

## Reconciliation model

- Rent payments reconcile against the stored Stellar transaction hash.
- Escrow deposits reconcile against the tracked escrow id.
- Reconciliation writes the latest external status back into `payments.metadata`.

## Retry model

- Existing direct gateway payments with a stored payment method can be retried.
- Stellar payments are not blindly re-submitted without the original signing material; instead, they should be reconciled against chain state.

## Failure handling

- External gateway or Stellar submission failures are persisted into `payments.metadata.error`.
- Refunds and releases update both the escrow state and the corresponding payment record.
- Webhook events for unknown payments are ignored gracefully and return `processed: false`.
