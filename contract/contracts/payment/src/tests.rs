//! Tests for the Payment contract.

use crate::payment_impl::*;
use crate::storage::DataKey;
use crate::types::*;
use crate::PaymentContract;
use soroban_sdk::token::StellarAssetClient as TokenAdminClient;
use soroban_sdk::{testutils::Address as _, testutils::Ledger, Address, Env, Map, String};

// Helper function to create a test agreement
fn create_test_agreement(
    env: &Env,
    id: &str,
    tenant: &Address,
    landlord: &Address,
    agent: Option<Address>,
    monthly_rent: i128,
    commission_rate: u32,
    status: AgreementStatus,
    payment_token: Address,
) -> RentAgreement {
    RentAgreement {
        agreement_id: String::from_str(env, id),
        tenant: tenant.clone(),
        landlord: landlord.clone(),
        agent,
        monthly_rent,
        agent_commission_rate: commission_rate,
        status,
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

fn update_recurring(
    env: &Env,
    client: &crate::PaymentContractClient<'_>,
    recurring_id: &String,
    recurring: &RecurringPayment,
) {
    let key = DataKey::RecurringPayment(recurring_id.clone());
    env.as_contract(&client.address, || {
        env.storage().persistent().set(&key, recurring);
    });
}

fn set_failed_list(
    env: &Env,
    client: &crate::PaymentContractClient<'_>,
    values: soroban_sdk::Vec<String>,
) {
    env.as_contract(&client.address, || {
        env.storage()
            .persistent()
            .set(&DataKey::FailedRecurringPayments, &values);
    });
}

#[test]
fn test_calculate_payment_split_no_commission() {
    let (landlord, agent) = calculate_payment_split(&1000, &0);
    assert_eq!(landlord, 1000);
    assert_eq!(agent, 0);
}

#[test]
fn test_calculate_payment_split_5_percent() {
    // Test with 5% commission (500 basis points)
    let (landlord, agent) = calculate_payment_split(&1000, &500);
    assert_eq!(landlord, 950);
    assert_eq!(agent, 50);
}

#[test]
fn test_calculate_payment_split_10_percent() {
    // Test with 10% commission (1000 basis points)
    let (landlord, agent) = calculate_payment_split(&2000, &1000);
    assert_eq!(landlord, 1800);
    assert_eq!(agent, 200);
}

#[test]
fn test_calculate_payment_split_2_5_percent() {
    // Test with 2.5% commission (250 basis points)
    let (landlord, agent) = calculate_payment_split(&10000, &250);
    assert_eq!(landlord, 9750);
    assert_eq!(agent, 250);
}

#[test]
fn test_create_payment_record() {
    let env = Env::default();
    let tenant = Address::generate(&env);
    let agreement_id = String::from_str(&env, "AGR_001");

    let record =
        create_payment_record(&env, &agreement_id, 1000, 950, 50, &tenant, 1, 12345).unwrap();

    assert_eq!(record.agreement_id, agreement_id);
    assert_eq!(record.amount, 1000);
    assert_eq!(record.landlord_amount, 950);
    assert_eq!(record.agent_amount, 50);
    assert_eq!(record.payment_number, 1);
    assert_eq!(record.timestamp, 12345);
    assert_eq!(record.tenant, tenant);
}

#[test]
fn test_create_test_agreement() {
    let env = Env::default();
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);

    let agreement = create_test_agreement(
        &env,
        "agreement_1",
        &tenant,
        &landlord,
        None,
        1000,
        0,
        AgreementStatus::Active,
        token.clone(),
    );

    assert_eq!(agreement.monthly_rent, 1000);
    assert_eq!(agreement.status, AgreementStatus::Active);
    assert_eq!(agreement.tenant, tenant);
    assert_eq!(agreement.landlord, landlord);
}

#[test]
fn test_agreement_with_agent() {
    let env = Env::default();
    env.mock_all_auths();

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let agent = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);

    // Mint tokens to tenant
    TokenAdminClient::new(&env, &token).mint(&tenant, &100000);

    let agreement = create_test_agreement(
        &env,
        "agreement_2",
        &tenant,
        &landlord,
        Some(agent.clone()),
        1000,
        500, // 5% commission
        AgreementStatus::Active,
        token.clone(),
    );

    assert_eq!(agreement.agent, Some(agent));
    assert_eq!(agreement.agent_commission_rate, 500);
}

