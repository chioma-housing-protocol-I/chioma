//! Dispute resolution for the Escrow contract.
//!
//! Issue #1560: escrow used to run its own, fully independent
//! initiate/resolve dispute flow, resolved unilaterally by a single
//! `arbiter` address. That local dispute system never called into the
//! dedicated `dispute_resolution` contract's arbiter voting/appeal system,
//! so a dispute raised through escrow could be resolved by one address's
//! say-so, bypassing arbitration entirely.
//!
//! This module now implements a single dispute path:
//!   1. `initiate_dispute` freezes the escrow locally (status -> Disputed,
//!      approvals cleared) and cross-contract calls
//!      `dispute_resolution::raise_dispute` so the dispute itself (reason,
//!      voting, appeal) is tracked by `dispute_resolution`, not duplicated
//!      here. This mirrors the existing cross-contract precedent in
//!      `dispute_resolution::raise_dispute`, which itself calls into the
//!      `chioma` contract via `env.invoke_contract`.
//!   2. `resolve_dispute_from_arbitration` is the ONLY way disputed funds can
//!      move. It may only be called by the escrow's own configured
//!      `dispute_resolution_contract`, once that contract's own voting has
//!      concluded (see that function's doc comment for the full
//!      authorization discussion).
use soroban_sdk::{token, Address, BytesN, Env, IntoVal, String};

use crate::access::AccessControl;
use crate::errors::EscrowError;
use crate::events;
use crate::storage::EscrowStorage;
use crate::types::EscrowStatus;

/// Dispute handling and resolution.
pub struct DisputeHandler;

impl DisputeHandler {
    /// Initiate a dispute on an escrow.
    /// Either depositor or beneficiary can call this.
    ///
    /// CHECKS:
    /// - Escrow must exist
    /// - Escrow must be in Funded state
    /// - Caller must be depositor or beneficiary
    /// - Dispute reason must not be empty
    ///
    /// EFFECTS:
    /// - Update escrow status to Disputed (freezes approvals so no other
    ///   release path can fire while arbitration is in progress)
    /// - Store a local copy of the dispute reason for convenience reads
    ///
    /// INTERACTIONS:
    /// - Cross-contract call into `dispute_resolution::raise_dispute`,
    ///   keyed by `escrow.agreement_id` (the raw rental agreement id, not
    ///   `escrow_id`, since `dispute_resolution`'s entire API — including
    ///   the `chioma` agreement lookup it performs internally — is keyed by
    ///   `agreement_id: String`). The dispute `reason` is passed through as
    ///   `raise_dispute`'s `details_hash` parameter: `raise_dispute` only
    ///   validates that this string is non-empty and stores it verbatim, it
    ///   does not require an actual hash, so passing the raw reason text is
    ///   acceptable and keeps the dispute's content in exactly one place
    ///   (`dispute_resolution`) instead of re-hashing/duplicating it here.
    ///   `raise_dispute` itself validates the caller is the agreement's
    ///   tenant or landlord and that the agreement is Active, which is why
    ///   this function no longer needs (or duplicates) that check locally.
    pub fn initiate_dispute(
        env: Env,
        escrow_id: BytesN<32>,
        caller: Address,
        reason: String,
    ) -> Result<(), EscrowError> {
        // CHECKS: Contract must not be paused (#1689)
        AccessControl::require_not_paused(&env)?;

        // CHECKS: Get and validate escrow
        let mut escrow = EscrowStorage::get(&env, &escrow_id).ok_or(EscrowError::EscrowNotFound)?;

        // Verify caller is a primary party (depositor or beneficiary)
        AccessControl::is_primary_party(&escrow, &caller)?;

        // Verify escrow is in Funded state
        if escrow.status != EscrowStatus::Funded {
            return Err(EscrowError::InvalidState);
        }

        // Authorize the dispute initiation
        caller.require_auth();

        // Verify reason is not empty
        if reason.is_empty() {
            return Err(EscrowError::EmptyDisputeReason);
        }

        // INTERACTIONS: delegate the dispute itself to dispute_resolution.
        // Done before the local status flip so a failed/rejected
        // cross-contract call (e.g. dispute already exists there) leaves
        // escrow's own state untouched rather than freezing funds for a
        // dispute that dispute_resolution never actually recorded.
        // `raise_dispute` is 13 chars, over the 9-char `symbol_short!` limit
        // (unlike the existing `get_agr` precedent, this function's real
        // name cannot be shortened since it's dispute_resolution's actual
        // public entry point), so it's built with `Symbol::new` instead.
        let () = env.invoke_contract(
            &escrow.dispute_resolution_contract,
            &soroban_sdk::Symbol::new(&env, "raise_dispute"),
            soroban_sdk::vec![
                &env,
                caller.clone().into_val(&env),
                escrow.agreement_id.clone().into_val(&env),
                reason.clone().into_val(&env),
            ],
        );

        // Re-fetch: the cross-contract call above cannot mutate our own
        // storage, but keep the checks-effects-interactions shape explicit
        // by treating the invoke_contract call as the "interaction" and
        // everything below as local "effects" that follow it.
        escrow.status = EscrowStatus::Disputed;
        escrow.disputed_at = Some(env.ledger().timestamp());
        escrow.dispute_reason = Some(reason);
        EscrowStorage::save(&env, &escrow);

        // Freeze funds by clearing all approvals
        EscrowStorage::clear_approvals(&env, &escrow_id);

        Ok(())
    }

