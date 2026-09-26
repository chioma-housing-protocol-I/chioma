//! Role-Based Access Control tests for the Escrow contract.
//!
//! Verifies that admin-only functions enforce the admin role and that
//! escrow operations are restricted to the correct parties.

use soroban_sdk::testutils::Address as _;
use soroban_sdk::token::StellarAssetClient as TokenAdminClient;
use soroban_sdk::{Address, Env, String};

use crate::errors::EscrowError;
use crate::escrow_impl::{EscrowContract, EscrowContractClient};
use crate::types::{EscrowStatus, TimeoutConfig};

fn setup(
    env: &Env,
) -> (
    EscrowContractClient<'_>,
    Address, // depositor
    Address, // beneficiary
    Address, // arbiter
    Address, // platform_governance
    Address, // agent_referral
    Address, // token
    String,  // agreement_id
    Address, // dispute_resolution_contract
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
    let agreement_id = String::from_str(env, "agreement-rbac-1");
    let dispute_resolution_contract = crate::tests_support::deploy_mock_dispute_resolution(env);

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

#[allow(clippy::too_many_arguments)]
fn funded_escrow(
    env: &Env,
    client: &EscrowContractClient<'_>,
    depositor: &Address,
    beneficiary: &Address,
    arbiter: &Address,
    platform_governance: &Address,
    agent_referral: &Address,
    token: &Address,
    agreement_id: &String,
    dispute_resolution_contract: &Address,
    amount: i128,
) -> soroban_sdk::BytesN<32> {
    let escrow_id = client.create(
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        &amount,
        token,
        agreement_id,
        dispute_resolution_contract,
    );

    let token_admin_client = TokenAdminClient::new(env, token);
    token_admin_client.mint(depositor, &amount);
    client.fund_escrow(&escrow_id, depositor);

    escrow_id
}

// ── initialize_admin ────────────────────────────────────────────────────────

#[test]
fn test_initialize_admin_succeeds_once() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, ..) = setup(&env);
    let admin = Address::generate(&env);

    let result = client.try_initialize_admin(&admin);
    assert!(result.is_ok(), "first initialize_admin should succeed");

    let stored = client.get_admin();
    assert_eq!(stored, Some(admin));
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn test_initialize_admin_cannot_be_called_twice() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, ..) = setup(&env);
    let admin = Address::generate(&env);

    client.initialize_admin(&admin);
    // Second call must panic — admin is already set
    client.initialize_admin(&admin);
}

// ── update_admin ────────────────────────────────────────────────────────────

#[test]
fn test_update_admin_succeeds_for_current_admin() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, ..) = setup(&env);
    let admin = Address::generate(&env);
    let new_admin = Address::generate(&env);

    client.initialize_admin(&admin);
    let result = client.try_update_admin(&admin, &new_admin);
    assert!(
        result.is_ok(),
        "current admin should be able to transfer admin role"
    );

    assert_eq!(client.get_admin(), Some(new_admin));
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn test_update_admin_fails_for_non_admin() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, ..) = setup(&env);
    let admin = Address::generate(&env);
    let attacker = Address::generate(&env);
    let new_admin = Address::generate(&env);

    client.initialize_admin(&admin);
    // Attacker tries to take over admin — must fail with NotAuthorized (#3)
    client.update_admin(&attacker, &new_admin);
}

// ── freeze_escrow ────────────────────────────────────────────────────────────

#[test]
fn test_admin_can_freeze_escrow() {
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
    let admin = Address::generate(&env);
    client.initialize_admin(&admin);

    let escrow_id = funded_escrow(
        &env,
        &client,
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &token,
        &agreement_id,
        &dispute_resolution_contract,
        1000,
    );

    let reason = soroban_sdk::String::from_str(&env, "security audit");
    let result = client.try_freeze_escrow(&escrow_id, &admin, &reason);
    assert!(result.is_ok(), "admin should be able to freeze escrow");
    assert!(client.is_escrow_frozen(&escrow_id));
}

