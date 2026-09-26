//! Tests for the Escrow contract.

use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::token::Client as TokenClient;
use soroban_sdk::token::StellarAssetClient as TokenAdminClient;
use soroban_sdk::{Address, Env};

use crate::escrow_impl::{EscrowContract, EscrowContractClient};
use crate::types::{EscrowStatus, TimeoutConfig};

fn setup_test(
    env: &Env,
) -> (
    EscrowContractClient<'_>,
    Address,
    Address,
    Address,
    Address,
    Address,
    Address,
    soroban_sdk::String,
    Address,
) {
    let contract_id = env.register(EscrowContract, ());
    let client = EscrowContractClient::new(env, &contract_id);

    let depositor = Address::generate(env);
    let beneficiary = Address::generate(env);
    let arbiter = Address::generate(env);
    let platform_governance = Address::generate(env);
    let agent_referral = Address::generate(env);

    let token_admin = Address::generate(env);
    let token_address = env
        .register_stellar_asset_contract_v2(token_admin)
        .address();

    let agreement_id = soroban_sdk::String::from_str(env, "agreement-1");
    let dispute_resolution_contract = crate::tests_support::deploy_mock_dispute_resolution(env);

    (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    )
}

#[test]
fn test_escrow_lifecycle() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test(&env);
    let amount = 1000i128;

    // 1. Create Escrow
    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );
    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Pending);
    assert_eq!(escrow.amount, amount);

    // 2. Fund Escrow
    // Mint tokens to depositor
    let token_admin = TokenAdminClient::new(&env, &token_address);
    token_admin.mint(&depositor, &amount);

    // Check initial balances
    let token_client = TokenClient::new(&env, &token_address);
    assert_eq!(token_client.balance(&depositor), amount);
    assert_eq!(token_client.balance(&client.address), 0);

    client.fund_escrow(&escrow_id, &depositor);

    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Funded);

    // Check balances after funding
    assert_eq!(token_client.balance(&depositor), 0);
    assert_eq!(token_client.balance(&client.address), amount);

    // 3. Approve Release (2-of-3)
    // First approval by depositor
    client.approve_release(&escrow_id, &depositor, &beneficiary);
    assert_eq!(client.get_approval_count(&escrow_id, &beneficiary), 1);

    // Second approval by arbiter
    client.approve_release(&escrow_id, &arbiter, &beneficiary);

    // Final state check
    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Released);

    // Check final balances
    assert_eq!(token_client.balance(&beneficiary), amount);
    assert_eq!(token_client.balance(&client.address), 0);
}

#[test]
fn test_dispute_resolution() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test(&env);
    let amount = 1000i128;

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );

    let token_admin = TokenAdminClient::new(&env, &token_address);
    token_admin.mint(&depositor, &amount);
    client.fund_escrow(&escrow_id, &depositor);

    // Initiate dispute: this now cross-contract delegates into
    // dispute_resolution (issue #1560) instead of resolving anything
    // locally.
    let reason = soroban_sdk::String::from_str(&env, "Service not delivered");
    client.initiate_dispute(&escrow_id, &beneficiary, &reason);

    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Disputed);
    assert_eq!(escrow.dispute_reason, Some(reason.clone()));

    // Prove the dispute was genuinely delegated: dispute_resolution's own
    // record shows exactly one raise_dispute call, keyed by the escrow's
    // agreement_id, carrying the same reason text.
    let mock_client =
        crate::tests_support::MockDisputeResolutionClient::new(&env, &dispute_resolution_contract);
    let calls = mock_client.raise_dispute_calls(&agreement_id);
    assert_eq!(calls.len(), 1);
    assert_eq!(calls.get(0).unwrap(), reason);

    // No single address (not even the legacy `arbiter`) can resolve the
    // dispute directly anymore: `resolve_dispute` no longer exists on the
    // contract at all, and escrow remains Disputed — funds stay frozen
    // until arbitration concludes.
    assert_eq!(client.get_escrow(&escrow_id).status, EscrowStatus::Disputed);

    // Only a completed arbitration outcome, delivered via
    // dispute_resolution's own resolve callback, can release funds.
    mock_client.resolve_and_release(&client.address, &escrow_id, &depositor);

    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Released);

    let token_client = TokenClient::new(&env, &token_address);
    assert_eq!(token_client.balance(&depositor), amount);
    assert_eq!(token_client.balance(&client.address), 0);
}

#[test]
fn test_unauthorized_funding() {
    let env = Env::default();
    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test(&env);
    let amount = 1000i128;

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );

    // Try to fund from beneficiary (should fail since only depositor can fund)
    // We expect an error, but AccessControl check happens before require_auth
    let result = client.try_fund_escrow(&escrow_id, &beneficiary);
    assert!(result.is_err());
}

