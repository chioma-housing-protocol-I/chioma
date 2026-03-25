# Soroban Project

## Project Structure

This repository uses the recommended structure for a Soroban project:

```text
.
├── contracts
│   └── hello_world
│       ├── src
│       │   ├── lib.rs
│       │   └── test.rs
│       └── Cargo.toml
├── Cargo.toml
└── README.md
```

- New Soroban contracts can be put in `contracts`, each in their own directory. There is already a `hello_world` contract in there to get you started.
- If you initialized this project with any other example contracts via `--with-example`, those contracts will be in the `contracts` directory as well.
- Contracts should have their own `Cargo.toml` files that rely on the top-level `Cargo.toml` workspace for their dependencies.
- Frontend libraries can be added to the top-level directory as well. If you initialized this project with a frontend template via `--frontend-template` you will have those files already included.

## Emergency Pause (Chioma Contract)

The `contracts/chioma` contract now includes an emergency pause mechanism:

- `pause(reason)` and `unpause()` are admin-only.
- `is_paused()` exposes current circuit-breaker status.
- Pause metadata is stored as `PauseState` (`is_paused`, `paused_at`, `paused_by`, `pause_reason`).
- Critical mutating operations (booking, payment, escrow, and token-management entrypoints) are blocked while paused.
- `Paused` and `Unpaused` events are emitted for operational monitoring.

## Timeout Mechanisms (Escrow + Dispute Resolution)

Timeout protection is now available to prevent stale funds/disputes from remaining open indefinitely.

- Escrow contract supports:
  - `set_timeout_config(caller, config)` / `get_timeout_config()`
  - `release_escrow_on_timeout(escrow_id)` for stale pending/funded escrows (refunds depositor)
  - `resolve_dispute_on_timeout(escrow_id)` for stale disputed escrows (auto-refund path)
  - timeout events: `EscrowTimeout`, `DisputeTimeout`
- Dispute resolution contract supports:
  - admin-configurable timeout settings via `set_timeout_config(admin, config)`
  - `resolve_dispute_on_timeout(agreement_id)` for stale unresolved disputes
  - timeout event: `DisputeTimeout`
