//! Invalid-input and error-path tests for the User Profile contract.
//!
//! Verifies that every `ContractError` variant reachable from the public API
//! is actually returned under the conditions documented in `errors.rs`.

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Bytes, Env, String};

fn create_contract(env: &Env) -> UserProfileContractClient<'_> {
    let contract_id = env.register(UserProfileContract, ());
    UserProfileContractClient::new(env, &contract_id)
}

// ── AlreadyInitialized (#1) ──────────────────────────────────────────────────

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

// ── ProfileAlreadyExists (#2) ────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn test_create_profile_fails_if_already_exists() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let data_hash = Bytes::from_array(&env, &[0u8; 32]);
    client.create_profile(&user, &AccountType::Tenant, &data_hash);
    client.create_profile(&user, &AccountType::Landlord, &data_hash);
}

#[test]
fn test_try_create_profile_returns_err_instead_of_panic() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let data_hash = Bytes::from_array(&env, &[0u8; 32]);
    client.create_profile(&user, &AccountType::Tenant, &data_hash);

    let result = client.try_create_profile(&user, &AccountType::Tenant, &data_hash);
    assert_eq!(result, Err(Ok(ContractError::ProfileAlreadyExists)));
}

// ── ProfileNotFound (#3) ─────────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_update_profile_fails_if_not_found() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    client.update_profile(&user, &Some(AccountType::Landlord), &None);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_verify_profile_fails_if_profile_not_found() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    client.verify_profile(&admin, &user);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_unverify_profile_fails_if_profile_not_found() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    client.unverify_profile(&admin, &user);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_delete_profile_fails_if_not_found() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    client.delete_profile(&user);
}

#[test]
fn test_try_update_profile_returns_err_for_not_found() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let result = client.try_update_profile(&user, &Some(AccountType::Landlord), &None);
    assert_eq!(result, Err(Ok(ContractError::ProfileNotFound)));
}

// ── InvalidHashLength (#4) ───────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn test_create_profile_fails_with_empty_hash() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let data_hash = Bytes::from_array(&env, &[]);
    client.create_profile(&user, &AccountType::Tenant, &data_hash);
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn test_create_profile_fails_with_hash_length_33() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let data_hash = Bytes::from_array(&env, &[0u8; 33]);
    client.create_profile(&user, &AccountType::Tenant, &data_hash);
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn test_create_profile_fails_with_hash_length_45() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let data_hash = Bytes::from_array(&env, &[0u8; 45]);
    client.create_profile(&user, &AccountType::Tenant, &data_hash);
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn test_create_profile_fails_with_hash_length_47() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let data_hash = Bytes::from_array(&env, &[0u8; 47]);
    client.create_profile(&user, &AccountType::Tenant, &data_hash);
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn test_update_profile_fails_with_invalid_hash_length() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let data_hash = Bytes::from_array(&env, &[0u8; 32]);
    client.create_profile(&user, &AccountType::Tenant, &data_hash);

    let bad_hash = Bytes::from_array(&env, &[1u8; 20]);
    client.update_profile(&user, &None, &Some(bad_hash));
}

#[test]
fn test_try_create_profile_returns_err_for_invalid_hash() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let data_hash = Bytes::from_array(&env, &[0u8; 10]);
    let result = client.try_create_profile(&user, &AccountType::Tenant, &data_hash);
    assert_eq!(result, Err(Ok(ContractError::InvalidHashLength)));
}

// ── AdminNotConfigured (#5) ──────────────────────────────────────────────────

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_get_admin_fails_if_not_configured() {
    let env = Env::default();
    let client = create_contract(&env);

    client.get_admin();
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_verify_profile_fails_if_admin_not_configured() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();

    client.verify_profile(&admin, &user);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_unverify_profile_fails_if_admin_not_configured() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();

    client.unverify_profile(&admin, &user);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_propose_upgrade_fails_if_admin_not_configured() {
    let env = Env::default();
    let client = create_contract(&env);

    let proposer = Address::generate(&env);

    env.mock_all_auths();

    let proposal_id = String::from_str(&env, "UPG-001");
    let wasm_hash = Bytes::from_array(&env, &[0u8; 32]);
    let notes = String::from_str(&env, "notes");

    client.propose_upgrade(&proposer, &proposal_id, &wasm_hash, &notes, &1000);
}

// ── AccessDenied (#7) — upgrade proposal lifecycle ──────────────────────────

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn test_propose_upgrade_fails_if_proposal_id_already_used() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let proposal_id = String::from_str(&env, "UPG-001");
    let wasm_hash = Bytes::from_array(&env, &[0u8; 32]);
    let notes = String::from_str(&env, "notes");

    client.propose_upgrade(&admin, &proposal_id, &wasm_hash, &notes, &1000);
    client.propose_upgrade(&admin, &proposal_id, &wasm_hash, &notes, &1000);
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn test_approve_upgrade_fails_if_not_found() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let proposal_id = String::from_str(&env, "UPG-NONEXISTENT");
    client.approve_upgrade(&admin, &proposal_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn test_execute_upgrade_fails_before_eta() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let proposal_id = String::from_str(&env, "UPG-001");
    let wasm_hash = Bytes::from_array(&env, &[0u8; 32]);
    let notes = String::from_str(&env, "notes");

    client.propose_upgrade(&admin, &proposal_id, &wasm_hash, &notes, &1_000_000);
    client.execute_upgrade(&admin, &proposal_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn test_execute_upgrade_fails_if_already_executed() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let proposal_id = String::from_str(&env, "UPG-001");
    let wasm_hash = Bytes::from_array(&env, &[0u8; 32]);
    let notes = String::from_str(&env, "notes");

    client.propose_upgrade(&admin, &proposal_id, &wasm_hash, &notes, &0);
    client.execute_upgrade(&admin, &proposal_id);
    client.execute_upgrade(&admin, &proposal_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn test_approve_upgrade_fails_if_already_executed() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let proposal_id = String::from_str(&env, "UPG-001");
    let wasm_hash = Bytes::from_array(&env, &[0u8; 32]);
    let notes = String::from_str(&env, "notes");

    client.propose_upgrade(&admin, &proposal_id, &wasm_hash, &notes, &0);
    client.execute_upgrade(&admin, &proposal_id);
    client.approve_upgrade(&admin, &proposal_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn test_execute_upgrade_fails_if_not_found() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let proposal_id = String::from_str(&env, "UPG-NONEXISTENT");
    client.execute_upgrade(&admin, &proposal_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn test_get_upgrade_proposal_fails_if_not_found() {
    let env = Env::default();
    let client = create_contract(&env);

    let proposal_id = String::from_str(&env, "UPG-NONEXISTENT");

    client.get_upgrade_proposal(&proposal_id);
}

#[test]
fn test_upgrade_proposal_lifecycle_succeeds() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let proposal_id = String::from_str(&env, "UPG-001");
    let wasm_hash = Bytes::from_array(&env, &[0u8; 32]);
    let notes = String::from_str(&env, "notes");

    client.propose_upgrade(&admin, &proposal_id, &wasm_hash, &notes, &0);
    client.approve_upgrade(&admin, &proposal_id);
    client.execute_upgrade(&admin, &proposal_id);

    let proposal = client.get_upgrade_proposal(&proposal_id);
    assert!(proposal.executed);
}
