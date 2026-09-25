# Contract Change Readiness Checklist

Definition of done for any change under `contract/`. Each item has an ID that
the contract PR checklist (`.github/PULL_REQUEST_TEMPLATE/contract.md`) refers to.

## R1 — Upgradeability

- Storage layout of existing keys is unchanged, or a migration path is documented.
- Upgrade entrypoints remain admin-gated; see [UPGRADES.md](UPGRADES.md).
- The change was exercised against a previously deployed WASM on testnet.

## R2 — Storage growth

- New persistent/instance entries have bounded size and a TTL/extend strategy.
- No unbounded `Vec`/`Map` growth keyed by user input.
- Temporary vs persistent storage choice is justified.

## R3 — Event schema stability

- Existing event topics and payload shapes are unchanged, or versioned.
- Indexers/backend consumers (`backend/src/modules/**/indexer`) are updated for any new event.

## R4 — Authorization

- Every state-changing function calls `require_auth` on the correct address.
- Admin/role checks are covered by negative tests.
- No new path bypasses pause/emergency controls ([EMERGENCY-PROCEDURES.md](../security/EMERGENCY-PROCEDURES.md)).

## R5 — Testing & tooling

- `contract/check-all.sh` passes (fmt, clippy, tests).
- Unit tests cover success and failure paths of changed functions.

## R6 — Cost & limits

- Resource/fee impact measured for changed entrypoints; no regression beyond budget.

## R7 — Documentation & deployment

- Contract docs and ABI references updated.
- Deployment notes added for testnet/mainnet ([TESTNET_DEPLOYMENT.md](TESTNET_DEPLOYMENT.md), [MAINNET_DEPLOYMENT.md](MAINNET_DEPLOYMENT.md)).