#[test]
fn test_unique_escrow_ids() {
    use crate::escrow_impl::EscrowContract;
    use soroban_sdk::contract;

    #[contract]
    struct TestContract;

    let env = Env::default();
    let contract_id = env.register(TestContract, ());

    let depositor = Address::generate(&env);
    let beneficiary = Address::generate(&env);
    let arbiter = Address::generate(&env);
    let platform_governance = Address::generate(&env);
    let agent_referral = Address::generate(&env);
    let token = Address::generate(&env);
    let agreement_id = soroban_sdk::String::from_str(&env, "agreement-unique-ids");
    let dispute_resolution_contract = crate::tests_support::deploy_mock_dispute_resolution(&env);

    let escrow_id1 = env
        .as_contract(&contract_id, || {
            EscrowContract::create(
                env.clone(),
                depositor.clone(),
                beneficiary.clone(),
                arbiter.clone(),
                platform_governance.clone(),
                agent_referral.clone(),
                1000,
                token.clone(),
                agreement_id.clone(),
                dispute_resolution_contract.clone(),
            )
        })
        .unwrap();

    env.ledger().with_mut(|li| li.timestamp += 1);

    let escrow_id2 = env
        .as_contract(&contract_id, || {
            EscrowContract::create(
                env.clone(),
                depositor.clone(),
                beneficiary.clone(),
                arbiter.clone(),
                platform_governance.clone(),
                agent_referral.clone(),
                1000,
                token.clone(),
                agreement_id.clone(),
                dispute_resolution_contract.clone(),
            )
        })
        .unwrap();

    assert_ne!(escrow_id1, escrow_id2, "Escrow IDs should be unique");

    let escrow1 = env
        .as_contract(&contract_id, || {
            EscrowContract::get_escrow(env.clone(), escrow_id1.clone())
        })
        .unwrap();

    let escrow2 = env
        .as_contract(&contract_id, || {
            EscrowContract::get_escrow(env.clone(), escrow_id2.clone())
        })
        .unwrap();

    assert_eq!(escrow1.id, escrow_id1);
    assert_eq!(escrow2.id, escrow_id2);
    assert_eq!(escrow1.amount, 1000);
    assert_eq!(escrow2.amount, 1000);
}

#[test]
fn test_duplicate_approval_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test(&env);
    let amount = 1000i128;

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );

    let token_admin = TokenAdminClient::new(&env, &token_address);
    token_admin.mint(&depositor, &amount);
    client.fund_escrow(&escrow_id, &depositor);

    // First approval should succeed
    client.approve_release(&escrow_id, &depositor, &beneficiary);
    assert_eq!(client.get_approval_count(&escrow_id, &beneficiary), 1);

    // Duplicate approval from same signer to same target should fail
    let result = client.try_approve_release(&escrow_id, &depositor, &beneficiary);
    assert!(result.is_err());

    // Count should still be 1
    assert_eq!(client.get_approval_count(&escrow_id, &beneficiary), 1);
}

#[test]
fn test_approval_count_tracks_per_target() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test(&env);
    let amount = 1000i128;

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );

    let token_admin = TokenAdminClient::new(&env, &token_address);
    token_admin.mint(&depositor, &amount);
    client.fund_escrow(&escrow_id, &depositor);

    // Depositor approves release to beneficiary
    client.approve_release(&escrow_id, &depositor, &beneficiary);
    assert_eq!(client.get_approval_count(&escrow_id, &beneficiary), 1);
    assert_eq!(client.get_approval_count(&escrow_id, &depositor), 0);

    // Beneficiary approves release to depositor (different target)
    client.approve_release(&escrow_id, &beneficiary, &depositor);
    assert_eq!(client.get_approval_count(&escrow_id, &beneficiary), 1);
    assert_eq!(client.get_approval_count(&escrow_id, &depositor), 1);

    // Arbiter approves release to beneficiary -> triggers release
    client.approve_release(&escrow_id, &arbiter, &beneficiary);

    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Released);

    let token_client = TokenClient::new(&env, &token_address);
    assert_eq!(token_client.balance(&beneficiary), amount);
}

#[test]
fn test_release_escrow_on_timeout_refunds_depositor() {
    let env = Env::default();
    env.mock_all_auths();
    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test(&env);
    let amount = 1000i128;

    let cfg = TimeoutConfig {
        escrow_timeout_days: 1,
        dispute_timeout_days: 30,
        payment_timeout_days: 7,
    };
    client.set_timeout_config(&depositor, &cfg);

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );
    let token_admin = TokenAdminClient::new(&env, &token_address);
    token_admin.mint(&depositor, &amount);
    client.fund_escrow(&escrow_id, &depositor);

    env.ledger().with_mut(|li| li.timestamp += 2 * 86_400);
    client.release_escrow_on_timeout(&escrow_id);

    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Refunded);

    let token_client = TokenClient::new(&env, &token_address);
    assert_eq!(token_client.balance(&depositor), amount);
    assert_eq!(token_client.balance(&client.address), 0);
}

