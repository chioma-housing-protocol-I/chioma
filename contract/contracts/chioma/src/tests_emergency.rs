//! Tests for emergency withdrawal (#2087): multi-sig gated withdrawal of a
//! token's balance out of the contract.

use crate::{errors::RentalError, types::Config, Contract, ContractClient};
use soroban_sdk::{testutils::Address as _, Address, Env, String, Vec};

fn create_contract() -> (Env, ContractClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let fee_collector = Address::generate(&env);

    let config = Config {
        fee_bps: 100,
        fee_collector,
        paused: false,
    };

    client.initialize(&admin, &config);

    (env, client, admin)
}

/// Sets up 3 multi-sig admins (2-of-3 required) and funds the contract
/// with `funding` of a freshly-registered token. Returns the token address
/// and the 3 admin addresses.
fn setup_multisig_and_fund_contract(
    env: &Env,
    client: &ContractClient<'static>,
    funding: i128,
) -> (Address, Address, Address, Address) {
    let admin1 = Address::generate(env);
    let admin2 = Address::generate(env);
    let admin3 = Address::generate(env);

    let mut admins = Vec::new(env);
    admins.push_back(admin1.clone());
    admins.push_back(admin2.clone());
    admins.push_back(admin3.clone());
    client.initialize_multisig(&admins, &2);

    let token = env
        .register_stellar_asset_contract_v2(Address::generate(env))
        .address();
    soroban_sdk::token::StellarAssetClient::new(env, &token).mint(&client.address, &funding);

    (token, admin1, admin2, admin3)
}

#[test]
fn test_propose_emergency_withdrawal() {
    let (env, client, _admin) = create_contract();
    let (token, admin1, _admin2, _admin3) = setup_multisig_and_fund_contract(&env, &client, 10_000);

    let recipient = Address::generate(&env);
    let proposal_id = client
        .try_propose_emergency_withdrawal(&admin1, &token, &5000, &recipient)
        .unwrap()
        .unwrap();

    assert!(!proposal_id.is_empty());

    let request = client
        .try_get_emergency_withdrawal(&proposal_id)
        .unwrap()
        .unwrap();
    assert_eq!(request.token, token);
    assert_eq!(request.amount, 5000);
    assert_eq!(request.recipient, recipient);
    assert!(!request.executed);

    let proposal = client.try_get_proposal(&proposal_id).unwrap().unwrap();
    assert_eq!(proposal.approval_count, 1); // proposer auto-approves
    assert!(!proposal.executed);
}

#[test]
fn test_propose_emergency_withdrawal_rejects_non_positive_amount() {
    let (env, client, _admin) = create_contract();
    let (token, admin1, _admin2, _admin3) = setup_multisig_and_fund_contract(&env, &client, 10_000);

    let recipient = Address::generate(&env);
    let result = client.try_propose_emergency_withdrawal(&admin1, &token, &0, &recipient);
    assert_eq!(result, Err(Ok(RentalError::InvalidAmount)));

    let result = client.try_propose_emergency_withdrawal(&admin1, &token, &-100, &recipient);
    assert_eq!(result, Err(Ok(RentalError::InvalidAmount)));
}

#[test]
fn test_propose_emergency_withdrawal_requires_admin() {
    let (env, client, _admin) = create_contract();
    let (token, _admin1, _admin2, _admin3) =
        setup_multisig_and_fund_contract(&env, &client, 10_000);

    let stranger = Address::generate(&env);
    let recipient = Address::generate(&env);
    let result = client.try_propose_emergency_withdrawal(&stranger, &token, &1000, &recipient);
    assert_eq!(result, Err(Ok(RentalError::Unauthorized)));
}

#[test]
fn test_execute_emergency_withdrawal_requires_sufficient_approvals() {
    let (env, client, _admin) = create_contract();
    let (token, admin1, admin2, _admin3) = setup_multisig_and_fund_contract(&env, &client, 10_000);

    let recipient = Address::generate(&env);
    let proposal_id = client
        .try_propose_emergency_withdrawal(&admin1, &token, &5000, &recipient)
        .unwrap()
        .unwrap();

    // Only 1 approval so far (the proposer's); 2 are required.
    let result = client.try_execute_emergency_withdrawal(&admin1, &proposal_id);
    assert_eq!(result, Err(Ok(RentalError::InsufficientApprovals)));

    client
        .try_approve_emergency_withdrawal(&admin2, &proposal_id)
        .unwrap()
        .unwrap();

    let result = client.try_execute_emergency_withdrawal(&admin1, &proposal_id);
    assert!(result.is_ok());
}

