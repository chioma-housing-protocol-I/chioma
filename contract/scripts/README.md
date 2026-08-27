# Deployment Scripts

Deploy Chioma Soroban contracts to [Stellar testnet](https://developers.stellar.org/docs/build/smart-contracts/getting-started/deploy-to-testnet).

## Prerequisites

1. [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli) (`stellar` 23.x)
2. Rust toolchain (used by `stellar contract build`)
3. A testnet identity with XLM (Friendbot funds it automatically)

## Quick start

```bash
cd contract

# Optional: use your existing identity
export DEPLOYER_KEY=caxton

# Build, deploy all 8 contracts, initialize, write .env.testnet
chmod +x scripts/deploy-testnet.sh scripts/verify-deployment.sh
./scripts/deploy-testnet.sh

# Smoke-test on-chain
./scripts/verify-deployment.sh
```

### First-time setup (manual)

```bash
stellar keys generate testnet-deployer --network testnet
stellar keys fund testnet-deployer --network testnet
```

## `deploy-testnet.sh`

| Flag            | Description                                        |
| --------------- | -------------------------------------------------- |
| `--skip-build`  | Use existing `target/wasm32v1-none/release/*.wasm` |
| `--skip-fund`   | Skip Friendbot funding                             |
| `--deploy-only` | Deploy only; skip `initialize` calls               |
| `--init-only`   | Initialize from existing `.env.testnet`            |

**Environment variables**

| Variable            | Default                        | Description                 |
| ------------------- | ------------------------------ | --------------------------- |
| `DEPLOYER_KEY`      | `testnet-deployer`             | CLI identity that signs txs |
| `NETWORK`           | `testnet`                      | Network name in CLI config  |
| `PLATFORM_FEE_BPS`  | `500`                          | Chioma `fee_bps` (5%)       |
| `MIN_DISPUTE_VOTES` | `3`                            | Dispute resolution quorum   |
| `WASM_DIR`          | `target/wasm32v1-none/release` | Built WASM location         |
| `ENV_FILE`          | `.env.testnet`                 | Output contract IDs         |

**Deploy order:** `user_profile` → `property_registry` → `agent_registry` → `rent_obligation` → `escrow` → `payment` → `dispute_resolution` → `chioma`

**Init order:** same through `payment`, then `chioma`, then `dispute_resolution` (needs `CHIOMA_CONTRACT_ID`).

**Output:** `.env.testnet` with `*_CONTRACT_ID` variables for the frontend/backend.

## `deploy-mainnet.sh`

Safety-focused wrapper around `deploy-testnet.sh` for Stellar mainnet (pubnet). See
[docs/deployment/MAINNET_DEPLOYMENT.md](../docs/deployment/MAINNET_DEPLOYMENT.md)
for the full runbook and the Production Launch Gate that must be satisfied first.

```bash
cd contract
./scripts/deploy-mainnet.sh --confirm
```

Unlike hand-running `deploy-testnet.sh` with mainnet env vars, this script:

- refuses to run without `--confirm` **and** a typed `DEPLOY TO MAINNET`
  confirmation (or `$CONFIRM_PHRASE` in non-interactive shells)
- never auto-generates a deployer identity — mainnet keys must already exist
  and be hardware-backed / offline
- always passes `--skip-fund` (mainnet has no Friendbot)
- refuses a dirty git tree by default (`--allow-dirty` to override, not recommended)
- appends the commit, deployer, and every deployed contract ID to
  `docs/deployment/MAINNET_DEPLOYMENTS.log`
- automatically runs `verify-deployment.sh` against mainnet once deploy completes

| Flag            | Description                                        |
| --------------- | --------------------------------------------------- |
| `--confirm`     | Required, or the script exits immediately            |
| `--skip-build`  | Use existing `target/wasm32v1-none/release/*.wasm`  |
| `--deploy-only` | Deploy only; skip `initialize` calls                |
| `--init-only`   | Initialize from existing `.env.mainnet`             |
| `--allow-dirty` | Bypass the clean-git-tree check (NOT recommended)   |

## `verify-deployment.sh`

Loads `.env.testnet` (or `.env.mainnet` via `ENV_FILE`), checks each contract exists on the target network, and runs read-only `invoke` smoke tests.

## Troubleshooting

- **Missing WASM:** run `./scripts/deploy-testnet.sh` without `--skip-build`, or `env -u CARGO_TARGET_DIR stellar contract build` from `contract/`.
- **Insufficient balance:** `stellar keys fund $DEPLOYER_KEY --network testnet`
- **Init auth errors:** ensure `DEPLOYER_KEY` is the same identity used as `--admin` / `--collector`.
- **Rate limits:** re-run with `--init-only` after deploy succeeds.

See also: [docs/deployment/TESTNET_DEPLOYMENT.md](../docs/deployment/TESTNET_DEPLOYMENT.md) and [docs/deployment/MAINNET_DEPLOYMENT.md](../docs/deployment/MAINNET_DEPLOYMENT.md)
