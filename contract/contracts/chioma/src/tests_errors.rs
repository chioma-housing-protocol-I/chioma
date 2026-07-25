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
    let admin = Address::generate(env);
    let config = Config {
        fee_bps: 100,
        fee_collector: Address::generate(env),
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
    assert_eq!(RentalError::AgreementNotFound.code(), 13);
    assert_eq!(RentalError::AgreementAlreadyExists.code(), 4);

    // Check messages
    assert_eq!(
        RentalError::AgreementNotFound.message(&env),
        String::from_str(&env, "Agreement not found. Please check the ID.")
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

    client.log_error(&RentalError::AgreementNotFound, &op, &details);

    let logs = client.get_error_logs(&10);
    assert_eq!(logs.len(), 1);

    let log = logs.get(0).unwrap();
    assert_eq!(log.error_code, 13);
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

#[test]
fn test_error_log_context_fields() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);

    let op = String::from_str(&env, "create_agreement");
    let details = String::from_str(&env, "Agreement ID not found in storage");

    client.log_error(&RentalError::AgreementNotFound, &op, &details);

    let logs = client.get_error_logs(&10);
    assert_eq!(logs.len(), 1);

    let log = logs.get(0).unwrap();
    assert_eq!(log.error_code, 13);
    assert_eq!(
        log.error_message,
        String::from_str(&env, "Agreement not found. Please check the ID.")
    );
    assert_eq!(log.details, details);
    assert_eq!(log.operation, op);
    assert!(log.timestamp > 0);
}

#[test]
fn test_error_log_timestamp() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);

    env.ledger().with_mut(|li| li.timestamp = 99999);

    let op = String::from_str(&env, "test_op");
    let details = String::from_str(&env, "test details");
    client.log_error(&RentalError::InternalError, &op, &details);

    let logs = client.get_error_logs(&10);
    let log = logs.get(0).unwrap();
    assert_eq!(log.timestamp, 99999);
}

#[test]
fn test_error_log_operation_name() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);

    let details = String::from_str(&env, "details");

    client.log_error(
        &RentalError::AgreementNotFound,
        &String::from_str(&env, "create_agreement"),
        &details,
    );
    client.log_error(
        &RentalError::PaymentFailed,
        &String::from_str(&env, "make_payment"),
        &details,
    );

    let logs = client.get_error_logs(&10);
    assert_eq!(logs.len(), 2);
    assert_eq!(
        logs.get(0).unwrap().operation,
        String::from_str(&env, "create_agreement")
    );
    assert_eq!(
        logs.get(1).unwrap().operation,
        String::from_str(&env, "make_payment")
    );
}

#[test]
fn test_error_log_details_completeness() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);

    let long_details = String::from_str(
        &env,
        "This is a very long error detail string that contains extensive information about what went wrong during the operation including context about the agreement state and the specific validation that failed during processing of the request",
    );
    let op = String::from_str(&env, "validate");

    client.log_error(&RentalError::InvalidInput, &op, &long_details);

    let logs = client.get_error_logs(&10);
    let log = logs.get(0).unwrap();
    assert_eq!(log.details, long_details);
}

#[test]
fn test_error_log_persistence() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);

    let op = String::from_str(&env, "create_agreement");
    let details = String::from_str(&env, "persistence test");

    client.log_error(&RentalError::AgreementNotFound, &op, &details);

    // Perform unrelated read operation
    let _config = client.get_rate_limit_config();

    // Verify error log persisted
    let logs = client.get_error_logs(&10);
    assert_eq!(logs.len(), 1);
    assert_eq!(logs.get(0).unwrap().operation, op);
}

#[test]
fn test_error_log_various_types() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);

    let details = String::from_str(&env, "test");

    client.log_error(
        &RentalError::AgreementNotFound,
        &String::from_str(&env, "core"),
        &details,
    );
    client.log_error(
        &RentalError::PaymentInsufficientFunds,
        &String::from_str(&env, "payment"),
        &details,
    );
    client.log_error(
        &RentalError::EscrowNotFound,
        &String::from_str(&env, "escrow"),
        &details,
    );
    client.log_error(
        &RentalError::RateLimitExceeded,
        &String::from_str(&env, "rate_limit"),
        &details,
    );

    let logs = client.get_error_logs(&10);
    assert_eq!(logs.len(), 4);
    assert_eq!(logs.get(0).unwrap().error_code, 13);
    assert_eq!(logs.get(1).unwrap().error_code, 201);
    assert_eq!(logs.get(2).unwrap().error_code, 401);
    assert_eq!(logs.get(3).unwrap().error_code, 801);
}

