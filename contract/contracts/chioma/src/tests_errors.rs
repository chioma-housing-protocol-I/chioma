use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, Env, String,
};

fn create_contract(env: &Env) -> ContractClient<'_> {
    let contract_id = env.register(Contract, ());
    ContractClient::new(env, &contract_id)
}

fn setup(env: &Env) -> ContractClient<'_> {
    let client = create_contract(env);
    let admin = Address::generate(&env);
    let config = Config {
        fee_bps: 100,
        fee_collector: Address::generate(&env),
        paused: false,
    };
    client.initialize(&admin, &config);
    env.ledger().with_mut(|li| li.timestamp = 100);
    client
}

#[test]
fn test_error_codes_and_messages() {
    let env = Env::default();

    // Check some core errors
    assert_eq!(RentalError::AlreadyInitialized.code(), 1);
    assert_eq!(RentalError::AgreementNotFound.code(), 13);
    assert_eq!(RentalError::Unauthorized.code(), 18);

    // Check new booking/agreement errors
    assert_eq!(RentalError::BookingNotFound.code(), 1001);
    assert_eq!(RentalError::BookingAlreadyExists.code(), 1002);

    // Check messages
    assert_eq!(
        RentalError::BookingNotFound.message(&env),
        String::from_str(&env, "Booking not found. Please check the booking ID.")
    );
    assert_eq!(
        RentalError::Unauthorized.message(&env),
        String::from_str(&env, "You are not authorized to perform this action.")
    );
}

#[test]
fn test_log_and_get_errors() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);

    let op = String::from_str(&env, "create_agreement");
    let details = String::from_str(&env, "Missing ID");

    client.log_error(&RentalError::BookingNotFound, &op, &details);

    let logs = client.get_error_logs(&10);
    assert_eq!(logs.len(), 1);

    let log = logs.get(0).unwrap();
    assert_eq!(log.error_code, 1001);
    assert_eq!(log.operation, op);
    assert_eq!(log.details, details);
    assert!(log.timestamp > 0);
}

#[test]
fn test_multiple_logs_limit() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);

    let op = String::from_str(&env, "op");
    let details = String::from_str(&env, "details");

    for _i in 0..15 {
        client.log_error(&RentalError::InternalError, &op, &details);
    }

    // Test limit
    let logs_limit_5 = client.get_error_logs(&5);
    assert_eq!(logs_limit_5.len(), 5);

    let logs_limit_20 = client.get_error_logs(&20);
    assert_eq!(logs_limit_20.len(), 15);
}
