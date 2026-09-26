//! Tests for recurring payment functionality (Issue #653)
#![allow(unused_results)]

use crate::storage::DataKey;
use crate::types::*;
use crate::PaymentContract;
use soroban_sdk::{
    testutils::{Address as _, Ledger as _},
    Address, Env, Map, String,
};

fn create_test_agreement(
    env: &Env,
    id: &str,
    tenant: &Address,
    landlord: &Address,
    monthly_rent: i128,
    payment_token: Address,
) -> RentAgreement {
    RentAgreement {
        agreement_id: String::from_str(env, id),
        tenant: tenant.clone(),
        landlord: landlord.clone(),
        agent: None,
        monthly_rent,
        agent_commission_rate: 0,
        status: AgreementStatus::Active,
        total_rent_paid: 0,
        payment_count: 0,
        security_deposit: 0,
        start_date: 0,
        end_date: 0,
        signed_at: None,
        payment_token,
        next_payment_due: 0,
        payment_history: Map::new(env),
    }
}

fn create_token(env: &Env, admin: &Address) -> Address {
    env.register_stellar_asset_contract_v2(admin.clone())
        .address()
}

fn create_payment_contract(env: &Env) -> crate::PaymentContractClient<'_> {
    let contract_id = env.register(PaymentContract, ());
    crate::PaymentContractClient::new(env, &contract_id)
}

fn seed_agreement(
    env: &Env,
    client: &crate::PaymentContractClient<'_>,
    agreement_key: &str,
    agreement: &RentAgreement,
) {
    let key = DataKey::Agreement(String::from_str(env, agreement_key));
    env.as_contract(&client.address, || {
        env.storage().persistent().set(&key, agreement);
    });
}

#[test]
fn test_create_recurring_payment_valid() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_payment_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);

    let agreement = create_test_agreement(&env, "agr_001", &tenant, &landlord, 1000, token);
    seed_agreement(&env, &client, "agr_001", &agreement);

    let result = client.try_create_recurring_payment(
        &String::from_str(&env, "agr_001"),
        &1000,
        &PaymentFrequency::Monthly,
        &1000,
        &5000,
        &true,
    );

    assert!(result.is_ok());
}

#[test]
fn test_recurring_payment_status_active() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_payment_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);

    let agreement = create_test_agreement(&env, "agr_002", &tenant, &landlord, 1000, token);
    seed_agreement(&env, &client, "agr_002", &agreement);

    let recurring_id = client
        .try_create_recurring_payment(
            &String::from_str(&env, "agr_002"),
            &1000,
            &PaymentFrequency::Monthly,
            &1000,
            &5000,
            &true,
        )
        .unwrap()
        .unwrap();

    let recurring = client
        .try_get_recurring_payment(&recurring_id)
        .unwrap()
        .unwrap();
    assert_eq!(recurring.status, RecurringStatus::Active);
}

#[test]
fn test_frequency_daily_86400_seconds() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_payment_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);

    let agreement = create_test_agreement(&env, "agr_daily", &tenant, &landlord, 1000, token);
    seed_agreement(&env, &client, "agr_daily", &agreement);

    let recurring_id = client
        .try_create_recurring_payment(
            &String::from_str(&env, "agr_daily"),
            &1000,
            &PaymentFrequency::Daily,
            &1000,
            &5000,
            &false,
        )
        .unwrap()
        .unwrap();

    let recurring = client
        .try_get_recurring_payment(&recurring_id)
        .unwrap()
        .unwrap();
    assert_eq!(recurring.next_payment_date, 1000);
}

#[test]
fn test_frequency_monthly_2592000_seconds() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_payment_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);

    let agreement = create_test_agreement(&env, "agr_monthly", &tenant, &landlord, 1000, token);
    seed_agreement(&env, &client, "agr_monthly", &agreement);

    let recurring_id = client
        .try_create_recurring_payment(
            &String::from_str(&env, "agr_monthly"),
            &1000,
            &PaymentFrequency::Monthly,
            &1000,
            &5000,
            &false,
        )
        .unwrap()
        .unwrap();

    let recurring = client
        .try_get_recurring_payment(&recurring_id)
        .unwrap()
        .unwrap();
    assert_eq!(recurring.next_payment_date, 1000);
}

#[test]
fn test_auto_renewal_enabled() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_payment_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);

    let agreement = create_test_agreement(&env, "agr_auto_true", &tenant, &landlord, 1000, token);
    seed_agreement(&env, &client, "agr_auto_true", &agreement);

    let recurring_id = client
        .try_create_recurring_payment(
            &String::from_str(&env, "agr_auto_true"),
            &1000,
            &PaymentFrequency::Monthly,
            &1000,
            &5000,
            &true,
        )
        .unwrap()
        .unwrap();

    let recurring = client
        .try_get_recurring_payment(&recurring_id)
        .unwrap()
        .unwrap();
    assert!(recurring.auto_renew);
}

