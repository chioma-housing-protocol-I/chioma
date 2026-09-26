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

`contracts/chioma/src/tests_gas_benchmarks.rs` measures real CPU-instruction
counts per entry point via `Env::cost_estimate()` and fails CI if an
operation exceeds its baseline by more than 10%. These are the committed
baselines (instructions, measured on the Soroban test host):

| Operation                   | Baseline (instructions) |
| ---------------------------- | -----------------------: |
| `create_agreement_with_token` |                  217,921 |
| `make_payment_with_token`     |                  362,387 |
| `release_escrow_with_token`   |                  349,901 |
| `propose_extension`           |                  243,078 |

`resolve_dispute` is not benchmarked here: dispute handling is routed
through the separate `dispute_resolution` contract, not this one.

Update a baseline only as part of a reviewed PR that intentionally changes
the corresponding code path — bump the constant in
`tests_gas_benchmarks.rs` and this table together, with the measured delta
noted in the PR description.

## 5. Comparison workflow

1. Run `cargo test -p chioma tests_gas_benchmarks -- --nocapture` (CI runs
   this on every PR as part of the standard test suite).
2. Compare the printed `instructions=` value against the baseline table
   above.
3. A regression beyond 10% fails the test automatically; investigate before
   merging.
4. For increases under 10%, or intentional baseline moves, update the
   baseline constant and this table together, and record the reasoning in
   the PR description.

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
