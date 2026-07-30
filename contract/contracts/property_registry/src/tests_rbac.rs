//! Access control tests for the Property Registry contract.
//!
//! Verifies that privileged/authenticated actions (initialize, register_property,
//! verify_property) reject calls missing the required `require_auth`, and that
//! `verify_property` is restricted to the contract admin.

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

fn create_contract(env: &Env) -> PropertyRegistryContractClient<'_> {
    let contract_id = env.register(PropertyRegistryContract, ());
    PropertyRegistryContractClient::new(env, &contract_id)
}

#[test]
#[should_panic]
fn test_initialize_fails_without_admin_auth() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);

    client.initialize(&admin);
}

#[test]
#[should_panic]
fn test_register_property_fails_without_landlord_auth() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    env.mock_auths(&[]);

    let property_id = String::from_str(&env, "PROP-001");
    let metadata_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

    client.register_property(&landlord, &property_id, &metadata_hash);
}

#[test]
#[should_panic]
fn test_verify_property_fails_without_admin_auth() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-001");
    let metadata_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

    client.register_property(&landlord, &property_id, &metadata_hash);

    env.mock_auths(&[]);

    client.verify_property(&admin, &property_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_verify_property_fails_if_not_admin() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);
    let non_admin = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-001");
    let metadata_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

    client.register_property(&landlord, &property_id, &metadata_hash);
    client.verify_property(&non_admin, &property_id);
}

#[test]
#[should_panic]
fn test_propose_upgrade_fails_without_admin_auth() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    env.mock_auths(&[]);

    let proposal_id = String::from_str(&env, "UPG-001");
    let wasm_hash = soroban_sdk::Bytes::from_array(&env, &[0u8; 32]);
    let notes = String::from_str(&env, "notes");

    client.propose_upgrade(&admin, &proposal_id, &wasm_hash, &notes, &1000);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_propose_upgrade_fails_if_not_admin() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let attacker = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let proposal_id = String::from_str(&env, "UPG-001");
    let wasm_hash = soroban_sdk::Bytes::from_array(&env, &[0u8; 32]);
    let notes = String::from_str(&env, "notes");

    client.propose_upgrade(&attacker, &proposal_id, &wasm_hash, &notes, &1000);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_approve_upgrade_fails_if_not_admin() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let attacker = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let proposal_id = String::from_str(&env, "UPG-001");
    let wasm_hash = soroban_sdk::Bytes::from_array(&env, &[0u8; 32]);
    let notes = String::from_str(&env, "notes");

    client.propose_upgrade(&admin, &proposal_id, &wasm_hash, &notes, &1000);
    client.approve_upgrade(&attacker, &proposal_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_execute_upgrade_fails_if_not_admin() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let attacker = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let proposal_id = String::from_str(&env, "UPG-001");
    let wasm_hash = soroban_sdk::Bytes::from_array(&env, &[0u8; 32]);
    let notes = String::from_str(&env, "notes");

    client.propose_upgrade(&admin, &proposal_id, &wasm_hash, &notes, &0);
    client.execute_upgrade(&attacker, &proposal_id);
}

// ── transfer_property ──────────────────────────────────────────────────────

#[test]
#[should_panic]
fn test_transfer_property_fails_without_current_landlord_auth() {
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

    env.mock_auths(&[]);

    client.transfer_property(&landlord, &new_landlord, &property_id);
}

/// An attacker cannot steal a property by calling `transfer_property` with
/// their own address as `current_landlord`: `require_auth` only proves the
/// caller signed for the address they claim to be, it does not prove that
/// address actually owns the property on record.
#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_transfer_property_fails_if_caller_is_not_actual_owner() {
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

    client.transfer_property(&attacker, &attacker, &property_id);
}

// ── update_property_metadata ───────────────────────────────────────────────

#[test]
#[should_panic]
fn test_update_property_metadata_fails_without_landlord_auth() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-001");
    let metadata_hash = String::from_str(&env, "QmOldHash");
    client.register_property(&landlord, &property_id, &metadata_hash);

    env.mock_auths(&[]);

    let new_metadata_hash = String::from_str(&env, "QmNewHash");
    client.update_property_metadata(&landlord, &property_id, &new_metadata_hash);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_update_property_metadata_fails_if_caller_is_not_actual_owner() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);
    let attacker = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-001");
    let metadata_hash = String::from_str(&env, "QmOldHash");
    client.register_property(&landlord, &property_id, &metadata_hash);

    let new_metadata_hash = String::from_str(&env, "QmNewHash");
    client.update_property_metadata(&attacker, &property_id, &new_metadata_hash);
}
