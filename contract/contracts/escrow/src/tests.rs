//! Tests for the Escrow contract.

use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::token::Client as TokenClient;
use soroban_sdk::token::StellarAssetClient as TokenAdminClient;
use soroban_sdk::{Address, Env};

use crate::escrow_impl::{EscrowContract, EscrowContractClient};
use crate::types::{EscrowStatus, TimeoutConfig};

fn setup_test(env: &Env) -> (EscrowContractClient<'_>, Address, Address, Address, Address) {
    let contract_id = env.register(EscrowContract, ());
    let client = EscrowContractClient::new(env, &contract_id);

    let depositor = Address::generate(env);
    let beneficiary = Address::generate(env);
    let arbiter = Address::generate(env);

    let token_admin = Address::generate(env);
    let token_address = env
        .register_stellar_asset_contract_v2(token_admin)
        .address();

    (client, depositor, beneficiary, arbiter, token_address)
}

#[test]
fn test_escrow_lifecycle() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, depositor, beneficiary, arbiter, token_address) = setup_test(&env);
    let amount = 1000i128;

    // 1. Create Escrow
    let escrow_id = client.create(&depositor, &beneficiary, &arbiter, &amount, &token_address);
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

    let (client, depositor, beneficiary, arbiter, token_address) = setup_test(&env);
    let amount = 1000i128;

    let escrow_id = client.create(&depositor, &beneficiary, &arbiter, &amount, &token_address);

    let token_admin = TokenAdminClient::new(&env, &token_address);
    token_admin.mint(&depositor, &amount);
    client.fund_escrow(&escrow_id, &depositor);

    // Initiate dispute
    let reason = soroban_sdk::String::from_str(&env, "Service not delivered");
    client.initiate_dispute(&escrow_id, &beneficiary, &reason);

    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Disputed);
    assert_eq!(escrow.dispute_reason, Some(reason));

    // Resolve dispute by arbiter (refund to depositor)
    client.resolve_dispute(&escrow_id, &arbiter, &depositor);

    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Released); // resolve_dispute currently sets status to Released regardless of target

    let token_client = TokenClient::new(&env, &token_address);
    assert_eq!(token_client.balance(&depositor), amount);
    assert_eq!(token_client.balance(&client.address), 0);
}

#[test]
fn test_unauthorized_funding() {
    let env = Env::default();
    let (client, depositor, beneficiary, arbiter, token_address) = setup_test(&env);
    let amount = 1000i128;

    let escrow_id = client.create(&depositor, &beneficiary, &arbiter, &amount, &token_address);

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
    let token = Address::generate(&env);

    let escrow_id1 = env
        .as_contract(&contract_id, || {
            EscrowContract::create(
                env.clone(),
                depositor.clone(),
                beneficiary.clone(),
                arbiter.clone(),
                1000,
                token.clone(),
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
                1000,
                token.clone(),
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

    let (client, depositor, beneficiary, arbiter, token_address) = setup_test(&env);
    let amount = 1000i128;

    let escrow_id = client.create(&depositor, &beneficiary, &arbiter, &amount, &token_address);

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

    let (client, depositor, beneficiary, arbiter, token_address) = setup_test(&env);
    let amount = 1000i128;

    let escrow_id = client.create(&depositor, &beneficiary, &arbiter, &amount, &token_address);

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
    let (client, depositor, beneficiary, arbiter, token_address) = setup_test(&env);
    let amount = 1000i128;

    let cfg = TimeoutConfig {
        escrow_timeout_days: 1,
        dispute_timeout_days: 30,
        payment_timeout_days: 7,
    };
    client.set_timeout_config(&depositor, &cfg);

    let escrow_id = client.create(&depositor, &beneficiary, &arbiter, &amount, &token_address);
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
    let (client, depositor, beneficiary, arbiter, token_address) = setup_test(&env);
    let amount = 1000i128;

    let cfg = TimeoutConfig {
        escrow_timeout_days: 2,
        dispute_timeout_days: 30,
        payment_timeout_days: 7,
    };
    client.set_timeout_config(&depositor, &cfg);

    let escrow_id = client.create(&depositor, &beneficiary, &arbiter, &amount, &token_address);
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
    let (client, depositor, beneficiary, arbiter, token_address) = setup_test(&env);
    let amount = 1000i128;

    let escrow_id = client.create(&depositor, &beneficiary, &arbiter, &amount, &token_address);
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

    let (client, depositor, beneficiary, arbiter, token_address) = setup_test(&env);
    let amount = 1000i128;
    let partial_amount = 300i128;

    // Create and fund escrow
    let escrow_id = client.create(&depositor, &beneficiary, &arbiter, &amount, &token_address);
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

    let (client, depositor, beneficiary, arbiter, token_address) = setup_test(&env);
    let amount = 1000i128;
    let partial_amount = 300i128;

    // Create and fund escrow
    let escrow_id = client.create(&depositor, &beneficiary, &arbiter, &amount, &token_address);
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

    let (client, depositor, beneficiary, arbiter, token_address) = setup_test(&env);
    let amount = 1000i128;
    let excessive_amount = 1500i128;

    // Create and fund escrow
    let escrow_id = client.create(&depositor, &beneficiary, &arbiter, &amount, &token_address);
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

    let (client, depositor, beneficiary, arbiter, token_address) = setup_test(&env);
    let amount = 1000i128;

    // Create and fund escrow
    let escrow_id = client.create(&depositor, &beneficiary, &arbiter, &amount, &token_address);
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

    let (client, depositor, beneficiary, arbiter, token_address) = setup_test(&env);
    let amount = 1000i128;
    let damage_amount = 200i128;

    // Create and fund escrow
    let escrow_id = client.create(&depositor, &beneficiary, &arbiter, &amount, &token_address);
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

    let (client, depositor, beneficiary, arbiter, token_address) = setup_test(&env);
    let amount = 1000i128;
    let damage_amount = 1000i128; // Full damage

    // Create and fund escrow
    let escrow_id = client.create(&depositor, &beneficiary, &arbiter, &amount, &token_address);
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

    let (client, depositor, beneficiary, arbiter, token_address) = setup_test(&env);
    let amount = 1000i128;
    let damage_amount = 0i128; // No damage

    // Create and fund escrow
    let escrow_id = client.create(&depositor, &beneficiary, &arbiter, &amount, &token_address);
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

    let (client, depositor, beneficiary, arbiter, token_address) = setup_test(&env);
    let amount = 1000i128;
    let damage_amount = 1500i128; // Exceeds balance

    // Create and fund escrow
    let escrow_id = client.create(&depositor, &beneficiary, &arbiter, &amount, &token_address);
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

    let (client, depositor, beneficiary, arbiter, token_address) = setup_test(&env);
    let amount = 1000i128;
    let damage_amount = 200i128;

    // Create and fund escrow
    let escrow_id = client.create(&depositor, &beneficiary, &arbiter, &amount, &token_address);
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

    let (client, depositor, beneficiary, arbiter, token_address) = setup_test(&env);
    let amount = 1000i128;
    let invalid_recipient = Address::generate(&env);

    // Create and fund escrow
    let escrow_id = client.create(&depositor, &beneficiary, &arbiter, &amount, &token_address);
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

    let (client, depositor, beneficiary, arbiter, token_address) = setup_test(&env);
    let amount = 1000i128;

    // Create and fund escrow
    let escrow_id = client.create(&depositor, &beneficiary, &arbiter, &amount, &token_address);
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
