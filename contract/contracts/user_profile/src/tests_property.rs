//! Property-based tests for the User Profile contract's core state-machine
//! invariant (#1562): an already-created profile can never be
//! "re-created" with conflicting data, and doing so must never reset
//! verification status or overwrite the stored profile -- the account owner
//! re-submitting `create_profile` with a different account type or data
//! hash must not be able to silently roll back a verified profile to
//! unverified.
//!
//! Each proptest case drives a fresh, real `UserProfileContract` instance
//! through a real `Env`, exercising `create_profile`/`verify_profile`
//! end-to-end.

use crate::types::AccountType;
use crate::{ContractError, UserProfileContract};
use proptest::prelude::*;
use soroban_sdk::{testutils::Address as _, Address, Bytes, Env};

fn create_contract(env: &Env) -> crate::UserProfileContractClient<'_> {
    let contract_id = env.register(UserProfileContract, ());
    crate::UserProfileContractClient::new(env, &contract_id)
}

fn account_type_from_index(i: u8) -> AccountType {
    match i % 3 {
        0 => AccountType::Tenant,
        1 => AccountType::Landlord,
        _ => AccountType::Agent,
    }
}

/// Creates a profile, optionally verifies it, then attempts to re-create
/// the same account's profile with a (possibly different) account type and
/// data hash. The re-creation must always fail, and the stored profile
/// (including `is_verified`) must be completely unchanged afterwards.
fn duplicate_creation_never_overwrites(
    type_a_idx: u8,
    type_b_idx: u8,
    hash_a_seed: u8,
    hash_b_seed: u8,
    verify_before_retry: bool,
) {
    let env = Env::default();
    let client = create_contract(&env);
    env.mock_all_auths();

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let account_id = Address::generate(&env);
    let type_a = account_type_from_index(type_a_idx);
    let type_b = account_type_from_index(type_b_idx);
    let hash_a = Bytes::from_slice(&env, &[hash_a_seed; 32]);
    let hash_b = Bytes::from_slice(&env, &[hash_b_seed; 32]);

    client.create_profile(&account_id, &type_a, &hash_a);

    if verify_before_retry {
        client.verify_profile(&admin, &account_id);
    }

    let original = client.get_profile(&account_id).unwrap();

    let second = client.try_create_profile(&account_id, &type_b, &hash_b);
    assert_eq!(
        second,
        Err(Ok(ContractError::ProfileAlreadyExists)),
        "re-creating an already-created profile must always fail"
    );

    let after = client.get_profile(&account_id).unwrap();
    assert_eq!(
        after, original,
        "rejected re-creation must not mutate the stored profile, \
         including verification status"
    );
    assert_eq!(
        after.is_verified, verify_before_retry,
        "rejected re-creation must never reset (or set) verification status"
    );
}

proptest! {
    /// An unverified profile's re-creation attempt is rejected without
    /// changing any stored field.
    #[test]
    fn prop_duplicate_creation_unverified_never_overwrites(
        type_a_idx in 0u8..3,
        type_b_idx in 0u8..3,
        hash_a_seed in any::<u8>(),
        hash_b_seed in any::<u8>(),
    ) {
        duplicate_creation_never_overwrites(type_a_idx, type_b_idx, hash_a_seed, hash_b_seed, false);
    }

    /// A verified profile's re-creation attempt is rejected without
    /// resetting `is_verified` back to false.
    #[test]
    fn prop_duplicate_creation_verified_never_resets_verification(
        type_a_idx in 0u8..3,
        type_b_idx in 0u8..3,
        hash_a_seed in any::<u8>(),
        hash_b_seed in any::<u8>(),
    ) {
        duplicate_creation_never_overwrites(type_a_idx, type_b_idx, hash_a_seed, hash_b_seed, true);
    }
}
