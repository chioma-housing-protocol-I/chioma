# Chioma Contract Extraction Plan

Design and migration plan for breaking up `contracts/chioma` (13,607 lines, 92 public
entry points across agreement lifecycle, multi-token payments, deposit interest,
royalties, multisig/timelock governance, rate limiting, and gas optimization) into
smaller, independently deployable contracts.

This document is a plan, not an implementation. No contract code changes ship with
it. It exists so the actual extraction can be reviewed and sequenced before anyone
starts moving money-handling code between contracts.

## Table of Contents

- [Why this is a plan and not a PR](#why-this-is-a-plan-and-not-a-pr)
- [Coupling analysis](#coupling-analysis)
- [Target architecture](#target-architecture)
- [Phased extraction plan](#phased-extraction-plan)
  - [Phase 0 — prerequisites](#phase-0--prerequisites)
  - [Phase 1 — Governance contract (multisig + timelock)](#phase-1--governance-contract-multisig--timelock)
  - [Phase 2 — Rate limiting + gas metrics](#phase-2--rate-limiting--gas-metrics)
  - [Phase 3 — Multi-token registry](#phase-3--multi-token-registry)
  - [Phase 4 — Deposit interest](#phase-4--deposit-interest)
  - [Phase 5 — Royalties](#phase-5--royalties)
- [Cross-contract call mechanics](#cross-contract-call-mechanics)
- [State migration strategy](#state-migration-strategy)
- [What stays in `chioma`](#what-stays-in-chioma)
- [Acceptance criteria mapping](#acceptance-criteria-mapping)
- [Risks and rollout](#risks-and-rollout)

---

## Why this is a plan and not a PR

`contracts/chioma` handles escrow, rent payments, and royalty payouts — real token
transfers gated by `require_auth`. Splitting it changes two things that are easy to
get subtly wrong under time pressure:

- **Auth semantics.** Inside one contract, `caller.require_auth()` proves who is
  calling. Across contracts, the callee sees the _contract_ as the caller unless
  auth is explicitly re-authorized/forwarded, so every extracted entry point needs
  its authorization story re-verified, not just moved.
- **Storage semantics.** Soroban storage is namespaced per contract. Data currently
  read/written directly (e.g. `royalties::transfer_with_royalty` mutating
  `RentAgreement.admin` in place) cannot simply "move" — either the reader crosses
  a contract boundary on every call, or the data itself is duplicated/synchronized,
  and both have correctness implications for already-deployed state.

Given that, this plan is deliberately staged from lowest to highest coupling, so
each phase can ship, deploy to testnet, and be soak-tested independently rather
than landing as one large, hard-to-review change.

## Coupling analysis

Grep-verified against the current `contracts/chioma/src/*.rs` (see
[Source layout](./../contracts/CHIOMA.md#source-layout)):

| Module             | Touches `DataKey::Agreement` directly?                                                                                        | Called from `agreement.rs` hot path?                                                        | Gates core admin/lifecycle calls in `lib.rs`?                                     |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `multi_sig`        | No                                                                                                                            | No                                                                                          | Yes — `require_admin`/`is_admin` gate upgrade proposals and version/pause changes |
| `timelock`         | No                                                                                                                            | No                                                                                          | Yes — delayed execution for admin actions                                         |
| `rate_limit`       | No                                                                                                                            | Yes — `create_agreement`, `sign_agreement` call `check_rate_limit` inline                   | No                                                                                |
| `gas_optimization` | No                                                                                                                            | No                                                                                          | No — read-only estimation/metrics                                                 |
| `multi_token`      | No                                                                                                                            | Yes — `create_agreement_with_token`/payment flow call `is_token_supported`/`convert_amount` | No                                                                                |
| `deposit_interest` | **Yes** — reads `RentAgreement` for principal/token; `process_interest_accruals` iterates all agreements via `AgreementCount` | No (invoked as its own admin/cron-style entry points)                                       | No                                                                                |
| `royalties`        | **Yes** — reads `RentAgreement`, and `transfer_with_royalty` **mutates** `agreement.admin` in place                           | No                                                                                          | No                                                                                |

This inverts the naive assumption that royalties/multi-token are the "safe, small
files to extract first." `multi_sig` and `timelock` are actually the cleanest: they
have zero storage coupling to `RentAgreement`, and the dependency direction is
"core calls into governance to check a permission," which is a natural
cross-contract shape (an access-controller/registry pattern). `royalties` and
`deposit_interest` are the hardest: they read _and write_ core agreement state and,
in the interest case, scan the whole agreement set.

## Target architecture

Each extracted area becomes its own Soroban contract crate under
`contract/contracts/`, following the existing pattern used by `property_registry`
and `user_profile` — own `Cargo.toml`, own `#[contract]` struct, own storage
namespace, own test suite, own deployment artifact (`.wasm`).

The `chioma` contract keeps the agreement/escrow core and holds the deployed
`Address` of each satellite contract in instance storage (mirroring how it already
tracks `SupportedToken`/`MultiSigConfig` today), invoking them through a generated
`Client` type (`soroban_sdk::contractclient`) rather than duplicating their logic.

```text
                        ┌───────────────────────┐
                        │   chioma (core)        │
                        │ agreement lifecycle,    │
                        │ escrow, payments        │
                        └───────┬─────────────────┘
                 calls (Address)│
        ┌────────────┬──────────┼───────────────┬───────────────┐
        ▼            ▼          ▼               ▼               ▼
  ┌───────────┐┌───────────┐┌───────────┐┌───────────────┐┌───────────┐
  │governance ││rate_policy││multi_token││deposit_interest││ royalties │
  │(multisig +││(rate_limit││ registry  ││                ││           │
  │ timelock) ││+ gas_opt) ││           ││                ││           │
  └───────────┘└───────────┘└───────────┘└───────────────┘└───────────┘
```

Admin config (which satellite `Address` to call) is set once via an
`initialize`/`set_*_contract` admin call, following the existing
`propose_upgrade`/`approve_upgrade` governance pattern already in `lib.rs`, so
swapping a satellite contract later goes through the same review path as a code
upgrade.

## Phased extraction plan

### Phase 0 — prerequisites

- Add `#[contractclient]` interface traits for each planned satellite (can be done
  incrementally per phase; not a big-bang step).
- Add an admin-settable `DataKey` per satellite (e.g. `DataKey::GovernanceContract`)
  in `chioma`, defaulting to "unset" so the core contract can run standalone in
  tests without deploying every satellite.
- No behavior change; this alone is safe to ship and review on its own.

### Phase 1 — Governance contract (multisig + timelock)

**Extract:** `multi_sig.rs` + `timelock.rs` → new crate `contracts/governance`.

- Zero coupling to `RentAgreement` storage (per the table above), so this is a
  mechanical move: the `MultiSigConfig`/`AdminProposal`/`TimelockAction` types and
  their storage keys move wholesale into the new contract's own storage namespace.
- `chioma`'s `require_admin`/`is_admin` call sites (`lib.rs:209,277,314,694,714,...`)
  become cross-contract calls: `governance_client.is_admin(&caller)`. Because these
  are read checks (not fund movement), the cross-contract round-trip is low-risk.
- `propose_action`/`approve_action`/`execute_action`/timelock queue/execute stay
  admin-authenticated in the governance contract itself — the caller's
  `require_auth()` happens against the governance contract directly, which is a
  cleaner authorization boundary than today (currently these run "inside" chioma
  but are logically independent of agreements).
- **Independently testable:** yes, immediately — the new crate's test suite
  exercises multisig/timelock in isolation, same as `property_registry`'s
  `tests_rbac.rs`/`tests_errors.rs` pattern.
- **Independently deployable:** yes — a change to timelock delay logic no longer
  requires redeploying `chioma`.

### Phase 2 — Rate limiting + gas metrics

**Extract:** `rate_limit.rs` + `gas_optimization.rs` → new crate `contracts/rate_policy`
(or split into two crates if gas metrics should evolve independently — recommend
starting combined since both are stateless-ish operational concerns, and
splitting further later is cheap once the pattern from Phase 1 exists).

- `rate_limit::check_rate_limit` is called inline from `create_agreement` and
  `sign_agreement` (`agreement.rs:57,154`). This becomes a cross-contract call on
  every agreement creation/signature — the first phase where extraction adds
  latency to a core user-facing action, so this phase should be benchmarked
  (`docs/performance/`) before/after to confirm the added cross-contract call is
  acceptable under the existing gas budget.
- `gas_optimization` is purely advisory (estimates/suggestions, no gating), so it
  can move with no core-path impact regardless of the rate-limit outcome.

### Phase 3 — Multi-token registry

**Extract:** `multi_token.rs` → new crate `contracts/token_registry`.

- No direct `RentAgreement` storage access, but `is_token_supported` and
  `convert_amount` are called from the core payment path
  (`agreement.rs:424,481`), so — like Phase 2 — this adds a cross-contract call
  to `create_agreement_with_token`/payment flows. Benchmark before committing.
- Migration wrinkle: existing `SupportedToken`/`TokenExchangeRate` entries live in
  `chioma`'s storage today and must be re-published into the new contract (see
  [State migration strategy](#state-migration-strategy)) — reads must not silently
  return "unsupported" for a token that was supported pre-migration.

### Phase 4 — Deposit interest

**Extract:** `deposit_interest.rs` → new crate `contracts/deposit_interest`.

- Hardest non-royalty case: it reads `RentAgreement` fields (principal, payment
  token) to compute accrual, and `process_interest_accruals` iterates every
  agreement via `DataKey::AgreementCount`.
- Requires deciding one of:
  1. **Read-through:** the new contract calls back into `chioma` via a narrow
     read-only view function (e.g. `get_agreement_escrow_info(agreement_id) ->
(i128, Address)`) exposed specifically for this purpose, instead of reading
     `RentAgreement` wholesale. Recommended — keeps `chioma` as the single source
     of truth for agreement state and avoids duplication drift.
  2. **Push model:** `chioma` pushes the fields the interest contract needs at
     agreement-creation/escrow-change time, and the interest contract keeps its
     own denormalized copy. Avoids a read-through call on the accrual path but
     introduces a second source of truth that must stay in sync — higher long-term
     risk, not recommended unless the read-through call proves too expensive.
- `process_interest_accruals`'s "iterate all agreements" batch pattern needs to
  either stay driven from `chioma` (which knows the agreement count and calls the
  interest contract once per agreement) or the interest contract needs its own
  index of agreement IDs it cares about — decide during implementation, flag in
  the phase's PR description.

### Phase 5 — Royalties

**Extract:** `royalties.rs` → new crate `contracts/royalties`.

- Highest coupling: `transfer_with_royalty` both reads `RentAgreement` (for
  `payment_token`, current landlord) **and writes** `agreement.admin = to` back
  into `chioma`'s storage. A satellite contract cannot mutate another contract's
  storage directly in Soroban, so this requires `chioma` to expose an
  authenticated write entry point (e.g. `transfer_agreement_ownership`) that the
  royalties contract calls, or — simpler and recommended — keep
  `transfer_with_royalty`'s _ownership-transfer_ step in `chioma` itself and have
  the royalties contract only own the royalty _calculation and payout_
  (`calculate_royalty`, `get_royalty`, `set_royalty`, the actual token transfers),
  with `chioma`'s agreement-transfer flow calling into it for the royalty amount
  and payout, then updating `agreement.admin` locally.
- This phase should not start until Phases 1–4 have shipped and the
  cross-contract call pattern (including a benchmarked, accepted latency/gas
  cost) is proven on testnet.

## Cross-contract call mechanics

For each phase:

- Define a `#[contractclient]` trait for the satellite's public interface in the
  satellite crate; `chioma` depends on the satellite crate (or a slim shared
  `-interface` crate exposing just the trait, to avoid pulling the satellite's
  full implementation/tests into `chioma`'s build) and calls through the
  generated `Client`.
- Auth forwarding: where a user-facing `chioma` entry point currently does
  `caller.require_auth()` then calls straight into e.g. `multi_sig::propose_action`,
  after extraction `chioma` still does `caller.require_auth()` itself (proving the
  caller authorized _this_ invocation), and the satellite contract independently
  requires whatever auth _it_ needs for its own state changes — do not assume one
  `require_auth()` covers both contracts. Test both boundaries explicitly, mirroring
  the `tests_rbac.rs` convention in [property_registry](../../contracts/property_registry/src/tests_rbac.rs).
- Every new cross-contract call site needs a corresponding integration test that
  deploys both contracts in the same `Env` (see `env.register` pattern already used
  throughout the test suites) and exercises the call end-to-end, not just each
  contract in isolation.

## State migration strategy

For already-deployed `chioma` instances (testnet first, then mainnet), each
phase's storage that moves to a satellite contract needs an explicit migration
step, since Soroban has no built-in cross-contract storage move:

1. **Freeze:** pause the affected functionality in `chioma` (the contract already
   has a `PauseState`/pause mechanism — reuse it) so no new writes land in the
   old storage location during migration.
2. **Read + republish:** an admin-run, one-time script (off-chain, using the
   existing `.env.testnet`/`.env.mainnet.example` deployment tooling in
   `contract/scripts/`) reads every existing entry for the migrating `DataKey`
   variant(s) from `chioma` via its existing public getters, and calls the new
   satellite contract's `initialize`/`import_*` admin entry point to write each
   entry into the new contract's storage. For phases with many entries (deposit
   interest, agreements-adjacent data), batch this to stay under the per-transaction
   footprint limit.
3. **Cutover:** set `chioma`'s `DataKey::<Satellite>Contract` to the deployed
   satellite `Address`, switching reads/writes in `chioma` to the cross-contract
   path.
4. **Verify:** diff a sample (or full set, for small tables like `MultiSigConfig`)
   of old vs. new values before removing read access to the old storage location.
5. **Unfreeze.**
6. Old storage entries in `chioma` are left in place (Soroban persistent storage
   has TTL-based archival; do not proactively delete) rather than removed, so a
   rollback within the TTL window is possible if cutover reveals a problem.

Each phase's PR should include a migration script under `contract/scripts/` and a
dry-run against a testnet snapshot before the mainnet cutover, per the existing
`docs/deployment/` process.

## What stays in `chioma`

`agreement.rs` (create/sign/submit/cancel/extend, escrow release, payment
history), `errors.rs`, `events.rs`, `storage.rs`, `types.rs`, and the
versioning/upgrade-proposal machinery already in `lib.rs` are the irreducible
core — the actual rental-agreement state machine and fund custody. Nothing in
this plan proposes extracting those; doing so would just relocate the god
contract rather than shrink it. Post-Phase-5, `lib.rs`'s public surface should
drop from 92 functions to roughly the agreement lifecycle + escrow + versioning
set (agreement.rs already exports ~20 functions) plus thin passthrough/config
functions for satellite contract addresses — a large, honest reduction, not a
complete elimination of cross-cutting admin surface.

## Acceptance criteria mapping

- **`lib.rs` public surface substantially reduced** — met after Phase 5; partial
  credit after each earlier phase (Phase 1 alone removes ~15 multisig/timelock
  entry points).
- **Extracted areas independently testable and deployable** — met per-phase, as
  each satellite is its own crate/wasm from the moment it's extracted.
- **Migration path documented for existing state** — this document's
  [State migration strategy](#state-migration-strategy) section, refined with
  concrete script details in each phase's implementation PR.

## Risks and rollout

- **Cross-contract gas/latency cost** on the hot path (Phases 2–3 touch
  `create_agreement`/payment flows directly) — benchmark before and after each
  such phase; if the cost is unacceptable, consider caching the satellite's
  answer in `chioma` instance storage with a short TTL rather than calling on
  every invocation.
- **Auth regressions** are the top correctness risk — every extracted entry
  point needs its own `tests_rbac.rs`-style coverage proving unauthorized calls
  still fail post-extraction, not just that the happy path still works.
- **Sequencing:** do not start Phase 5 (royalties) or Phase 4 (deposit interest)
  until Phase 1's pattern has run on testnet for a real deployment cycle —
  they're the two phases most likely to surface a cross-contract design problem,
  and it's cheaper to find that problem on the low-coupling governance contract
  first.
- **Scope guard:** each phase should ship as its own PR with its own test suite
  and its own testnet deployment/soak period — this plan is explicitly not a
  single "extract everything" change.
