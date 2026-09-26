# Gas Cost Estimation

## 1. Purpose

This guide explains how Chioma estimates and tracks gas consumption for high-value contract operations.

## 2. Built-in estimates

The `chioma` contract exposes `estimate_gas_cost` for the following operations:

| OperationType      | Operation name              | Estimate |
| ------------------ | --------------------------- | -------: |
| `CreateAgreement`  | `create_agreement`          |   32,000 |
| `MakePayment`      | `make_payment_with_token`   |   59,000 |
| `ReleaseEscrow`    | `release_escrow_with_token` |   41,000 |
| `ResolveDispute`   | `resolve_dispute`           |   46,000 |
| `ProposeExtension` | `propose_extension`         |   31,000 |

### Estimation assumptions

- persistent read: about `5,000`
- persistent write: about `10,000`
- token transfer: about `25,000`
- event emission and TTL updates add smaller overhead

These are planning estimates, not final chain-measured values.

## 3. How to use the estimate API

```rust
let gas = client.estimate_gas_cost(&OperationType::MakePayment)?;
let metrics = client.get_gas_metrics()?;
let suggestion = client.optimize_operation(&OperationType::MakePayment)?;
```

## 4. When estimates are most useful

- designing a new feature before implementation
- checking whether a refactor changed expected cost
- setting performance budgets for reviews
- choosing between alternative storage layouts

## 5. Updating estimates

Refresh estimates when:

- storage keys change
- token transfer flow changes
- agreement lifecycle writes change
- a new event is added to a hot path

## 6. Review checklist

- [ ] estimate captured before change
- [ ] estimate captured after change
- [ ] major deltas explained
- [ ] optimization suggestion reviewed for affected operation
