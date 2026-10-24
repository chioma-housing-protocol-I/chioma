# Chioma Contract Constants Reference

This documents every fee, threshold, timeout, and other magic number baked
into the `chioma` contract's source, what it governs, and why that
particular value was chosen (or, where no rationale was recorded at the
time, what tradeoff the value expresses). It complements
[`CHIOMA.md`](./CHIOMA.md), which documents the contract's entry points.

## Fees

| Constant | Value | Location | What it governs |
| --- | --- | --- | --- |
| `Config.fee_bps` | caller-set at `initialize`/`update_config`, capped at `10_000` | `types.rs`, enforced in `lib.rs::initialize`/`update_config` | Platform fee, in basis points (1 bps = 0.01%). The `10_000` cap (100%) is a sanity bound preventing a misconfigured or malicious admin from setting a fee that consumes the entire payment; it is not itself a recommended operating fee. |

Two further fee mechanisms exist in sibling modules of this same contract,
each independently bounded and tracked:

- **Royalties** (`royalties.rs`): `RoyaltyConfig.royalty_bps`, also basis
  points, charged only on secondary transfer of an agreement via
  `transfer_with_royalty` — a distinct event from ongoing rent flow. See
  the module-level doc comment in `royalties.rs` for how this relates to
  the two fee mechanisms below.
- **Deposit interest rate** (`deposit_interest.rs`): `DepositInterestConfig.annual_rate`,
  basis points per year, applied via compound interest (`period_seconds`/
  `periods_per_year` below) to a tenant's security deposit.

## Rate limiting (`rate_limit.rs`)

| Constant | Value | What it governs |
| --- | --- | --- |
| `BLOCKS_PER_DAY` | `17_280` | Approximates one calendar day of Stellar ledger closes, assuming ~5-second block times (`86_400 / 5`). Used to convert the per-day call cap into a block-count window. If the network's actual average block time drifts materially from 5s, this constant should be revisited — it is an approximation, not a protocol-guaranteed value. |
| `RateLimitConfig.max_calls_per_block` (default `10`) | `10` | Global cap on calls to a given function within a single block, to blunt a single-block spam burst. |
| `RateLimitConfig.max_calls_per_user_per_day` (default `100`) | `100` | Per-user daily cap on calls to a given function, to blunt sustained per-account abuse without blocking normal usage patterns (a tenant or landlord interacting with their own agreements many times a day stays well under this). |
| `RateLimitConfig.cooldown_blocks` (default `0`) | `0` (disabled by default) | Minimum blocks a user must wait between consecutive calls to the same function; `0` means no cooldown is enforced unless an admin opts a function into one via `set_rate_limit_config`. |

These defaults are deliberately permissive baselines, not final production
tuning — `set_rate_limit_config` lets an admin tighten them per deployment
without a contract upgrade.

## Multi-sig governance (`multi_sig.rs`)

| Constant | Value | What it governs |
| --- | --- | --- |
| `PROPOSAL_EXPIRY_SECONDS` | `7 * 24 * 60 * 60` (7 days) | How long an admin proposal (add/remove admin, update required-signature count, etc.) stays open for signing before it expires unexecuted. Long enough that a geographically distributed admin set can realistically coordinate signatures, short enough that a stale, forgotten proposal cannot be executed much later under conditions nobody re-reviewed. |

## Timelock delays (`timelock.rs`)

Each timelocked action type has its own minimum delay between when it is
proposed and when it becomes executable. The delays are graduated by blast
radius: the more damage a mistaken or malicious execution could do, the
longer the mandatory waiting period during which it can be publicly
scrutinized and, if needed, contested or the proposing admin's keys
rotated out.

| Constant | Value | Action gated |
| --- | --- | --- |
| `MIN_DELAY_UPDATE_ADMIN` | `7 * 24 * 60 * 60` (7 days) | Changing contract admin(s) — the highest-impact action, since a compromised or malicious new admin can affect everything else below. Longest delay in the contract. |
| `MIN_DELAY_UPDATE_CONFIG` | `3 * 24 * 60 * 60` (3 days) | Updating `Config` (including `fee_bps`) — directly affects every user's economics going forward, but is reversible by a further config update, unlike an admin change. |
| `MIN_DELAY_UPDATE_RATES` | `2 * 24 * 60 * 60` (2 days) | Updating exchange/interest rates — narrower blast radius than a full config change, still directly financial. |
| `MIN_DELAY_PAUSE` | `24 * 60 * 60` (1 day) | Pausing the contract (or a specific function) — a defensive action, but one that can itself be used to deny legitimate users service, so it is not instant. |
| `MIN_DELAY_UNPAUSE` | `60 * 60` (1 hour) | Unpausing — deliberately much shorter than pausing, since an admin team that has just finished responding to an incident should be able to restore service quickly once they are confident it is safe, without waiting out a multi-day delay that would compound the outage. |

## Storage / TTL

| Constant | Value | What it governs |
| --- | --- | --- |
| `TTL_THRESHOLD` (`agreement.rs`) | `500_000` ledgers | How close to expiry a persistent storage entry's TTL can get before the contract proactively extends it, to avoid the entry being archived out from under an active agreement. |
| `TTL_BUMP` (`agreement.rs`) | `500_000` ledgers | How many ledgers each TTL extension adds. Matches `TTL_THRESHOLD` so an extension always buys roughly another full threshold's worth of runway before the next one is needed. |
| `STORAGE_VERSION` (`lib.rs`) | `1` | Current on-chain storage schema version, bumped by `migrate` after a WASM upgrade that changes storage layout. Not a tunable parameter — it is a version counter, included here for completeness since it is still a top-level contract constant. |

## Calendar conversions

These are not policy choices, just fixed unit conversions used throughout
the contract wherever a duration needs converting between seconds and a
calendar unit:

| Constant | Value | Used by |
| --- | --- | --- |
| `SECONDS_PER_DAY` (`deposit_interest.rs`) | `86_400` | Interest compounding period calculations. |
| `SECONDS_PER_MONTH` (`agreement.rs`) | `30 * 24 * 60 * 60` | Agreement duration/renewal calculations. Uses a flat 30-day month rather than calendar months, consistent with how rental terms are typically quoted (e.g. "$X/month") rather than tied to a specific calendar date's actual day count. |

## Updating this document

Whenever a new constant, fee, or timeout is added to `chioma`'s source, add
a row here in the same pass, including the *why* alongside the value —
the value alone is visible in the code; the reasoning is what this
document exists to preserve.