#[test]
fn test_recurring_payments_creation() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_payment_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);

    let agreement = create_test_agreement(
        &env,
        "agreement_rp_1",
        &tenant,
        &landlord,
        None,
        1000,
        0,
        AgreementStatus::Active,
        token,
    );

    seed_agreement(&env, &client, "agreement_rp_1", &agreement);

    let recurring_id = client.create_recurring_payment(
        &String::from_str(&env, "agreement_rp_1"),
        &1000,
        &PaymentFrequency::Monthly,
        &1,
        &10_000,
        &false,
    );

    let recurring = client.get_recurring_payment(&recurring_id);
    assert_eq!(recurring.amount, 1000);
    assert_eq!(recurring.frequency, PaymentFrequency::Monthly);
    assert_eq!(recurring.status, RecurringStatus::Active);
}

#[test]
fn test_recurring_payments_execution() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_payment_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);

    let agreement = create_test_agreement(
        &env,
        "agreement_rp_2",
        &tenant,
        &landlord,
        None,
        1000,
        0,
        AgreementStatus::Active,
        token,
    );
    seed_agreement(&env, &client, "agreement_rp_2", &agreement);

    let recurring_id = client.create_recurring_payment(
        &String::from_str(&env, "agreement_rp_2"),
        &1000,
        &PaymentFrequency::Monthly,
        &10,
        &100_000,
        &false,
    );

    env.ledger().with_mut(|li| {
        li.timestamp = 20;
    });

    client.execute_recurring_payment(&recurring_id);

    let executions = client.get_payment_executions(&recurring_id);
    assert_eq!(executions.len(), 1);
    assert_eq!(executions.get(0).unwrap().status, ExecutionStatus::Success);

    let recurring = client.get_recurring_payment(&recurring_id);
    assert_eq!(recurring.next_payment_date, 10 + 2_592_000);
}

#[test]
fn test_recurring_payments_pause_resume() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_payment_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);

    let agreement = create_test_agreement(
        &env,
        "agreement_rp_3",
        &tenant,
        &landlord,
        None,
        1000,
        0,
        AgreementStatus::Active,
        token,
    );
    seed_agreement(&env, &client, "agreement_rp_3", &agreement);

    let recurring_id = client.create_recurring_payment(
        &String::from_str(&env, "agreement_rp_3"),
        &1000,
        &PaymentFrequency::Weekly,
        &10,
        &100_000,
        &false,
    );

    client.pause_recurring_payment(&recurring_id);
    assert_eq!(
        client.get_recurring_payment(&recurring_id).status,
        RecurringStatus::Paused
    );

    client.resume_recurring_payment(&recurring_id);
    assert_eq!(
        client.get_recurring_payment(&recurring_id).status,
        RecurringStatus::Active
    );
}

#[test]
fn test_recurring_payments_cancellation() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_payment_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);

    let agreement = create_test_agreement(
        &env,
        "agreement_rp_4",
        &tenant,
        &landlord,
        None,
        1000,
        0,
        AgreementStatus::Active,
        token,
    );
    seed_agreement(&env, &client, "agreement_rp_4", &agreement);

    let recurring_id = client.create_recurring_payment(
        &String::from_str(&env, "agreement_rp_4"),
        &1000,
        &PaymentFrequency::Monthly,
        &10,
        &100_000,
        &false,
    );

    client.cancel_recurring_payment(&recurring_id);
    assert_eq!(
        client.get_recurring_payment(&recurring_id).status,
        RecurringStatus::Cancelled
    );
}