#[test]
fn test_execute_emergency_withdrawal_transfers_funds() {
    let (env, client, _admin) = create_contract();
    let (token, admin1, admin2, _admin3) = setup_multisig_and_fund_contract(&env, &client, 10_000);

    let recipient = Address::generate(&env);
    let proposal_id = client
        .try_propose_emergency_withdrawal(&admin1, &token, &5000, &recipient)
        .unwrap()
        .unwrap();
    client
        .try_approve_emergency_withdrawal(&admin2, &proposal_id)
        .unwrap()
        .unwrap();

    let token_client = soroban_sdk::token::Client::new(&env, &token);
    assert_eq!(token_client.balance(&client.address), 10_000);
    assert_eq!(token_client.balance(&recipient), 0);

    client
        .try_execute_emergency_withdrawal(&admin1, &proposal_id)
        .unwrap()
        .unwrap();

    assert_eq!(token_client.balance(&client.address), 5000);
    assert_eq!(token_client.balance(&recipient), 5000);

    let request = client
        .try_get_emergency_withdrawal(&proposal_id)
        .unwrap()
        .unwrap();
    assert!(request.executed);
}

#[test]
fn test_execute_emergency_withdrawal_rejects_insufficient_contract_balance() {
    let (env, client, _admin) = create_contract();
    let (token, admin1, admin2, _admin3) = setup_multisig_and_fund_contract(&env, &client, 1000);

    let recipient = Address::generate(&env);
    // Request more than the contract actually holds.
    let proposal_id = client
        .try_propose_emergency_withdrawal(&admin1, &token, &5000, &recipient)
        .unwrap()
        .unwrap();
    client
        .try_approve_emergency_withdrawal(&admin2, &proposal_id)
        .unwrap()
        .unwrap();

    let result = client.try_execute_emergency_withdrawal(&admin1, &proposal_id);
    assert_eq!(result, Err(Ok(RentalError::EscrowInsufficientFunds)));

    // The failed execution must not have marked the proposal/request
    // executed, so the balance shortfall can be fixed and this retried.
    let request = client
        .try_get_emergency_withdrawal(&proposal_id)
        .unwrap()
        .unwrap();
    assert!(!request.executed);
    let proposal = client.try_get_proposal(&proposal_id).unwrap().unwrap();
    assert!(!proposal.executed);
}

#[test]
fn test_execute_emergency_withdrawal_twice_fails() {
    let (env, client, _admin) = create_contract();
    let (token, admin1, admin2, _admin3) = setup_multisig_and_fund_contract(&env, &client, 10_000);

    let recipient = Address::generate(&env);
    let proposal_id = client
        .try_propose_emergency_withdrawal(&admin1, &token, &5000, &recipient)
        .unwrap()
        .unwrap();
    client
        .try_approve_emergency_withdrawal(&admin2, &proposal_id)
        .unwrap()
        .unwrap();
    client
        .try_execute_emergency_withdrawal(&admin1, &proposal_id)
        .unwrap()
        .unwrap();

    let result = client.try_execute_emergency_withdrawal(&admin1, &proposal_id);
    assert_eq!(result, Err(Ok(RentalError::ProposalAlreadyExecuted)));
}

#[test]
fn test_execute_emergency_withdrawal_rejects_wrong_action_type() {
    let (env, client, _admin) = create_contract();
    let (token, admin1, admin2, _admin3) = setup_multisig_and_fund_contract(&env, &client, 10_000);

    // An ordinary (non-emergency-withdrawal) proposal has no linked
    // EmergencyWithdrawalRequest and must be rejected, not misinterpreted.
    let proposal_id = client
        .try_propose_action(
            &admin1,
            &crate::types::ActionType::Pause,
            &None,
            &soroban_sdk::Bytes::new(&env),
        )
        .unwrap()
        .unwrap();
    client
        .try_approve_action(&admin2, &proposal_id)
        .unwrap()
        .unwrap();

    let result = client.try_execute_emergency_withdrawal(&admin1, &proposal_id);
    assert_eq!(result, Err(Ok(RentalError::InvalidTransition)));

    let _ = token; // token unused in this path; silence unused warning
}

#[test]
fn test_get_emergency_withdrawal_not_found() {
    let (env, client, _admin) = create_contract();
    let missing_id = String::from_str(&env, "prop_");
    let result = client.try_get_emergency_withdrawal(&missing_id);
    assert_eq!(result, Err(Ok(RentalError::ProposalNotFound)));
}

#[test]
fn test_execute_emergency_withdrawal_requires_admin() {
    let (env, client, _admin) = create_contract();
    let (token, admin1, admin2, _admin3) = setup_multisig_and_fund_contract(&env, &client, 10_000);

    let recipient = Address::generate(&env);
    let proposal_id = client
        .try_propose_emergency_withdrawal(&admin1, &token, &5000, &recipient)
        .unwrap()
        .unwrap();
    client
        .try_approve_emergency_withdrawal(&admin2, &proposal_id)
        .unwrap()
        .unwrap();

    let stranger = Address::generate(&env);
    let result = client.try_execute_emergency_withdrawal(&stranger, &proposal_id);
    assert_eq!(result, Err(Ok(RentalError::Unauthorized)));
}
