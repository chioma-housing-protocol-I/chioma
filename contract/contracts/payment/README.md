# Payment Contract

## Recurring Payments

This contract now supports automated recurring payments for rent agreements.

### Data Models
- `RecurringPayment`
- `PaymentFrequency`
- `RecurringStatus`
- `PaymentExecution`
- `ExecutionStatus`

### Functions
- `create_recurring_payment`
- `execute_recurring_payment`
- `pause_recurring_payment`
- `resume_recurring_payment`
- `cancel_recurring_payment`
- `get_recurring_payment`
- `get_payment_executions`
- `process_due_payments`
- `get_due_payments`
- `retry_failed_payment`
- `get_failed_payments`

### Supported Frequencies
- Daily
- Weekly
- BiWeekly
- Monthly
- Quarterly
- Annually

### Notes
- Creation derives payer/payee from the agreement (`tenant`/`landlord`).
- `process_due_payments` is keeper/oracle style execution for due entries.
- Failed recurring executions are tracked and can be retried.

### Test Command
```bash
cargo test recurring_payments
```
