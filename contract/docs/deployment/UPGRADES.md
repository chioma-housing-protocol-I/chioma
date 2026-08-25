# Coordinated Upgrade & Admin Rotation Guide

This document replaces per-contract upgrade guidance and describes the
**single, authoritative process** for upgrading and rotating admin keys across
all eight Chioma protocol contracts.

---

## Table of Contents

1. [Architecture overview](#1-architecture-overview)
2. [Upgrade Registry contract](#2-upgrade-registry-contract)
3. [Upgrading a contract](#3-upgrading-a-contract)
4. [Admin key rotation](#4-admin-key-rotation)
5. [Protocol status dashboard](#5-protocol-status-dashboard)
6. [Per-contract quirks](#6-per-contract-quirks)
7. [Acceptance checklist](#7-acceptance-checklist)
8. [Rollback](#8-rollback)
9. [Incident response — compromised key](#9-incident-response--compromised-key)

---

## 1. Architecture overview

The protocol consists of eight Soroban contracts:

| Contract | Env var | Admin storage | Upgrade module |
|---|---|---|---|
| `user_profile` | `USER_PROFILE_CONTRACT_ID` | `DataKey::Admin` | `upgrade.rs` |
| `property_registry` | `PROPERTY_REGISTRY_CONTRACT_ID` | `DataKey::State.admin` | `upgrade.rs` |
| `agent_registry` | `AGENT_REGISTRY_CONTRACT_ID` | `DataKey::State.admin` | `upgrade.rs` |
| `rent_obligation` | `RENT_OBLIGATION_CONTRACT_ID` | none | `upgrade.rs` |
| `escrow` | `ESCROW_CONTRACT_ID` | `DataKey::SystemAdmin` | `upgrade.rs` |
| `payment` | `PAYMENT_CONTRACT_ID` | fee collector only | `upgrade.rs` |
| `dispute_resolution` | `DISPUTE_RESOLUTION_CONTRACT_ID` | `DataKey::State.admin` | `upgrade.rs` |
| `chioma` | `CHIOMA_CONTRACT_ID` | `DataKey::State.admin` + MultiSigConfig | inline in `lib.rs` |

A ninth contract, **`upgrade_registry`**, is the coordination layer:

```
contract/contracts/upgrade_registry/
├── src/lib.rs        — on-chain registry contract
├── src/types.rs      — ContractRecord, AdminRotationProposal, ProtocolContractStatus
├── src/storage.rs    — DataKey enum + helpers
├── src/errors.rs     — RegistryError
└── src/events.rs     — on-chain events
```

The `upgrade_registry` contract is **not** a proxy; it does not sit in the call
path of normal protocol transactions.  It is purely an administrative bookkeeping
contract that records the current admin address and deployed version of every
other contract, and gates coordinated admin rotation proposals behind M-of-N
approval.

---

## 2. Upgrade Registry contract

### 2.1 Deployment

Deploy once per environment (testnet / mainnet) alongside the other eight contracts.

```bash
# Build
stellar contract build

# Deploy
REGISTRY_ID=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/upgrade_registry.wasm \
  --source-account testnet-deployer \
  --network testnet)

echo "UPGRADE_REGISTRY_CONTRACT_ID=${REGISTRY_ID}" >> .env.testnet

# Initialize (1-of-1 for testnet; use 2-of-3 for mainnet)
ADMIN=$(stellar keys public-key testnet-deployer)
stellar contract invoke \
  --id "$REGISTRY_ID" \
  --source-account testnet-deployer \
  --network testnet \
  --send yes \
  -- initialize \
  --primary_admin "$ADMIN" \
  --admins "[\"$ADMIN\"]" \
  --required_approvals 1
```

For mainnet use a multi-sig setup:

```bash
stellar contract invoke \
  --id "$REGISTRY_ID" \
  --source-account mainnet-deployer \
  --network mainnet \
  --send yes \
  -- initialize \
  --primary_admin "$ADMIN_1" \
  --admins "[\"$ADMIN_1\",\"$ADMIN_2\",\"$ADMIN_3\"]" \
  --required_approvals 2
```

### 2.2 Register all 8 contracts

Run immediately after deploying and initializing all protocol contracts (the
`deploy-testnet.sh` script will do this automatically once updated).

```bash
source .env.testnet
ADMIN=$(stellar keys public-key testnet-deployer)

for contract_name \
  in user_profile property_registry agent_registry rent_obligation \
     escrow payment dispute_resolution chioma; do

  var="${contract_name^^}_CONTRACT_ID"
  contract_id="${!var}"

  stellar contract invoke \
    --id "$UPGRADE_REGISTRY_CONTRACT_ID" \
    --source-account testnet-deployer \
    --network testnet \
    --send yes \
    -- register_contract \
    --caller "$ADMIN" \
    --name "$contract_name" \
    --contract_id "$contract_id" \
    --admin "$ADMIN" \
    --version "1.0.0" \
    --notes "initial deployment"
done
```

### 2.3 Read the protocol status

```bash
stellar contract invoke \
  --id "$UPGRADE_REGISTRY_CONTRACT_ID" \
  --source-account testnet-deployer \
  --network testnet \
  --send no \
  -- get_protocol_status
```

Returns a `Vec<ProtocolContractStatus>` — one entry per registered contract —
containing `name`, `contract_id`, `admin`, `version`, and `last_updated`.

---

## 3. Upgrading a contract

Use the `coordinated-upgrade.sh` script for **all** upgrades.  Do not invoke
per-contract upgrade functions directly without going through this script,
because direct invocations bypass the registry bookkeeping step.

### 3.1 Quick reference

```bash
# From contract/
./scripts/coordinated-upgrade.sh \
  <contract_name> \
  <path/to/new.wasm> \
  <new_version_string> \
  [--delay 86400] \
  [--notes "Bug fix: ..."] \
  [--dry-run]
```

Examples:

```bash
# Upgrade escrow, dry-run first
./scripts/coordinated-upgrade.sh escrow \
  target/wasm32v1-none/release/escrow.wasm 1.2.1 \
  --notes "Fix partial-release overflow" \
  --dry-run

# Upgrade chioma with a 48-hour timelock
./scripts/coordinated-upgrade.sh chioma \
  target/wasm32v1-none/release/chioma.wasm 2.0.0 \
  --delay 172800 \
  --notes "v2: add multi-token support"
```

### 3.2 What the script does

```
Step 0 — Print get_protocol_status table, ask for confirmation
Step 1 — stellar contract install → WASM hash
Step 2 — propose_upgrade / propose_contract_upgrade on the target contract
Step 3 — (pauses) Print approval command for co-signers; wait for ENTER
Step 4 — (optional) execute_upgrade / execute_contract_upgrade
Step 5 — update_version in Upgrade Registry
Step 6 — verify-deployment.sh smoke test
```

### 3.3 Multi-contract upgrades (protocol version bump)

When multiple contracts must be upgraded together (e.g. a breaking API change
between `chioma` and `dispute_resolution`):

1. Run `coordinated-upgrade.sh` for each contract with `--delay 86400`
   so all timelocks expire at roughly the same time.
2. Wait for all timelocks to pass.
3. Execute all upgrades in dependency order (see `deploy-testnet.sh`
   `INIT_CONTRACTS` array for the correct order).
4. Run `./scripts/verify-deployment.sh` to confirm all contracts are healthy.
5. The registry will reflect the new versions after each `update_version` call.

### 3.4 Chioma vs peripheral contracts

`chioma` uses a richer upgrade path:

| | `chioma` | Other 7 contracts |
|---|---|---|
| Propose fn | `propose_contract_upgrade` | `propose_upgrade` |
| Approve fn | `approve_contract_upgrade` | `approve_upgrade` |
| Execute fn | `execute_contract_upgrade` | `execute_upgrade` |
| Multi-sig enforced | ✅ (`required_signatures` from MultiSigConfig) | ⚠ threshold hardcoded to 1 |
| Version history | ✅ stored on-chain | ❌ only in registry |
| Cancelled flag | ✅ | ❌ |

The `coordinated-upgrade.sh` script handles this distinction automatically.

---

## 4. Admin key rotation

### 4.1 When to rotate

- Suspected or confirmed compromise of any admin key.
- Planned key rotation per your security policy (e.g. quarterly).
- Team member offboarding.

### 4.2 Using the rotate-admin.sh script

```bash
# Rotate all 8 contracts
./scripts/rotate-admin.sh <NEW_ADMIN_ADDRESS> \
  --notes "Q3 rotation — see incident ticket #123"

# Rotate a subset
./scripts/rotate-admin.sh <NEW_ADMIN_ADDRESS> \
  --contracts "escrow,payment,chioma"

# Dry-run
./scripts/rotate-admin.sh <NEW_ADMIN_ADDRESS> --dry-run
```

### 4.3 What the script does

```
Step 1 — propose_rotation in Upgrade Registry (M-of-N governance gate)
          Pauses for co-signer approvals if required_approvals > 1
Step 2 — Call set_admin / set_platform_fee_collector per contract
          (see §6 for per-contract notes)
Step 3 — update_admin in Upgrade Registry for each succeeded contract
Step 4 — execute_rotation to close the proposal in the registry
```

### 4.4 Per-contract admin rotation commands

Because admin management is inconsistent across the 8 contracts, the table
below shows the exact call required for each:

| Contract | Admin rotation call | Notes |
|---|---|---|
| `user_profile` | add `set_admin(caller, new_admin)` function | No direct setter exists yet — see §6.1 |
| `property_registry` | add `set_admin(caller, new_admin)` function | §6.1 |
| `agent_registry` | add `set_admin(caller, new_admin)` function | §6.1 |
| `dispute_resolution` | add `set_admin(caller, new_admin)` function | §6.1 |
| `escrow` | `set_admin(caller, new_admin)` | Must be added — §6.2 |
| `payment` | `set_platform_fee_collector(collector)` | Already exposed |
| `rent_obligation` | N/A | No admin stored |
| `chioma` | `propose_action(AddAdmin, new_admin)` + `execute_action` | Multi-sig governed |

#### Manual rotation for `chioma` (multi-sig)

```bash
source .env.testnet
ADMIN=$(stellar keys public-key testnet-deployer)

# 1. Propose adding new admin
stellar contract invoke \
  --id "$CHIOMA_CONTRACT_ID" \
  --source-account testnet-deployer \
  --network testnet \
  --send yes \
  -- propose_action \
  --proposer "$ADMIN" \
  --action_type "AddAdmin" \
  --target "$NEW_ADMIN" \
  --data ""

# 2. Co-signers approve (one per required signature)
# stellar contract invoke ... -- approve_action --approver <addr> --proposal_id <id>

# 3. Execute
stellar contract invoke \
  --id "$CHIOMA_CONTRACT_ID" \
  --source-account testnet-deployer \
  --network testnet \
  --send yes \
  -- execute_action \
  --executor "$ADMIN" \
  --proposal_id <PROPOSAL_ID>

# 4. Optionally remove old admin
# (repeat propose_action / execute_action with action_type = "RemoveAdmin")

# 5. Update registry
stellar contract invoke \
  --id "$UPGRADE_REGISTRY_CONTRACT_ID" \
  --source-account testnet-deployer \
  --network testnet \
  --send yes \
  -- update_admin \
  --caller "$ADMIN" \
  --name "chioma" \
  --new_admin "$NEW_ADMIN"
```

### 4.5 Propagation checklist

After running `rotate-admin.sh`, verify:

- [ ] `get_protocol_status` shows the new admin for every rotated contract
- [ ] The old admin key can no longer call admin-gated functions (test with `--dry-run` / `--send no`)
- [ ] `verify-deployment.sh` passes
- [ ] The rotation proposal in the registry shows `executed: true`

---

## 5. Protocol status dashboard

The single-call dashboard query:

```bash
stellar contract invoke \
  --id "$UPGRADE_REGISTRY_CONTRACT_ID" \
  --source-account testnet-deployer \
  --network testnet \
  --send no \
  -- get_protocol_status
```

Returns for each registered contract:

```json
[
  {
    "name": "chioma",
    "contract_id": "C...",
    "admin": "G...",
    "version": "2.0.0",
    "last_updated": 1234567890
  },
  ...
]
```

Run this before every upgrade or rotation to confirm the current state is as
expected and check for admin drift between contracts.

### 5.1 Cross-checking admin consistency

All contracts that share an admin should show the same `admin` value.
If they diverge, investigate before proceeding with any upgrade.

```bash
stellar contract invoke \
  --id "$UPGRADE_REGISTRY_CONTRACT_ID" \
  --source-account testnet-deployer \
  --network testnet \
  --send no \
  -- get_protocol_status \
  | python3 -c "
import sys, json
records = json.load(sys.stdin)
admins = {r['admin'] for r in records if r['name'] != 'rent_obligation'}
if len(admins) > 1:
    print('WARNING: admin mismatch detected')
    for r in records:
        print(f'  {r[\"name\"]}: {r[\"admin\"]}')
else:
    print('OK: all contracts share the same admin')
"
```

---

## 6. Per-contract quirks

### 6.1 Missing set_admin functions

`user_profile`, `property_registry`, `agent_registry`, and `dispute_resolution`
store their admin in `ContractState` but do not currently expose a `set_admin`
function in their public ABI.  Until one is added, admin rotation for these
contracts must be done by deploying a new version that accepts the new admin
address during initialization — which means a full replacement upgrade, not
an in-place WASM swap.

**Recommended fix**: Add the following to each contract's `lib.rs`:

```rust
/// Rotate the contract admin (current admin only).
pub fn set_admin(env: Env, caller: Address, new_admin: Address) -> Result<(), /* Error */> {
    caller.require_auth();
    let mut state = /* get state */;
    if caller != state.admin {
        return Err(/* Unauthorized */);
    }
    state.admin = new_admin;
    env.storage().instance().set(&DataKey::State, &state);
    env.storage().instance().extend_ttl(500_000, 500_000);
    Ok(())
}
```

Track this as a follow-up issue.

### 6.2 Escrow has no set_admin

`escrow` stores admin at `DataKey::SystemAdmin` but exposes no setter.
Add a `set_admin(caller, new_admin)` function guarded by the current system admin.

### 6.3 rent_obligation has no admin concept

`rent_obligation` is initialized with no arguments and stores no admin.
No admin rotation applies.  Upgrades still go through the normal
`propose_upgrade` / `execute_upgrade` flow but with any authorized caller.

### 6.4 payment has no admin concept beyond fee collector

`payment` uses `set_platform_fee_collector` as its admin-equivalent operation.
Admin rotation for `payment` = calling `set_platform_fee_collector` with the
new address.

### 6.5 required_signatures hardcoded to 1 in peripheral contracts

Six of the seven peripheral `upgrade.rs` files set `required_signatures: 1`
unconditionally.  This means propose + execute by a single admin is enough,
regardless of how many admins exist.  This is intentional for simplicity but
means there is no multi-sig check on these upgrades.  If you need multi-sig
enforcement, either:

- Gate the upgrade via a `chioma` multi-sig proposal that calls
  `execute_upgrade` on the target as a cross-contract call, or
- Amend the peripheral `upgrade.rs` to read `required_signatures` from a
  stored config (follow the `chioma` pattern).

### 6.6 Actual WASM update not called

The current `execute_upgrade` implementations record state but do not call
`env.deployer().update_current_contract_wasm(wasm_hash)`.  This means the
proposal workflow is correctly gated but the actual bytecode swap is a
**separate** step that must be done via `stellar contract upgrade`:

```bash
stellar contract upgrade \
  --id "$CONTRACT_ID" \
  --source-account testnet-deployer \
  --network testnet \
  --wasm-hash "$WASM_HASH"
```

The `coordinated-upgrade.sh` script documents where to insert this call
(between Steps 3 and 4) once the contracts expose a native upgrade primitive.

---

## 7. Acceptance checklist

### Before upgrading

- [ ] `get_protocol_status` printed and reviewed — no unexpected admin or version drift
- [ ] New WASM compiled from a tagged commit
- [ ] All tests passing locally (`cargo test`)
- [ ] Security review completed for the diff
- [ ] Upgrade tested on a local sandbox with `stellar contract simulate`
- [ ] Rollback plan documented (previous WASM hash saved)
- [ ] Communication plan ready for any user-facing impact

### After upgrading

- [ ] `verify-deployment.sh` passes (all 8 contracts respond)
- [ ] `get_protocol_status` shows expected new version
- [ ] Admin for upgraded contract unchanged (or correctly rotated)
- [ ] Protocol smoke tests pass end-to-end
- [ ] Version recorded in the registry via `update_version`
- [ ] Upgrade proposal shows `executed: true`

---

## 8. Rollback

### 8.1 WASM rollback

Keep the previous WASM hash in your upgrade notes.  To roll back:

```bash
# Re-upload the old WASM (or reuse its hash if still on-chain)
OLD_HASH="<previous wasm hash>"

stellar contract upgrade \
  --id "$CONTRACT_ID" \
  --source-account testnet-deployer \
  --network testnet \
  --wasm-hash "$OLD_HASH"

# Update the registry to reflect the rollback
stellar contract invoke \
  --id "$UPGRADE_REGISTRY_CONTRACT_ID" \
  --source-account testnet-deployer \
  --network testnet \
  --send yes \
  -- update_version \
  --caller "$ADMIN" \
  --name "$CONTRACT_NAME" \
  --new_version "<previous_version>" \
  --notes "Rollback from <new_version> due to <reason>"
```

### 8.2 State rollback

State is stored on-chain and cannot be rolled back by reverting the WASM.  If
a bad upgrade corrupts state, a migration contract or a replacement deployment
with state export/import is required (see the Soroban state migration patterns
in the original UPGRADES.md for reference code).

---

## 9. Incident response — compromised key

If an admin key is suspected compromised:

1. **Pause** — Call `chioma.pause()` immediately to halt user-facing operations.
   For other contracts that support it, pause them too.

2. **Assess** — Run `get_protocol_status` to see which contracts the compromised
   key is admin on.  Check on-chain events for any unauthorized transactions.

3. **Rotate** — Run `rotate-admin.sh <NEW_SAFE_ADDRESS>`.  For multi-sig
   contracts where the compromised key is one of multiple admins, the remaining
   admins can propose and execute a `RemoveAdmin` action.

4. **Verify** — Run `get_protocol_status` and confirm the compromised address
   is no longer the admin on any contract.

5. **Audit** — Review all on-chain transactions since the suspected compromise
   timestamp.  Check upgrade proposals and admin action proposals for any that
   were executed by the compromised key.

6. **Unpause** — Once the rotation is verified, call `chioma.unpause()`.

7. **Document** — Record the incident, timeline, and remediation steps.

---

## References

- [Soroban CLI reference](https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli)
- [deploy-testnet.sh](../../../scripts/deploy-testnet.sh)
- [coordinated-upgrade.sh](../../../scripts/coordinated-upgrade.sh)
- [rotate-admin.sh](../../../scripts/rotate-admin.sh)
- [verify-deployment.sh](../../../scripts/verify-deployment.sh)
- [upgrade_registry contract](../../../contracts/upgrade_registry/src/lib.rs)
