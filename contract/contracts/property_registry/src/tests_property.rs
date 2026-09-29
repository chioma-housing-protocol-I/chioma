//! Property-based tests for the Property Registry contract's core
//! state-machine invariant: a `property_id` can only ever be registered
//! once, and a rejected re-registration attempt must never mutate the
//! original stored record (#1562).
//!
//! Each proptest case drives a fresh, real `PropertyRegistryContract`
//! instance through a real `Env` (not a pure-function mirror), so this
//! actually exercises the on-chain storage/authorization logic in
//! `property.rs`, not just its arithmetic.

use super::*;
use proptest::prelude::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

fn create_contract(env: &Env) -> PropertyRegistryContractClient<'_> {
    let contract_id = env.register(PropertyRegistryContract, ());
    PropertyRegistryContractClient::new(env, &contract_id)
}

/// Registers `property_id` once, then attempts to register the exact same
/// id again with arbitrary (possibly different) landlord/metadata. The
/// second attempt must always fail with `PropertyAlreadyExists`, and the
/// originally stored record must be completely unchanged afterwards --
/// re-registration must never let a second caller overwrite an existing
/// property, whether or not they claim different data.
fn duplicate_registration_never_overwrites(
    metadata_a: &str,
    metadata_b: &str,
    same_landlord: bool,
) {
    let env = Env::default();
    let client = create_contract(&env);
    env.mock_all_auths();

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let landlord_a = Address::generate(&env);
    let landlord_b = if same_landlord {
        landlord_a.clone()
    } else {
        Address::generate(&env)
    };

    let property_id = String::from_str(&env, "PROP-PROPTEST-1");
    let hash_a = String::from_str(&env, metadata_a);
    let hash_b = String::from_str(&env, metadata_b);

    client.register_property(&landlord_a, &property_id, &hash_a);
    let original = client.get_property(&property_id).unwrap();
    let count_after_first = client.get_property_count();

    let second = client.try_register_property(&landlord_b, &property_id, &hash_b);
    assert_eq!(
        second,
        Err(Ok(PropertyError::PropertyAlreadyExists)),
        "re-registering an existing property_id must always fail, \
         regardless of whether the caller/metadata match the original"
    );

    // The stored record must be identical to the original -- a rejected
    // re-registration must never partially or fully overwrite it.
    let after = client.get_property(&property_id).unwrap();
    assert_eq!(
        after, original,
        "rejected re-registration must not mutate the stored record"
    );
    assert_eq!(
        client.get_property_count(),
        count_after_first,
        "rejected re-registration must not increment the property count"
    );
}

proptest! {
    /// Same landlord re-registering the same id with different metadata
    /// still must not be allowed to overwrite the original.
    #[test]
    fn prop_duplicate_registration_same_landlord_never_overwrites(
        metadata_a in "[a-zA-Z0-9]{10,40}",
        metadata_b in "[a-zA-Z0-9]{10,40}",
    ) {
        duplicate_registration_never_overwrites(&metadata_a, &metadata_b, true);
    }

    /// A different landlord attempting to "claim" an already-registered
    /// property_id must be rejected exactly the same way.
    #[test]
    fn prop_duplicate_registration_different_landlord_never_overwrites(
        metadata_a in "[a-zA-Z0-9]{10,40}",
        metadata_b in "[a-zA-Z0-9]{10,40}",
    ) {
        duplicate_registration_never_overwrites(&metadata_a, &metadata_b, false);
    }
}
