# Benchmarking Guide

## 1. Goal

Benchmarking validates whether gas estimates and real execution behavior remain within acceptable limits after contract changes.

## 2. Benchmark targets

Benchmark at least these operations when touched:

- `create_agreement`
- `make_payment_with_token`
- `release_escrow_with_token`
- `resolve_dispute`
- `propose_extension`

## 3. Benchmark procedure

### Local contract build

```bash
cd contract
cargo build --workspace --target wasm32-unknown-unknown --release
```

### Unit/integration verification

```bash
cargo test
```

### Soroban invocation profiling

```bash
soroban contract invoke \
  --id <CONTRACT_ID> \
  --network testnet \
  -- \
  create_agreement \
  --admin <ADMIN> \
  --user <USER>
```

Capture:

- CPU instructions
- memory or RAM usage
- ledger read/write footprint
- output success and failure behavior

## 4. Baseline table

Use the built-in gas estimates as the minimum baseline until more detailed measured values are recorded:

| Operation                   | Planning baseline |
| --------------------------- | ----------------: |
| `create_agreement`          |            32,000 |
| `make_payment_with_token`   |            59,000 |
| `release_escrow_with_token` |            41,000 |
| `resolve_dispute`           |            46,000 |
| `propose_extension`         |            31,000 |

## 5. Comparison workflow

1. Run the current benchmark.
2. Compare against the planning baseline or prior measured benchmark.
3. Investigate any increase greater than 10%.
4. Record whether the increase is acceptable, temporary, or a regression.

## 6. Reporting format

Every benchmark report should include:

- operation tested
- input shape
- environment used
- baseline value
- measured value
- percentage change
- explanation

## 7. Example report snippet

```text
Operation: make_payment_with_token
Environment: local Soroban test run
Baseline: 59,000
Measured: 56,400
Delta: -4.4%
Notes: removed one redundant agreement reload before write-back
```
