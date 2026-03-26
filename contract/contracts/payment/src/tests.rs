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

// ─── Late Fee Tests ───────────────────────────────────────────────────────────

use crate::late_fee::compute_fee;
use crate::types::LateFeeConfig;

fn make_late_fee_config(
    env: &Env,
    agreement_id: &str,
    pct: u32,
    grace: u32,
    max: i128,
    compound: bool,
) -> LateFeeConfig {
    LateFeeConfig {
        agreement_id: String::from_str(env, agreement_id),
        late_fee_percentage: pct,
        grace_period_days: grace,
        max_late_fee: max,
        compounding: compound,
    }
}

#[allow(dead_code)]
fn seed_late_fee_config(
    env: &Env,
    client: &crate::PaymentContractClient<'_>,
    config: &LateFeeConfig,
) {
    use crate::storage::DataKey;
    env.as_contract(&client.address, || {
        env.storage()
            .persistent()
            .set(&DataKey::LateFeeConfig(config.agreement_id.clone()), config);
    });
}

// ── compute_fee unit tests (pure logic, no env needed) ──────────────────────

#[test]
fn test_late_fee_within_grace_period() {
    let env = Env::default();
    let config = make_late_fee_config(&env, "a1", 5, 5, 0, false);
    // 3 days late, grace is 5 → no fee
    assert_eq!(compute_fee(&config, 1000, 3), 0);
    // exactly at grace boundary → no fee
    assert_eq!(compute_fee(&config, 1000, 5), 0);
}

#[test]
fn test_late_fee_simple_calculation() {
    let env = Env::default();
    // 5% per day, 5-day grace, no cap, no compounding
    // days_late=10 → days_over=5 → fee = 1000 * 5/100 * 5 = 250
    let config = make_late_fee_config(&env, "a1", 5, 5, 0, false);
    assert_eq!(compute_fee(&config, 1000, 10), 250);
}

#[test]
fn test_late_fee_simple_one_day_over_grace() {
    let env = Env::default();
    // 5% per day, 5-day grace → 1 day over → fee = 1000 * 5/100 * 1 = 50
    let config = make_late_fee_config(&env, "a1", 5, 5, 0, false);
    assert_eq!(compute_fee(&config, 1000, 6), 50);
}

#[test]
fn test_late_fee_max_cap_applied() {
    let env = Env::default();
    // Without cap: 1000 * 5/100 * 5 = 250; cap at 100 → 100
    let config = make_late_fee_config(&env, "a1", 5, 5, 100, false);
    assert_eq!(compute_fee(&config, 1000, 10), 100);
}

#[test]
fn test_late_fee_compounding() {
    let env = Env::default();
    // 5% compounding, 5-day grace, days_late=10 → 5 days compounding
    // fee = 1000 * (1.05^5) - 1000 = 1000 * 1.2762... - 1000 ≈ 276
    // integer: 1000 * 105^5 / 100^5 - 1000
    let config = make_late_fee_config(&env, "a1", 5, 5, 0, true);
    let fee = compute_fee(&config, 1000, 10);
    // 105^5 = 12762815625, /100^5 = 10000000000 → 1276 - 1000 = 276
    assert_eq!(fee, 276);
}

#[test]
fn test_late_fee_compounding_capped() {
    let env = Env::default();
    let config = make_late_fee_config(&env, "a1", 5, 5, 200, true);
    let fee = compute_fee(&config, 1000, 10);
    assert_eq!(fee, 200); // capped at 200
}

#[test]
fn test_late_fee_zero_grace_period() {
    let env = Env::default();
    // No grace period: 1 day late → fee = 1000 * 5/100 * 1 = 50
    let config = make_late_fee_config(&env, "a1", 5, 0, 0, false);
    assert_eq!(compute_fee(&config, 1000, 1), 50);
    assert_eq!(compute_fee(&config, 1000, 0), 0);
}

// ── Contract-level integration tests ────────────────────────────────────────

#[test]
fn test_set_and_get_late_fee_config() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_payment_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);

    let agreement = create_test_agreement(
        &env,
        "lf_agr_1",
        &tenant,
        &landlord,
        None,
        2000,
        0,
        AgreementStatus::Active,
        token,
    );
    seed_agreement(&env, &client, "lf_agr_1", &agreement);

    client.set_late_fee_config(&String::from_str(&env, "lf_agr_1"), &5, &5, &500, &false);

    let config = client.get_late_fee_config(&String::from_str(&env, "lf_agr_1"));
    assert_eq!(config.late_fee_percentage, 5);
    assert_eq!(config.grace_period_days, 5);
    assert_eq!(config.max_late_fee, 500);
    assert!(!config.compounding);
}

#[test]
fn test_calculate_late_fee_via_contract() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_payment_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);

    let agreement = create_test_agreement(
        &env,
        "lf_agr_2",
        &tenant,
        &landlord,
        None,
        1000,
        0,
        AgreementStatus::Active,
        token,
    );
    seed_agreement(&env, &client, "lf_agr_2", &agreement);

    client.set_late_fee_config(&String::from_str(&env, "lf_agr_2"), &5, &5, &0, &false);

    // 10 days late, 5-day grace → 5 days over → 1000 * 5% * 5 = 250
    let fee = client.calculate_late_fee(
        &String::from_str(&env, "lf_agr_2"),
        &String::from_str(&env, "pay_001"),
        &10,
    );
    assert_eq!(fee, 250);
}