#[test]
fn test_release_escrow_on_timeout_before_deadline_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test(&env);
    let amount = 1000i128;

    let cfg = TimeoutConfig {
        escrow_timeout_days: 2,
        dispute_timeout_days: 30,
        payment_timeout_days: 7,
    };
    client.set_timeout_config(&depositor, &cfg);

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );
    let token_admin = TokenAdminClient::new(&env, &token_address);
    token_admin.mint(&depositor, &amount);
    client.fund_escrow(&escrow_id, &depositor);

    env.ledger().with_mut(|li| li.timestamp += 86_400);
    let result = client.try_release_escrow_on_timeout(&escrow_id);
    assert!(result.is_err());
}

#[test]
fn test_resolve_dispute_on_timeout_refunds_depositor() {
    let env = Env::default();
    env.mock_all_auths();
    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test(&env);
    let amount = 1000i128;

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );
    let token_admin = TokenAdminClient::new(&env, &token_address);
    token_admin.mint(&depositor, &amount);
    client.fund_escrow(&escrow_id, &depositor);
    client.initiate_dispute(
        &escrow_id,
        &beneficiary,
        &soroban_sdk::String::from_str(&env, "timeout dispute"),
    );

    let cfg = TimeoutConfig {
        escrow_timeout_days: 14,
        dispute_timeout_days: 1,
        payment_timeout_days: 7,
    };
    client.set_timeout_config(&depositor, &cfg);
    env.ledger().with_mut(|li| li.timestamp += 2 * 86_400);

    client.resolve_dispute_on_timeout(&escrow_id);
    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Refunded);

    let token_client = TokenClient::new(&env, &token_address);
    assert_eq!(token_client.balance(&depositor), amount);
    assert_eq!(token_client.balance(&client.address), 0);
}

#[test]
fn test_partial_release_success() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test(&env);
    let amount = 1000i128;
    let partial_amount = 300i128;

    // Create and fund escrow
    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );
    let token_admin = TokenAdminClient::new(&env, &token_address);
    token_admin.mint(&depositor, &amount);
    client.fund_escrow(&escrow_id, &depositor);

    // Get approvals for partial release to beneficiary (2-of-3)
    client.approve_partial_release(&escrow_id, &depositor, &beneficiary);
    client.approve_partial_release(&escrow_id, &arbiter, &beneficiary);

    let reason = soroban_sdk::String::from_str(&env, "Partial payment for services");

    // Execute partial release
    client.release_escrow_partial(&escrow_id, &partial_amount, &beneficiary, &reason);

    // Verify escrow amount updated
    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.amount, amount - partial_amount);
    assert_eq!(escrow.status, EscrowStatus::Funded); // Still funded

    // Verify token transfer
    let token_client = TokenClient::new(&env, &token_address);
    assert_eq!(token_client.balance(&beneficiary), partial_amount);
    assert_eq!(
        token_client.balance(&client.address),
        amount - partial_amount
    );

    // Verify release history
    let history = client.get_release_history(&escrow_id);
    assert_eq!(history.len(), 1);
    assert_eq!(history.get(0).unwrap().amount, partial_amount);
    assert_eq!(history.get(0).unwrap().recipient, beneficiary);
}

#[test]
fn test_partial_release_insufficient_approvals() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test(&env);
    let amount = 1000i128;
    let partial_amount = 300i128;

    // Create and fund escrow
    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );
    let token_admin = TokenAdminClient::new(&env, &token_address);
    token_admin.mint(&depositor, &amount);
    client.fund_escrow(&escrow_id, &depositor);

    // Only one approval
    client.approve_partial_release(&escrow_id, &depositor, &beneficiary);

    let reason = soroban_sdk::String::from_str(&env, "Partial payment");

    // Should fail with NotAuthorized
    let result =
        client.try_release_escrow_partial(&escrow_id, &partial_amount, &beneficiary, &reason);
    assert!(result.is_err());
}

#[test]
fn test_partial_release_exceeds_balance() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test(&env);
    let amount = 1000i128;
    let excessive_amount = 1500i128;

    // Create and fund escrow
    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );
    let token_admin = TokenAdminClient::new(&env, &token_address);
    token_admin.mint(&depositor, &amount);
    client.fund_escrow(&escrow_id, &depositor);

    // Get approvals
    client.approve_partial_release(&escrow_id, &depositor, &beneficiary);
    client.approve_partial_release(&escrow_id, &arbiter, &beneficiary);

    let reason = soroban_sdk::String::from_str(&env, "Excessive payment");

    // Should fail with InsufficientFunds
    let result =
        client.try_release_escrow_partial(&escrow_id, &excessive_amount, &beneficiary, &reason);
    assert!(result.is_err());
}

