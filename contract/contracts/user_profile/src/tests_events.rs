//! Event emission tests for the User Profile contract.
//!
//! Verifies that each lifecycle event is published with the expected topic
//! count, and that no event is published when a call reverts.
//!
//! Note: `env.events().all()` only returns the events emitted by the most
//! recent top-level contract invocation, so each assertion below is checked
//! immediately after the call it targets rather than as a running total.

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Events as _},
    Address, Bytes, Env,
};

fn create_contract(env: &Env) -> UserProfileContractClient<'_> {
    let contract_id = env.register(UserProfileContract, ());
    UserProfileContractClient::new(env, &contract_id)
}

#[test]
fn test_initialize_emits_initialized_event() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let events = env.events().all();
    assert_eq!(events.len(), 1);

    let event = events.last().unwrap();
    assert_eq!(event.0, client.address);
    // Topics: [event_name, admin]
    assert_eq!(event.1.len(), 2);
}

#[test]
fn test_create_profile_emits_profile_created_event() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let data_hash = Bytes::from_array(&env, &[0u8; 32]);
    client.create_profile(&user, &AccountType::Tenant, &data_hash);

    let events = env.events().all();
    assert_eq!(events.len(), 1);

    let event = events.last().unwrap();
    assert_eq!(event.0, client.address);
    // Topics: [event_name_part1, event_name_part2, account_id]
    assert_eq!(event.1.len(), 3);
}

#[test]
fn test_update_profile_emits_profile_updated_event() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let data_hash = Bytes::from_array(&env, &[0u8; 32]);
    client.create_profile(&user, &AccountType::Tenant, &data_hash);

    client.update_profile(&user, &Some(AccountType::Landlord), &None);

    let events = env.events().all();
    assert_eq!(events.len(), 1);

    let event = events.last().unwrap();
    assert_eq!(event.0, client.address);
    assert_eq!(event.1.len(), 3);
}

#[test]
fn test_verify_profile_emits_profile_verified_event() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let data_hash = Bytes::from_array(&env, &[0u8; 32]);
    client.create_profile(&user, &AccountType::Tenant, &data_hash);

    client.verify_profile(&admin, &user);

    let events = env.events().all();
    assert_eq!(events.len(), 1);

    let event = events.last().unwrap();
    assert_eq!(event.0, client.address);
    assert_eq!(event.1.len(), 3);
}

#[test]
fn test_unverify_profile_emits_profile_unverified_event() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let data_hash = Bytes::from_array(&env, &[0u8; 32]);
    client.create_profile(&user, &AccountType::Tenant, &data_hash);
    client.verify_profile(&admin, &user);

    client.unverify_profile(&admin, &user);

    let events = env.events().all();
    assert_eq!(events.len(), 1);

    let event = events.last().unwrap();
    assert_eq!(event.0, client.address);
    assert_eq!(event.1.len(), 3);
}

#[test]
fn test_delete_profile_emits_profile_deleted_event() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let data_hash = Bytes::from_array(&env, &[0u8; 32]);
    client.create_profile(&user, &AccountType::Tenant, &data_hash);

    client.delete_profile(&user);

    let events = env.events().all();
    assert_eq!(events.len(), 1);

    let event = events.last().unwrap();
    assert_eq!(event.0, client.address);
    assert_eq!(event.1.len(), 3);
}

#[test]
fn test_no_event_emitted_when_create_profile_reverts() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let data_hash = Bytes::from_array(&env, &[0u8; 32]);
    client.create_profile(&user, &AccountType::Tenant, &data_hash);

    let result = client.try_create_profile(&user, &AccountType::Tenant, &data_hash);
    assert!(result.is_err());

    assert_eq!(env.events().all().len(), 0);
}

#[test]
fn test_no_event_emitted_when_update_profile_reverts() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let result = client.try_update_profile(&user, &Some(AccountType::Landlord), &None);
    assert!(result.is_err());

    assert_eq!(env.events().all().len(), 0);
}

#[test]
fn test_no_event_emitted_when_verify_profile_reverts() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let non_admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let data_hash = Bytes::from_array(&env, &[0u8; 32]);
    client.create_profile(&user, &AccountType::Tenant, &data_hash);

    let result = client.try_verify_profile(&non_admin, &user);
    assert!(result.is_err());

    assert_eq!(env.events().all().len(), 0);
}

#[test]
fn test_no_event_emitted_when_delete_profile_reverts() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let result = client.try_delete_profile(&user);
    assert!(result.is_err());

    assert_eq!(env.events().all().len(), 0);
}
