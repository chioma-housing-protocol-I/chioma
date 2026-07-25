# Performance Optimization

**Priority:** Medium  
**Category:** Documentation  
**Type:** Documentation  
**Related Issues:** #742, #4, #12, #16

## 1. Objective

This guide documents practical performance optimization techniques for Chioma Soroban contracts, with a focus on gas usage, storage efficiency, predictable throughput, and safe optimization rollouts.

## 2. Current Optimization Baseline

The `chioma` contract already exposes built-in gas estimation and optimization helpers in `src/gas_optimization.rs`.

### Current tracked operations

| Operation                   | Estimated average gas |    Min |    Max | Optimization potential |
| --------------------------- | --------------------: | -----: | -----: | ---------------------: |
| `create_agreement`          |                32,000 | 25,600 | 38,400 |                    15% |
| `make_payment_with_token`   |                59,000 | 47,200 | 70,800 |                    25% |
| `release_escrow_with_token` |                41,000 | 32,800 | 49,200 |                    20% |
| `resolve_dispute`           |                46,000 | 36,800 | 55,200 |                    20% |
| `propose_extension`         |                31,000 | 24,800 | 37,200 |                    15% |

These values are source-derived conservative estimates and should be treated as the default planning baseline until refreshed with benchmark runs.

## 3. Primary Bottlenecks

### Storage I/O

- Persistent reads and writes dominate execution cost.
- Re-reading the same record within a call is usually avoidable.
- Full-vector read-modify-write patterns grow expensive as history accumulates.

### Cross-contract calls

- Token transfers are one of the most expensive steps in payment and escrow flows.
- Avoid unnecessary cross-contract work when simple guard conditions can fail early.

### Event volume

- Large event payloads and frequent event emission increase footprint.
- Emit what downstream systems need, not full object snapshots by default.

## 4. Optimization Techniques

### Data access

- Read a record once, mutate it in memory, then write it back once.
- Prefer keyed records over scanning vectors when lookup frequency is high.
- Use instance storage for global state and persistent storage for durable per-record data.

### Control flow

- Fail fast on authorization, pause checks, and state guards.
- Do validation before expensive transfers.
- Keep branching shallow for the common path.

### Data modeling

- Keep structs compact and stable.
- Split rarely used data into separate keys if it prevents repeated heavy reads.
- Avoid storing duplicate derived values unless they are materially cheaper to read than recomputing.

### Batch strategy

- Batch related configuration updates when it reduces repeated auth and storage overhead.
- Avoid oversized batches that risk hitting ledger limits or making failures harder to recover from.

## 5. Operation-Specific Recommendations

### `create_agreement`

- Batch validation in one pass.
- Avoid re-reading `AgreementCount` after it has already been loaded.

### `make_payment_with_token`

- Cache the agreement locally across all checks and write-back.
- Skip token-rate lookup when payment token already matches agreement token.
- Keep payment history records compact.

### `release_escrow_with_token`

- Combine frozen-state and agreement-state checks before token transfer work.
- Skip no-op transfer paths.

### `resolve_dispute`

- Minimize intermediate state transitions.
- Write final dispute resolution state once where possible.

### `propose_extension`

- Prefer append-only or segmented history storage as extension counts grow.

## 6. Performance Checklist

- [ ] Baseline measured before optimization
- [ ] Changed operation identified and isolated
- [ ] Redundant reads/writes removed
- [ ] Event payload reviewed
- [ ] Cross-contract calls minimized
- [ ] Benchmarks rerun after changes
- [ ] Functional tests still pass
- [ ] Documentation updated with new baseline if behavior changed

## 7. Optimization Workflow

1. Identify the slow or expensive operation.
2. Capture the existing gas estimate or benchmark.
3. Trace storage reads, writes, and cross-contract calls.
4. Reduce redundant work while keeping behavior unchanged.
5. Rerun benchmarks and regression tests.
6. Record the delta in the PR description and docs when material.

## 8. Tools

- `cargo test`
- `cargo build --target wasm32-unknown-unknown --release`
- Soroban CLI invocation profiling
- `estimate_gas_cost`
- `get_gas_metrics`
- `optimize_operation`

## 9. Example

```rust
let before = client.estimate_gas_cost(&OperationType::MakePayment)?;
let suggestion = client.optimize_operation(&OperationType::MakePayment)?;

// Apply code changes, rerun tests, and compare to refreshed metrics.
```
