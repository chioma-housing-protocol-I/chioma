# Dependency Management

**Priority:** Medium  
**Category:** Documentation  
**Type:** Documentation  
**Related Issues:** #717, #26, #28, #29

## 1. Purpose

This guide defines how Chioma manages third-party dependencies across the backend, frontend, and Soroban contract workspaces. It covers package manager usage, version pinning, security updates, auditing, compatibility checks, breaking-change handling, documentation expectations, and troubleshooting.

The goals are:

- Keep builds reproducible.
- Reduce supply-chain risk.
- Make upgrades incremental and reviewable.
- Avoid breaking cross-workspace compatibility between `backend`, `frontend`, and `contract`.

## 2. Package Management Strategy

Chioma currently uses a mixed dependency model:

| Workspace       | Manifest                                                    | Lock / resolver                                         | Primary tooling |
| --------------- | ----------------------------------------------------------- | ------------------------------------------------------- | --------------- |
| Repository root | `package.json`                                              | `pnpm-lock.yaml`                                        | `pnpm`          |
| Frontend        | `frontend/package.json`                                     | `frontend/pnpm-lock.yaml` or workspace lock             | `pnpm`          |
| Backend         | `backend/package.json`                                      | `backend/pnpm-lock.yaml`                                | `pnpm`          |
| Contracts       | `contract/Cargo.toml` and `contract/contracts/*/Cargo.toml` | `Cargo.lock` when generated locally, workspace resolver | `cargo`         |

### Rules

- Use `pnpm` for JavaScript/TypeScript dependency changes. Do not mix `npm install` or `yarn add` for package updates even if some scripts still contain `npm run`.
- Use the nearest manifest for dependency changes:
  - root for shared JS tooling
  - `frontend/` for Next.js dependencies
  - `backend/` for NestJS dependencies
  - `contract/` or a contract crate for Rust dependencies
- Commit lockfile changes together with manifest changes.
- Prefer the repository's workspace-aware commands over ad hoc installs.
- Add new packages only when the capability cannot reasonably be satisfied by an existing dependency.

### Standard Commands

```bash
# Root tooling
pnpm add -D <package>

# Frontend
pnpm --dir frontend add <package>
pnpm --dir frontend add -D <package>

# Backend
pnpm --dir backend add <package>
pnpm --dir backend add -D <package>

# Contracts
cd contract
cargo add <crate> --package chioma
```

## 3. Version Pinning Approach

Chioma uses lockfiles for reproducibility and semver ranges in manifests for controlled patch/minor adoption.

### JavaScript / TypeScript

- `packageManager` is pinned in root, frontend, and backend manifests. This is the first layer of toolchain pinning.
- `pnpm-lock.yaml` files are the source of truth for exact resolved versions.
- Use:
  - `^x.y.z` for actively maintained framework and application dependencies where patch/minor updates are expected.
  - exact overrides in `overrides` / `pnpm.overrides` for known-problem packages, transitive CVEs, or resolver consistency.
- Keep related package families aligned:
  - NestJS packages in backend
  - React / Next.js packages in frontend
  - AWS SDK package versions where possible

### Rust / Soroban

- Shared contract dependencies should prefer the workspace dependency table in `contract/Cargo.toml`.
- Contract crates should inherit workspace versions where possible instead of duplicating version strings.
- Pin crates more conservatively for on-chain code than UI dependencies because runtime behavior and compiled WASM size matter more than convenience.

### Pinning Rules

- Do not hand-edit lockfiles.
- Avoid broad version jumps in the same PR as feature work.
- For risky upgrades, pin the direct dependency first, verify behavior, then relax only if needed.
- Document every non-obvious override in the PR description or relevant docs.

## 4. Safe Update Procedure

### Routine update flow

1. Confirm why the dependency is being changed: feature, bug fix, security advisory, or ecosystem compatibility.
2. Review changelog and release notes before updating major packages.
3. Update the dependency in the correct workspace.
4. Regenerate the lockfile using the workspace package manager.
5. Run focused verification for the touched workspace.
6. Document notable behavior changes.

### Verification commands

```bash
# Frontend
pnpm --dir frontend format:check
pnpm --dir frontend test
pnpm --dir frontend build

# Backend
pnpm --dir backend lint
pnpm --dir backend test
pnpm --dir backend ci

# Contracts
cd contract
cargo test
cargo build --workspace --target wasm32-unknown-unknown --release
```

### Update cadence

- Patch updates: batch regularly.
- Minor updates: schedule after changelog review.
- Major updates: isolate in dedicated PRs unless urgently required by security or platform compatibility.

