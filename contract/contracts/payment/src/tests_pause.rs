//! Global pause tests for the Payment contract (#1689).
//!
//! payment had no admin/access-control concept at all before this — these
//! tests cover the new minimal admin primitive (`admin.rs`) and the
//! contract-wide pause built on top of it: an authorized emergency stop of
//! state-changing entry points, while reads remain available.

use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, Env, Map, String};

use crate::errors::PaymentError as Error;
use crate::types::{AgreementStatus, PaymentFrequency, RentAgreement};
use crate::PaymentContract;

fn create_payment_contract(env: &Env) -> crate::PaymentContractClient<'_> {
    let contract_id = env.register(PaymentContract, ());
    crate::PaymentContractClient::new(env, &contract_id)
}

fn create_token(env: &Env, admin: &Address) -> Address {
    env.register_stellar_asset_contract_v2(admin.clone())
        .address()
}

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

fn seed_agreement(
    env: &Env,
    client: &crate::PaymentContractClient<'_>,
    agreement_key: &str,
    agreement: &RentAgreement,
) {
    let key = crate::storage::DataKey::Agreement(String::from_str(env, agreement_key));
    env.as_contract(&client.address, || {
        env.storage().persistent().set(&key, agreement);
    });
}

#[test]
fn test_admin_can_pause_and_unpause() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_payment_contract(&env);
    let admin = Address::generate(&env);
    client.initialize_admin(&admin);

    assert!(!client.is_paused());

    let result = client.try_pause(&admin);
    assert!(result.is_ok(), "admin should be able to pause");
    assert!(client.is_paused());

    let result = client.try_unpause(&admin);
    assert!(result.is_ok(), "admin should be able to unpause");
    assert!(!client.is_paused());
}

#[test]
fn test_initialize_admin_cannot_be_called_twice() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_payment_contract(&env);
    let admin = Address::generate(&env);
    client.initialize_admin(&admin);

    let other = Address::generate(&env);
    let result = client.try_initialize_admin(&other);
    assert_eq!(result, Err(Ok(Error::AdminAlreadySet)));
    assert_eq!(client.get_admin(), Some(admin));
}

#[test]
fn test_non_admin_cannot_pause() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_payment_contract(&env);
    let admin = Address::generate(&env);
    client.initialize_admin(&admin);

    let outsider = Address::generate(&env);
    let result = client.try_pause(&outsider);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
    assert!(!client.is_paused());
}

#[test]
fn test_pause_before_admin_configured_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_payment_contract(&env);
    let someone = Address::generate(&env);

    let result = client.try_pause(&someone);
    assert_eq!(result, Err(Ok(Error::AdminNotSet)));
}

#[test]
fn test_double_pause_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_payment_contract(&env);
    let admin = Address::generate(&env);
    client.initialize_admin(&admin);
    client.pause(&admin);

    let result = client.try_pause(&admin);
    assert_eq!(result, Err(Ok(Error::ContractPaused)));
}

#[test]
fn test_unpause_when_not_paused_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_payment_contract(&env);
    let admin = Address::generate(&env);
    client.initialize_admin(&admin);

    let result = client.try_unpause(&admin);
    assert_eq!(result, Err(Ok(Error::NotPaused)));
}

#[test]
fn test_create_recurring_payment_blocked_while_paused() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_payment_contract(&env);
    let admin = Address::generate(&env);
    client.initialize_admin(&admin);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);

    let agreement = create_test_agreement(&env, "agreement_1", &tenant, &landlord, 1000, token);
    seed_agreement(&env, &client, "agreement_1", &agreement);

    client.pause(&admin);

    let result = client.try_create_recurring_payment(
        &String::from_str(&env, "agreement_1"),
        &1000,
        &PaymentFrequency::Monthly,
        &1,
        &10_000,
        &false,
    );
    assert_eq!(result, Err(Ok(Error::ContractPaused)));
}

#[test]
fn test_reads_remain_available_while_paused() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_payment_contract(&env);
    let admin = Address::generate(&env);
    client.initialize_admin(&admin);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);

    let agreement = create_test_agreement(&env, "agreement_1", &tenant, &landlord, 1000, token);
    seed_agreement(&env, &client, "agreement_1", &agreement);

    let recurring_id = client.create_recurring_payment(
        &String::from_str(&env, "agreement_1"),
        &1000,
        &PaymentFrequency::Monthly,
        &1,
        &10_000,
        &false,
    );

    client.pause(&admin);

    // Reads must keep working while the contract is paused.
    let recurring = client.get_recurring_payment(&recurring_id);
    assert_eq!(recurring.amount, 1000);
    assert_eq!(client.get_admin(), Some(admin));
    assert!(client.is_paused());
}

#[test]
fn test_unpausing_restores_normal_operation() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_payment_contract(&env);
    let admin = Address::generate(&env);
    client.initialize_admin(&admin);

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);

    let agreement = create_test_agreement(&env, "agreement_1", &tenant, &landlord, 1000, token);
    seed_agreement(&env, &client, "agreement_1", &agreement);

    client.pause(&admin);
    let blocked = client.try_create_recurring_payment(
        &String::from_str(&env, "agreement_1"),
        &1000,
        &PaymentFrequency::Monthly,
        &1,
        &10_000,
        &false,
    );
    assert_eq!(blocked, Err(Ok(Error::ContractPaused)));

    client.unpause(&admin);
    let result = client.try_create_recurring_payment(
        &String::from_str(&env, "agreement_1"),
        &1000,
        &PaymentFrequency::Monthly,
        &1,
        &10_000,
        &false,
    );
    assert!(result.is_ok(), "operations should resume after unpause");
}

#[test]
fn test_process_due_payments_blocked_while_paused() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_payment_contract(&env);
    let admin = Address::generate(&env);
    client.initialize_admin(&admin);
    client.pause(&admin);

    // process_due_payments must reject up front rather than iterating and
    // marking due payments Failed because of the pause (see lib.rs comment).
    let result = client.try_process_due_payments();
    assert_eq!(result, Err(Ok(Error::ContractPaused)));
}
