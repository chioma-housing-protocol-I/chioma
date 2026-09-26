//! Per-entry-point gas/resource benchmarks.
//!
//! Measures real Soroban host resource usage (CPU instructions, memory,
//! ledger reads/writes) for each benchmarked entry point via
//! `Env::cost_estimate()`, and fails the test if usage regresses beyond the
//! threshold documented in `docs/performance/BENCHMARKING.md`.
//!
//! Resolves: https://github.com/chioma-housing-protocol-I/chioma/issues/1682

extern crate std;

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String, Vec};
use std::println;

/// Maximum allowed increase over the recorded baseline before a test fails.
/// Mirrors the 10% regression policy in `docs/performance/BENCHMARKING.md`.
const REGRESSION_THRESHOLD_PERCENT: u64 = 10;

/// Measured CPU-instruction baselines, recorded from a passing run of this
/// file. Update these (and the table in `docs/performance/BENCHMARKING.md`)
/// together whenever an intentional, reviewed change moves the numbers.
const CREATE_AGREEMENT_WITH_TOKEN_BASELINE: u64 = 217_921;
const MAKE_PAYMENT_WITH_TOKEN_BASELINE: u64 = 362_387;
const RELEASE_ESCROW_WITH_TOKEN_BASELINE: u64 = 349_901;
const PROPOSE_EXTENSION_BASELINE: u64 = 243_078;

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

fn create_token(env: &Env, admin: &Address) -> Address {
    env.register_stellar_asset_contract_v2(admin.clone())
        .address()
}

/// Reports measured resources for `operation` and asserts they have not
/// regressed beyond `REGRESSION_THRESHOLD_PERCENT` over `baseline`.
///
/// A `baseline` of 0 means "no baseline recorded yet" — the check is skipped
/// and the measured value is printed so it can be copied into the constants
/// above and into `docs/performance/BENCHMARKING.md`.
fn report_and_check(operation: &str, instructions: u64, baseline: u64) {
    println!(
        "[gas-benchmark] operation={operation} instructions={instructions} baseline={baseline}"
    );

    if baseline == 0 {
        return;
    }

    let ceiling = baseline + (baseline * REGRESSION_THRESHOLD_PERCENT / 100);
    let delta_percent = if instructions >= baseline {
        ((instructions - baseline) * 100) as i64 / baseline as i64
    } else {
        -(((baseline - instructions) * 100) as i64 / baseline as i64)
    };
    println!("[gas-benchmark] operation={operation} delta={delta_percent}%");

    assert!(
        instructions <= ceiling,
        "{operation} regressed: {instructions} instructions exceeds the {ceiling} ceiling \
         ({REGRESSION_THRESHOLD_PERCENT}% over baseline {baseline})"
    );
}

#[test]
fn benchmark_create_agreement_with_token() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_addr = create_token(&env, &admin);
    client.add_supported_token(
        &token_addr,
        &String::from_str(&env, "USDC"),
        &6,
        &1,
        &1_000_000_000,
    );

    let agreement_id = String::from_str(&env, "GAS-CREATE");
    let input = AgreementInput {
        agreement_id: agreement_id.clone(),
        user: tenant.clone(),
        admin: landlord.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 1_000_000,
            agent_commission_rate: 0,
        },
        payment_token: token_addr.clone(),
        metadata_uri: String::from_str(&env, ""),
        attributes: Vec::new(&env),
    };

    client.create_agreement_with_token(&input);

    let resources = env.cost_estimate().resources();
    report_and_check(
        "create_agreement_with_token",
        resources.instructions as u64,
        CREATE_AGREEMENT_WITH_TOKEN_BASELINE,
    );
}

#[test]
fn benchmark_make_payment_with_token() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_addr = create_token(&env, &admin);
    client.add_supported_token(
        &token_addr,
        &String::from_str(&env, "USDC"),
        &6,
        &1,
        &1_000_000_000,
    );

    let agreement_id = String::from_str(&env, "GAS-PAY");
    client.create_agreement_with_token(&AgreementInput {
        agreement_id: agreement_id.clone(),
        user: tenant.clone(),
        admin: landlord.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 1_000_000,
            agent_commission_rate: 0,
        },
        payment_token: token_addr.clone(),
        metadata_uri: String::from_str(&env, ""),
        attributes: Vec::new(&env),
    });

    client.submit_agreement(&landlord, &agreement_id);
    client.sign_agreement(&tenant, &agreement_id);
    client.approve_agreement(&admin, &agreement_id);

    let token_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_addr);
    token_client.mint(&tenant, &10_000);

    client.make_payment_with_token(&agreement_id, &1000, &token_addr);

    let resources = env.cost_estimate().resources();
    report_and_check(
        "make_payment_with_token",
        resources.instructions as u64,
        MAKE_PAYMENT_WITH_TOKEN_BASELINE,
    );
}

#[test]
fn benchmark_release_escrow_with_token() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_addr = create_token(&env, &admin);
    client.add_supported_token(
        &token_addr,
        &String::from_str(&env, "USDC"),
        &6,
        &1,
        &1_000_000_000,
    );

    let agreement_id = String::from_str(&env, "GAS-ESCROW");
    client.create_agreement_with_token(&AgreementInput {
        agreement_id: agreement_id.clone(),
        user: tenant.clone(),
        admin: landlord.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 1_000_000,
            agent_commission_rate: 0,
        },
        payment_token: token_addr.clone(),
        metadata_uri: String::from_str(&env, ""),
        attributes: Vec::new(&env),
    });

    client.submit_agreement(&landlord, &agreement_id);
    client.sign_agreement(&tenant, &agreement_id);
    client.approve_agreement(&admin, &agreement_id);

    let token_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_addr);
    token_client.mint(&tenant, &10_000);
    client.make_payment_with_token(&agreement_id, &1000, &token_addr);

    client.release_escrow_with_token(&agreement_id, &token_addr);

    let resources = env.cost_estimate().resources();
    report_and_check(
        "release_escrow_with_token",
        resources.instructions as u64,
        RELEASE_ESCROW_WITH_TOKEN_BASELINE,
    );
}

#[test]
fn benchmark_propose_extension() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_addr = create_token(&env, &admin);
    client.add_supported_token(
        &token_addr,
        &String::from_str(&env, "USDC"),
        &6,
        &1,
        &1_000_000_000,
    );

    let agreement_id = String::from_str(&env, "GAS-EXT");
    client.create_agreement_with_token(&AgreementInput {
        agreement_id: agreement_id.clone(),
        user: tenant.clone(),
        admin: landlord.clone(),
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 1_000_000,
            agent_commission_rate: 0,
        },
        payment_token: token_addr.clone(),
        metadata_uri: String::from_str(&env, ""),
        attributes: Vec::new(&env),
    });

    client.submit_agreement(&landlord, &agreement_id);
    client.sign_agreement(&tenant, &agreement_id);
    client.approve_agreement(&admin, &agreement_id);

    client.propose_extension(&landlord, &agreement_id, &6, &None, &None);

    let resources = env.cost_estimate().resources();
    report_and_check(
        "propose_extension",
        resources.instructions as u64,
        PROPOSE_EXTENSION_BASELINE,
    );
}