## 5. Security Update Procedure

Security updates should be handled with urgency and minimal unrelated change.

### Triage

- Identify whether the issue affects:
  - production runtime
  - development tooling only
  - a transitive dependency only
- Confirm exploitability in Chioma's actual usage path.
- Check whether mitigation is available through `overrides`, config, or feature disablement while a full upgrade is prepared.

### Response steps

1. Capture the advisory ID, affected package, current version, and fixed version.
2. Upgrade the direct dependency if possible.
3. If the issue is transitive, use `pnpm.overrides` or `overrides` to force the patched version.
4. Re-run the relevant test/build matrix.
5. Note the change in the PR body and any operations runbook if rollout coordination is needed.

### Security best practices

- Prefer the smallest safe version jump.
- Remove unused dependencies instead of patching them indefinitely.
- Treat auth, crypto, file upload, PDF, image processing, and network libraries as high-risk.
- Review native dependencies carefully, especially packages with postinstall scripts or compiled bindings.

## 6. Dependency Auditing

### JavaScript audits

```bash
pnpm audit
pnpm --dir frontend audit
pnpm --dir backend audit
```

### Rust audits

```bash
cd contract
cargo tree
cargo outdated
```

If `cargo-audit` is available locally, run:

```bash
cargo audit
```

### Audit expectations

- Run an audit before release branches or dependency-heavy PRs.
- Review both direct and transitive findings.
- Record accepted risk only when the advisory is not exploitable in this codebase and no practical patch exists.

## 7. Compatibility and Breaking Changes

Breaking changes must be isolated and documented.

### Before upgrading a potentially breaking dependency

- Read the migration guide.
- Search the codebase for APIs used from that package.
- Identify coupled packages that must move together.
- Test the downstream surface:
  - backend DTOs and middleware for NestJS changes
  - rendering, routing, and query hooks for Next.js / React changes
  - serialization, storage layout assumptions, and WASM output for Soroban changes

### Breaking-change playbook

1. Create a dedicated branch or PR for the upgrade.
2. Update code to the new API surface.
3. Add or update tests that cover the migrated behavior.
4. Update docs and examples.
5. Call out rollout risks in the PR description.

## 8. License Compliance

- Only introduce dependencies with licenses compatible with project use.
- Review licenses before adding new packages, especially SaaS SDKs, blockchain tooling, and UI asset packages.
- Flag packages with copyleft or unusual redistribution clauses for maintainer review before merging.

## 9. Dependency Documentation Requirements

Document dependency changes when they affect:

- local setup
- build/test commands
- runtime behavior
- configuration or environment variables
- security posture
- developer workflow

Update at least one of the following when relevant:

- `README.md`
- `backend/docs/README.md`
- frontend feature docs
- contract docs
- release notes / PR description

## 10. Checklist

- [ ] Correct workspace manifest updated
- [ ] Lockfile updated and committed
- [ ] Changelog / migration notes reviewed
- [ ] Security advisories checked
- [ ] Overrides documented if used
- [ ] Tests and build run for affected workspace
- [ ] Breaking changes documented
- [ ] License reviewed for new direct dependencies
- [ ] Docs updated where behavior or workflow changed

## 11. Troubleshooting

### Lockfile drift

Symptoms:

- CI installs different versions than local
- unexpected package resolution changes

Actions:

- reinstall with `pnpm install`
- regenerate the affected lockfile with the correct workspace command
- avoid mixing package managers

### Peer dependency noise

Symptoms:

- warnings after installs
- runtime mismatch between framework packages

Actions:

- align the package family versions
- prefer workspace overrides over ignoring the warning
- verify the package is actually supported on the current Next.js or NestJS major

### Native package failures

Symptoms:

- install or build errors for packages like `sharp` or `sqlite3`

Actions:

- reinstall with the pinned package manager version
- clear local modules and reinstall
- confirm Node version compatibility with the package release

### Rust dependency resolution issues

Symptoms:

- workspace crate mismatch
- Soroban SDK feature incompatibility

Actions:

- prefer `[workspace.dependencies]` alignment
- update dependent contract crates together
- rebuild with the same release profile used for deployment

### Security fix blocked by a transitive dependency

Actions:

- use `pnpm.overrides`
- open a follow-up issue if the direct package still needs upstream remediation
- document the temporary mitigation in the PR

## 12. Recommended Operating Model

- Keep dependency PRs small and reviewable.
- Separate security updates from feature work unless the user explicitly wants them bundled.
- Prefer removal over replacement, and replacement over addition.
- Re-audit after every major framework upgrade.
