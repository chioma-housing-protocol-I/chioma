# Integration Tests

## Purpose

Integration tests validate realistic workflows across multiple actors, state changes, and contract modules. They should prove the protocol flow works, not only that individual helpers compile.

## Multi-Contract Harness

Every workflow below is exercised *within a single contract's own test
suite* (registering only that one contract in a fresh `Env`). Before #1687
there was no harness that registered several of this workspace's 9
contracts together in one `Env` and drove a scenario across them the way an
off-chain caller (backend/frontend/indexer) actually would.

`contracts/integration_tests` (run via `cargo test -p integration-tests`) is
that harness. It path-depends on `property_registry`, `agent_registry`,
`escrow`, `dispute_resolution`, `payment`, and `chioma` as libraries and
registers real contracts, not mocks, in `tests/protocol_scenarios.rs`.

A workspace-wide audit for #1685/#1687 found the 9 contracts almost never
call each other on-chain -- `dispute_resolution::raise_dispute` calling
`chioma`'s agreement lookup via `env.invoke_contract` is the *only*
project-to-project call site in the whole codebase (every other contract's
only external call is to a Soroban token contract). Registering the real
`chioma` contract for that scenario, instead of the hand-written
`MockChiomaContract` that `dispute_resolution`'s own test suite uses,
surfaced two pre-existing bugs the mock had been silently working around:

1. The invoke symbol is `"get_agr"` (`dispute_resolution/src/dispute.rs`),
   but `chioma`'s actual exported function is `get_agreement` -- Soroban
   resolves by exact name, so this call never reaches it in production.
2. Even with the symbol fixed, `dispute_resolution`'s local `RentAgreement`
   type doesn't structurally match `chioma`'s real one (different field
   names/shapes), so decoding the real response would still fail.

See the doc comment on
`scenario_1_raise_dispute_against_real_chioma_agreement_is_currently_broken`
in `contracts/integration_tests/tests/protocol_scenarios.rs` for the full
writeup; that test intentionally documents this as still-broken rather than
papering over it, and is written to fail loudly (with a message pointing
back here) once someone fixes the underlying symbol/type mismatch, so it
gets updated rather than silently passing for the wrong reason.

The other two scenarios in that file (a property/agent/escrow lifecycle,
and a property/recurring-payment/late-fee lifecycle) don't hit real
cross-contract calls, since none exist for those contracts -- they instead
confirm that registering multiple contracts together in one `Env` doesn't
change any individual contract's behavior or leak state between them.

## Core Workflows

| Workflow                    | Required assertions                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------------------- |
| Escrow creation and release | Deposit is created, approvals are recorded, release threshold is enforced, funds/state move once          |
| Escrow timeout              | Timeout cannot execute early, succeeds at the correct boundary, emits timeout event                       |
| Dispute lifecycle           | Dispute opens, evidence is stored, arbiter decision updates final status, duplicate resolution is blocked |
| Payment processing          | Valid payment records state, failed payment does not mutate final balances, events are emitted            |
| Emergency pause             | Paused contract rejects mutating calls and allows approved recovery/unpause flow                          |
| Property registration       | Owner can create/update property, unrelated users cannot mutate it                                        |
| User profile                | Profile creation, update, and lookup remain consistent across repeated calls                              |

## Actor Model

Define actors in test setup and reuse the names in assertions:

- `admin`
- `tenant`
- `landlord`
- `agent`
- `arbiter`
- `attacker`

Tests are easier to audit when the actor role is visible at the call site.

## Ledger and Time Control

For timeout or recurring-payment tests:

- Set ledger timestamp before creating the record.
- Advance the ledger to just before the deadline.
- Assert the action fails.
- Advance to the deadline or just after it.
- Assert the action succeeds and cannot be repeated.

## Event Assertions

Integration tests should verify events for major externally observed actions. Assert both topics and important payload fields so indexers and dashboards remain compatible.

## Example Flow

```rust
#[test]
fn escrow_release_requires_two_distinct_approvals() {
    let env = Env::default();
    env.mock_all_auths();
    let actors = setup_actors(&env);
    let client = setup_escrow(&env, &actors.admin);

    let escrow_id = client.create_escrow(
        &actors.tenant,
        &actors.landlord,
        &actors.arbiter,
        &1000_i128,
    );

    client.approve_release(&escrow_id, &actors.tenant);
    assert!(client.try_release(&escrow_id).is_err());

    client.approve_release(&escrow_id, &actors.landlord);
    client.release(&escrow_id);

    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Released);
}
```

## When to Add Integration Tests

Add or update integration tests when a change:

- Adds or changes a public method.
- Changes authorization requirements.
- Changes storage layout or migration behavior.
- Changes timeout, payment, dispute, or escrow state machines.
- Fixes a bug reported from a user workflow.
