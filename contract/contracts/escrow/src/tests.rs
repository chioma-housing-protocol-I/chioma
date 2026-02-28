//! Tests for the Escrow contract.

use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::token::Client as TokenClient;
use soroban_sdk::token::StellarAssetClient as TokenAdminClient;
use soroban_sdk::{Address, Env};

use crate::escrow_impl::{EscrowContract, EscrowContractClient};
use crate::types::EscrowStatus;

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
