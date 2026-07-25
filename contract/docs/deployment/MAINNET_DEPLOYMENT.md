# Mainnet Deployment Guide

This guide walks through deploying the Chioma Soroban contracts to the Stellar
**public network (pubnet / mainnet)**, where they hold and move **real tenant,
landlord, and guest funds** through the `escrow` and `payment` contracts.

> **Read this first.** Mainnet is not "testnet with a different flag." Bugs are
> irreversible and can cause permanent fund loss. Deployment is gated behind a
> **hard launch gate** (see [Production Launch Gate](#production-launch-gate)):
> the deployment **MUST NOT** proceed until an independent security audit of at
> least the `escrow` and `payment` contracts is complete. See
> [../security/AUDIT.md](../security/AUDIT.md).

---

## Table of Contents

1. [Production Launch Gate (hard blockers)](#production-launch-gate)
2. [What changes from testnet](#what-changes-from-testnet)
3. [Prerequisites](#prerequisites)
4. [Key custody and admin model](#key-custody-and-admin-model)
5. [Pre-deployment checklist](#pre-deployment-checklist)
6. [Deployment procedure](#deployment-procedure)
7. [Post-deployment hardening](#post-deployment-hardening)
8. [Verification](#verification)
9. [Upgrade governance](#upgrade-governance)
10. [Rollback and pause plan](#rollback-and-pause-plan)
11. [Monitoring](#monitoring)
12. [References](#references)

---

## Production Launch Gate

Mainnet deployment is **blocked** until every item below is satisfied. Treat a
missing audit as a **hard blocker**, not a nice-to-have.

- [ ] **Independent security audit complete** for at least `escrow` and
      `payment`, all Critical/High findings resolved, and the report published
      per [../security/AUDIT.md](../security/AUDIT.md). **No audit ⇒ no mainnet.**
- [ ] This `MAINNET_DEPLOYMENT.md` runbook has been reviewed and dry-run on
      testnet by at least two team members.
- [ ] Admin key custody is a hardware wallet or multisig — **never** a plain
      secret key sitting in an env var on a server (see
      [Key custody and admin model](#key-custody-and-admin-model)).
- [ ] The [Pre-deployment checklist](#pre-deployment-checklist) is fully green.
- [ ] Incident response is ready: pause keys accessible, monitoring live, and
      the [../security/EMERGENCY-PROCEDURES.md](../security/EMERGENCY-PROCEDURES.md)
      runbook rehearsed on testnet within the last quarter.

If any box is unchecked, **stop**. Do not deploy contracts that hold real funds.

---

## What changes from testnet

The testnet flow ([TESTNET_DEPLOYMENT.md](./TESTNET_DEPLOYMENT.md),
[../../scripts/deploy-testnet.sh](../../scripts/deploy-testnet.sh)) and the
mainnet flow share the same build, deploy order, and initialization calls. Only
the environment and the key-handling change. Every value that differs is
captured in [`.env.mainnet.example`](../../.env.mainnet.example).

| Setting | Testnet | Mainnet (pubnet) |
| --- | --- | --- |
| Network name (CLI config) | `testnet` | `mainnet` |
| Network passphrase | `Test SDF Network ; September 2015` | `Public Global Stellar Network ; September 2015` |
| RPC URL | `https://soroban-testnet.stellar.org:443` | A production RPC you control or trust (self-hosted, or a provider such as Blockdaemon / Validation Cloud / QuickNode). **There is no free "Friendbot" RPC for mainnet.** |
| Account funding | Friendbot (free) | Fund the deployer with **real XLM** — Friendbot does **not** exist on mainnet. Run the deploy with `--skip-fund`. |
| Deployer key | Locally generated CLI identity | Hardware-backed / offline signer, ideally handed off to a multisig immediately after init |
| Admin address | Deployer public key | **Multisig** (see [Key custody and admin model](#key-custody-and-admin-model)) |
| `ENV_FILE` | `.env.testnet` | `.env.mainnet` (populated from `.env.mainnet.example`) |
| Contract aliases | `chioma_testnet_*` | `chioma_mainnet_*` |
| `PLATFORM_FEE_BPS` / `MIN_DISPUTE_VOTES` | dev defaults (`500` / `3`) | production-reviewed values, sign-off required |

---

## Prerequisites

- **Stellar CLI 23.x** (`stellar`) — install from
  <https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli>.
  (Older docs may say `soroban`; the current tooling used by this repo's scripts
  is the `stellar` binary.)
- **Rust toolchain** with the `wasm32v1-none` target used by
  `stellar contract build`.
- A **funded mainnet account** to act as deployer, held in a hardware wallet or
  otherwise offline. See [Key custody](#key-custody-and-admin-model).
- The **audited** WASM commit checked out (the exact commit hash covered by the
  audit report — do not deploy code the auditors did not see).

Configure the mainnet network in the CLI once:

```bash
stellar network add mainnet \
  --rpc-url "<YOUR_MAINNET_RPC_URL>" \
  --network-passphrase "Public Global Stellar Network ; September 2015"
```

---

## Key custody and admin model

The `escrow` and `payment` contracts control real funds, and the `chioma`
contract can `pause` the whole protocol. Whoever holds admin controls those
powers, so admin custody is the single most important decision here.

**Rules for mainnet:**

1. **No plain secret keys on servers.** The deployer identity must be backed by
   a hardware wallet / offline signer. Never place a mainnet `S...` secret in
   `.env.mainnet`, CI, or any always-on host. `.env.mainnet` holds **only**
   public contract IDs and non-secret config.
2. **Admin = multisig.** Each contract exposes admin management; use it to move
   admin off the single deployer key and onto a multisig:
   - `chioma`: `initialize_multisig`, then `add_admin` / `remove_admin`
     (`is_admin` to verify). Upgrades go through
     `propose_contract_upgrade` → `approve_contract_upgrade` →
     `execute_contract_upgrade` and `get_multisig_config`.
   - `escrow`: `set_admin` / `update_admin` (`get_admin` to verify), multi-party
     release approvals (`approve_release`, `approve_partial_release`), and
     `freeze_escrow` / `unfreeze_escrow` for incident response.
   - `user_profile`, `property_registry`, `agent_registry`: `initialize --admin`
     with the multisig address.
   - `dispute_resolution`: `initialize --admin <multisig> --min_votes_required N`.
3. **Separate roles.** The `payment` fee collector, the protocol admin, and the
   pause operator should not all be the same single key.
4. **Keep keys offline** and rehearse a pause/unpause drill on testnet quarterly
   (see [../security/EMERGENCY-PROCEDURES.md](../security/EMERGENCY-PROCEDURES.md)
   §7).

---

## Pre-deployment checklist

- [ ] [Production Launch Gate](#production-launch-gate) fully satisfied (audit done).
- [ ] Deploying from the **exact commit** covered by the audit; `git status` clean.
- [ ] `cargo test` green and `./check-all.sh` passes on that commit.
- [ ] `stellar contract build` produces the 8 expected WASM artifacts.
- [ ] `.env.mainnet` created from `.env.mainnet.example`, reviewed, **contains no secrets**.
- [ ] Mainnet RPC endpoint reachable and healthy.
- [ ] Deployer account funded with enough XLM for 8 deploys + init txs + reserves.
- [ ] Multisig address(es) provisioned and tested on testnet.
- [ ] `PLATFORM_FEE_BPS` and `MIN_DISPUTE_VOTES` confirmed and signed off.
- [ ] Monitoring/alerting for `Paused`, `Unpaused`, and rate-limit events wired up.
- [ ] Rollback/pause runbook printed and on-hand ([Rollback and pause plan](#rollback-and-pause-plan)).

---

## Deployment procedure

The repo's deploy script,
[`scripts/deploy-testnet.sh`](../../scripts/deploy-testnet.sh), is
network-parameterized (`NETWORK`, `DEPLOYER_KEY`, `ENV_FILE`, `ALIAS_PREFIX`,
`PLATFORM_FEE_BPS`, `MIN_DISPUTE_VOTES`) and can drive a mainnet deploy. The
critical differences are `--skip-fund` (no Friendbot on mainnet) and a
hardware-backed `DEPLOYER_KEY`.

The **deploy order** (no cross-contract WASM deps) and **init order** are the
same as testnet:

**Deploy:** `user_profile` → `property_registry` → `agent_registry` →
`rent_obligation` → `escrow` → `payment` → `dispute_resolution` → `chioma`

**Init:** same through `payment`, then `chioma`, then `dispute_resolution`
(needs `CHIOMA_CONTRACT_ID`).

### Option A — scripted (recommended for reproducibility)

Only use this if `DEPLOYER_KEY` is a hardware/offline signer that the `stellar`
CLI can drive; the script never handles a raw secret itself.

```bash
cd contract

# Build the audited commit
env -u CARGO_TARGET_DIR stellar contract build

# Deploy + initialize on mainnet.
NETWORK=mainnet \
DEPLOYER_KEY=<mainnet-hardware-identity> \
ENV_FILE=.env.mainnet \
ALIAS_PREFIX=chioma_mainnet \
PLATFORM_FEE_BPS=500 \
MIN_DISPUTE_VOTES=3 \
  ./scripts/deploy-testnet.sh --skip-fund
```

The script writes each deployed `*_CONTRACT_ID` into `.env.mainnet` and runs the
per-contract initializers with `--admin` set to the deployer's public key.
**Immediately** hand off admin to the multisig — see
[Post-deployment hardening](#post-deployment-hardening).

### Option B — manual, one contract at a time

Prefer this when each transaction must be individually reviewed and
hardware-signed. It mirrors the initializers in
[`deploy-testnet.sh`](../../scripts/deploy-testnet.sh) but on mainnet.

```bash
# Example: deploy one contract
stellar contract deploy \
  --wasm target/wasm32v1-none/release/escrow.wasm \
  --source-account <mainnet-hardware-identity> \
  --network mainnet \
  --alias chioma_mainnet_escrow
# → record the returned C... id into .env.mainnet
```

Initializers (admin = your multisig where the call takes an admin):

| Contract | Initialization call |
| --- | --- |
| `user_profile` | `initialize --admin <MULTISIG>` |
| `property_registry` | `initialize --admin <MULTISIG>` |
| `agent_registry` | `initialize --admin <MULTISIG>` |
| `rent_obligation` | `initialize` |
| `escrow` | `initialize_admin --admin <MULTISIG>` |
| `payment` | `set_platform_fee_collector --collector <FEE_COLLECTOR>` |
| `chioma` | `initialize --admin <MULTISIG> --config '{"fee_bps": 500, "fee_collector": "<FEE_COLLECTOR>", "paused": false}'` |
| `dispute_resolution` | `initialize --admin <MULTISIG> --min_votes_required 3 --chioma_contract <CHIOMA_CONTRACT_ID>` |

Example invoke:

```bash
stellar contract invoke \
  --id <ESCROW_CONTRACT_ID> \
  --source-account <mainnet-hardware-identity> \
  --network mainnet \
  --send yes \
  -- initialize_admin --admin <MULTISIG_ADDRESS>
```

---

## Post-deployment hardening

Immediately after init, before announcing or routing any user funds:

1. **Transfer admin to the multisig** if init used the single deployer key:
   - `chioma`: `initialize_multisig`, then `add_admin <multisig-member>` for
     each signer and `remove_admin` the bootstrap key; verify with `is_admin`
     and `get_multisig_config`.
   - `escrow`: `set_admin` / `update_admin` to the multisig; verify `get_admin`.
2. **Record the deployed version** so upgrades/rollbacks are auditable:
   `record_version` (and later `update_version_status` to `Deprecated` /
   `Revoked`); verify with `get_version` / `get_version_history`.
3. **Confirm `paused = false`** where expected and that pause works: run a
   `pause`/`unpause` dry run through the multisig on a low-risk window.
4. **Commit `.env.mainnet`** (public IDs only) so the frontend/backend can
   consume the addresses. Double-check no secret leaked in.

---

## Verification

Reuse [`scripts/verify-deployment.sh`](../../scripts/verify-deployment.sh)
against mainnet — it checks on-chain presence and runs read-only smoke tests:

```bash
cd contract
NETWORK=mainnet ENV_FILE=.env.mainnet DEPLOYER_KEY=<mainnet-hardware-identity> \
  ./scripts/verify-deployment.sh
```

Manual spot checks:

```bash
stellar contract info --id <CONTRACT_ID> --network mainnet
stellar contract invoke --id <CHIOMA_CONTRACT_ID> --network mainnet \
  --source-account <identity> --send no -- get_state
stellar contract invoke --id <CHIOMA_CONTRACT_ID> --network mainnet \
  --source-account <identity> --send no -- is_paused
```

Confirm: admin is the multisig (`is_admin` / `get_admin` / `get_multisig_config`),
version recorded (`get_version`), and fee config matches sign-off (`get_state`).

---

## Upgrade governance

Contract upgrades on mainnet go through the on-chain multisig proposal flow, not
an ad-hoc admin call. See [UPGRADES.md](./UPGRADES.md) for strategy (proxy vs.
replacement, migration, testing) and:

- `propose_contract_upgrade` → `approve_contract_upgrade`
  (quorum per `get_multisig_config`) → `execute_contract_upgrade`.
- `escrow` mirrors this with `propose_upgrade` / `approve_upgrade` /
  `execute_upgrade`.
- Record every change with `record_version` / `update_version_status`.

**Every mainnet upgrade must be tested on testnet first** and, if it touches
fund-handling logic in `escrow`/`payment`, **re-audited** per
[../security/AUDIT.md](../security/AUDIT.md).

---

## Rollback and pause plan

If a bug is found post-deploy, follow
[../security/EMERGENCY-PROCEDURES.md](../security/EMERGENCY-PROCEDURES.md). In
short:

1. **Pause immediately.** `chioma pause --reason "<incident>"` halts booking,
   payment, escrow, and token-management entrypoints (`is_paused` to confirm).
   For a single stuck deposit, `escrow freeze_escrow` isolates it.
2. **Assess** on a block explorer / RPC: which agreements, escrows, balances are
   affected.
3. **Fix and upgrade** via the [Upgrade governance](#upgrade-governance) flow,
   after testnet validation (and re-audit if funds logic changed).
4. **Roll back** if needed using the procedures in
   [UPGRADES.md](./UPGRADES.md) §4 (proxy rollback to previous implementation,
   or reference restore), then `update_version_status` the bad version to
   `Revoked`.
5. **Unpause and monitor** once verified.

Keep the previous WASM/implementation and its recorded version available so a
rollback can be executed quickly.

---

## Monitoring

- Alert on `Paused` / `Unpaused` events and on rate-limit / circuit-breaker
  events (`events::rate_limit_exceeded`) — see
  [../security/EMERGENCY-PROCEDURES.md](../security/EMERGENCY-PROCEDURES.md) §2.
- Watch escrow release / dispute-timeout events (`EscrowTimeout`,
  `DisputeTimeout`).
- Track deployer/multisig XLM balances so admin operations never fail for lack
  of fees.

---

## References

- [TESTNET_DEPLOYMENT.md](./TESTNET_DEPLOYMENT.md) — testnet dry-run of this flow
- [UPGRADES.md](./UPGRADES.md) — upgrade strategy, migration, rollback
- [../security/AUDIT.md](../security/AUDIT.md) — audit requirement and status (launch gate)
- [../security/EMERGENCY-PROCEDURES.md](../security/EMERGENCY-PROCEDURES.md) — pause & incident response
- [../../scripts/README.md](../../scripts/README.md) — deploy & verify scripts
- [`.env.mainnet.example`](../../.env.mainnet.example) — mainnet config template
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli)
