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

proptest! {
    /// Whatever metadata and property_id are chosen, a freshly registered
    /// property must round-trip through `get_property` unverified, with
    /// the exact landlord/metadata it was registered with.
    #[test]
    fn prop_get_property_round_trip(
        metadata in "[a-zA-Z0-9]{10,40}",
        property_suffix in "[A-Z0-9]{1,20}",
    ) {
        let env = Env::default();
        let client = create_contract(&env);
        env.mock_all_auths();

        let admin = Address::generate(&env);
        client.initialize(&admin);

        let landlord = Address::generate(&env);
        let property_id = String::from_str(&env, &property_suffix);
        let hash = String::from_str(&env, &metadata);

        client.register_property(&landlord, &property_id, &hash);

        let stored = client.get_property(&property_id).unwrap();
        assert_eq!(stored.landlord, landlord);
        assert_eq!(stored.metadata_hash, hash);
        assert!(!stored.verified);
        assert_eq!(stored.verified_at, None);
        assert!(client.has_property(&property_id));
    }

    /// Registering `count` distinct property ids must grow the global
    /// counter by exactly `count`, regardless of what `count` is.
    #[test]
    fn prop_register_distinct_ids_increments_count(
        metadata in "[a-zA-Z0-9]{10,40}",
        count in 1u32..=5,
    ) {
        let env = Env::default();
        let client = create_contract(&env);
        env.mock_all_auths();

        let admin = Address::generate(&env);
        client.initialize(&admin);

        let ids = ["PROP-A", "PROP-B", "PROP-C", "PROP-D", "PROP-E"];
        let hash = String::from_str(&env, &metadata);

        for id in ids.iter().take(count as usize) {
            let landlord = Address::generate(&env);
            let property_id = String::from_str(&env, id);
            client.register_property(&landlord, &property_id, &hash);
        }

        assert_eq!(client.get_property_count(), count);
    }

    /// Any caller other than the contract admin must be rejected when
    /// attempting to verify a property, and the property's verification
    /// state must remain untouched.
    #[test]
    fn prop_verify_by_non_admin_always_unauthorized(metadata in "[a-zA-Z0-9]{10,40}") {
        let env = Env::default();
        let client = create_contract(&env);
        env.mock_all_auths();

        let admin = Address::generate(&env);
        client.initialize(&admin);

        let landlord = Address::generate(&env);
        let property_id = String::from_str(&env, "PROP-VERIFY-AUTH");
        let hash = String::from_str(&env, &metadata);
        client.register_property(&landlord, &property_id, &hash);

        let impostor = Address::generate(&env);
        let result = client.try_verify_property(&impostor, &property_id);
        assert_eq!(result, Err(Ok(PropertyError::Unauthorized)));

        let after = client.get_property(&property_id).unwrap();
        assert!(!after.verified);
        assert_eq!(after.verified_at, None);
    }

    /// Verifying an already-verified property must always fail the second
    /// time with `AlreadyVerified`, and must not change the stored record
    /// set by the first, successful verification.
    #[test]
    fn prop_verify_twice_fails_already_verified(metadata in "[a-zA-Z0-9]{10,40}") {
        let env = Env::default();
        let client = create_contract(&env);
        env.mock_all_auths();

        let admin = Address::generate(&env);
        client.initialize(&admin);

        let landlord = Address::generate(&env);
        let property_id = String::from_str(&env, "PROP-VERIFY-TWICE");
        let hash = String::from_str(&env, &metadata);
        client.register_property(&landlord, &property_id, &hash);

        client.verify_property(&admin, &property_id);
        let after_first = client.get_property(&property_id).unwrap();
        assert!(after_first.verified);

        let second = client.try_verify_property(&admin, &property_id);
        assert_eq!(second, Err(Ok(PropertyError::AlreadyVerified)));

        let after_second = client.get_property(&property_id).unwrap();
        assert_eq!(after_second, after_first);
    }

    /// Only the landlord on record may transfer a property; any other
    /// caller must be rejected and the recorded landlord must not change.
    #[test]
    fn prop_transfer_by_non_owner_always_unauthorized(metadata in "[a-zA-Z0-9]{10,40}") {
        let env = Env::default();
        let client = create_contract(&env);
        env.mock_all_auths();

        let admin = Address::generate(&env);
        client.initialize(&admin);

        let landlord_a = Address::generate(&env);
        let property_id = String::from_str(&env, "PROP-TRANSFER-AUTH");
        let hash = String::from_str(&env, &metadata);
        client.register_property(&landlord_a, &property_id, &hash);

        let impostor = Address::generate(&env);
        let new_landlord = Address::generate(&env);
        let result = client.try_transfer_property(&impostor, &new_landlord, &property_id);
        assert_eq!(result, Err(Ok(PropertyError::Unauthorized)));

        let after = client.get_property(&property_id).unwrap();
        assert_eq!(after.landlord, landlord_a);
    }

    /// A successful transfer must update only the landlord field --
    /// metadata, verification status/timestamp, and registration timestamp
    /// must be carried over unchanged, whether or not the property was
    /// verified beforehand.
    #[test]
    fn prop_transfer_preserves_metadata_and_verification_state(
        metadata in "[a-zA-Z0-9]{10,40}",
        verify_before in any::<bool>(),
    ) {
        let env = Env::default();
        let client = create_contract(&env);
        env.mock_all_auths();

        let admin = Address::generate(&env);
        client.initialize(&admin);

        let landlord_a = Address::generate(&env);
        let property_id = String::from_str(&env, "PROP-TRANSFER-PRESERVE");
        let hash = String::from_str(&env, &metadata);
        client.register_property(&landlord_a, &property_id, &hash);

        if verify_before {
            client.verify_property(&admin, &property_id);
        }
        let original = client.get_property(&property_id).unwrap();

        let new_landlord = Address::generate(&env);
        client.transfer_property(&landlord_a, &new_landlord, &property_id);

        let after = client.get_property(&property_id).unwrap();
        assert_eq!(after.landlord, new_landlord);
        assert_eq!(after.metadata_hash, original.metadata_hash);
        assert_eq!(after.verified, original.verified);
        assert_eq!(after.verified_at, original.verified_at);
        assert_eq!(after.registered_at, original.registered_at);
    }

    /// Only the landlord on record may update a property's metadata; any
    /// other caller must be rejected and the stored metadata must not
    /// change.
    #[test]
    fn prop_update_metadata_by_non_owner_always_unauthorized(
        metadata_a in "[a-zA-Z0-9]{10,40}",
        metadata_b in "[a-zA-Z0-9]{10,40}",
    ) {
        let env = Env::default();
        let client = create_contract(&env);
        env.mock_all_auths();

        let admin = Address::generate(&env);
        client.initialize(&admin);

        let landlord_a = Address::generate(&env);
        let property_id = String::from_str(&env, "PROP-UPDATE-AUTH");
        let hash_a = String::from_str(&env, &metadata_a);
        client.register_property(&landlord_a, &property_id, &hash_a);

        let impostor = Address::generate(&env);
        let hash_b = String::from_str(&env, &metadata_b);
        let result = client.try_update_property_metadata(&impostor, &property_id, &hash_b);
        assert_eq!(result, Err(Ok(PropertyError::Unauthorized)));

        let after = client.get_property(&property_id).unwrap();
        assert_eq!(after.metadata_hash, hash_a);
    }

    /// A successful metadata update must always revoke verification --
    /// `verified` becomes false and `verified_at` becomes `None` -- no
    /// matter whether the property was verified beforehand.
    #[test]
    fn prop_update_metadata_revokes_verification(
        metadata_a in "[a-zA-Z0-9]{10,40}",
        metadata_b in "[a-zA-Z0-9]{10,40}",
        verify_before in any::<bool>(),
    ) {
        let env = Env::default();
        let client = create_contract(&env);
        env.mock_all_auths();

        let admin = Address::generate(&env);
        client.initialize(&admin);

        let landlord = Address::generate(&env);
        let property_id = String::from_str(&env, "PROP-UPDATE-REVOKE");
        let hash_a = String::from_str(&env, &metadata_a);
        client.register_property(&landlord, &property_id, &hash_a);

        if verify_before {
            client.verify_property(&admin, &property_id);
        }

        let hash_b = String::from_str(&env, &metadata_b);
        client.update_property_metadata(&landlord, &property_id, &hash_b);

        let after = client.get_property(&property_id).unwrap();
        assert_eq!(after.metadata_hash, hash_b);
        assert!(!after.verified);
        assert_eq!(after.verified_at, None);
    }

    /// An empty property_id must always be rejected with
    /// `InvalidPropertyId`, regardless of the metadata supplied, and must
    /// never be counted as a registration.
    #[test]
    fn prop_empty_property_id_always_rejected(metadata in "[a-zA-Z0-9]{10,40}") {
        let env = Env::default();
        let client = create_contract(&env);
        env.mock_all_auths();

        let admin = Address::generate(&env);
        client.initialize(&admin);

        let landlord = Address::generate(&env);
        let empty_id = String::from_str(&env, "");
        let hash = String::from_str(&env, &metadata);

        let result = client.try_register_property(&landlord, &empty_id, &hash);
        assert_eq!(result, Err(Ok(PropertyError::InvalidPropertyId)));
        assert_eq!(client.get_property_count(), 0);
    }

    /// An empty metadata hash must always be rejected with
    /// `InvalidMetadata`, regardless of the property_id supplied, and must
    /// never be counted as a registration.
    #[test]
    fn prop_empty_metadata_always_rejected(property_suffix in "[A-Z0-9]{1,20}") {
        let env = Env::default();
        let client = create_contract(&env);
        env.mock_all_auths();

        let admin = Address::generate(&env);
        client.initialize(&admin);

        let landlord = Address::generate(&env);
        let property_id = String::from_str(&env, &property_suffix);
        let empty_hash = String::from_str(&env, "");

        let result = client.try_register_property(&landlord, &property_id, &empty_hash);
        assert_eq!(result, Err(Ok(PropertyError::InvalidMetadata)));
        assert_eq!(client.get_property_count(), 0);
        assert!(!client.has_property(&property_id));
    }
}
