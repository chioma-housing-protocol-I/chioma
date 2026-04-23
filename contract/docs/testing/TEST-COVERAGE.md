# Test Coverage Requirements

## Coverage Policy

Contract changes must include meaningful tests for changed behavior. The target is not only line coverage; tests must assert protocol invariants, authorization boundaries, and state transitions.

## Required Coverage by Change Type

| Change type | Required coverage |
|---|---|
| New public method | Success, invalid input, unauthorized caller, emitted event, storage state |
| Bug fix | Regression test that fails before the fix and passes after it |
| Storage change | Read/write behavior, missing key behavior, compatibility notes |
| Error change | Exact error variant and caller-visible behavior |
| Event change | Topic and payload assertion |
| Timeout/rate limit change | Before boundary, at boundary, after boundary |
| WASM-facing change | `cargo build --target wasm32-unknown-unknown --release` |

## Critical Invariants

Always protect these invariants with tests when touched:

- Escrow funds cannot be released twice.
- A single signer cannot satisfy multi-sig approval alone.
- Disputes cannot be resolved more than once.
- Paused contracts reject mutating operations.
- Admin-only operations require admin authorization.
- Payments cannot be marked complete without required state updates.
- Property ownership cannot be changed by unrelated users.
- User profiles cannot overwrite another user's profile.

## Coverage Review Checklist

- Does the test fail if the new behavior is removed?
- Does it assert state, not just absence of panic?
- Does it include a negative path?
- Does it include the actor that should not be allowed?
- Does it cover event payloads used by frontend/indexers?
- Does it avoid sleeps, real network calls, and nondeterministic time?

## Measuring Coverage

Rust coverage tooling can vary by contributor environment. If coverage tooling is installed, use it as supporting evidence:

```bash
cd contract
cargo llvm-cov --workspace --html
```

Coverage reports are useful, but PRs should not rely on coverage percentage alone. A small, high-signal invariant test is better than broad tests that do not assert contract behavior.

## Known Gaps

When a test cannot be added immediately, document the gap in the PR with:

- The uncovered behavior.
- Why it is blocked.
- Manual verification performed.
- Follow-up issue or owner.

Do not merge contract changes with uncovered security-critical behavior unless maintainers explicitly accept the risk.