#[test]
fn test_recurring_payments_frequency_calculations() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_payment_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);

    let agreement = create_test_agreement(
        &env,
        "agreement_rp_5",
        &tenant,
        &landlord,
        None,
        1000,
        0,
        AgreementStatus::Active,
        token,
    );
    seed_agreement(&env, &client, "agreement_rp_5", &agreement);

    let recurring_id = client.create_recurring_payment(
        &String::from_str(&env, "agreement_rp_5"),
        &1000,
        &PaymentFrequency::Weekly,
        &10,
        &100_000,
        &false,
    );

    env.ledger().with_mut(|li| {
        li.timestamp = 20;
    });
    client.execute_recurring_payment(&recurring_id);

    let recurring = client.get_recurring_payment(&recurring_id);
    assert_eq!(recurring.next_payment_date, 10 + 604_800);
}

#[test]
fn test_recurring_payments_auto_renewal() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_payment_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);

    let agreement = create_test_agreement(
        &env,
        "agreement_rp_6",
        &tenant,
        &landlord,
        None,
        1000,
        0,
        AgreementStatus::Active,
        token,
    );
    seed_agreement(&env, &client, "agreement_rp_6", &agreement);

    let recurring_id = client.create_recurring_payment(
        &String::from_str(&env, "agreement_rp_6"),
        &1000,
        &PaymentFrequency::Daily,
        &10,
        &11,
        &true,
    );

    env.ledger().with_mut(|li| {
        li.timestamp = 10;
    });
    client.execute_recurring_payment(&recurring_id);

    let recurring = client.get_recurring_payment(&recurring_id);
    assert_eq!(recurring.status, RecurringStatus::Active);
    assert!(recurring.end_date >= 10 + 86_400);
}

#[test]
fn test_recurring_payments_due_processing() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_payment_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);

    let agreement = create_test_agreement(
        &env,
        "agreement_rp_7",
        &tenant,
        &landlord,
        None,
        1000,
        0,
        AgreementStatus::Active,
        token,
    );
    seed_agreement(&env, &client, "agreement_rp_7", &agreement);

    let recurring_id = client.create_recurring_payment(
        &String::from_str(&env, "agreement_rp_7"),
        &1000,
        &PaymentFrequency::Monthly,
        &10,
        &100_000,
        &false,
    );

    env.ledger().with_mut(|li| {
        li.timestamp = 11;
    });

    let due = client.get_due_payments();
    assert_eq!(due.len(), 1);
    assert_eq!(due.get(0).unwrap(), recurring_id.clone());

    let processed = client.process_due_payments();
    assert_eq!(processed.len(), 1);
    assert_eq!(processed.get(0).unwrap(), recurring_id.clone());
}

#[test]
fn test_recurring_payments_retry_logic() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_payment_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);

    let agreement = create_test_agreement(
        &env,
        "agreement_rp_8",
        &tenant,
        &landlord,
        None,
        1000,
        0,
        AgreementStatus::Active,
        token,
    );
    seed_agreement(&env, &client, "agreement_rp_8", &agreement);

    let recurring_id = client.create_recurring_payment(
        &String::from_str(&env, "agreement_rp_8"),
        &1000,
        &PaymentFrequency::Monthly,
        &10,
        &100_000,
        &false,
    );

    let mut recurring = client.get_recurring_payment(&recurring_id);
    recurring.status = RecurringStatus::Failed;
    update_recurring(&env, &client, &recurring_id, &recurring);
    set_failed_list(&env, &client, soroban_sdk::vec![&env, recurring_id.clone()]);

    env.ledger().with_mut(|li| {
        li.timestamp = 20;
    });

    client.retry_failed_payment(&recurring_id);
    let failed_after_retry = client.get_failed_payments();
    assert_eq!(failed_after_retry.len(), 0);
    assert_eq!(client.get_payment_executions(&recurring_id).len(), 1);
}
