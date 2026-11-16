//! Tests for aggregate contract usage metrics (#2088).

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String, Vec};

fn create_contract(env: &Env) -> ContractClient<'_> {
    let contract_id = env.register(Contract, ());
    ContractClient::new(env, &contract_id)
}

fn initialize_contract(env: &Env, client: &ContractClient<'_>, admin: &Address) {
    let config = Config {
        fee_bps: 100,
        fee_collector: Address::generate(env),
        paused: false,
    };
    client.initialize(admin, &config);
}

/// Creates and activates an agreement on `token`, with the tenant funded
/// with enough of it to make `payments_to_make` payments of `rent` each.
fn setup_active_agreement(
    env: &Env,
    client: &ContractClient<'_>,
    admin: &Address,
    token: &Address,
    rent: i128,
    funding: i128,
) -> (String, Address) {
    let tenant = Address::generate(env);
    let landlord = Address::generate(env);
    let agreement_id = String::from_str(env, "AGR-METRICS");

    client.create_agreement_with_token(&AgreementInput {
        agreement_id: agreement_id.clone(),
        user: tenant.clone(),
        admin: landlord.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: rent,
            security_deposit: rent * 2,
            start_date: 100,
            end_date: 1_000_000,
            agent_commission_rate: 0,
        },
        payment_token: token.clone(),
        metadata_uri: String::from_str(env, ""),
        attributes: Vec::new(env),
    });

    client.submit_agreement(&landlord, &agreement_id);
    client.sign_agreement(&tenant, &agreement_id);
    client.approve_agreement(admin, &agreement_id);

    soroban_sdk::token::StellarAssetClient::new(env, token).mint(&tenant, &funding);

    (agreement_id, tenant)
}

#[test]
fn test_metrics_start_at_zero() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let token = env
        .register_stellar_asset_contract_v2(Address::generate(&env))
        .address();

    let metrics = client.get_contract_metrics(&token);
    assert_eq!(metrics.total_value_locked, 0);
    assert_eq!(metrics.total_transaction_count, 0);
    assert_eq!(metrics.total_transaction_volume, 0);
    assert_eq!(metrics.average_transaction_size, 0);
}

#[test]
fn test_metrics_after_single_payment() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let token = env
        .register_stellar_asset_contract_v2(Address::generate(&env))
        .address();
    client.add_supported_token(
        &token,
        &String::from_str(&env, "USDC"),
        &6,
        &1,
        &1_000_000_000,
    );

    let (agreement_id, _tenant) = setup_active_agreement(&env, &client, &admin, &token, 1000, 5000);

    client.make_payment_with_token(&agreement_id, &1000, &token);

    let metrics = client.get_contract_metrics(&token);
    assert_eq!(metrics.total_value_locked, 1000);
    assert_eq!(metrics.total_transaction_count, 1);
    assert_eq!(metrics.total_transaction_volume, 1000);
    assert_eq!(metrics.average_transaction_size, 1000);
}

#[test]
fn test_metrics_accumulate_across_multiple_payments() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let token = env
        .register_stellar_asset_contract_v2(Address::generate(&env))
        .address();
    client.add_supported_token(
        &token,
        &String::from_str(&env, "USDC"),
        &6,
        &1,
        &1_000_000_000,
    );

    let (agreement_id, _tenant) =
        setup_active_agreement(&env, &client, &admin, &token, 1000, 10_000);

    client.make_payment_with_token(&agreement_id, &1000, &token);
    client.make_payment_with_token(&agreement_id, &2000, &token);
    client.make_payment_with_token(&agreement_id, &3000, &token);

    let metrics = client.get_contract_metrics(&token);
    assert_eq!(metrics.total_value_locked, 6000);
    assert_eq!(metrics.total_transaction_count, 3);
    assert_eq!(metrics.total_transaction_volume, 6000);
    assert_eq!(metrics.average_transaction_size, 2000);
}

#[test]
fn test_total_value_locked_drops_after_escrow_release() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let token = env
        .register_stellar_asset_contract_v2(Address::generate(&env))
        .address();
    client.add_supported_token(
        &token,
        &String::from_str(&env, "USDC"),
        &6,
        &1,
        &1_000_000_000,
    );

    let (agreement_id, _tenant) = setup_active_agreement(&env, &client, &admin, &token, 1000, 5000);

    client.make_payment_with_token(&agreement_id, &1000, &token);
    assert_eq!(client.get_contract_metrics(&token).total_value_locked, 1000);

    client.release_escrow_with_token(&agreement_id, &token);

    let metrics = client.get_contract_metrics(&token);
    // TVL reflects the contract's current balance, so it drops to zero once
    // everything escrowed is released — transaction count/volume are a
    // running history and do not drop.
    assert_eq!(metrics.total_value_locked, 0);
    assert_eq!(metrics.total_transaction_count, 1);
    assert_eq!(metrics.total_transaction_volume, 1000);
}

#[test]
fn test_total_value_locked_is_per_token() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let token_a = env
        .register_stellar_asset_contract_v2(Address::generate(&env))
        .address();
    let token_b = env
        .register_stellar_asset_contract_v2(Address::generate(&env))
        .address();
    client.add_supported_token(
        &token_a,
        &String::from_str(&env, "USDC"),
        &6,
        &1,
        &1_000_000_000,
    );

    let (agreement_id, _tenant) =
        setup_active_agreement(&env, &client, &admin, &token_a, 1000, 5000);
    client.make_payment_with_token(&agreement_id, &1000, &token_a);

    assert_eq!(
        client.get_contract_metrics(&token_a).total_value_locked,
        1000
    );
    // A token the contract never received has zero balance, independent of
    // the shared transaction-count/volume totals.
    assert_eq!(client.get_contract_metrics(&token_b).total_value_locked, 0);
}

#[test]
fn test_get_contract_metrics_requires_no_authorization() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);
    let token = env
        .register_stellar_asset_contract_v2(Address::generate(&env))
        .address();

    // Now that setup (which itself needed auth) is done, verify the actual
    // read-only call needs none.
    env.mock_auths(&[]);
    let metrics = client.get_contract_metrics(&token);
    assert_eq!(metrics.total_transaction_count, 0);
}