#[test]
fn test_error_log_ordering() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);

    let details = String::from_str(&env, "d");

    client.log_error(
        &RentalError::InternalError,
        &String::from_str(&env, "op1"),
        &details,
    );
    client.log_error(
        &RentalError::InternalError,
        &String::from_str(&env, "op2"),
        &details,
    );
    client.log_error(
        &RentalError::InternalError,
        &String::from_str(&env, "op3"),
        &details,
    );
    client.log_error(
        &RentalError::InternalError,
        &String::from_str(&env, "op4"),
        &details,
    );
    client.log_error(
        &RentalError::InternalError,
        &String::from_str(&env, "op5"),
        &details,
    );

    let logs = client.get_error_logs(&10);
    assert_eq!(logs.len(), 5);
    assert_eq!(
        logs.get(0).unwrap().operation,
        String::from_str(&env, "op1")
    );
    assert_eq!(
        logs.get(1).unwrap().operation,
        String::from_str(&env, "op2")
    );
    assert_eq!(
        logs.get(2).unwrap().operation,
        String::from_str(&env, "op3")
    );
    assert_eq!(
        logs.get(3).unwrap().operation,
        String::from_str(&env, "op4")
    );
    assert_eq!(
        logs.get(4).unwrap().operation,
        String::from_str(&env, "op5")
    );
}

#[test]
fn test_error_log_limit_returns_most_recent() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);

    let op = String::from_str(&env, "op");

    // Log 15 errors with distinguishable details
    client.log_error(
        &RentalError::InternalError,
        &op,
        &String::from_str(&env, "error_0"),
    );
    client.log_error(
        &RentalError::InternalError,
        &op,
        &String::from_str(&env, "error_1"),
    );
    client.log_error(
        &RentalError::InternalError,
        &op,
        &String::from_str(&env, "error_2"),
    );
    client.log_error(
        &RentalError::InternalError,
        &op,
        &String::from_str(&env, "error_3"),
    );
    client.log_error(
        &RentalError::InternalError,
        &op,
        &String::from_str(&env, "error_4"),
    );
    client.log_error(
        &RentalError::InternalError,
        &op,
        &String::from_str(&env, "error_5"),
    );
    client.log_error(
        &RentalError::InternalError,
        &op,
        &String::from_str(&env, "error_6"),
    );
    client.log_error(
        &RentalError::InternalError,
        &op,
        &String::from_str(&env, "error_7"),
    );
    client.log_error(
        &RentalError::InternalError,
        &op,
        &String::from_str(&env, "error_8"),
    );
    client.log_error(
        &RentalError::InternalError,
        &op,
        &String::from_str(&env, "error_9"),
    );
    client.log_error(
        &RentalError::InternalError,
        &op,
        &String::from_str(&env, "error_10"),
    );
    client.log_error(
        &RentalError::InternalError,
        &op,
        &String::from_str(&env, "error_11"),
    );
    client.log_error(
        &RentalError::InternalError,
        &op,
        &String::from_str(&env, "error_12"),
    );
    client.log_error(
        &RentalError::InternalError,
        &op,
        &String::from_str(&env, "error_13"),
    );
    client.log_error(
        &RentalError::InternalError,
        &op,
        &String::from_str(&env, "error_14"),
    );

    let logs = client.get_error_logs(&5);
    assert_eq!(logs.len(), 5);
    // Should return the 5 most recent (indices 10-14)
    assert_eq!(
        logs.get(0).unwrap().details,
        String::from_str(&env, "error_10")
    );
    assert_eq!(
        logs.get(1).unwrap().details,
        String::from_str(&env, "error_11")
    );
    assert_eq!(
        logs.get(2).unwrap().details,
        String::from_str(&env, "error_12")
    );
    assert_eq!(
        logs.get(3).unwrap().details,
        String::from_str(&env, "error_13")
    );
    assert_eq!(
        logs.get(4).unwrap().details,
        String::from_str(&env, "error_14")
    );
}

#[test]
fn test_get_error_logs_empty_history_returns_empty_vec() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);

    let logs = client.get_error_logs(&10);
    assert_eq!(logs.len(), 0);
}

#[test]
fn test_get_error_logs_zero_limit_returns_empty_vec() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);

    client.log_error(
        &RentalError::InternalError,
        &String::from_str(&env, "op"),
        &String::from_str(&env, "details"),
    );

    let logs = client.get_error_logs(&0);
    assert_eq!(logs.len(), 0);
}

#[test]
fn test_get_error_logs_limit_above_count_returns_all_logs() {
    let env = Env::default();
    env.mock_all_auths();
    let client = setup(&env);

    client.log_error(
        &RentalError::AgreementNotFound,
        &String::from_str(&env, "op_a"),
        &String::from_str(&env, "a"),
    );
    client.log_error(
        &RentalError::PaymentFailed,
        &String::from_str(&env, "op_b"),
        &String::from_str(&env, "b"),
    );
    client.log_error(
        &RentalError::EscrowNotFound,
        &String::from_str(&env, "op_c"),
        &String::from_str(&env, "c"),
    );

    let logs = client.get_error_logs(&100);
    assert_eq!(logs.len(), 3);
    assert_eq!(
        logs.get(0).unwrap().operation,
        String::from_str(&env, "op_a")
    );
    assert_eq!(
        logs.get(1).unwrap().operation,
        String::from_str(&env, "op_b")
    );
    assert_eq!(
        logs.get(2).unwrap().operation,
        String::from_str(&env, "op_c")
    );
}
