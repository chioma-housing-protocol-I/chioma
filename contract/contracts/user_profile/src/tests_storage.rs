//! Storage read/write coverage for the User Profile contract.
//!
//! Exercises the persistent `Profile` entries and instance `Admin`/`Initialized`
//! data through the public API (the only way to reach them, since storage is
//! private to the contract), verifying that reads reflect exactly what was
//! written, that missing entries read back as `None`/`false`, and that writes
//! for one account never leak into another account's storage slot.

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger as _},
    Address, Bytes, Env,
};

fn create_contract(env: &Env) -> UserProfileContractClient<'_> {
    let contract_id = env.register(UserProfileContract, ());
    UserProfileContractClient::new(env, &contract_id)
}

#[test]
fn test_get_profile_returns_none_when_absent() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    assert_eq!(client.get_profile(&user), None);
}

#[test]
fn test_has_profile_returns_false_when_absent() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    assert!(!client.has_profile(&user));
}

#[test]
fn test_get_profile_reflects_written_data() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let data_hash = Bytes::from_array(&env, &[7u8; 32]);

    env.mock_all_auths();
    client.initialize(&admin);
    client.create_profile(&user, &AccountType::Agent, &data_hash);

    let stored = client.get_profile(&user).unwrap();
    assert_eq!(stored.account_id, user);
    assert_eq!(stored.account_type, AccountType::Agent);
    assert_eq!(stored.data_hash, data_hash);
    assert!(!stored.is_verified);
}

#[test]
fn test_get_profile_reflects_updates() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let data_hash = Bytes::from_array(&env, &[0u8; 32]);
    let new_hash = Bytes::from_array(&env, &[9u8; 46]);

    env.mock_all_auths();
    client.initialize(&admin);
    client.create_profile(&user, &AccountType::Tenant, &data_hash);

    client.update_profile(&user, &Some(AccountType::Agent), &Some(new_hash.clone()));

    let stored = client.get_profile(&user).unwrap();
    assert_eq!(stored.account_type, AccountType::Agent);
    assert_eq!(stored.data_hash, new_hash);
}

#[test]
fn test_update_profile_bumps_last_updated_timestamp() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let data_hash = Bytes::from_array(&env, &[0u8; 32]);

    env.mock_all_auths();
    client.initialize(&admin);
    let created = client.create_profile(&user, &AccountType::Tenant, &data_hash);

    env.ledger()
        .with_mut(|li| li.timestamp = created.last_updated + 100);

    let updated = client.update_profile(&user, &Some(AccountType::Landlord), &None);
    assert!(updated.last_updated > created.last_updated);
}

#[test]
fn test_delete_profile_clears_storage() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let data_hash = Bytes::from_array(&env, &[0u8; 32]);

    env.mock_all_auths();
    client.initialize(&admin);
    client.create_profile(&user, &AccountType::Tenant, &data_hash);

    client.delete_profile(&user);

    assert_eq!(client.get_profile(&user), None);
    assert!(!client.has_profile(&user));
}

#[test]
fn test_recreate_profile_after_delete() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let data_hash = Bytes::from_array(&env, &[0u8; 32]);
    let new_hash = Bytes::from_array(&env, &[1u8; 32]);

    env.mock_all_auths();
    client.initialize(&admin);
    client.create_profile(&user, &AccountType::Tenant, &data_hash);
    client.delete_profile(&user);

    let recreated = client.create_profile(&user, &AccountType::Landlord, &new_hash);
    assert_eq!(recreated.account_type, AccountType::Landlord);
    assert_eq!(recreated.data_hash, new_hash);
    assert!(!recreated.is_verified);
}

#[test]
fn test_profile_storage_is_isolated_per_account() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user_a = Address::generate(&env);
    let user_b = Address::generate(&env);
    let hash_a = Bytes::from_array(&env, &[1u8; 32]);
    let hash_b = Bytes::from_array(&env, &[2u8; 46]);

    env.mock_all_auths();
    client.initialize(&admin);
    client.create_profile(&user_a, &AccountType::Tenant, &hash_a);
    client.create_profile(&user_b, &AccountType::Agent, &hash_b);

    client.delete_profile(&user_a);

    assert_eq!(client.get_profile(&user_a), None);
    let profile_b = client.get_profile(&user_b).unwrap();
    assert_eq!(profile_b.account_type, AccountType::Agent);
    assert_eq!(profile_b.data_hash, hash_b);
}

#[test]
fn test_verify_and_unverify_persist_across_reads() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let data_hash = Bytes::from_array(&env, &[0u8; 32]);

    env.mock_all_auths();
    client.initialize(&admin);
    client.create_profile(&user, &AccountType::Tenant, &data_hash);

    client.verify_profile(&admin, &user);
    assert!(client.get_profile(&user).unwrap().is_verified);

    client.unverify_profile(&admin, &user);
    assert!(!client.get_profile(&user).unwrap().is_verified);
}

#[test]
fn test_get_admin_reflects_initialized_admin() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    assert_eq!(client.get_admin(), admin);
}
