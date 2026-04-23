# Integration Tests

## Purpose

Integration tests validate realistic workflows across multiple actors, state changes, and contract modules. They should prove the protocol flow works, not only that individual helpers compile.

## Core Workflows

| Workflow | Required assertions |
|---|---|
| Escrow creation and release | Deposit is created, approvals are recorded, release threshold is enforced, funds/state move once |
| Escrow timeout | Timeout cannot execute early, succeeds at the correct boundary, emits timeout event |
| Dispute lifecycle | Dispute opens, evidence is stored, arbiter decision updates final status, duplicate resolution is blocked |
| Payment processing | Valid payment records state, failed payment does not mutate final balances, events are emitted |
| Emergency pause | Paused contract rejects mutating calls and allows approved recovery/unpause flow |
| Property registration | Owner can create/update property, unrelated users cannot mutate it |
| User profile | Profile creation, update, and lookup remain consistent across repeated calls |

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
