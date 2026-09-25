//! Shared test-only support for exercising escrow's dispute delegation to
//! `dispute_resolution` (issue #1560).
//!
//! `escrow` does not depend on the `dispute_resolution` crate (they are
//! independent workspace members that only interact through
//! `env.invoke_contract`), so escrow's own tests need a lightweight stand-in
//! contract registered in the same `Env`, exactly mirroring the pattern
//! already used in `dispute_resolution::tests_raise_dispute`'s
//! `MockChiomaContract` (a `#[contract]` stub registered in the same `Env`,
//! driven via its generated client).
//!
//! `MockDisputeResolution` mimics the two dispute_resolution behaviors
//! escrow's dispute flow actually depends on:
//! - `raise_dispute(raiser, agreement_id, details_hash)` — what
//!   `escrow::initiate_dispute` cross-contract calls. This stand-in records
//!   the call (so tests can assert escrow really delegated instead of
//!   resolving anything itself) and requires `raiser.require_auth()`,
//!   matching the real contract's own check.
//! - `resolve_and_release(escrow_contract, escrow_id, release_to)` — a
//!   test-only entry point that simulates "arbitration has concluded" by
//!   cross-contract calling escrow's `resolve_dispute_from_arbitration`,
//!   authenticated as itself. This models the callback direction described
//!   in `dispute::DisputeHandler::resolve_dispute_from_arbitration`'s doc
//!   comment: in production, `dispute_resolution`'s own `resolve_dispute` /
//!   `resolve_dispute_weighted` / `resolve_dispute_on_timeout` would make
//!   this same call once voting/appeal has actually concluded.
use soroban_sdk::{contract, contractimpl, symbol_short, Address, Env, String, Vec};

#[contract]
pub struct MockDisputeResolution;

#[contractimpl]
impl MockDisputeResolution {
    /// Mirrors `dispute_resolution::raise_dispute`'s signature and auth
    /// requirement. Records each call for test assertions instead of
    /// implementing real voting state — voting/appeal logic is exercised in
    /// `dispute_resolution`'s own test suite; this stand-in exists purely to
    /// prove escrow's `initiate_dispute` genuinely delegates instead of
    /// resolving anything itself.
    pub fn raise_dispute(env: Env, raiser: Address, agreement_id: String, details_hash: String) {
        raiser.require_auth();
        assert!(!details_hash.is_empty(), "details_hash must not be empty");

        let key = (symbol_short!("raised"), agreement_id);
        let mut log: Vec<String> = env.storage().instance().get(&key).unwrap_or(Vec::new(&env));
        log.push_back(details_hash);
        env.storage().instance().set(&key, &log);
    }

    /// Returns every `details_hash` recorded by `raise_dispute` calls for
    /// this `agreement_id`, so tests can assert escrow delegated the
    /// dispute exactly once with the expected reason, and did not call this
    /// more than once for the same agreement.
    pub fn raise_dispute_calls(env: Env, agreement_id: String) -> Vec<String> {
        let key = (symbol_short!("raised"), agreement_id);
        env.storage().instance().get(&key).unwrap_or(Vec::new(&env))
    }

    /// Test-only simulation of "arbitration concluded, release funds".
    /// Cross-contract calls back into escrow's
    /// `resolve_dispute_from_arbitration`, authenticated as THIS contract's
    /// own address — the same shape a completed
    /// `dispute_resolution::resolve_dispute` call would use in production.
    ///
    /// Returns the `Result` from escrow unchanged (via escrow's generated
    /// `try_resolve_dispute_from_arbitration`-shaped error encoding) so
    /// callers can assert success/failure without a panic in the common
    /// case; a genuinely unauthorized direct call bypassing this contract
    /// entirely (see `resolve_dispute_direct_call_by_non_dispute_resolution_rejected`)
    /// still panics, which is what a real unauthorized `require_auth` failure
    /// does in Soroban.
    ///
    /// No explicit `require_auth()`/`authorize_as_current_contract` call is
    /// needed here for THIS contract's own identity: per
    /// `Env::authorize_as_current_contract`'s documentation, "All the direct
    /// calls that the current contract performs are always considered to
    /// have been authorized" — `authorize_as_current_contract` is only
    /// needed for deeper (grandchild) calls. Since this function directly
    /// invokes `escrow::resolve_dispute_from_arbitration`, escrow's
    /// `require_auth()` on this contract's own address is satisfied by the
    /// host automatically, with no signature and no test-only mocking
    /// required — this is real production auth behavior, not a testutils
    /// convenience, which is exactly why the accompanying test in
    /// `tests_dispute_resolution_integration` deliberately does NOT call
    /// `env.mock_all_auths()` for this call path.
    pub fn resolve_and_release(
        env: Env,
        escrow_contract: Address,
        escrow_id: soroban_sdk::BytesN<32>,
        release_to: Address,
    ) -> Result<(), soroban_sdk::Val> {
        env.invoke_contract(
            &escrow_contract,
            &soroban_sdk::Symbol::new(&env, "resolve_dispute_from_arbitration"),
            soroban_sdk::vec![
                &env,
                soroban_sdk::IntoVal::into_val(&escrow_id, &env),
                soroban_sdk::IntoVal::into_val(&release_to, &env),
            ],
        )
    }
}

/// Register a `MockDisputeResolution` instance in `env` and return its
/// address, ready to be passed as an escrow's `dispute_resolution_contract`
/// at `create()` time.
pub fn deploy_mock_dispute_resolution(env: &Env) -> Address {
    env.register(MockDisputeResolution, ())
}