#[test]
fn test_multiple_partial_releases() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test(&env);
    let amount = 1000i128;

    // Create and fund escrow
    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );
    let token_admin = TokenAdminClient::new(&env, &token_address);
    token_admin.mint(&depositor, &amount);
    client.fund_escrow(&escrow_id, &depositor);

    // First partial release
    client.approve_partial_release(&escrow_id, &depositor, &beneficiary);
    client.approve_partial_release(&escrow_id, &arbiter, &beneficiary);
    client.release_escrow_partial(
        &escrow_id,
        &300i128,
        &beneficiary,
        &soroban_sdk::String::from_str(&env, "First payment"),
    );

    // Second partial release
    client.approve_partial_release(&escrow_id, &depositor, &beneficiary);
    client.approve_partial_release(&escrow_id, &arbiter, &beneficiary);
    client.release_escrow_partial(
        &escrow_id,
        &200i128,
        &beneficiary,
        &soroban_sdk::String::from_str(&env, "Second payment"),
    );

    // Verify escrow balance
    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.amount, 500i128);

    // Verify token balances
    let token_client = TokenClient::new(&env, &token_address);
    assert_eq!(token_client.balance(&beneficiary), 500i128);
    assert_eq!(token_client.balance(&client.address), 500i128);

    // Verify release history
    let history = client.get_release_history(&escrow_id);
    assert_eq!(history.len(), 2);
}

#[test]
fn test_damage_deduction_success() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test(&env);
    let amount = 1000i128;
    let damage_amount = 200i128;

    // Create and fund escrow
    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );
    let token_admin = TokenAdminClient::new(&env, &token_address);
    token_admin.mint(&depositor, &amount);
    client.fund_escrow(&escrow_id, &depositor);

    // Get approvals for release to depositor (2-of-3)
    client.approve_partial_release(&escrow_id, &beneficiary, &depositor);
    client.approve_partial_release(&escrow_id, &arbiter, &depositor);

    let reason = soroban_sdk::String::from_str(&env, "Damaged furniture");

    // Execute damage deduction
    client.release_with_deduction(&escrow_id, &damage_amount, &reason);

    // Verify escrow is fully released
    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Released);

    // Verify token transfers
    let token_client = TokenClient::new(&env, &token_address);
    assert_eq!(token_client.balance(&beneficiary), damage_amount); // Damage to landlord
    assert_eq!(token_client.balance(&depositor), amount - damage_amount); // Refund to tenant
    assert_eq!(token_client.balance(&client.address), 0); // Contract empty

    // Verify release history
    let history = client.get_release_history(&escrow_id);
    assert_eq!(history.len(), 2); // Two records: damage and refund
}

#[test]
fn test_damage_deduction_full_amount() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test(&env);
    let amount = 1000i128;
    let damage_amount = 1000i128; // Full damage

    // Create and fund escrow
    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );
    let token_admin = TokenAdminClient::new(&env, &token_address);
    token_admin.mint(&depositor, &amount);
    client.fund_escrow(&escrow_id, &depositor);

    // Get approvals
    client.approve_partial_release(&escrow_id, &beneficiary, &depositor);
    client.approve_partial_release(&escrow_id, &arbiter, &depositor);

    let reason = soroban_sdk::String::from_str(&env, "Total property damage");

    // Execute full damage deduction
    client.release_with_deduction(&escrow_id, &damage_amount, &reason);

    // Verify balances
    let token_client = TokenClient::new(&env, &token_address);
    assert_eq!(token_client.balance(&beneficiary), damage_amount);
    assert_eq!(token_client.balance(&depositor), 0);
    assert_eq!(token_client.balance(&client.address), 0);

    // Verify escrow is released
    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Released);
}

#[test]
fn test_damage_deduction_no_damage() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test(&env);
    let amount = 1000i128;
    let damage_amount = 0i128; // No damage

    // Create and fund escrow
    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );
    let token_admin = TokenAdminClient::new(&env, &token_address);
    token_admin.mint(&depositor, &amount);
    client.fund_escrow(&escrow_id, &depositor);

    // Get approvals
    client.approve_partial_release(&escrow_id, &beneficiary, &depositor);
    client.approve_partial_release(&escrow_id, &arbiter, &depositor);

    let reason = soroban_sdk::String::from_str(&env, "No damage found");

    // Execute with no damage
    client.release_with_deduction(&escrow_id, &damage_amount, &reason);

    // Verify full refund to depositor
    let token_client = TokenClient::new(&env, &token_address);
    assert_eq!(token_client.balance(&beneficiary), 0);
    assert_eq!(token_client.balance(&depositor), amount);
    assert_eq!(token_client.balance(&client.address), 0);
}

#[test]
fn test_damage_deduction_exceeds_balance() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test(&env);
    let amount = 1000i128;
    let damage_amount = 1500i128; // Exceeds balance

    // Create and fund escrow
    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );
    let token_admin = TokenAdminClient::new(&env, &token_address);
    token_admin.mint(&depositor, &amount);
    client.fund_escrow(&escrow_id, &depositor);

    // Get approvals
    client.approve_partial_release(&escrow_id, &beneficiary, &depositor);
    client.approve_partial_release(&escrow_id, &arbiter, &depositor);

    let reason = soroban_sdk::String::from_str(&env, "Excessive damage");

    // Should fail with InsufficientFunds
    let result = client.try_release_with_deduction(&escrow_id, &damage_amount, &reason);
    assert!(result.is_err());
}