    /// Resolve a disputed escrow using a completed `dispute_resolution`
    /// arbitration outcome, releasing funds to `release_to`.
    ///
    /// This REPLACES the old unilateral single-`arbiter` `resolve_dispute`.
    /// That function has been removed: no single address can resolve a
    /// dispute and move funds anymore.
    ///
    /// CHECKS:
    /// - Escrow must exist
    /// - Escrow must be in Disputed state
    /// - Caller must be the escrow's own configured
    ///   `dispute_resolution_contract`
    /// - Release target must be beneficiary or depositor
    ///
    /// EFFECTS:
    /// - Update escrow status to Released
    /// - Clear dispute reason
    /// - Clear approvals
    ///
    /// INTERACTIONS:
    /// - Token transfer after all state updates
    ///
    /// ── Authorization design (point 5 in the issue) ──────────────────────
    /// Design chosen: (a) escrow exposes a resolve-callback that only the
    /// `dispute_resolution` contract itself may call. This function takes NO
    /// `caller: Address` argument at all — unlike every other escrow
    /// fund-movement function — specifically to avoid the spoofing risk of
    /// trusting a caller-supplied identity argument. Instead it looks up
    /// `escrow.dispute_resolution_contract` (set once, at escrow creation
    /// time, and never mutated afterwards) directly from the escrow's own
    /// storage, and calls `require_auth()` on THAT address. For this to
    /// succeed, the invocation must have been authorized by that exact
    /// address — which for a contract address, per Soroban's auth model,
    /// means that contract itself must be the one making the call (a
    /// contract's own address is a valid, signature-free authorizer for
    /// invocations it directly initiates via `env.invoke_contract`; nothing
    /// else can produce a valid authorization for a contract address). So in
    /// practice this function can only be entered successfully when
    /// `dispute_resolution` itself is the direct caller, which per
    /// `dispute_resolution`'s own logic (`resolve_dispute`,
    /// `resolve_dispute_weighted`, `resolve_dispute_on_timeout`) only
    /// happens after that dispute has actually concluded (min votes reached,
    /// or appeal window/timeout logic satisfied).
    ///
    /// This was chosen over design (b) — dispute_resolution storing escrow's
    /// address and calling back into it directly — because design (a) does
    /// not require adding a new "escrow contract address" field to
    /// `dispute_resolution`'s `ContractState`/initialization, and keeps all
    /// escrow-specific business logic (release targets, token transfers)
    /// inside escrow, where the funds actually live. `dispute_resolution`
    /// does not currently call out to escrow at all after resolving a
    /// dispute — wiring that final "resolve outcome -> call
    /// resolve_dispute_from_arbitration" hop is orchestration work for
    /// whatever off-chain/relayer or `chioma`-level process drives the
    /// end-to-end flow, since `dispute_resolution::resolve_dispute` only
    /// knows the `agreement_id`, not which escrow (`BytesN<32>`) to release;
    /// that mapping is escrow-side (`escrow.agreement_id`), so the caller of
    /// this function needs to resolve `agreement_id -> escrow_id` itself
    /// (e.g. via `chioma`, which is the contract that already knows both).
    ///
    /// CONFIDENCE NOTE: `Address::require_auth()` succeeding for a contract's
    /// own address when that contract is the direct invoker is a standard,
    /// documented Soroban auth-framework behavior, but this specific
    /// codebase has NO prior instance of it (the one existing cross-contract
    /// call in this repo, `dispute_resolution -> chioma`, is a plain
    /// read-only `invoke_contract` with no auth crossing the boundary at
    /// all), and the exact host-level call-stack-matching logic behind it
    /// lives in `soroban-env-host`, not in the vendored `soroban-sdk` source
    /// available for inspection here. The address-identity lookup
    /// (`escrow.dispute_resolution_contract`, read from storage rather than
    /// a caller-supplied argument) is the primary, unconditionally-enforced
    /// guard regardless of the auth mechanism's exact host semantics;
    /// `require_auth()` is defense in depth on top of it. The new
    /// cross-contract test in `tests_dispute_resolution_integration`
    /// exercises both directions under `env.mock_all_auths()`: a direct call
    /// from a non-`dispute_resolution` address is rejected, and a call
    /// routed through `dispute_resolution` (invoked the same way
    /// `dispute_resolution -> chioma` is invoked elsewhere in this repo)
    /// succeeds only after arbitration voting concludes. Because
    /// `mock_all_auths()` bypasses real signature/identity verification, it
    /// cannot by itself prove the host will reject a forged contract
    /// identity on a live network — that would require a testnet/mainnet
    /// (or `mock_auths`-with-explicit-address) integration test outside this
    /// unit test suite's scope.
    pub fn resolve_dispute_from_arbitration(
        env: Env,
        escrow_id: BytesN<32>,
        release_to: Address,
    ) -> Result<(), EscrowError> {
        // CHECKS: Get and validate escrow
        let mut escrow = EscrowStorage::get(&env, &escrow_id).ok_or(EscrowError::EscrowNotFound)?;

        // Verify escrow is in Disputed state
        if escrow.status != EscrowStatus::Disputed {
            return Err(EscrowError::InvalidState);
        }

        // Verify release target is valid
        if release_to != escrow.beneficiary && release_to != escrow.depositor {
            return Err(EscrowError::InvalidApprovalTarget);
        }

        // CHECKS + AUTH: caller must be exactly the dispute_resolution
        // contract instance this escrow was created with, authenticated as
        // itself.
        let caller = escrow.dispute_resolution_contract.clone();
        caller.require_auth();

        // EFFECTS: Update status and clear dispute
        escrow.status = EscrowStatus::Released;
        escrow.disputed_at = None;
        escrow.dispute_reason = None;
        EscrowStorage::save(&env, &escrow);

        // Clear approvals
        EscrowStorage::clear_approvals(&env, &escrow_id);

        // INTERACTIONS: Token transfer from escrow contract to release target
        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(&env.current_contract_address(), &release_to, &escrow.amount);

        Ok(())
    }

