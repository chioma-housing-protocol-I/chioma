# 0004. Soroban split across eight contracts

- **Status**: Accepted
- **Date**: 2026-09-25

## Context

On-chain logic covers agreements, escrow, payments, rent obligations, disputes, property registration, agents, and user profiles. Soroban contracts have size limits, and upgrade/audit risk grows with contract size.

## Decision

Eight Soroban (Rust) contracts under `contract/contracts/`: `chioma` (core agreements), `escrow`, `payment`, `rent_obligation`, `dispute_resolution`, `property_registry`, `agent_registry`, and `user_profile`. Contracts call each other via cross-contract invocation.

## Alternatives considered

- **Single monolithic contract** — rejected: approaches Wasm size limits, and any change forces re-auditing and upgrading everything, including escrow funds logic.
- **Ethereum / EVM L2** — rejected: Stellar gives low fees, native stablecoin/anchor rails for fiat on/off-ramps in target markets.
- **Off-chain only** — rejected: escrow and agreement guarantees are the protocol's core trust property.

## Consequences

- Funds-handling contracts (escrow, payment) can be audited and upgraded independently.
- Cross-contract calls add cost and require careful authorisation and versioning between contracts.
- Deployment must track eight contract IDs per network.