#[test]
fn test_damage_deduction_insufficient_approvals() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test(&env);
    let amount = 1000i128;
    let damage_amount = 200i128;

    // Create and fund escrow
    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );
    let token_admin = TokenAdminClient::new(&env, &token_address);
    token_admin.mint(&depositor, &amount);
    client.fund_escrow(&escrow_id, &depositor);

    // Only one approval
    client.approve_partial_release(&escrow_id, &beneficiary, &depositor);

    let reason = soroban_sdk::String::from_str(&env, "Damage");

    // Should fail with NotAuthorized
    let result = client.try_release_with_deduction(&escrow_id, &damage_amount, &reason);
    assert!(result.is_err());
}

#[test]
fn test_partial_release_invalid_recipient() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test(&env);
    let amount = 1000i128;
    let invalid_recipient = Address::generate(&env);

    // Create and fund escrow
    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );
    let token_admin = TokenAdminClient::new(&env, &token_address);
    token_admin.mint(&depositor, &amount);
    client.fund_escrow(&escrow_id, &depositor);

    // Get approvals (though it will fail)
    // This should fail at approve_partial_release due to invalid target
    let approve_result1 =
        client.try_approve_partial_release(&escrow_id, &depositor, &invalid_recipient);
    assert!(approve_result1.is_err()); // Should fail with InvalidApprovalTarget
}

#[test]
fn test_partial_release_empty_reason() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test(&env);
    let amount = 1000i128;

    // Create and fund escrow
    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );
    let token_admin = TokenAdminClient::new(&env, &token_address);
    token_admin.mint(&depositor, &amount);
    client.fund_escrow(&escrow_id, &depositor);

    // Get approvals
    client.approve_partial_release(&escrow_id, &depositor, &beneficiary);
    client.approve_partial_release(&escrow_id, &arbiter, &beneficiary);

    let empty_reason = soroban_sdk::String::from_str(&env, "");

    // Should fail with EmptyReleaseReason
    let result =
        client.try_release_escrow_partial(&escrow_id, &300i128, &beneficiary, &empty_reason);
    assert!(result.is_err());
}

// ─── Issue #650: Access Control Tests ──────────────────────────────────────

#[test]
fn test_is_depositor_correct_address() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test(&env);
    let amount = 1000i128;

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );
    let escrow = client.get_escrow(&escrow_id);

    assert_eq!(escrow.depositor, depositor);
}

#[test]
fn test_is_depositor_incorrect_address() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test(&env);
    let amount = 1000i128;
    let wrong_address = Address::generate(&env);

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );
    let escrow = client.get_escrow(&escrow_id);

    assert_ne!(escrow.depositor, wrong_address);
}

#[test]
fn test_is_beneficiary_correct_address() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test(&env);
    let amount = 1000i128;

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );
    let escrow = client.get_escrow(&escrow_id);

    assert_eq!(escrow.beneficiary, beneficiary);
}

#[test]
fn test_is_beneficiary_incorrect_address() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test(&env);
    let amount = 1000i128;
    let wrong_address = Address::generate(&env);

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );
    let escrow = client.get_escrow(&escrow_id);

    assert_ne!(escrow.beneficiary, wrong_address);
}

#[test]
fn test_is_arbiter_correct_address() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test(&env);
    let amount = 1000i128;

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );
    let escrow = client.get_escrow(&escrow_id);

    assert_eq!(escrow.arbiter, arbiter);
}

#[test]
fn test_is_arbiter_incorrect_address() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test(&env);
    let amount = 1000i128;
    let wrong_address = Address::generate(&env);

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );
    let escrow = client.get_escrow(&escrow_id);

    assert_ne!(escrow.arbiter, wrong_address);
}

#[test]
fn test_is_party_depositor() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test(&env);
    let amount = 1000i128;

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );
    let escrow = client.get_escrow(&escrow_id);

    // Depositor is a party
    assert!(
        escrow.depositor == depositor
            || escrow.beneficiary == depositor
            || escrow.arbiter == depositor
    );
}

#[test]
fn test_is_party_beneficiary() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test(&env);
    let amount = 1000i128;

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );
    let escrow = client.get_escrow(&escrow_id);

    // Beneficiary is a party
    assert!(
        escrow.depositor == beneficiary
            || escrow.beneficiary == beneficiary
            || escrow.arbiter == beneficiary
    );
}

#[test]
fn test_is_party_arbiter() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test(&env);
    let amount = 1000i128;

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );
    let escrow = client.get_escrow(&escrow_id);

    // Arbiter is a party
    assert!(
        escrow.depositor == arbiter || escrow.beneficiary == arbiter || escrow.arbiter == arbiter
    );
}

#[test]
fn test_is_party_non_party() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test(&env);
    let amount = 1000i128;
    let non_party = Address::generate(&env);

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );
    let escrow = client.get_escrow(&escrow_id);

    // Non-party should not match any party
    assert!(
        escrow.depositor != non_party
            && escrow.beneficiary != non_party
            && escrow.arbiter != non_party
    );
}