#[test]
fn test_apply_late_fee_creates_record() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_payment_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);

    // next_payment_due = 1000, grace = 5 days (432000s)
    // set ledger to 1000 + 432000 + 86400 = 1 day past grace
    let mut agreement = create_test_agreement(
        &env,
        "lf_agr_3",
        &tenant,
        &landlord,
        None,
        1000,
        0,
        AgreementStatus::Active,
        token,
    );
    agreement.next_payment_due = 1000;
    seed_agreement(&env, &client, "lf_agr_3", &agreement);

    client.set_late_fee_config(&String::from_str(&env, "lf_agr_3"), &5, &5, &0, &false);

    // 1 day past grace period
    env.ledger().with_mut(|li| {
        li.timestamp = 1000 + 5 * 86_400 + 86_400 + 1;
    });

    let record = client.apply_late_fee(
        &String::from_str(&env, "lf_agr_3"),
        &String::from_str(&env, "pay_lf_001"),
    );

    assert_eq!(record.days_late, 1);
    assert_eq!(record.base_amount, 1000);
    assert_eq!(record.late_fee, 50); // 1000 * 5% * 1 = 50
    assert_eq!(record.total_due, 1050);
    assert!(!record.waived);
}

#[test]
fn test_apply_late_fee_not_late_returns_error() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_payment_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);

    let mut agreement = create_test_agreement(
        &env,
        "lf_agr_4",
        &tenant,
        &landlord,
        None,
        1000,
        0,
        AgreementStatus::Active,
        token,
    );
    agreement.next_payment_due = 1_000_000;
    seed_agreement(&env, &client, "lf_agr_4", &agreement);

    client.set_late_fee_config(&String::from_str(&env, "lf_agr_4"), &5, &5, &0, &false);

    // Ledger is before due date → not late
    env.ledger().with_mut(|li| {
        li.timestamp = 500;
    });

    let result = client.try_apply_late_fee(
        &String::from_str(&env, "lf_agr_4"),
        &String::from_str(&env, "pay_lf_002"),
    );
    assert!(result.is_err());
}

#[test]
fn test_waive_late_fee() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_payment_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);

    let mut agreement = create_test_agreement(
        &env,
        "lf_agr_5",
        &tenant,
        &landlord,
        None,
        1000,
        0,
        AgreementStatus::Active,
        token,
    );
    agreement.next_payment_due = 1000;
    seed_agreement(&env, &client, "lf_agr_5", &agreement);

    client.set_late_fee_config(&String::from_str(&env, "lf_agr_5"), &5, &5, &0, &false);

    env.ledger().with_mut(|li| {
        li.timestamp = 1000 + 5 * 86_400 + 86_400 + 1;
    });

    client.apply_late_fee(
        &String::from_str(&env, "lf_agr_5"),
        &String::from_str(&env, "pay_lf_003"),
    );

    client.waive_late_fee(
        &String::from_str(&env, "lf_agr_5"),
        &String::from_str(&env, "pay_lf_003"),
        &String::from_str(&env, "Tenant hardship"),
    );

    let record = client.get_late_fee_record(&String::from_str(&env, "pay_lf_003"));
    assert!(record.waived);
    assert_eq!(record.total_due, record.base_amount); // fee removed
}

#[test]
fn test_apply_late_fee_duplicate_returns_error() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_payment_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);

    let mut agreement = create_test_agreement(
        &env,
        "lf_agr_6",
        &tenant,
        &landlord,
        None,
        1000,
        0,
        AgreementStatus::Active,
        token,
    );
    agreement.next_payment_due = 1000;
    seed_agreement(&env, &client, "lf_agr_6", &agreement);

    client.set_late_fee_config(&String::from_str(&env, "lf_agr_6"), &5, &5, &0, &false);

    env.ledger().with_mut(|li| {
        li.timestamp = 1000 + 5 * 86_400 + 86_400 + 1;
    });

    client.apply_late_fee(
        &String::from_str(&env, "lf_agr_6"),
        &String::from_str(&env, "pay_lf_004"),
    );

    // Second apply should fail
    let result = client.try_apply_late_fee(
        &String::from_str(&env, "lf_agr_6"),
        &String::from_str(&env, "pay_lf_004"),
    );
    assert!(result.is_err());
}

#[test]
fn test_compounding_late_fee_via_contract() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_payment_contract(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);

    let agreement = create_test_agreement(
        &env,
        "lf_agr_7",
        &tenant,
        &landlord,
        None,
        1000,
        0,
        AgreementStatus::Active,
        token,
    );
    seed_agreement(&env, &client, "lf_agr_7", &agreement);

    client.set_late_fee_config(
        &String::from_str(&env, "lf_agr_7"),
        &5,
        &5,
        &0,
        &true, // compounding
    );

    // 10 days late → 5 days over grace → compounding fee = 276
    let fee = client.calculate_late_fee(
        &String::from_str(&env, "lf_agr_7"),
        &String::from_str(&env, "pay_comp_001"),
        &10,
    );
    assert_eq!(fee, 276);
}
