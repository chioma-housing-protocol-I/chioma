use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, Env, String,
};

// ─── helpers ──────────────────────────────────────────────────────────────────

fn create_contract(env: &Env) -> ContractClient<'_> {
    let contract_id = env.register(Contract, ());
    ContractClient::new(env, &contract_id)
}

fn setup(env: &Env) -> (ContractClient<'_>, Address) {
    let client = create_contract(env);
    let admin = Address::generate(env);
    let config = Config {
        fee_bps: 100,
        fee_collector: Address::generate(env),
        paused: false,
    };
    client.initialize(&admin, &config);
    (client, admin)
}

/// Creates a Draft agreement and returns the agreement_id String.
fn create_agreement_helper(
    env: &Env,
    client: &ContractClient<'_>,
    tenant: &Address,
    landlord: &Address,
    deposit: i128,
) -> String {
    let id = String::from_str(env, "AGR001");
    let token = Address::generate(env);
    client.create_agreement(
        &id, landlord, tenant, &None, &1000, &deposit, &100, &1_000_000, &0, &token,
    );
    id
}

// ─── tests ────────────────────────────────────────────────────────────────────

#[test]
fn test_set_deposit_interest_config() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _admin) = setup(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let id = create_agreement_helper(&env, &client, &tenant, &landlord, 5_000);

    client.set_deposit_interest_config(
        &id,
        &500, // 5 % per year
        &CompoundingFrequency::Monthly,
        &InterestRecipient::Tenant,
    );

    let cfg = client.get_deposit_interest_config(&id);
    assert_eq!(cfg.annual_rate, 500);
    assert_eq!(cfg.interest_recipient, InterestRecipient::Tenant);
    assert_eq!(cfg.compounding_frequency, CompoundingFrequency::Monthly);
}

#[test]
fn test_deposit_interest_initialised_with_principal() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _admin) = setup(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let deposit = 10_000_i128;
    let id = create_agreement_helper(&env, &client, &tenant, &landlord, deposit);

    client.set_deposit_interest_config(
        &id,
        &1000,
        &CompoundingFrequency::Daily,
        &InterestRecipient::Landlord,
    );

    let di = client.get_deposit_interest(&id);
    assert_eq!(di.principal, deposit);
    assert_eq!(di.accrued_interest, 0);
    assert_eq!(di.total_with_interest, deposit);
}

#[test]
fn test_calculate_accrued_interest_no_time() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _admin) = setup(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let id = create_agreement_helper(&env, &client, &tenant, &landlord, 10_000);

    client.set_deposit_interest_config(
        &id,
        &500,
        &CompoundingFrequency::Monthly,
        &InterestRecipient::Split,
    );

    // No time has elapsed → interest must be 0.
    let interest = client.calculate_accrued_interest(&id);
    assert_eq!(interest, 0);
}

#[test]
fn test_calculate_accrued_interest_after_30_days() {
    let env = Env::default();
    env.mock_all_auths();

    // Start at ledger timestamp 0.
    env.ledger().with_mut(|li| li.timestamp = 0);

    let (client, _admin) = setup(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let deposit = 12_000_i128;
    let id = create_agreement_helper(&env, &client, &tenant, &landlord, deposit);

    client.set_deposit_interest_config(
        &id,
        &1200, // 12 % per year
        &CompoundingFrequency::Monthly,
        &InterestRecipient::Tenant,
    );

    // Advance 30 days.
    env.ledger().with_mut(|li| li.timestamp = 30 * 86_400);

    // Expected: 12_000 × 1200 / (12 × 10_000) × 1 period = 12_000 × 0.01 = 120
    let interest = client.calculate_accrued_interest(&id);
    assert_eq!(interest, 120);
}

#[test]
fn test_accrue_interest_persists_state() {
    let env = Env::default();
    env.mock_all_auths();

    env.ledger().with_mut(|li| li.timestamp = 0);
    let (client, _admin) = setup(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let deposit = 12_000_i128;
    let id = create_agreement_helper(&env, &client, &tenant, &landlord, deposit);

    client.set_deposit_interest_config(
        &id,
        &1200,
        &CompoundingFrequency::Monthly,
        &InterestRecipient::Tenant,
    );

    // Advance 30 days then accrue.
    env.ledger().with_mut(|li| li.timestamp = 30 * 86_400);
    let accrual = client.accrue_interest(&id);

    assert_eq!(accrual.amount, 120);
    assert_eq!(accrual.rate, 1200);

    let di = client.get_deposit_interest(&id);
    assert_eq!(di.accrued_interest, 120);
    assert_eq!(di.total_with_interest, deposit + 120);
    assert_eq!(di.accrual_history.len(), 1);
}

#[test]
fn test_accrue_interest_multiple_periods() {
    let env = Env::default();
    env.mock_all_auths();

    env.ledger().with_mut(|li| li.timestamp = 0);
    let (client, _admin) = setup(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let deposit = 12_000_i128;
    let id = create_agreement_helper(&env, &client, &tenant, &landlord, deposit);

    client.set_deposit_interest_config(
        &id,
        &1200,
        &CompoundingFrequency::Monthly,
        &InterestRecipient::Tenant,
    );

    // First accrual at 30 days.
    env.ledger().with_mut(|li| li.timestamp = 30 * 86_400);
    client.accrue_interest(&id);

    // Second accrual at 60 days.
    env.ledger().with_mut(|li| li.timestamp = 60 * 86_400);
    client.accrue_interest(&id);

    let di = client.get_deposit_interest(&id);
    assert_eq!(di.accrual_history.len(), 2);
    // total accrued ≥ 240 (compounding slightly more is fine)
    assert!(di.accrued_interest >= 240);
}

#[test]
fn test_get_accrual_history() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| li.timestamp = 0);

    let (client, _admin) = setup(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let id = create_agreement_helper(&env, &client, &tenant, &landlord, 5_000);

    client.set_deposit_interest_config(
        &id,
        &600,
        &CompoundingFrequency::Monthly,
        &InterestRecipient::Split,
    );

    env.ledger().with_mut(|li| li.timestamp = 30 * 86_400);
    client.accrue_interest(&id);

    let history = client.get_accrual_history(&id);
    assert_eq!(history.len(), 1);
    assert!(history.get(0).unwrap().amount > 0);
}

#[test]
#[should_panic(expected = "Error(Contract, #25)")]
fn test_config_not_found_error() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _) = setup(&env);

    client.get_deposit_interest_config(&String::from_str(&env, "NONEXISTENT"));
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_invalid_rate_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _admin) = setup(&env);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let id = create_agreement_helper(&env, &client, &tenant, &landlord, 5_000);

    client.set_deposit_interest_config(
        &id,
        &10_001, // > 10 000 bps — invalid
        &CompoundingFrequency::Daily,
        &InterestRecipient::Tenant,
    );
}