#[test]
fn test_authorization_fund_escrow_depositor_only() {
    let env = Env::default();
    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test(&env);
    let amount = 1000i128;

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );

    // Only depositor can fund
    env.mock_all_auths();
    let token_admin = TokenAdminClient::new(&env, &token_address);
    token_admin.mint(&depositor, &amount);

    let result = client.try_fund_escrow(&escrow_id, &depositor);
    assert!(result.is_ok());
}

#[test]
fn test_authorization_fund_escrow_beneficiary_fails() {
    let env = Env::default();
    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test(&env);
    let amount = 1000i128;

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );

    // Beneficiary cannot fund
    let result = client.try_fund_escrow(&escrow_id, &beneficiary);
    assert!(result.is_err());
}

#[test]
fn test_authorization_fund_escrow_arbiter_fails() {
    let env = Env::default();
    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test(&env);
    let amount = 1000i128;

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );

    // Arbiter cannot fund
    let result = client.try_fund_escrow(&escrow_id, &arbiter);
    assert!(result.is_err());
}

#[test]
fn test_authorization_initiate_dispute_beneficiary() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test(&env);
    let amount = 1000i128;

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );
    let token_admin = TokenAdminClient::new(&env, &token_address);
    token_admin.mint(&depositor, &amount);
    client.fund_escrow(&escrow_id, &depositor);

    // Beneficiary can initiate dispute
    let reason = soroban_sdk::String::from_str(&env, "Service not delivered");
    let result = client.try_initiate_dispute(&escrow_id, &beneficiary, &reason);
    assert!(result.is_ok());
}

#[test]
fn test_authorization_initiate_dispute_depositor() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test(&env);
    let amount = 1000i128;

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );
    let token_admin = TokenAdminClient::new(&env, &token_address);
    token_admin.mint(&depositor, &amount);
    client.fund_escrow(&escrow_id, &depositor);

    // Depositor can initiate dispute
    let reason = soroban_sdk::String::from_str(&env, "Dispute from depositor");
    let result = client.try_initiate_dispute(&escrow_id, &depositor, &reason);
    assert!(result.is_ok());
}

#[test]
fn test_authorization_initiate_dispute_arbiter_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test(&env);
    let amount = 1000i128;

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );
    let token_admin = TokenAdminClient::new(&env, &token_address);
    token_admin.mint(&depositor, &amount);
    client.fund_escrow(&escrow_id, &depositor);

    // Arbiter cannot initiate dispute
    let reason = soroban_sdk::String::from_str(&env, "Arbiter dispute");
    let result = client.try_initiate_dispute(&escrow_id, &arbiter, &reason);
    assert!(result.is_err());
}

// NOTE (issue #1560): the following three tests originally asserted
// "only arbiter can resolve_dispute" / "depositor/beneficiary cannot
// resolve_dispute" against the old unilateral single-arbiter
// `resolve_dispute`. That function has been removed entirely — no single
// address (arbiter included) can resolve a dispute anymore. They are
// migrated here to assert the equivalent property under the new model:
// resolution is exclusively a function of *which contract* is calling
// `resolve_dispute_from_arbitration`, not which human/party address is
// passed as an argument (there is no such argument anymore). A fuller,
// genuinely cross-contract version of this coverage — proving a real
// dispute_resolution-shaped caller succeeds while a direct call does not —
// lives in `tests_dispute_resolution_integration`.

#[test]
fn test_authorization_resolve_dispute_only_dispute_resolution_contract() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test(&env);
    let amount = 1000i128;

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );
    let token_admin = TokenAdminClient::new(&env, &token_address);
    token_admin.mint(&depositor, &amount);
    client.fund_escrow(&escrow_id, &depositor);
    client.initiate_dispute(
        &escrow_id,
        &beneficiary,
        &soroban_sdk::String::from_str(&env, "dispute"),
    );

    // The legacy `arbiter` address alone can no longer resolve anything —
    // `resolve_dispute` (arbiter-gated) no longer exists on the contract at
    // all. Only the escrow's configured dispute_resolution_contract, acting
    // through a completed arbitration outcome, can release funds.
    let mock_client =
        crate::tests_support::MockDisputeResolutionClient::new(&env, &dispute_resolution_contract);
    let result = mock_client.try_resolve_and_release(&client.address, &escrow_id, &depositor);
    assert!(
        result.is_ok(),
        "the escrow's own configured dispute_resolution_contract should be able to resolve"
    );
    assert_eq!(client.get_escrow(&escrow_id).status, EscrowStatus::Released);
}

// A test proving a DIRECT (non-dispute_resolution) call to
// resolve_dispute_from_arbitration is rejected cannot use
// `env.mock_all_auths()` here: blanket mocking authorizes every
// `require_auth()` call unconditionally ("It is not currently possible to
// mock a subset of auths" — soroban_sdk::Env::mock_all_auths), so it cannot
// distinguish a genuine dispute_resolution-contract caller from any other
// caller. That precise boundary is instead proven in
// `tests_dispute_resolution_integration`, without `mock_all_auths()`, by
// actually attempting the call from outside dispute_resolution's own
// invocation and observing the host reject it, alongside the positive case
// (a call genuinely routed through the mock dispute_resolution contract
// succeeding with zero extra auth setup, per
// `Env::authorize_as_current_contract`'s documented "direct calls ... are
// always considered to have been authorized" rule).

