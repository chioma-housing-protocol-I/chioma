# Security Audit Requirement & Status

**Priority:** CRITICAL (blocks mainnet launch)
**Category:** Security
**Type:** Process / Documentation
**Status:** NOT STARTED — no third-party audit has been performed
**Related:** [MAINNET_DEPLOYMENT.md](../deployment/MAINNET_DEPLOYMENT.md),
[EMERGENCY-PROCEDURES.md](./EMERGENCY-PROCEDURES.md), issue #1327

---

## 1. Policy: audit before real funds

The Chioma Soroban contracts under `contract/contracts/` — in particular
`escrow` (security deposits) and `payment` (rent processing) — hold and move
**real tenant, landlord, and guest funds** once on mainnet. Shipping unaudited
fund-handling code to mainnet is a direct path to irreversible fund loss.

**Policy:** An independent, third-party security audit of at least the `escrow`
and `payment` contracts (and ideally `chioma` and `dispute_resolution`, which
can move funds and pause the protocol) **MUST** be completed, with all
Critical/High findings resolved, **before** any mainnet deployment that handles
real funds. This is enforced as a hard blocker in the
[Production Launch Gate](../deployment/MAINNET_DEPLOYMENT.md#production-launch-gate).

Improved unit-test coverage (issues #1283–#1286), gas optimization (#1290), and
event standardization (#1289) are valuable but **do not** satisfy this
requirement. An external audit is a distinct, more fundamental control.

---

## 2. Current status

| Item                            | Status     |
| ------------------------------- | ---------- |
| Third-party audit commissioned  | ❌ Not yet |
| Audit scope agreed with auditor | ❌ Not yet |
| Audit in progress               | ❌ Not yet |
| Findings remediated             | ❌ N/A     |
| Audit report published          | ❌ Not yet |
| **Cleared for mainnet**         | ❌ **NO**  |

> As of this document, **no third-party security audit exists** for any Chioma
> contract. Mainnet deployment is therefore **blocked**.

---

## 3. Required scope

Minimum scope for a launch-blocking audit:

- **`escrow`** — deposit/fund/release flows (`create`, `fund_escrow`,
  `release_rent`, `release_escrow_partial`, `release_with_deduction`,
  `withdraw_safety_deposit`), multi-party release approvals, dispute paths
  (`initiate_dispute`, `resolve_dispute`), timeout auto-refunds
  (`release_escrow_on_timeout`, `resolve_dispute_on_timeout`), freeze
  (`freeze_escrow` / `unfreeze_escrow`), and admin/RBAC
  (`initialize_admin`, `set_admin`, `update_admin`).
- **`payment`** — rent payment processing, fee collection
  (`set_platform_fee_collector`), splits/royalties, and recurring payments.
- **`chioma`** (recommended) — agreement lifecycle, token handling, the
  emergency `pause` circuit breaker, multisig upgrade governance
  (`initialize_multisig`, `propose_contract_upgrade`,
  `approve_contract_upgrade`, `execute_contract_upgrade`), and rate limiting.
- **`dispute_resolution`** (recommended) — arbitration quorum and timeout
  resolution that can move escrowed funds.

Audit focus areas: authorization/`require_auth` correctness, reentrancy and
cross-contract call safety, integer/rounding errors in fee & interest math,
pause/freeze bypasses, upgrade-authority and multisig-quorum enforcement,
timeout/refund edge cases, and storage/TTL assumptions.

The audit **MUST** be pinned to a specific commit hash, and that **same commit**
must be the one deployed to mainnet (see the
[pre-deployment checklist](../deployment/MAINNET_DEPLOYMENT.md#pre-deployment-checklist)).

---

## 4. Process

1. **Freeze scope** at a commit; ensure `cargo test` and `./check-all.sh` pass.
2. **Engage an auditor.** A reputable independent firm is preferred. If budget
   is a constraint, a documented lightweight/community audit with **public
   disclosure of scope and findings** is better than none — but the scope and
   limitations must be stated openly here.
3. **Remediate** all Critical/High findings; re-review the fixes.
4. **Publish** the report (link it in [Section 6](#6-audit-reports)) and record
   the audited commit hash.
5. **Re-audit on change:** any later change to `escrow`/`payment` fund logic
   before or after launch requires re-review before it reaches mainnet (see
   [MAINNET_DEPLOYMENT.md → Upgrade governance](../deployment/MAINNET_DEPLOYMENT.md#upgrade-governance)).

---

## 5. Pre-audit hardening checklist

Complete before handing code to an auditor (reduces cost and noise):

- [ ] `cargo fmt --all -- --check` clean
- [ ] `cargo clippy --all-targets --all-features -- -D warnings` clean
- [ ] `cargo test` green across all contracts
- [ ] Public entrypoints documented (`contract/docs/contracts/`)
- [ ] Known-limitations / assumptions listed for the auditor
- [ ] Emergency procedures in place ([EMERGENCY-PROCEDURES.md](./EMERGENCY-PROCEDURES.md))

---

## 6. Audit reports

_No audit reports yet._ Once an audit is complete, record it here:

| Date | Auditor | Scope (contracts) | Commit | Report link | Critical/High resolved |
| ---- | ------- | ----------------- | ------ | ----------- | ---------------------- |
| —    | —       | —                 | —      | —           | —                      |

---

## 7. References

- [MAINNET_DEPLOYMENT.md](../deployment/MAINNET_DEPLOYMENT.md) — launch gate
- [EMERGENCY-PROCEDURES.md](./EMERGENCY-PROCEDURES.md) — pause & incident response
- [../architecture/OVERVIEW.md](../architecture/OVERVIEW.md) — system architecture
- [Stellar smart-contract security](https://developers.stellar.org/docs/build/security-docs)
