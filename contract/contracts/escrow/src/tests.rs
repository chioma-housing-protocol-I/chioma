//! Tests for the Escrow contract.

use soroban_sdk::testutils::Address as _;
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