// ─── Issue #650: Rate Limiting Tests ───────────────────────────────────────

// Rate limit tests removed - rate limit config is not exposed as a public method
// The rate limiting is tested implicitly through other tests

// ─── Issue #839: Multi-Party Payout & Safety Deposit Tests ─────────────────

fn setup_test_with_fees(
    env: &Env,
) -> (
    EscrowContractClient<'_>,
    Address,
    Address,
    Address,
    Address,
    Address,
    Address,
    soroban_sdk::String,
    Address,
) {
    let contract_id = env.register(EscrowContract, ());
    let client = EscrowContractClient::new(env, &contract_id);

    let depositor = Address::generate(env);
    let beneficiary = Address::generate(env);
    let arbiter = Address::generate(env);
    let platform_governance = Address::generate(env);
    let agent_referral = Address::generate(env);

    let token_admin = Address::generate(env);
    let token_address = env
        .register_stellar_asset_contract_v2(token_admin)
        .address();

    let agreement_id = soroban_sdk::String::from_str(env, "agreement-fees-1");
    let dispute_resolution_contract = crate::tests_support::deploy_mock_dispute_resolution(env);

    (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    )
}

#[test]
fn test_release_rent_splits_90_5_5() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test_with_fees(&env);
    let amount = 1000i128;

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );

    let token_admin = TokenAdminClient::new(&env, &token_address);
    token_admin.mint(&depositor, &amount);
    client.fund_escrow(&escrow_id, &depositor);

    let token_client = TokenClient::new(&env, &token_address);
    assert_eq!(token_client.balance(&client.address), amount);

    client.release_rent(&escrow_id, &arbiter);

    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Released);

    assert_eq!(token_client.balance(&beneficiary), 900);
    assert_eq!(token_client.balance(&platform_governance), 50);
    assert_eq!(token_client.balance(&agent_referral), 50);
    assert_eq!(token_client.balance(&client.address), 0);
}

#[test]
fn test_release_rent_rounding_remainder_goes_to_agent() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test_with_fees(&env);
    // 101 * 90 / 100 = 90, 101 * 5 / 100 = 5, remainder = 101 - 90 - 5 = 6
    let amount = 101i128;

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );

    let token_admin = TokenAdminClient::new(&env, &token_address);
    token_admin.mint(&depositor, &amount);
    client.fund_escrow(&escrow_id, &depositor);

    client.release_rent(&escrow_id, &arbiter);

    let token_client = TokenClient::new(&env, &token_address);
    assert_eq!(token_client.balance(&beneficiary), 90);
    assert_eq!(token_client.balance(&platform_governance), 5);
    assert_eq!(token_client.balance(&agent_referral), 6);
    assert_eq!(token_client.balance(&client.address), 0);
}

#[test]
fn test_release_rent_only_arbiter_can_call() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test_with_fees(&env);
    let amount = 1000i128;

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );

    let token_admin = TokenAdminClient::new(&env, &token_address);
    token_admin.mint(&depositor, &amount);
    client.fund_escrow(&escrow_id, &depositor);

    let result = client.try_release_rent(&escrow_id, &depositor);
    assert!(result.is_err());

    let result = client.try_release_rent(&escrow_id, &beneficiary);
    assert!(result.is_err());
}

#[test]
fn test_release_rent_blocked_when_disputed() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test_with_fees(&env);
    let amount = 1000i128;

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );

    let token_admin = TokenAdminClient::new(&env, &token_address);
    token_admin.mint(&depositor, &amount);
    client.fund_escrow(&escrow_id, &depositor);

    client.initiate_dispute(
        &escrow_id,
        &depositor,
        &soroban_sdk::String::from_str(&env, "payment issue"),
    );

    let result = client.try_release_rent(&escrow_id, &arbiter);
    assert!(result.is_err());
}

#[test]
fn test_withdraw_safety_deposit_success_after_timeout() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test_with_fees(&env);
    let amount = 500i128;

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );

    let token_admin = TokenAdminClient::new(&env, &token_address);
    token_admin.mint(&depositor, &amount);
    client.fund_escrow(&escrow_id, &depositor);

    let config = client.get_timeout_config();
    let timeout_seconds = config.escrow_timeout_days * 86_400;

    env.ledger().with_mut(|l| {
        l.timestamp += timeout_seconds + 1;
    });

    client.withdraw_safety_deposit(&escrow_id, &depositor);

    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Refunded);

    let token_client = TokenClient::new(&env, &token_address);
    assert_eq!(token_client.balance(&depositor), amount);
    assert_eq!(token_client.balance(&client.address), 0);
}

#[test]
fn test_withdraw_safety_deposit_blocked_before_timeout() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test_with_fees(&env);
    let amount = 500i128;

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );

    let token_admin = TokenAdminClient::new(&env, &token_address);
    token_admin.mint(&depositor, &amount);
    client.fund_escrow(&escrow_id, &depositor);

    let result = client.try_withdraw_safety_deposit(&escrow_id, &depositor);
    assert!(result.is_err());
}