#[test]
fn test_arbiter_can_freeze_escrow() {
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
    let admin = Address::generate(&env);
    client.initialize_admin(&admin);

    let escrow_id = funded_escrow(
        &env,
        &client,
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &token,
        &agreement_id,
        &dispute_resolution_contract,
        1000,
    );

    let reason = soroban_sdk::String::from_str(&env, "dispute opened");
    let result = client.try_freeze_escrow(&escrow_id, &arbiter, &reason);
    assert!(result.is_ok(), "arbiter should be able to freeze escrow");
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn test_non_admin_non_arbiter_cannot_freeze_escrow() {
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
    let admin = Address::generate(&env);
    let outsider = Address::generate(&env);
    client.initialize_admin(&admin);

    let escrow_id = funded_escrow(
        &env,
        &client,
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &token,
        &agreement_id,
        &dispute_resolution_contract,
        1000,
    );

    let reason = soroban_sdk::String::from_str(&env, "malicious freeze");
    client.freeze_escrow(&escrow_id, &outsider, &reason);
}

// ── unfreeze_escrow ──────────────────────────────────────────────────────────

#[test]
fn test_admin_can_unfreeze_escrow() {
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
    let admin = Address::generate(&env);
    client.initialize_admin(&admin);

    let escrow_id = funded_escrow(
        &env,
        &client,
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &token,
        &agreement_id,
        &dispute_resolution_contract,
        1000,
    );

    let reason = soroban_sdk::String::from_str(&env, "freeze for audit");
    client.freeze_escrow(&escrow_id, &admin, &reason);
    assert!(client.is_escrow_frozen(&escrow_id));

    let result = client.try_unfreeze_escrow(&escrow_id, &admin);
    assert!(result.is_ok(), "admin should be able to unfreeze escrow");
    assert!(!client.is_escrow_frozen(&escrow_id));
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn test_arbiter_cannot_unfreeze_escrow() {
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
    let admin = Address::generate(&env);
    client.initialize_admin(&admin);

    let escrow_id = funded_escrow(
        &env,
        &client,
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &token,
        &agreement_id,
        &dispute_resolution_contract,
        1000,
    );

    let reason = soroban_sdk::String::from_str(&env, "freeze for audit");
    client.freeze_escrow(&escrow_id, &admin, &reason);

    // Arbiter froze it but only admin can unfreeze — must fail
    client.unfreeze_escrow(&escrow_id, &arbiter);
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn test_outsider_cannot_unfreeze_escrow() {
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
    let admin = Address::generate(&env);
    let outsider = Address::generate(&env);
    client.initialize_admin(&admin);

    let escrow_id = funded_escrow(
        &env,
        &client,
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &token,
        &agreement_id,
        &dispute_resolution_contract,
        1000,
    );

    let reason = soroban_sdk::String::from_str(&env, "freeze");
    client.freeze_escrow(&escrow_id, &admin, &reason);
    client.unfreeze_escrow(&escrow_id, &outsider);
}

// ── fund_escrow ──────────────────────────────────────────────────────────────

#[test]
fn test_depositor_can_fund_escrow() {
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
    let amount = 500i128;

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

    let token_admin_client = TokenAdminClient::new(&env, &token);
    token_admin_client.mint(&depositor, &amount);

    let result = client.try_fund_escrow(&escrow_id, &depositor);
    assert!(result.is_ok(), "depositor should be able to fund escrow");
    assert_eq!(client.get_escrow(&escrow_id).status, EscrowStatus::Funded);
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn test_beneficiary_cannot_fund_escrow() {
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
    let amount = 500i128;

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

    let token_admin_client = TokenAdminClient::new(&env, &token);
    token_admin_client.mint(&beneficiary, &amount);

    // Beneficiary is not the depositor — must fail
    client.fund_escrow(&escrow_id, &beneficiary);
}

// ── set_timeout_config ────────────────────────────────────────────────────────

#[test]
fn test_timeout_config_requires_auth() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, ..) = setup(&env);

    let config = TimeoutConfig {
        escrow_timeout_days: 30,
        dispute_timeout_days: 14,
        payment_timeout_days: 7,
    };

    // Any authenticated address may update timeout config (not admin-restricted)
    let caller = Address::generate(&env);
    let result = client.try_set_timeout_config(&caller, &config);
    assert!(result.is_ok());
}

// ── approve_release ─────────────────────────────────────────────────────────

#[test]
fn test_beneficiary_can_approve_release() {
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

    let escrow_id = funded_escrow(
        &env,
        &client,
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &token,
        &agreement_id,
        &dispute_resolution_contract,
        1000,
    );

    let result = client.try_approve_release(&escrow_id, &beneficiary, &beneficiary);
    assert!(
        result.is_ok(),
        "beneficiary should be able to approve release"
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_outsider_cannot_approve_release() {
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
    let outsider = Address::generate(&env);

    let escrow_id = funded_escrow(
        &env,
        &client,
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &token,
        &agreement_id,
        &dispute_resolution_contract,
        1000,
    );

    // Outsider cannot approve release
    client.approve_release(&escrow_id, &outsider, &beneficiary);
}

// ── initiate_dispute ────────────────────────────────────────────────────────

#[test]
fn test_beneficiary_can_initiate_dispute() {
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

    let escrow_id = funded_escrow(
        &env,
        &client,
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &token,
        &agreement_id,
        &dispute_resolution_contract,
        1000,
    );

    let reason = soroban_sdk::String::from_str(&env, "unauthorized deduction");
    let result = client.try_initiate_dispute(&escrow_id, &beneficiary, &reason);
    assert!(
        result.is_ok(),
        "beneficiary should be able to initiate dispute"
    );
    assert_eq!(client.get_escrow(&escrow_id).status, EscrowStatus::Disputed);
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn test_outsider_cannot_initiate_dispute() {
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
    let outsider = Address::generate(&env);

    let escrow_id = funded_escrow(
        &env,
        &client,
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &token,
        &agreement_id,
        &dispute_resolution_contract,
        1000,
    );

    let reason = soroban_sdk::String::from_str(&env, "dispute");
    // Only depositor/beneficiary can initiate dispute
    client.initiate_dispute(&escrow_id, &outsider, &reason);
}

// ── resolve_dispute_from_arbitration ────────────────────────────────────────
//
// NOTE (issue #1560): `resolve_dispute` (arbiter-gated) has been removed.
// `test_arbiter_can_resolve_dispute` is migrated below to prove the
// equivalent property under the new model: resolution now requires a call
// genuinely routed through the escrow's configured
// dispute_resolution_contract, not any particular human-controlled address
// (arbiter included). `test_non_arbiter_cannot_resolve_dispute`'s intent —
// "an address that isn't authorized cannot resolve" — is still covered, but
// precisely distinguishing "authorized dispute_resolution contract" from
// "any other caller" requires NOT using `env.mock_all_auths()` (blanket
// mocking cannot express that distinction, see the note in
// `tests.rs::test_authorization_resolve_dispute_direct_call_fails`'s
// replacement comment), so that half of the coverage lives in
// `tests_dispute_resolution_integration` instead of here.

#[test]
fn test_dispute_resolution_contract_can_resolve_dispute() {
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

    let escrow_id = funded_escrow(
        &env,
        &client,
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &token,
        &agreement_id,
        &dispute_resolution_contract,
        1000,
    );

    let reason = soroban_sdk::String::from_str(&env, "dispute");
    client.initiate_dispute(&escrow_id, &depositor, &reason);

    // The escrow's configured dispute_resolution_contract resolves the
    // dispute in favor of beneficiary, via the same
    // resolve_dispute_from_arbitration path any completed arbitration
    // outcome must use.
    let mock_client =
        crate::tests_support::MockDisputeResolutionClient::new(&env, &dispute_resolution_contract);
    let result = mock_client.try_resolve_and_release(&client.address, &escrow_id, &beneficiary);
    assert!(
        result.is_ok(),
        "the configured dispute_resolution_contract should be able to resolve"
    );
    assert_eq!(client.get_escrow(&escrow_id).status, EscrowStatus::Released);
}

// ── approve_partial_release ─────────────────────────────────────────────────

#[test]
fn test_depositor_can_approve_partial_release() {
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

    let escrow_id = funded_escrow(
        &env,
        &client,
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &token,
        &agreement_id,
        &dispute_resolution_contract,
        1000,
    );

    let result = client.try_approve_partial_release(&escrow_id, &depositor, &beneficiary);
    assert!(
        result.is_ok(),
        "depositor should be able to approve partial release"
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_outsider_cannot_approve_partial_release() {
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
    let outsider = Address::generate(&env);

    let escrow_id = funded_escrow(
        &env,
        &client,
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &token,
        &agreement_id,
        &dispute_resolution_contract,
        1000,
    );

    // Outsider cannot approve partial release
    client.approve_partial_release(&escrow_id, &outsider, &beneficiary);
}

// ── admin_unfreeze ──────────────────────────────────────────────────────────

#[test]
fn test_admin_can_unfreeze_and_release() {
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
    let admin = Address::generate(&env);
    client.initialize_admin(&admin);

    let escrow_id = funded_escrow(
        &env,
        &client,
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &token,
        &agreement_id,
        &dispute_resolution_contract,
        1000,
    );

    let reason = soroban_sdk::String::from_str(&env, "security freeze");
    client.freeze_escrow(&escrow_id, &admin, &reason);
    assert!(client.is_escrow_frozen(&escrow_id));

    // Admin unfreezes
    let result = client.try_unfreeze_escrow(&escrow_id, &admin);
    assert!(result.is_ok(), "admin should be able to unfreeze escrow");
    assert!(!client.is_escrow_frozen(&escrow_id));
}

// ─── Global Pause Tests (#1689) ───────────────────────────────────────────────
//
// escrow already had per-escrow freeze; these tests cover the separate
// contract-wide pause: an authorized emergency stop of ALL state-changing
// entry points (not just one escrow), while reads remain available.

#[test]
fn test_admin_can_pause_and_unpause() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, ..) = setup(&env);
    let admin = Address::generate(&env);
    client.initialize_admin(&admin);

    assert!(!client.is_paused());

    let result = client.try_pause(&admin);
    assert!(result.is_ok(), "admin should be able to pause");
    assert!(client.is_paused());

    let result = client.try_unpause(&admin);
    assert!(result.is_ok(), "admin should be able to unpause");
    assert!(!client.is_paused());
}

#[test]
fn test_non_admin_cannot_pause() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, ..) = setup(&env);
    let admin = Address::generate(&env);
    client.initialize_admin(&admin);

    let outsider = Address::generate(&env);
    let result = client.try_pause(&outsider);
    assert_eq!(result, Err(Ok(EscrowError::NotAuthorized)));
    assert!(!client.is_paused());
}

#[test]
fn test_non_admin_cannot_unpause() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, ..) = setup(&env);
    let admin = Address::generate(&env);
    client.initialize_admin(&admin);
    client.pause(&admin);

    let outsider = Address::generate(&env);
    let result = client.try_unpause(&outsider);
    assert_eq!(result, Err(Ok(EscrowError::NotAuthorized)));
    assert!(client.is_paused());
}

#[test]
fn test_double_pause_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, ..) = setup(&env);
    let admin = Address::generate(&env);
    client.initialize_admin(&admin);
    client.pause(&admin);

    let result = client.try_pause(&admin);
    assert_eq!(result, Err(Ok(EscrowError::ContractPaused)));
}

