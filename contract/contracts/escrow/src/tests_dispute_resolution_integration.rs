//! Cross-contract integration tests proving escrow's dispute flow is
//! genuinely delegated to (a stand-in for) `dispute_resolution`, and that
//! fund release after a dispute can ONLY happen via a call actually routed
//! through that contract (issue #1560).
//!
//! Uses the same multi-contract-in-one-`Env` test convention already
//! established in `dispute_resolution::tests_raise_dispute` (a `#[contract]`
//! stand-in registered alongside the contract under test, driven through its
//! generated client) — see `tests_support::MockDisputeResolution`.

use soroban_sdk::testutils::Address as _;
use soroban_sdk::token::Client as TokenClient;
use soroban_sdk::token::StellarAssetClient as TokenAdminClient;
use soroban_sdk::{Address, Env, String};

use crate::escrow_impl::{EscrowContract, EscrowContractClient};
use crate::tests_support::{deploy_mock_dispute_resolution, MockDisputeResolutionClient};
use crate::types::EscrowStatus;

#[allow(clippy::too_many_arguments)]
fn setup(
    env: &Env,
) -> (
    EscrowContractClient<'_>,
    Address, // depositor
    Address, // beneficiary
    Address, // arbiter (legacy field, not consulted for dispute resolution anymore)
    Address, // platform_governance
    Address, // agent_referral
    Address, // token
    String,  // agreement_id
    Address, // dispute_resolution_contract (mock)
) {
    let contract_id = env.register(EscrowContract, ());
    let client = EscrowContractClient::new(env, &contract_id);

    let depositor = Address::generate(env);
    let beneficiary = Address::generate(env);
    let arbiter = Address::generate(env);
    let platform_governance = Address::generate(env);
    let agent_referral = Address::generate(env);
    let token_admin = Address::generate(env);
    let token = env
        .register_stellar_asset_contract_v2(token_admin)
        .address();
    let agreement_id = String::from_str(env, "agr-integration-1");
    let dispute_resolution_contract = deploy_mock_dispute_resolution(env);

    (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token,
        agreement_id,
        dispute_resolution_contract,
    )
}

/// Full happy-path lifecycle: a dispute raised via escrow is subject to
/// dispute_resolution's arbiter voting (here, the mock's recorded call
/// stands in for the real arbiter voting/appeal system, which is exercised
/// in `dispute_resolution`'s own test suite), escrow itself never resolves
/// unilaterally, and funds only move once the resolve callback — the same
/// call shape `dispute_resolution::resolve_dispute` would make once voting
/// concludes — reaches escrow.
#[test]
fn dispute_raised_via_escrow_is_delegated_and_only_resolves_via_callback() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token,
        agreement_id,
        dispute_resolution_contract,
    ) = setup(&env);
    let amount = 1_000i128;

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token,
        &agreement_id,
        &dispute_resolution_contract,
    );

    let token_admin = TokenAdminClient::new(&env, &token);
    token_admin.mint(&depositor, &amount);
    client.fund_escrow(&escrow_id, &depositor);

    // 1. Raise the dispute via escrow.
    let reason = String::from_str(&env, "unit not delivered as agreed");
    client.initiate_dispute(&escrow_id, &depositor, &reason);

    // 2. Escrow's local state reflects the freeze, but escrow did NOT
    //    resolve or release anything itself.
    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Disputed);
    let token_client = TokenClient::new(&env, &token);
    assert_eq!(token_client.balance(&client.address), amount);
    assert_eq!(token_client.balance(&beneficiary), 0);
    assert_eq!(token_client.balance(&depositor), 0);

    // 3. The dispute is genuinely queryable via dispute_resolution's own
    //    API (here, the mock's call log) — proving escrow delegated instead
    //    of tracking the dispute itself.
    let mock_client = MockDisputeResolutionClient::new(&env, &dispute_resolution_contract);
    let calls = mock_client.raise_dispute_calls(&agreement_id);
    assert_eq!(
        calls.len(),
        1,
        "dispute_resolution should have recorded exactly one raise_dispute call"
    );
    assert_eq!(calls.get(0).unwrap(), reason);

    // 4. Attempting to call escrow's resolve entry point from OUTSIDE
    //    dispute_resolution (no wrapping contract call, and deliberately no
    //    `env.mock_all_auths()` covering this specific call) fails: escrow
    //    requires auth on its own stored `dispute_resolution_contract`
    //    address, and nothing here can produce that authorization except
    //    dispute_resolution itself being the direct caller.
    //
    //    `mock_all_auths()` was already called above (needed for
    //    `initiate_dispute`'s `caller.require_auth()`), so to prove this
    //    boundary for real we disable mocking again before attempting the
    //    direct call.
    env.set_auths(&[]);
    let direct_result = client.try_resolve_dispute_from_arbitration(&escrow_id, &beneficiary);
    assert!(
        direct_result.is_err(),
        "a caller other than dispute_resolution must not be able to resolve a dispute"
    );
    assert_eq!(
        client.get_escrow(&escrow_id).status,
        EscrowStatus::Disputed,
        "escrow must remain untouched after a rejected direct resolve attempt"
    );

    // 5. Only a call genuinely routed through dispute_resolution succeeds —
    //    and per `Env::authorize_as_current_contract`'s documented "direct
    //    calls ... are always considered to have been authorized" rule,
    //    this requires no auth mocking at all for the mock's own identity.
    mock_client.resolve_and_release(&client.address, &escrow_id, &beneficiary);

    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Released);
    assert_eq!(token_client.balance(&beneficiary), amount);
    assert_eq!(token_client.balance(&client.address), 0);
}

/// Narrower, deliberately auth-mock-free proof of the negative case: a
/// contract that is NOT the escrow's configured dispute_resolution_contract
/// cannot resolve a dispute, even when it makes the exact same direct call
/// shape the real mock uses.
#[test]
fn resolve_dispute_rejects_a_different_contract_impersonating_dispute_resolution() {
    let env = Env::default();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token,
        agreement_id,
        dispute_resolution_contract,
    ) = setup(&env);
    let amount = 1_000i128;

    // A second, distinct mock instance — NOT the one this escrow was
    // configured with.
    let impostor_contract = deploy_mock_dispute_resolution(&env);
    assert_ne!(impostor_contract, dispute_resolution_contract);

    env.mock_all_auths();
    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token,
        &agreement_id,
        &dispute_resolution_contract,
    );
    let token_admin = TokenAdminClient::new(&env, &token);
    token_admin.mint(&depositor, &amount);
    client.fund_escrow(&escrow_id, &depositor);
    client.initiate_dispute(&escrow_id, &depositor, &String::from_str(&env, "dispute"));

    // Disable mocking so this specific call is judged on real auth
    // semantics: the impostor contract calling
    // resolve_dispute_from_arbitration directly on escrow is its own
    // "direct call" (always self-authorized for ITS OWN address), but
    // escrow requires auth on `escrow.dispute_resolution_contract`
    // (the real one), which the impostor is not — so this must fail.
    env.set_auths(&[]);
    let impostor_client = MockDisputeResolutionClient::new(&env, &impostor_contract);
    let result = impostor_client.try_resolve_and_release(&client.address, &escrow_id, &beneficiary);
    assert!(
        result.is_err(),
        "a different contract must not be able to resolve another escrow's dispute"
    );
    assert_eq!(client.get_escrow(&escrow_id).status, EscrowStatus::Disputed);
}
