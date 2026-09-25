//! Event emission tests for the Property Registry contract.
//!
//! Verifies that `ContractInitialized`, `PropertyRegistered` and
//! `PropertyVerified` are published with the expected topic count, and that
//! no event is published when a call reverts.
//!
//! Note: `env.events().all()` only returns the events emitted by the most
//! recent top-level contract invocation, so each assertion below is checked
//! immediately after the call it targets rather than as a running total.

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Events as _},
    Address, Env, String,
};

fn create_contract(env: &Env) -> PropertyRegistryContractClient<'_> {
    let contract_id = env.register(PropertyRegistryContract, ());
    PropertyRegistryContractClient::new(env, &contract_id)
}

#[test]
fn test_initialize_emits_contract_initialized_event() {
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
fn test_register_property_emits_property_registered_event() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-001");
    let metadata_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

    client.register_property(&landlord, &property_id, &metadata_hash);

    let events = env.events().all();
    assert_eq!(events.len(), 1);

    let event = events.last().unwrap();
    assert_eq!(event.0, client.address);
    // Topics: [event_name, landlord, property_id]
    assert_eq!(event.1.len(), 3);
}

#[test]
fn test_verify_property_emits_property_verified_event() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-001");
    let metadata_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");
    client.register_property(&landlord, &property_id, &metadata_hash);

    client.verify_property(&admin, &property_id);

    let events = env.events().all();
    assert_eq!(events.len(), 1);

    let event = events.last().unwrap();
    assert_eq!(event.0, client.address);
    // Topics: [event_name, admin, property_id]
    assert_eq!(event.1.len(), 3);
}

#[test]
fn test_no_event_emitted_when_register_property_reverts() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-001");
    let metadata_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");
    client.register_property(&landlord, &property_id, &metadata_hash);

    // Second registration with the same id must fail and must not emit an event.
    let result = client.try_register_property(&landlord, &property_id, &metadata_hash);
    assert!(result.is_err());

    assert_eq!(env.events().all().len(), 0);
}

#[test]
fn test_no_event_emitted_when_verify_property_reverts() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let non_admin = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-001");
    let metadata_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");
    client.register_property(&landlord, &property_id, &metadata_hash);

    let result = client.try_verify_property(&non_admin, &property_id);
    assert!(result.is_err());

    assert_eq!(env.events().all().len(), 0);
}

#[test]
fn test_transfer_property_emits_property_transferred_event() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);
    let new_landlord = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-001");
    let metadata_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");
    client.register_property(&landlord, &property_id, &metadata_hash);

    client.transfer_property(&landlord, &new_landlord, &property_id);

    let events = env.events().all();
    assert_eq!(events.len(), 1);

    let event = events.last().unwrap();
    assert_eq!(event.0, client.address);
    // Topics: [event_name, previous_landlord, property_id]
    assert_eq!(event.1.len(), 3);
}

#[test]
fn test_update_property_metadata_emits_event() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-001");
    let metadata_hash = String::from_str(&env, "QmOldHash");
    client.register_property(&landlord, &property_id, &metadata_hash);

    let new_metadata_hash = String::from_str(&env, "QmNewHash");
    client.update_property_metadata(&landlord, &property_id, &new_metadata_hash);

    let events = env.events().all();
    assert_eq!(events.len(), 1);

    let event = events.last().unwrap();
    assert_eq!(event.0, client.address);
    // Topics: [event_name, landlord, property_id]
    assert_eq!(event.1.len(), 3);
}

#[test]
fn test_no_event_emitted_when_transfer_property_reverts() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);
    let attacker = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-001");
    let metadata_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");
    client.register_property(&landlord, &property_id, &metadata_hash);

    let result = client.try_transfer_property(&attacker, &attacker, &property_id);
    assert!(result.is_err());

    assert_eq!(env.events().all().len(), 0);
}

#[test]
fn test_no_event_emitted_when_update_property_metadata_reverts() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-001");
    let metadata_hash = String::from_str(&env, "QmOldHash");
    client.register_property(&landlord, &property_id, &metadata_hash);

    let empty_metadata_hash = String::from_str(&env, "");
    let result = client.try_update_property_metadata(&landlord, &property_id, &empty_metadata_hash);
    assert!(result.is_err());

    assert_eq!(env.events().all().len(), 0);
}