#[test]
fn test_unpause_when_not_paused_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, ..) = setup(&env);
    let admin = Address::generate(&env);
    client.initialize_admin(&admin);

    let result = client.try_unpause(&admin);
    assert_eq!(result, Err(Ok(EscrowError::NotPaused)));
}

#[test]
fn test_create_blocked_while_paused() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, depositor, beneficiary, arbiter, platform_governance, agent_referral, token) =
        setup(&env);
    let admin = Address::generate(&env);
    client.initialize_admin(&admin);
    client.pause(&admin);

    let result = client.try_create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &1000,
        &token,
    );
    assert_eq!(result, Err(Ok(EscrowError::ContractPaused)));
}

#[test]
fn test_fund_escrow_blocked_while_paused() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, depositor, beneficiary, arbiter, platform_governance, agent_referral, token) =
        setup(&env);
    let admin = Address::generate(&env);
    client.initialize_admin(&admin);

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &1000,
        &token,
    );
    let token_admin_client = TokenAdminClient::new(&env, &token);
    token_admin_client.mint(&depositor, &1000);

    client.pause(&admin);

    let result = client.try_fund_escrow(&escrow_id, &depositor);
    assert_eq!(result, Err(Ok(EscrowError::ContractPaused)));
}

#[test]
fn test_approve_release_blocked_while_paused() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, depositor, beneficiary, arbiter, platform_governance, agent_referral, token) =
        setup(&env);
    let admin = Address::generate(&env);
    client.initialize_admin(&admin);

    let escrow_id = funded_escrow(
        &env,
        &client,
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &token,
        1000,
    );

    client.pause(&admin);

    let result = client.try_approve_release(&escrow_id, &depositor, &beneficiary);
    assert_eq!(result, Err(Ok(EscrowError::ContractPaused)));
}

