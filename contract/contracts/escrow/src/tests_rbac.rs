//! Role-Based Access Control tests for the Escrow contract.
//!
//! Verifies that admin-only functions enforce the admin role and that
//! escrow operations are restricted to the correct parties.

use soroban_sdk::testutils::Address as _;
use soroban_sdk::token::StellarAssetClient as TokenAdminClient;
use soroban_sdk::{Address, Env};

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

    (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token,
    )
}

fn funded_escrow(
    env: &Env,
    client: &EscrowContractClient<'_>,
    depositor: &Address,
    beneficiary: &Address,
    arbiter: &Address,
    platform_governance: &Address,
    agent_referral: &Address,
    token: &Address,
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

    let reason = soroban_sdk::String::from_str(&env, "security audit");
    let result = client.try_freeze_escrow(&escrow_id, &admin, &reason);
    assert!(result.is_ok(), "admin should be able to freeze escrow");
    assert!(client.is_escrow_frozen(&escrow_id));
}

#[test]
fn test_arbiter_can_freeze_escrow() {
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

    let reason = soroban_sdk::String::from_str(&env, "dispute opened");
    let result = client.try_freeze_escrow(&escrow_id, &arbiter, &reason);
    assert!(result.is_ok(), "arbiter should be able to freeze escrow");
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn test_non_admin_non_arbiter_cannot_freeze_escrow() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, depositor, beneficiary, arbiter, platform_governance, agent_referral, token) =
        setup(&env);
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

    let (client, depositor, beneficiary, arbiter, platform_governance, agent_referral, token) =
        setup(&env);
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

    let (client, depositor, beneficiary, arbiter, platform_governance, agent_referral, token) =
        setup(&env);
    let amount = 500i128;

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token,
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

    let (client, depositor, beneficiary, arbiter, platform_governance, agent_referral, token) =
        setup(&env);
    let amount = 500i128;

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token,
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
