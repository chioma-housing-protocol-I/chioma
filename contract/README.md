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
