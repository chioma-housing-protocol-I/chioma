//! Access control tests for the User Profile contract.
//!
//! Verifies that privileged/authenticated actions (initialize, create_profile,
//! update_profile, delete_profile, verify_profile, unverify_profile, and the
//! upgrade-proposal flow) reject calls missing the required `require_auth`,
//! and that admin-only actions are restricted to the configured admin.

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Bytes, Env, String};

fn create_contract(env: &Env) -> UserProfileContractClient<'_> {
    let contract_id = env.register(UserProfileContract, ());
    UserProfileContractClient::new(env, &contract_id)
}

fn hash32(env: &Env) -> Bytes {
    Bytes::from_array(env, &[0u8; 32])
}

// ── initialize ──────────────────────────────────────────────────────────────

#[test]
#[should_panic]
fn test_initialize_fails_without_admin_auth() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);

    client.initialize(&admin);
}

// ── create_profile ──────────────────────────────────────────────────────────

#[test]
#[should_panic]
fn test_create_profile_fails_without_owner_auth() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    env.mock_auths(&[]);

    client.create_profile(&user, &AccountType::Tenant, &hash32(&env));
}

// ── update_profile ───────────────────────────────────────────────────────────

#[test]
#[should_panic]
fn test_update_profile_fails_without_owner_auth() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);
    client.create_profile(&user, &AccountType::Tenant, &hash32(&env));

    env.mock_auths(&[]);

    client.update_profile(&user, &Some(AccountType::Landlord), &None);
}

// ── delete_profile ───────────────────────────────────────────────────────────

#[test]
#[should_panic]
fn test_delete_profile_fails_without_owner_auth() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);
    client.create_profile(&user, &AccountType::Tenant, &hash32(&env));

    env.mock_auths(&[]);

    client.delete_profile(&user);
}

// ── verify_profile ───────────────────────────────────────────────────────────

#[test]
#[should_panic]
fn test_verify_profile_fails_without_admin_auth() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);
    client.create_profile(&user, &AccountType::Tenant, &hash32(&env));

    env.mock_auths(&[]);

    client.verify_profile(&admin, &user);
}

/// A signed-in but non-admin caller cannot verify a profile: `require_auth`
/// only proves the caller signed for the address they claim to be, it does
/// not prove that address is the configured admin.
#[test]
#[should_panic(expected = "Error(Contract, #6)")]
fn test_verify_profile_fails_if_caller_is_not_admin() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let attacker = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);
    client.create_profile(&user, &AccountType::Tenant, &hash32(&env));

    client.verify_profile(&attacker, &user);
}

// ── unverify_profile ─────────────────────────────────────────────────────────

#[test]
#[should_panic]
fn test_unverify_profile_fails_without_admin_auth() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);
    client.create_profile(&user, &AccountType::Tenant, &hash32(&env));
    client.verify_profile(&admin, &user);

    env.mock_auths(&[]);

    client.unverify_profile(&admin, &user);
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
fn test_unverify_profile_fails_if_caller_is_not_admin() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let attacker = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);
    client.create_profile(&user, &AccountType::Tenant, &hash32(&env));
    client.verify_profile(&admin, &user);

    client.unverify_profile(&attacker, &user);
}

// ── propose_upgrade / approve_upgrade / execute_upgrade ─────────────────────

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
    let wasm_hash = Bytes::from_array(&env, &[0u8; 32]);
    let notes = String::from_str(&env, "notes");

    client.propose_upgrade(&admin, &proposal_id, &wasm_hash, &notes, &1000);
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
fn test_propose_upgrade_fails_if_caller_is_not_admin() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let attacker = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let proposal_id = String::from_str(&env, "UPG-001");
    let wasm_hash = Bytes::from_array(&env, &[0u8; 32]);
    let notes = String::from_str(&env, "notes");

    client.propose_upgrade(&attacker, &proposal_id, &wasm_hash, &notes, &1000);
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
fn test_approve_upgrade_fails_if_caller_is_not_admin() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let attacker = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let proposal_id = String::from_str(&env, "UPG-001");
    let wasm_hash = Bytes::from_array(&env, &[0u8; 32]);
    let notes = String::from_str(&env, "notes");

    client.propose_upgrade(&admin, &proposal_id, &wasm_hash, &notes, &1000);
    client.approve_upgrade(&attacker, &proposal_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
fn test_execute_upgrade_fails_if_caller_is_not_admin() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let attacker = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let proposal_id = String::from_str(&env, "UPG-001");
    let wasm_hash = Bytes::from_array(&env, &[0u8; 32]);
    let notes = String::from_str(&env, "notes");

    client.propose_upgrade(&admin, &proposal_id, &wasm_hash, &notes, &0);
    client.execute_upgrade(&attacker, &proposal_id);
}
