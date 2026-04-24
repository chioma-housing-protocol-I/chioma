# Scaling Strategies

## 1. Objective

Scaling in Chioma contract workloads means keeping hot agreement and payment paths efficient as the number of agreements, extensions, payments, and governance actions grows.

## 2. Scaling principles

- Keep hot-path storage lookups direct and predictable.
- Avoid unbounded vector growth on frequently accessed records.
- Separate operational history from frequently mutated live state when needed.
- Batch administrative updates carefully.

## 3. High-growth areas

### Agreement volume

- `AgreementCount`
- individual `Agreement(String)` records

### Payment history

- `PaymentRecord(String, u32)`
- `get_payment_history`

### Extension history

- `AgreementExtension(String)`
- `ExtensionHistory(String)`

### Governance activity

- `AdminProposal(String)`
- `TimelockAction(String)`
- `UpgradeProposal(String)`

## 4. Recommended strategies

- Prefer record-per-item storage for histories that can grow without bound.
- Avoid loading entire historical collections in hot paths.
- Keep governance and diagnostic records out of user transaction paths.
- Revisit struct payload size when adding new fields to heavily used records.

## 5. Operational monitoring

Watch for:

- rising gas on payment or agreement operations
- increased latency on history-heavy reads
- growing state size in extension and governance flows

## 6. Scaling checklist

- [ ] new feature reviewed for storage growth pattern
- [ ] history access separated from write-heavy paths when possible
- [ ] benchmark captured for the affected operation
- [ ] gas estimate helper updated if assumptions changed
