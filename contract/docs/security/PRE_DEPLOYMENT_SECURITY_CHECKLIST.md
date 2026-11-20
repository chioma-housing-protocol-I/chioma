# Contract Pre-Deployment Security Checklist

This is the verification record for any contract build that is about to be
deployed to testnet or mainnet. It complements, and does not replace, the
third-party audit requirement in [AUDIT.md](AUDIT.md) and the change-level
checks in [READINESS_CHECKLIST.md](../deployment/READINESS_CHECKLIST.md).

The checklist is deliberately short enough to complete for every release.
Each item needs either a tick, or a dated exception with an owner and a reason.
An empty item blocks deployment. Record the commit hash and the WASM digests
you verified so the record can be matched to what was actually deployed.

## Release identity

- [ ] Target network, commit hash and tag recorded below.
- [ ] Working tree is clean, and the commit is the one covered by the audit or
      documented exception.
- [ ] WASM artifacts rebuilt from that commit and their digests recorded.
- [ ] Deployer and admin keys identified; no secret is stored in the repo.

| Field | Value |
| --- | --- |
| Network | |
| Commit | |
| Tag / release | |
| Verified by | |
| Date (UTC) | |

## Authorization and access control

- [ ] Every state-changing entrypoint checks the caller with `require_auth`.
- [ ] Admin-only entrypoints check the configured admin or multisig, and each
      has a negative test proving an unauthorised caller fails.
- [ ] No role or admin address can be set from an unauthenticated path.
- [ ] Pause, freeze and emergency controls are reachable by the intended
      responder and cannot be invoked by a tenant or landlord.
- [ ] Multisig thresholds and quorum maths are covered by boundary tests.

See [AUTHORIZATION_DOCUMENTATION](../../../backend/docs/security/AUTHORIZATION_DOCUMENTATION.md)
for the backend-side model this must agree with.

## Fund safety

- [ ] Deposit, rent payment, fee, refund and dispute flows have success and
      failure tests with exact balance assertions.
- [ ] Rounding, fee basis points and partial-release maths have boundary tests
      at zero, one and maximum allowed values.
- [ ] Timeout refunds work when a party disappears, and cannot be replayed.
- [ ] A paused or frozen escrow cannot be drained through another entrypoint.
- [ ] Token trustlines, reserves and allowances needed by the contracts are
      listed in the deployment notes.

## Pause and emergency response

- [ ] `Paused` and `Unpaused` events are emitted on every state change.
- [ ] The pause blocks the entrypoints listed in
      [EMERGENCY-PROCEDURES.md](EMERGENCY-PROCEDURES.md), and tests assert the
      full blocked and allowed matrix.
- [ ] Releasing escrow, refunding and withdrawing already-earned balances
      follow the policy documented for the paused state.
- [ ] The on-call responder has the key and a tested path to pause.
- [ ] Monitoring alerts on pause events and unusual refund volume.

## Upgrades and admin changes

- [ ] Upgrade authority is the multisig, never a single operator key.
- [ ] A proposed upgrade can be cancelled and a failing upgrade cannot leave
      the contract partially initialised.
- [ ] Storage keys used by existing deployments are unchanged, or a migration
      is documented and tested on a restored testnet state.
- [ ] Admin parameter changes (fee basis points, dispute votes) are bounded and
      emit events.

## Storage, TTL and limits

- [ ] Persistent entries that grow with users have an extension strategy.
- [ ] No input can create an unbounded map or vector entry.
- [ ] Event payloads and topics match the indexer's expectations in
      [EVENT-REFERENCE.md](../reference/EVENT-REFERENCE.md).
- [ ] Error codes are stable and documented in
      [ERROR-REFERENCE.md](../reference/ERROR-REFERENCE.md).

## Tooling and build

Record the output of each command next to its item.

- [ ] `cd contract && cargo fmt --all -- --check`
- [ ] `cd contract && cargo clippy --all-targets --all-features -- -D warnings`
- [ ] `cd contract && cargo test` (all contracts green)
- [ ] `cd contract && ./check-all.sh`
- [ ] `stellar contract build` produces the expected WASM artifacts
- [ ] Dependency versions and sources reviewed; no unpinned git dependency

## Sign-off

| Role | Name | Decision (approve / exception / block) | Date (UTC) |
| --- | --- | --- | --- |
| Contract author | | | |
| Security reviewer | | | |
| Release owner | | | |

An exception needs a linked issue with an owner and a target date. Deployment
is blocked while any fund-safety, authorization or pause item is unchecked.

## References

- [AUDIT.md](AUDIT.md) audit policy, scope and report register
- [MAINNET_DEPLOYMENT.md](../deployment/MAINNET_DEPLOYMENT.md) launch gate and
  deployment procedure
- [READINESS_CHECKLIST.md](../deployment/READINESS_CHECKLIST.md) per-change
  definition of done
- [EMERGENCY-PROCEDURES.md](EMERGENCY-PROCEDURES.md) pause and incident response