#[test]
fn test_invalid_recurring_dates_start_gte_end() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_payment_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);

    let agreement = create_test_agreement(&env, "agr_invalid", &tenant, &landlord, 1000, token);
    seed_agreement(&env, &client, "agr_invalid", &agreement);

    let result = client.try_create_recurring_payment(
        &String::from_str(&env, "agr_invalid"),
        &1000,
        &PaymentFrequency::Monthly,
        &2000,
        &2000,
        &false,
    );

    assert!(result.is_err());
}

#[test]
fn test_pause_recurring_payment() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_payment_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);

    let agreement = create_test_agreement(&env, "agr_pause", &tenant, &landlord, 1000, token);
    seed_agreement(&env, &client, "agr_pause", &agreement);

    let recurring_id = client
        .try_create_recurring_payment(
            &String::from_str(&env, "agr_pause"),
            &1000,
            &PaymentFrequency::Monthly,
            &1000,
            &5000,
            &false,
        )
        .unwrap()
        .unwrap();

    let result = client.try_pause_recurring_payment(&recurring_id);
    assert!(result.is_ok());

    let recurring = client
        .try_get_recurring_payment(&recurring_id)
        .unwrap()
        .unwrap();
    assert_eq!(recurring.status, RecurringStatus::Paused);
}

#[test]
fn test_cancel_recurring_payment() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_payment_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);

    let agreement = create_test_agreement(&env, "agr_cancel", &tenant, &landlord, 1000, token);
    seed_agreement(&env, &client, "agr_cancel", &agreement);

    let recurring_id = client
        .try_create_recurring_payment(
            &String::from_str(&env, "agr_cancel"),
            &1000,
            &PaymentFrequency::Monthly,
            &1000,
            &5000,
            &false,
        )
        .unwrap()
        .unwrap();

    let result = client.try_cancel_recurring_payment(&recurring_id);
    assert!(result.is_ok());

    let recurring = client
        .try_get_recurring_payment(&recurring_id)
        .unwrap()
        .unwrap();
    assert_eq!(recurring.status, RecurringStatus::Cancelled);
}

#[test]
fn test_get_failed_payments_empty() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_payment_contract(&env);
    let failed = client.try_get_failed_payments().unwrap().unwrap();
    assert_eq!(failed.len(), 0);
}

#[test]
fn test_payment_executions_bounded_by_max() {
    // A recurring payment executed far more times than MAX_PAYMENT_EXECUTIONS
    // (120) must not let its execution history grow unbounded (#1683): the
    // oldest executions are dropped once the cap is exceeded.
    let env = Env::default();
    env.mock_all_auths();

    let client = create_payment_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);

    let agreement = create_test_agreement(&env, "agr_bound", &tenant, &landlord, 1000, token);
    seed_agreement(&env, &client, "agr_bound", &agreement);

    let recurring_id = client.create_recurring_payment(
        &String::from_str(&env, "agr_bound"),
        &1000,
        &PaymentFrequency::Daily,
        &0,
        &(86_400 * 200),
        &true,
    );

    for _ in 0..125 {
        client.execute_recurring_payment(&recurring_id);
        env.ledger().with_mut(|l| {
            l.timestamp += 86_400;
        });
    }

    let executions = client.get_payment_executions(&recurring_id);
    assert_eq!(executions.len(), 120);
}

#[test]
fn test_create_recurring_payment_extends_ttl() {
    use soroban_sdk::testutils::storage::Persistent as _;

    let env = Env::default();
    env.mock_all_auths();

    let client = create_payment_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);

    let agreement = create_test_agreement(&env, "agr_ttl", &tenant, &landlord, 1000, token);
    seed_agreement(&env, &client, "agr_ttl", &agreement);

    let recurring_id = client.create_recurring_payment(
        &String::from_str(&env, "agr_ttl"),
        &1000,
        &PaymentFrequency::Monthly,
        &0,
        &(2_592_000 * 12),
        &true,
    );

    // Before this fix (#1683), payment's storage writes never called
    // extend_ttl at all, so a recurring payment with no further writes
    // could be archived out from under an active schedule.
    let ttl = env.as_contract(&client.address, || {
        let key = DataKey::RecurringPayment(recurring_id.clone());
        env.storage().persistent().get_ttl(&key)
    });

    assert!(
        ttl >= 499_000,
        "expected the recurring payment key's TTL to be bumped close to the 500_000-ledger threshold, got {ttl}"
    );
}
