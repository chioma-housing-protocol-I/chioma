# Testing Strategy

## Purpose

Chioma contracts protect housing payments, escrow decisions, property records, and user profile data. The test strategy focuses on correctness first, then regression protection, gas-conscious design, and reproducible release checks.

## Test Pyramid

| Layer | Goal | Required for |
|---|---|---|
| Unit tests | Validate contract functions, storage helpers, events, and errors in isolation | Every new public method and every bug fix |
| Integration tests | Validate multi-step flows across actors and contract state | Escrow, disputes, payments, pause controls, and admin workflows |
| Regression tests | Lock behavior after a production bug or security finding | Every fixed defect |
| Build checks | Prove contracts compile for host tests and WASM release target | Every PR touching `contract/` |

## Minimum Coverage Expectations

- Public contract methods: success path, authorization failure, invalid input, and relevant state transition.
- Storage changes: write, read, overwrite or reject duplicate, and missing-record behavior.
- Events: emitted topic and payload for user-visible state changes.
- Errors: exact `ContractError` or domain error for expected failures.
- Time-based logic: before timeout, at timeout boundary, and after timeout.
- Admin-only logic: authorized admin, non-admin, and uninitialized or paused state when applicable.

## Required Local Checks

Run these before submitting a contract PR:

```bash
cd contract
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test
cargo build --target wasm32-unknown-unknown --release
```

Use `./check-all.sh` when the script is available and executable in your environment.

## Test Organization

- Keep fast unit tests beside each contract in `contracts/<name>/src/tests.rs`.
- Split large domains into focused files such as `tests_rate_limit.rs`, `tests_timelock.rs`, or `tests_errors.rs`.
- Share setup helpers inside the contract test module rather than adding cross-contract coupling.
- Name helpers by what they create, for example `create_initialized_env`, `register_agent`, or `create_funded_escrow`.

## Pull Request Checklist

- New behavior has unit tests.
- Cross-actor workflows have integration-style tests.
- Tests cover negative authorization paths.
- Events and storage side effects are asserted.
- `cargo test` passes locally.
- Clippy passes with `-D warnings`.
- WASM release build succeeds.

## Documentation Map

- [Unit Tests](./UNIT-TESTS.md)
- [Integration Tests](./INTEGRATION-TESTS.md)
- [Test Coverage](./TEST-COVERAGE.md)
- [Debugging Tests](./DEBUGGING.md)