#[test]
fn test_withdraw_safety_deposit_blocked_when_disputed() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test_with_fees(&env);
    let amount = 500i128;

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );

    let token_admin = TokenAdminClient::new(&env, &token_address);
    token_admin.mint(&depositor, &amount);
    client.fund_escrow(&escrow_id, &depositor);

    client.initiate_dispute(
        &escrow_id,
        &depositor,
        &soroban_sdk::String::from_str(&env, "damage claim"),
    );

    let config = client.get_timeout_config();
    let timeout_seconds = config.escrow_timeout_days * 86_400;
    env.ledger().with_mut(|l| {
        l.timestamp += timeout_seconds + 1;
    });

    let result = client.try_withdraw_safety_deposit(&escrow_id, &depositor);
    assert!(result.is_err());
}

#[test]
fn test_withdraw_safety_deposit_only_depositor_can_call() {
    let env = Env::default();
    env.mock_all_auths();

    let (
        client,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        token_address,
        agreement_id,
        dispute_resolution_contract,
    ) = setup_test_with_fees(&env);
    let amount = 500i128;

    let escrow_id = client.create(
        &depositor,
        &beneficiary,
        &arbiter,
        &platform_governance,
        &agent_referral,
        &amount,
        &token_address,
        &agreement_id,
        &dispute_resolution_contract,
    );

    let token_admin = TokenAdminClient::new(&env, &token_address);
    token_admin.mint(&depositor, &amount);
    client.fund_escrow(&escrow_id, &depositor);

    let config = client.get_timeout_config();
    let timeout_seconds = config.escrow_timeout_days * 86_400;
    env.ledger().with_mut(|l| {
        l.timestamp += timeout_seconds + 1;
    });

    let result = client.try_withdraw_safety_deposit(&escrow_id, &beneficiary);
    assert!(result.is_err());
}

#[test]
fn test_release_history_bounded_by_max() {
    use crate::storage::EscrowStorage;
    use crate::types::ReleaseRecord;
    use soroban_sdk::contract;

    #[contract]
    struct TestContract;

    let env = Env::default();
    let contract_id = env.register(TestContract, ());
    let escrow_id = soroban_sdk::BytesN::from_array(&env, &[7u8; 32]);
    let recipient = Address::generate(&env);

    // Appending well past MAX_RELEASE_HISTORY (64) must not let the list
    // grow unbounded (#1683): the oldest entries are dropped instead.
    env.as_contract(&contract_id, || {
        for i in 0..100u32 {
            EscrowStorage::add_release_record(
                &env,
                &escrow_id,
                ReleaseRecord {
                    escrow_id: escrow_id.clone(),
                    amount: i as i128,
                    recipient: recipient.clone(),
                    released_at: env.ledger().timestamp(),
                    reason: soroban_sdk::String::from_str(&env, "partial"),
                },
            );
        }
    });

    let history = env.as_contract(&contract_id, || {
        EscrowStorage::get_release_history(&env, &escrow_id)
    });

    assert_eq!(history.len(), 64);
    // The oldest 36 records (amount 0..=35) should have been evicted,
    // leaving the most recent 64 (amount 36..=99).
    assert_eq!(history.get(0).unwrap().amount, 36);
    assert_eq!(history.get(63).unwrap().amount, 99);
}

#[test]
fn test_save_extends_escrow_ttl() {
    use crate::storage::EscrowStorage;
    use crate::types::{Escrow, EscrowStatus};
    use soroban_sdk::testutils::storage::Persistent as _;
    use soroban_sdk::{contract, BytesN};

    #[contract]
    struct TestContract;

    let env = Env::default();
    let contract_id = env.register(TestContract, ());
    let escrow_id = BytesN::from_array(&env, &[3u8; 32]);
    let party = Address::generate(&env);
    let token = Address::generate(&env);

    let escrow = Escrow {
        id: escrow_id.clone(),
        depositor: party.clone(),
        beneficiary: party.clone(),
        arbiter: party.clone(),
        platform_governance: party.clone(),
        agent_referral: party.clone(),
        amount: 1000,
        token,
        status: EscrowStatus::Pending,
        created_at: env.ledger().timestamp(),
        timeout_days: 14,
        disputed_at: None,
        dispute_reason: None,
        is_frozen: false,
        frozen_at: None,
        freeze_reason: None,
    };

    // save() must extend the entity's TTL (#1683): before this fix, only
    // rate-limit and upgrade keys ever called extend_ttl, so an escrow
    // that received no further writes could be archived out from under an
    // open, funded position.
    let ttl = env.as_contract(&contract_id, || {
        EscrowStorage::save(&env, &escrow);
        let key = crate::types::DataKey::Escrow(escrow_id.clone());
        env.storage().persistent().get_ttl(&key)
    });

    assert!(
        ttl >= 499_000,
        "expected the escrow key's TTL to be bumped close to the 500_000-ledger threshold, got {ttl}"
    );
}
