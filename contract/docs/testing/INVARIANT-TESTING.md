# Invariant Testing Framework

Chioma contracts hold funds and enforce multi-party rules, so a single edge
case in arithmetic or authorization is a production incident. Property-based
invariant testing complements the example-based unit and integration tests by
checking that a rule holds for a wide range of generated inputs.

This document defines the shared framework. The implementation lives in
[`contracts/invariant-testing`](../../contracts/invariant-testing/src/lib.rs),
and [`integration_tests/tests/invariant_framework.rs`](../../contracts/integration_tests/tests/invariant_framework.rs)
is a working example against a real contract function.

## When to use it

Write a property test when a rule must hold for every valid input, for example:

- shares sum back to the original amount;
- balances never go negative after a release or deduction;
- a fee increase never increases the tenant's rent;
- a bounded value stays inside `0..=10_000` basis points.

Use a normal unit test for one concrete scenario, an authorization boundary,
or an exact error code. Property tests prove a rule, unit tests pin an example.

## Layers

| Piece | Location | Responsibility |
| --- | --- | --- |
| Strategies | `invariant_testing::strategies` | Reusable input domains with agreed bounds |
| Assertions | `invariant_testing::assertions` | Consistent invariant checks and failure messages |
| Contract suites | `contracts/<name>/src/tests_property.rs` | Contract-specific invariants using the pieces above |
| Integration example | `contracts/integration_tests/tests/invariant_framework.rs` | End-to-end use against exported contract logic |

Adding a new domain or check belongs in the shared crate, not in a contract
local file, so every suite stays consistent.

## Writing a test

Add the shared crate as a dev-dependency:

```toml
[dev-dependencies]
proptest = "1.4.0"
invariant-testing = { path = "../invariant-testing" }
```

Then express the rule in terms of a strategy and an assertion:

```rust
use invariant_testing::{assertions, strategies};
use proptest::prelude::*;

proptest! {
    #[test]
    fn split_preserves_amount(
        amount in strategies::amount(),
        bps in strategies::basis_points(),
    ) {
        let (landlord, agent) = calculate_payment_split(&amount, &bps);
        assertions::assert_sum_preserved(&[landlord, agent], amount, "split");
        assertions::assert_non_negative(landlord, "landlord share");
        assertions::assert_non_negative(agent, "agent share");
    }
}
```

Prefer calling the real contract function. A pure copy of the on-chain math in
the test only proves the copy, not the contract. If a function cannot be called
without a Soroban `Env`, build a small test `Env` with `testutils` and assert on
the resulting storage or error instead.

## Conventions

- Name property tests `prop_<rule>` so they are distinguishable from examples.
- State the invariant in the doc comment and include the values in assertion
  messages. A failing case should explain itself.
- Keep strategies bounded. Unbounded `i128` generators cause overflow that has
  nothing to do with the rule under test.
- Prefer `saturating_*` or explicit bounds when the production code does, and
  assert the same boundary behaviour.
- Do not use sleeps, wall-clock time, network calls or randomness outside
  `proptest`. Reproducibility is the point of the framework.

## Reproducing a failure

`proptest` writes a minimal failing case to
`contracts/<contract>/proptest-regressions/<suite>.txt`. Commit that file. It
becomes a permanent regression test and is replayed before new cases are
generated.

When a generated case fails:

1. Read the minimal input from the regression file or test output.
2. Reproduce locally with `cd contract && cargo test -p <contract> <test_name>`.
3. Fix the contract, not the strategy, unless the generated input is outside
   the domain the contract accepts.
4. Keep the regression file in the fix commit.

## Required checks

Run from `contract/`:

```bash
cargo test -p invariant-testing
cargo test -p integration-tests --test invariant_framework
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
```

The full contract suite (`cargo test`) must also pass before a PR is merged.

## References

- [Testing Strategy](TESTING-STRATEGY.md): test pyramid and required local checks
- [Test Coverage](TEST-COVERAGE.md): critical invariants to protect
- [Mainnet Deployment Guide](../deployment/MAINNET_DEPLOYMENT.md): release gate
