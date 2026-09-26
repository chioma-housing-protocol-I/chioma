//! Invalid-input and error-path tests for the Property Registry contract.
//!
//! Verifies that every `PropertyError` variant reachable from the public API
//! is actually returned under the conditions documented in `errors.rs`.

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

fn create_contract(env: &Env) -> PropertyRegistryContractClient<'_> {
    let contract_id = env.register(PropertyRegistryContract, ());
    PropertyRegistryContractClient::new(env, &contract_id)
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn test_double_initialization_fails() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);
    client.initialize(&admin);
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn test_register_property_fails_if_not_initialized() {
    let env = Env::default();
    let client = create_contract(&env);

    let landlord = Address::generate(&env);

    env.mock_all_auths();

    let property_id = String::from_str(&env, "PROP-001");
    let metadata_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

    client.register_property(&landlord, &property_id, &metadata_hash);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_register_property_fails_if_already_exists() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-001");
    let metadata_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

    client.register_property(&landlord, &property_id, &metadata_hash);
    client.register_property(&landlord, &property_id, &metadata_hash);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_register_property_fails_if_already_exists_different_landlord() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord1 = Address::generate(&env);
    let landlord2 = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-001");
    let metadata_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

    client.register_property(&landlord1, &property_id, &metadata_hash);
    client.register_property(&landlord2, &property_id, &metadata_hash);
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn test_register_property_fails_with_empty_property_id() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let property_id = String::from_str(&env, "");
    let metadata_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

    client.register_property(&landlord, &property_id, &metadata_hash);
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn test_register_property_fails_with_empty_metadata() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-001");
    let metadata_hash = String::from_str(&env, "");

    client.register_property(&landlord, &property_id, &metadata_hash);
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn test_verify_property_fails_if_property_not_found() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-NONEXISTENT");

    client.verify_property(&admin, &property_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
fn test_verify_property_fails_if_already_verified() {
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
    client.verify_property(&admin, &property_id);
}

#[test]
fn test_try_register_property_returns_err_instead_of_panic() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-001");
    let metadata_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

    client.register_property(&landlord, &property_id, &metadata_hash);

    let result = client.try_register_property(&landlord, &property_id, &metadata_hash);
    assert_eq!(result, Err(Ok(PropertyError::PropertyAlreadyExists)));
}

#[test]
fn test_try_verify_property_returns_err_for_not_found() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-NONEXISTENT");
    let result = client.try_verify_property(&admin, &property_id);
    assert_eq!(result, Err(Ok(PropertyError::PropertyNotFound)));
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn test_verify_property_fails_if_not_initialized() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);

    env.mock_all_auths();

    let property_id = String::from_str(&env, "PROP-001");

    client.verify_property(&admin, &property_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn test_propose_upgrade_fails_if_not_initialized() {
    let env = Env::default();
    let client = create_contract(&env);

    let proposer = Address::generate(&env);

    env.mock_all_auths();

    let proposal_id = String::from_str(&env, "UPG-001");
    let wasm_hash = soroban_sdk::Bytes::from_array(&env, &[0u8; 32]);
    let notes = String::from_str(&env, "notes");

    client.propose_upgrade(&proposer, &proposal_id, &wasm_hash, &notes, &1000);
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn test_propose_upgrade_fails_if_proposal_id_already_used() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let proposal_id = String::from_str(&env, "UPG-001");
    let wasm_hash = soroban_sdk::Bytes::from_array(&env, &[0u8; 32]);
    let notes = String::from_str(&env, "notes");

    client.propose_upgrade(&admin, &proposal_id, &wasm_hash, &notes, &1000);
    client.propose_upgrade(&admin, &proposal_id, &wasm_hash, &notes, &1000);
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn test_execute_upgrade_fails_before_eta() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let proposal_id = String::from_str(&env, "UPG-001");
    let wasm_hash = soroban_sdk::Bytes::from_array(&env, &[0u8; 32]);
    let notes = String::from_str(&env, "notes");

    client.propose_upgrade(&admin, &proposal_id, &wasm_hash, &notes, &1_000_000);
    client.execute_upgrade(&admin, &proposal_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn test_execute_upgrade_fails_if_already_executed() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let proposal_id = String::from_str(&env, "UPG-001");
    let wasm_hash = soroban_sdk::Bytes::from_array(&env, &[0u8; 32]);
    let notes = String::from_str(&env, "notes");

    client.propose_upgrade(&admin, &proposal_id, &wasm_hash, &notes, &0);
    client.execute_upgrade(&admin, &proposal_id);
    client.execute_upgrade(&admin, &proposal_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn test_get_upgrade_proposal_fails_if_not_found() {
    let env = Env::default();
    let client = create_contract(&env);

    let proposal_id = String::from_str(&env, "UPG-NONEXISTENT");

    client.get_upgrade_proposal(&proposal_id);
}

// ── transfer_property ──────────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn test_transfer_property_fails_if_not_initialized() {
    let env = Env::default();
    let client = create_contract(&env);

    let landlord = Address::generate(&env);
    let new_landlord = Address::generate(&env);

    env.mock_all_auths();

    let property_id = String::from_str(&env, "PROP-001");

    client.transfer_property(&landlord, &new_landlord, &property_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn test_transfer_property_fails_if_not_found() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);
    let new_landlord = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-NONEXISTENT");

    client.transfer_property(&landlord, &new_landlord, &property_id);
}

#[test]
fn test_try_transfer_property_returns_err_for_non_owner() {
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
    assert_eq!(result, Err(Ok(PropertyError::Unauthorized)));
}

// ── update_property_metadata ───────────────────────────────────────────────

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn test_update_property_metadata_fails_if_not_initialized() {
    let env = Env::default();
    let client = create_contract(&env);

    let landlord = Address::generate(&env);

    env.mock_all_auths();

    let property_id = String::from_str(&env, "PROP-001");
    let new_metadata_hash = String::from_str(&env, "QmNewHash");

    client.update_property_metadata(&landlord, &property_id, &new_metadata_hash);
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn test_update_property_metadata_fails_if_not_found() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-NONEXISTENT");
    let new_metadata_hash = String::from_str(&env, "QmNewHash");

    client.update_property_metadata(&landlord, &property_id, &new_metadata_hash);
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn test_update_property_metadata_fails_with_empty_metadata() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-001");
    let metadata_hash = String::from_str(&env, "QmOldHash");
    client.register_property(&landlord, &property_id, &metadata_hash);

    let new_metadata_hash = String::from_str(&env, "");
    client.update_property_metadata(&landlord, &property_id, &new_metadata_hash);
}

#[test]
fn test_try_update_property_metadata_returns_err_for_non_owner() {
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
    let result = client.try_update_property_metadata(&attacker, &property_id, &new_metadata_hash);
    assert_eq!(result, Err(Ok(PropertyError::Unauthorized)));
}
