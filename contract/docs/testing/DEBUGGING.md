# Debugging Contract Tests

## First Checks

Start with the smallest failing command:

```bash
cd contract
cargo test -p escrow release_escrow -- --nocapture
```

Then run the full contract suite before finishing:

```bash
cargo test
```

## Common Failures

| Symptom | Likely cause | Fix |
|---|---|---|
| `Unauthorized` | Missing auth mock or wrong actor | Use the correct actor and avoid `mock_all_auths` in auth-specific tests |
| Missing storage value | Test did not initialize contract or used a different key | Check setup helper and `DataKey` variant |
| Timeout test fails | Ledger timestamp/block was not advanced correctly | Set ledger info before action and advance across the boundary |
| Event assertion fails | Topic order or payload shape changed | Compare emitted event with frontend/indexer contract |
| Clippy failure | New warning introduced by tests or helpers | Fix warning; contract CI uses `-D warnings` |
| WASM build failure | Host-only dependency or feature leaked into contract code | Gate host-only code with `#[cfg(test)]` or move it to tests |

## Useful Commands

Run one contract package:

```bash
cargo test -p chioma
```

Run one test by name:

```bash
cargo test escrow_timeout -- --nocapture
```

Run formatting:

```bash
cargo fmt --all
```

Run strict linting:

```bash
cargo clippy --all-targets --all-features -- -D warnings
```

Run release WASM build:

```bash
cargo build --target wasm32-unknown-unknown --release
```

## Debugging Patterns

- Print only temporary values while investigating; remove debug output before final checks unless it is part of a deliberate `--nocapture` troubleshooting example.
- Reduce failing tests to one actor and one state transition before expanding the scenario.
- Assert intermediate state after every important call in multi-step workflows.
- If an auth test only passes with `mock_all_auths`, rewrite it with explicit mock auths.
- If a time test is flaky, replace relative assumptions with explicit ledger timestamp setup.

## PR Notes for Persistent Failures

If a failure cannot be fixed in the same PR, document:

- Exact command.
- Exact error.
- Whether the failure exists on the base branch.
- Why the current change is or is not related.
- Follow-up issue link.
