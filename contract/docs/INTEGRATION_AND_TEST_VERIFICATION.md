# Contract integration + test verification (PR-ready checklist)

This document explains how to **credibly demonstrate** that Chioma’s Soroban contracts are working together as intended **from a testing/CI perspective**, and what evidence belongs in a PR description.

It is intentionally **not** a substitute for running the checks yourself: a PR should include **commands run + results** (pass/fail), not assertions without proof.

## What “integration” means in this repo (contracts)

In Soroban, “integration” in this monorepo usually means one or more of the following:

- **Cross-contract calls**: a contract uses `Env::invoke_contract` (or generated clients) to call another deployed contract and validates returned data/state transitions.
- **Token interactions**: tests use Soroban’s token test utilities (`soroban_sdk::token::...`) to exercise transfers/escrows/payments realistically.
- **End-to-end flows within a single contract**: multiple public entrypoints are exercised in sequence to validate lifecycle behavior (initialize → mutate → query).

Concrete example worth highlighting in PR text when relevant:

- `dispute_resolution` validates disputes against agreements stored in the Chioma contract via a cross-contract fetch (see `raise_dispute` implementation).

## What GitHub Actions will run for contract changes

The workflow file is:

- `.github/workflows/contract-ci-cd.yml`

It runs (in separate jobs):

- `cargo build --release` (workspace)
- `cargo fmt --all -- --check`
- `cargo clippy --all-targets --all-features -- -D warnings`
- `cargo test --all`

## What you should run locally before pushing (recommended)

From the repo root:

```bash
cd contract
./check-all.sh
```

`./check-all.sh` is stricter than the GitHub workflow’s `cargo build --release` alone because it also includes:

- `cargo fmt --all -- --check`
- `cargo clippy --all-targets --all-features -- -D warnings`
- `cargo test`
- `cargo build --target wasm32-unknown-unknown --release`

If the wasm build fails due to a missing target, install it once:

```bash
rustup target add wasm32-unknown-unknown
```

## How to capture “proof” for your PR description

When you open a PR, reviewers typically want:

- **The exact command(s)** you ran
- **The outcome** (exit code 0 / “all tests passed”)
- **What area** you validated (which contracts/flows)

### Minimal evidence template (copy/paste into PR)

```text
Local verification (contracts)

Commands:
- cd contract && ./check-all.sh

Result:
- PASS (exit 0)

Notes:
- Focus: <e.g. dispute_resolution ↔ chioma agreement fetch + error matrix>
```

### If you only ran a subset (acceptable, but say so)

```text
Local verification (contracts)

Commands:
- cd contract && cargo test -p dispute_resolution

Result:
- PASS (exit 0)

Notes:
- Subset run; full workspace gate still required before merge: ./check-all.sh
```

## PR readiness checklist (contracts)

Use this as your own merge gate:

- [ ] **No unintended changes**: `git diff` shows only the intended files.
- [ ] **Workspace tests pass**: `cd contract && cargo test --all` (or `./check-all.sh`).
- [ ] **Formatting passes**: `cd contract && cargo fmt --all -- --check`.
- [ ] **Clippy is clean at CI strictness**: `cd contract && cargo clippy --all-targets --all-features -- -D warnings`.
- [ ] **WASM build passes** (recommended): `cd contract && cargo build --target wasm32-unknown-unknown --release` (included in `./check-all.sh`).
- [ ] **Integration points you touched are tested**:
  - [ ] Cross-contract calls (`invoke_contract` / clients) have both **success** and **failure** tests where applicable.
  - [ ] Token flows include **balance/state assertions** where applicable.
- [ ] **PR text includes commands + results** (from the templates above).

## If you also changed backend or frontend

Run the Makefile CI entrypoints in each affected directory:

```bash
cd backend && make ci
cd backend && make security-ci   # backend-only security pipeline
```

```bash
cd frontend && make ci
```

## Important honesty rule (avoid review churn)

Do not claim:

- “All integration tests work”

unless you actually ran the relevant suite(s) and they passed. Prefer precise language:

- “Validated `<specific flows>` via `<commands>`; all passed locally.”

That wording matches what maintainers can verify quickly in CI logs and in your PR description.
