# Gas Optimization Report

## Methods Benchmarked

- `update_profile`
- `get_profile`
- `delete_profile`

## Storage Strategy and Optimizations

- Profiles are stored under a single `DataKey::UserProfile(Address)` entry in persistent storage to minimize key fan-out and reads.
- `update_profile` reuses the existing `is_verified` flag rather than duplicating verification state in storage.
- Validation is done early to avoid unnecessary reads/writes.
- Rate limiting uses the stored `last_updated` field to avoid additional counters.

## Measurement Approach

Gas and storage costs should be measured locally using Soroban simulation tooling to avoid fabricated numbers.

Recommended approach:

1. Build the contract:
   - `cargo build --release -p chioma`
2. Simulate contract invocations with Soroban CLI:
   - `soroban contract invoke --wasm target/wasm32-unknown-unknown/release/chioma.wasm --id <contract-id> --network <network> -- update_profile --account <address> --account_type 1 --data_hash <bytes>`
   - `soroban contract invoke --wasm target/wasm32-unknown-unknown/release/chioma.wasm --id <contract-id> --network <network> -- get_profile --account <address>`
   - `soroban contract invoke --wasm target/wasm32-unknown-unknown/release/chioma.wasm --id <contract-id> --network <network> -- delete_profile --account <address>`
3. Record the reported `cost` and `storage` outputs from the simulation logs for each method.

These outputs provide the authoritative gas and storage usage without inventing values.