#[test]
fn test_initiate_dispute_blocked_while_paused() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, depositor, beneficiary, arbiter, platform_governance, agent_referral, token) =
        setup(&env);
    let admin = Address::generate(&env);
    client.initialize_admin(&admin);

    let escrow_id = funded_escrow(
        &env,
        &client,
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &token,
        1000,
    );

    client.pause(&admin);

    let reason = soroban_sdk::String::from_str(&env, "disputed while paused");
    let result = client.try_initiate_dispute(&escrow_id, &depositor, &reason);
    assert_eq!(result, Err(Ok(EscrowError::ContractPaused)));
}

#[test]
fn test_reads_remain_available_while_paused() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, depositor, beneficiary, arbiter, platform_governance, agent_referral, token) =
        setup(&env);
    let admin = Address::generate(&env);
    client.initialize_admin(&admin);

    let escrow_id = funded_escrow(
        &env,
        &client,
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &token,
        1000,
    );

    client.pause(&admin);

    // Reads must keep working while the contract is paused.
    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Funded);
    assert_eq!(client.get_admin(), Some(admin));
    assert!(client.is_paused());
    assert!(!client.is_escrow_frozen(&escrow_id));
}

#[test]
fn test_unpausing_restores_normal_operation() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, depositor, beneficiary, arbiter, platform_governance, agent_referral, token) =
        setup(&env);
    let admin = Address::generate(&env);
    client.initialize_admin(&admin);

    let escrow_id = funded_escrow(
        &env,
        &client,
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &token,
        1000,
    );

    client.pause(&admin);
    let blocked = client.try_approve_release(&escrow_id, &depositor, &beneficiary);
    assert_eq!(blocked, Err(Ok(EscrowError::ContractPaused)));

    client.unpause(&admin);
    let result = client.try_approve_release(&escrow_id, &depositor, &beneficiary);
    assert!(result.is_ok(), "operations should resume after unpause");
}

#[test]
fn test_admin_can_still_freeze_and_unfreeze_while_paused() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, depositor, beneficiary, arbiter, platform_governance, agent_referral, token) =
        setup(&env);
    let admin = Address::generate(&env);
    client.initialize_admin(&admin);

    let escrow_id = funded_escrow(
        &env,
        &client,
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &token,
        1000,
    );

    client.pause(&admin);

    // Emergency per-escrow freeze/unfreeze must still work while the whole
    // contract is paused, since both are themselves admin-controlled
    // emergency mechanisms, not regular state-changing operations.
    let reason = soroban_sdk::String::from_str(&env, "freeze during pause");
    let result = client.try_freeze_escrow(&escrow_id, &admin, &reason);
    assert!(
        result.is_ok(),
        "admin should still be able to freeze while paused"
    );

    let result = client.try_unfreeze_escrow(&escrow_id, &admin);
    assert!(
        result.is_ok(),
        "admin should still be able to unfreeze while paused"
    );
}