    /// Get dispute information for an escrow.
    /// Returns the dispute reason if escrow is disputed, None otherwise.
    pub fn get_dispute_info(
        env: Env,
        escrow_id: BytesN<32>,
    ) -> Result<Option<String>, EscrowError> {
        let escrow = EscrowStorage::get(&env, &escrow_id).ok_or(EscrowError::EscrowNotFound)?;

        Ok(escrow.dispute_reason)
    }

    /// Check if an escrow is currently disputed.
    pub fn is_disputed(env: Env, escrow_id: BytesN<32>) -> Result<bool, EscrowError> {
        let escrow = EscrowStorage::get(&env, &escrow_id).ok_or(EscrowError::EscrowNotFound)?;
        Ok(escrow.status == EscrowStatus::Disputed)
    }

    /// Resolve a disputed escrow automatically when dispute timeout is reached.
    /// On timeout, funds are refunded to depositor.
    pub fn resolve_dispute_on_timeout(env: Env, escrow_id: BytesN<32>) -> Result<(), EscrowError> {
        AccessControl::require_not_paused(&env)?;

        let mut escrow = EscrowStorage::get(&env, &escrow_id).ok_or(EscrowError::EscrowNotFound)?;

        if escrow.status != EscrowStatus::Disputed {
            return Err(EscrowError::InvalidState);
        }

        let disputed_at = escrow.disputed_at.unwrap_or(escrow.created_at);
        let timeout_days = EscrowStorage::get_timeout_config(&env).dispute_timeout_days;
        let timeout_seconds = timeout_days.saturating_mul(86_400);
        let deadline = disputed_at.saturating_add(timeout_seconds);
        let now = env.ledger().timestamp();
        if now <= deadline {
            return Err(EscrowError::TimeoutNotReached);
        }

        escrow.status = EscrowStatus::Refunded;
        escrow.disputed_at = None;
        escrow.dispute_reason = None;
        EscrowStorage::save(&env, &escrow);

        EscrowStorage::clear_approvals(&env, &escrow_id);
        let targets = [escrow.beneficiary.clone(), escrow.depositor.clone()];
        let signers = [
            escrow.depositor.clone(),
            escrow.beneficiary.clone(),
            escrow.arbiter.clone(),
        ];
        EscrowStorage::clear_approval_counts(&env, &escrow_id, &targets, &signers);

        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(
            &env.current_contract_address(),
            &escrow.depositor,
            &escrow.amount,
        );

        events::dispute_timeout(&env, escrow_id);
        Ok(())
    }
}
