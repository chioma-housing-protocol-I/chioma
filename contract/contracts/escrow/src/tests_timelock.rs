//! Tests for the generic sensitive-operation timelock (#2085).

use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{Address, Bytes, Env, String};

use crate::errors::EscrowError;
use crate::escrow_impl::{EscrowContract, EscrowContractClient};
use crate::timelock::MIN_DELAY_SECONDS;

fn setup(env: &Env) -> (EscrowContractClient<'_>, Address) {
    let contract_id = env.register(EscrowContract, ());
    let client = EscrowContractClient::new(env, &contract_id);
    let admin = Address::generate(env);
    env.mock_all_auths();
    client.initialize_admin(&admin);
    (client, admin)
}

#[test]
fn test_queue_action_rejects_delay_below_minimum() {
    let env = Env::default();
    let (client, admin) = setup(&env);

    let target = Address::generate(&env);
    let data = Bytes::new(&env);
    let action_id = String::from_str(&env, "ACT-1");

    let result = client.try_queue_timelock_action(
        &admin,
        &action_id,
        &target,
        &data,
        &(MIN_DELAY_SECONDS - 1),
    );
    assert_eq!(result, Err(Ok(EscrowError::TimelockEtaNotReached)));
}

#[test]
fn test_queue_action_rejects_non_admin() {
    let env = Env::default();
    let (client, _admin) = setup(&env);
    let outsider = Address::generate(&env);
    let target = Address::generate(&env);
    let data = Bytes::new(&env);
    let action_id = String::from_str(&env, "ACT-2");

    let result =
        client.try_queue_timelock_action(&outsider, &action_id, &target, &data, &MIN_DELAY_SECONDS);
    assert_eq!(result, Err(Ok(EscrowError::NotAuthorized)));
}

#[test]
fn test_queue_then_get_action() {
    let env = Env::default();
    let (client, admin) = setup(&env);
    let target = Address::generate(&env);
    let data = Bytes::new(&env);
    let action_id = String::from_str(&env, "ACT-3");

    client.queue_timelock_action(&admin, &action_id, &target, &data, &MIN_DELAY_SECONDS);

    let action = client.get_timelock_action(&action_id);
    assert_eq!(action.id, action_id);
    assert_eq!(action.target, target);
    assert!(!action.executed);
    assert!(!action.cancelled);

    let active = client.get_active_timelock_actions();
    assert_eq!(active.len(), 1);
    assert_eq!(active.get(0).unwrap(), action_id);
}

#[test]
fn test_execute_action_before_eta_fails() {
    let env = Env::default();
    let (client, admin) = setup(&env);
    let target = Address::generate(&env);
    let data = Bytes::new(&env);
    let action_id = String::from_str(&env, "ACT-4");

    client.queue_timelock_action(&admin, &action_id, &target, &data, &MIN_DELAY_SECONDS);

    let result = client.try_execute_timelock_action(&admin, &action_id);
    assert_eq!(result, Err(Ok(EscrowError::TimelockEtaNotReached)));
}

#[test]
fn test_execute_action_after_eta_succeeds_and_removes_from_active() {
    let env = Env::default();
    let (client, admin) = setup(&env);
    let target = Address::generate(&env);
    let data = Bytes::new(&env);
    let action_id = String::from_str(&env, "ACT-5");

    client.queue_timelock_action(&admin, &action_id, &target, &data, &MIN_DELAY_SECONDS);
    env.ledger()
        .with_mut(|li| li.timestamp += MIN_DELAY_SECONDS + 1);

    client.execute_timelock_action(&admin, &action_id);

    let action = client.get_timelock_action(&action_id);
    assert!(action.executed);

    let active = client.get_active_timelock_actions();
    assert_eq!(active.len(), 0);
}

#[test]
fn test_execute_action_twice_fails() {
    let env = Env::default();
    let (client, admin) = setup(&env);
    let target = Address::generate(&env);
    let data = Bytes::new(&env);
    let action_id = String::from_str(&env, "ACT-6");

    client.queue_timelock_action(&admin, &action_id, &target, &data, &MIN_DELAY_SECONDS);
    env.ledger()
        .with_mut(|li| li.timestamp += MIN_DELAY_SECONDS + 1);
    client.execute_timelock_action(&admin, &action_id);

    let result = client.try_execute_timelock_action(&admin, &action_id);
    assert_eq!(result, Err(Ok(EscrowError::TimelockAlreadyExecuted)));
}

#[test]
fn test_cancel_action_before_execution_succeeds() {
    let env = Env::default();
    let (client, admin) = setup(&env);
    let target = Address::generate(&env);
    let data = Bytes::new(&env);
    let action_id = String::from_str(&env, "ACT-7");

    client.queue_timelock_action(&admin, &action_id, &target, &data, &MIN_DELAY_SECONDS);
    client.cancel_timelock_action(&admin, &action_id);

    let action = client.get_timelock_action(&action_id);
    assert!(action.cancelled);

    let active = client.get_active_timelock_actions();
    assert_eq!(active.len(), 0);
}

#[test]
fn test_cancel_action_rejects_non_admin() {
    let env = Env::default();
    let (client, admin) = setup(&env);
    let outsider = Address::generate(&env);
    let target = Address::generate(&env);
    let data = Bytes::new(&env);
    let action_id = String::from_str(&env, "ACT-8");

    client.queue_timelock_action(&admin, &action_id, &target, &data, &MIN_DELAY_SECONDS);

    let result = client.try_cancel_timelock_action(&outsider, &action_id);
    assert_eq!(result, Err(Ok(EscrowError::NotAuthorized)));
}

#[test]
fn test_execute_after_cancel_fails() {
    let env = Env::default();
    let (client, admin) = setup(&env);
    let target = Address::generate(&env);
    let data = Bytes::new(&env);
    let action_id = String::from_str(&env, "ACT-9");

    client.queue_timelock_action(&admin, &action_id, &target, &data, &MIN_DELAY_SECONDS);
    client.cancel_timelock_action(&admin, &action_id);
    env.ledger()
        .with_mut(|li| li.timestamp += MIN_DELAY_SECONDS + 1);

    let result = client.try_execute_timelock_action(&admin, &action_id);
    assert_eq!(result, Err(Ok(EscrowError::TimelockAlreadyCancelled)));
}

#[test]
fn test_queue_duplicate_action_id_fails() {
    let env = Env::default();
    let (client, admin) = setup(&env);
    let target = Address::generate(&env);
    let data = Bytes::new(&env);
    let action_id = String::from_str(&env, "ACT-10");

    client.queue_timelock_action(&admin, &action_id, &target, &data, &MIN_DELAY_SECONDS);
    let result =
        client.try_queue_timelock_action(&admin, &action_id, &target, &data, &MIN_DELAY_SECONDS);
    assert_eq!(result, Err(Ok(EscrowError::InvalidState)));
}
