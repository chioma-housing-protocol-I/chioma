use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, Env, String,
};

fn create_contract(env: &Env) -> PropertyRegistryContractClient<'_> {
    let contract_id = env.register(PropertyRegistryContract, ());
    PropertyRegistryContractClient::new(env, &contract_id)
}

#[test]
fn test_successful_initialization() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);

    env.mock_all_auths();

    let result = client.try_initialize(&admin);
    assert!(result.is_ok());

    let state = client.get_state().unwrap();
    assert_eq!(state.admin, admin);
    assert!(state.initialized);
}

#[test]
fn test_get_state_returns_none_before_initialization() {
    let env = Env::default();
    let client = create_contract(&env);

    assert!(client.get_state().is_none());
}

#[test]
fn test_query_methods_are_safe_before_initialization() {
    let env = Env::default();
    let client = create_contract(&env);

    let property_id = String::from_str(&env, "PROP-001");

    assert_eq!(client.get_property_count(), 0);
    assert!(!client.has_property(&property_id));
    assert!(client.get_property(&property_id).is_none());
}

#[test]
fn test_register_property_success() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-001");
    let metadata_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

    let result = client.try_register_property(&landlord, &property_id, &metadata_hash);
    assert!(result.is_ok());

    let property = client.get_property(&property_id).unwrap();
    assert_eq!(property.property_id, property_id);
    assert_eq!(property.landlord, landlord);
    assert_eq!(property.metadata_hash, metadata_hash);
    assert!(!property.verified);
    assert!(property.verified_at.is_none());

    assert!(client.has_property(&property_id));
    assert_eq!(client.get_property_count(), 1);
}

#[test]
fn test_verify_property_success() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-001");
    let metadata_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

    client.register_property(&landlord, &property_id, &metadata_hash);

    let result = client.try_verify_property(&admin, &property_id);
    assert!(result.is_ok());

    let property = client.get_property(&property_id).unwrap();
    assert!(property.verified);
    assert!(property.verified_at.is_some());
}

#[test]
fn test_get_property_returns_none_for_nonexistent() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-NONEXISTENT");

    let result = client.get_property(&property_id);
    assert!(result.is_none());
}

#[test]
fn test_has_property_returns_false_for_nonexistent() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-NONEXISTENT");

    let result = client.has_property(&property_id);
    assert!(!result);
}

#[test]
fn test_property_count_increments() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    assert_eq!(client.get_property_count(), 0);

    let property_id_1 = String::from_str(&env, "PROP-001");
    let property_id_2 = String::from_str(&env, "PROP-002");
    let metadata_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

    client.register_property(&landlord, &property_id_1, &metadata_hash);
    assert_eq!(client.get_property_count(), 1);

    client.register_property(&landlord, &property_id_2, &metadata_hash);
    assert_eq!(client.get_property_count(), 2);
}

#[test]
fn test_multiple_landlords_can_register_properties() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord1 = Address::generate(&env);
    let landlord2 = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let property_id_1 = String::from_str(&env, "PROP-001");
    let property_id_2 = String::from_str(&env, "PROP-002");
    let metadata_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

    client.register_property(&landlord1, &property_id_1, &metadata_hash);
    client.register_property(&landlord2, &property_id_2, &metadata_hash);

    let prop1 = client.get_property(&property_id_1).unwrap();
    let prop2 = client.get_property(&property_id_2).unwrap();

    assert_eq!(prop1.landlord, landlord1);
    assert_eq!(prop2.landlord, landlord2);
    assert_eq!(client.get_property_count(), 2);
}

#[test]
fn test_registered_at_timestamp() {
    let env = Env::default();
    env.ledger().with_mut(|ledger| {
        ledger.timestamp = 1000;
    });

    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-001");
    let metadata_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

    client.register_property(&landlord, &property_id, &metadata_hash);

    let property = client.get_property(&property_id).unwrap();
    assert_eq!(property.registered_at, 1000);
}

#[test]
fn test_verified_at_timestamp() {
    let env = Env::default();
    env.ledger().with_mut(|ledger| {
        ledger.timestamp = 1000;
    });

    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-001");
    let metadata_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

    client.register_property(&landlord, &property_id, &metadata_hash);

    env.ledger().with_mut(|ledger| {
        ledger.timestamp = 2000;
    });

    client.verify_property(&admin, &property_id);

    let property = client.get_property(&property_id).unwrap();
    assert_eq!(property.verified_at, Some(2000));
}

// ─── Issue #649: Property Registration & Verification Tests ───────────────────

#[test]
fn test_register_property_with_various_types() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let property_types = [
        ("APARTMENT-001", "QmApartment001"),
        ("HOUSE-001", "QmHouse001"),
        ("COMMERCIAL-001", "QmCommercial001"),
    ];

    for (prop_id, metadata) in property_types.iter() {
        let property_id = String::from_str(&env, prop_id);
        let metadata_hash = String::from_str(&env, metadata);

        let result = client.try_register_property(&landlord, &property_id, &metadata_hash);
        assert!(result.is_ok());

        let property = client.get_property(&property_id).unwrap();
        assert_eq!(property.property_id, property_id);
        assert!(!property.verified);
    }

    assert_eq!(client.get_property_count(), 3);
}

#[test]
fn test_verify_property_updates_status() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-VERIFY-TEST");
    let metadata_hash = String::from_str(&env, "QmVerifyTest");

    client.register_property(&landlord, &property_id, &metadata_hash);

    let property_before = client.get_property(&property_id).unwrap();
    assert!(!property_before.verified);
    assert!(property_before.verified_at.is_none());

    client.verify_property(&admin, &property_id);

    let property_after = client.get_property(&property_id).unwrap();
    assert!(property_after.verified);
    assert!(property_after.verified_at.is_some());
}

#[test]
fn test_get_property_returns_all_fields() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();
    env.ledger().with_mut(|li| li.timestamp = 1);

    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-FIELDS-TEST");
    let metadata_hash = String::from_str(&env, "QmFieldsTest");

    client.register_property(&landlord, &property_id, &metadata_hash);

    let property = client.get_property(&property_id).unwrap();
    assert_eq!(property.property_id, property_id);
    assert_eq!(property.landlord, landlord);
    assert_eq!(property.metadata_hash, metadata_hash);
    assert!(!property.verified);
    assert!(property.registered_at > 0);
    assert!(property.verified_at.is_none());
}

#[test]
fn test_get_property_nonexistent_returns_none() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let nonexistent_id = String::from_str(&env, "NONEXISTENT-PROP");
    let result = client.get_property(&nonexistent_id);
    assert!(result.is_none());
}

#[test]
fn test_property_count_accuracy() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    assert_eq!(client.get_property_count(), 0);

    for i in 0..5 {
        let property_id = match i {
            0 => String::from_str(&env, "PROP-0"),
            1 => String::from_str(&env, "PROP-1"),
            2 => String::from_str(&env, "PROP-2"),
            3 => String::from_str(&env, "PROP-3"),
            4 => String::from_str(&env, "PROP-4"),
            _ => String::from_str(&env, "PROP-5"),
        };
        let metadata_hash = match i {
            0 => String::from_str(&env, "QmMetadata0"),
            1 => String::from_str(&env, "QmMetadata1"),
            2 => String::from_str(&env, "QmMetadata2"),
            3 => String::from_str(&env, "QmMetadata3"),
            4 => String::from_str(&env, "QmMetadata4"),
            _ => String::from_str(&env, "QmMetadata5"),
        };
        client.register_property(&landlord, &property_id, &metadata_hash);
        assert_eq!(client.get_property_count(), (i + 1) as u32);
    }
}

#[test]
fn test_property_count_not_affected_by_verification() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let property_id_1 = String::from_str(&env, "PROP-COUNT-1");
    let property_id_2 = String::from_str(&env, "PROP-COUNT-2");
    let metadata_hash = String::from_str(&env, "QmCountMetadata");

    client.register_property(&landlord, &property_id_1, &metadata_hash);
    client.register_property(&landlord, &property_id_2, &metadata_hash);
    assert_eq!(client.get_property_count(), 2);

    client.verify_property(&admin, &property_id_1);
    assert_eq!(client.get_property_count(), 2);

    client.verify_property(&admin, &property_id_2);
    assert_eq!(client.get_property_count(), 2);
}

#[test]
fn test_property_count_with_larger_batch() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let properties = [
        ("BATCH-00", "QmBatch00"),
        ("BATCH-01", "QmBatch01"),
        ("BATCH-02", "QmBatch02"),
        ("BATCH-03", "QmBatch03"),
        ("BATCH-04", "QmBatch04"),
        ("BATCH-05", "QmBatch05"),
        ("BATCH-06", "QmBatch06"),
        ("BATCH-07", "QmBatch07"),
        ("BATCH-08", "QmBatch08"),
        ("BATCH-09", "QmBatch09"),
    ];

    for (i, (prop_id, metadata)) in properties.iter().enumerate() {
        let property_id = String::from_str(&env, prop_id);
        let metadata_hash = String::from_str(&env, metadata);

        client.register_property(&landlord, &property_id, &metadata_hash);
        assert_eq!(client.get_property_count(), (i + 1) as u32);
    }

    assert_eq!(client.get_property_count(), properties.len() as u32);
}

// ─── Upgrade proposal lifecycle ────────────────────────────────────────────

#[test]
fn test_upgrade_proposal_full_lifecycle() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);

    env.mock_all_auths();
    env.ledger().with_mut(|li| li.timestamp = 1000);

    client.initialize(&admin);

    let proposal_id = String::from_str(&env, "UPG-001");
    let wasm_hash = soroban_sdk::Bytes::from_array(&env, &[7u8; 32]);
    let notes = String::from_str(&env, "bump to v2");

    client.propose_upgrade(&admin, &proposal_id, &wasm_hash, &notes, &500);

    let proposal = client.get_upgrade_proposal(&proposal_id);
    assert_eq!(proposal.id, proposal_id);
    assert_eq!(proposal.proposer, admin);
    assert_eq!(proposal.wasm_hash, wasm_hash);
    assert_eq!(proposal.notes, notes);
    assert_eq!(proposal.eta, 1500);
    assert!(!proposal.executed);
    assert_eq!(proposal.approvals.len(), 1);

    client.approve_upgrade(&admin, &proposal_id);
    let proposal = client.get_upgrade_proposal(&proposal_id);
    assert_eq!(proposal.approvals.len(), 2);

    env.ledger().with_mut(|li| li.timestamp = 1500);
    client.execute_upgrade(&admin, &proposal_id);

    let proposal = client.get_upgrade_proposal(&proposal_id);
    assert!(proposal.executed);
}

// ─── Property transfer ─────────────────────────────────────────────────────

#[test]
fn test_transfer_property_success() {
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

    let result = client.try_transfer_property(&landlord, &new_landlord, &property_id);
    assert!(result.is_ok());

    let property = client.get_property(&property_id).unwrap();
    assert_eq!(property.landlord, new_landlord);
}

#[test]
fn test_transfer_property_preserves_metadata_and_verification_status() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);
    let new_landlord = Address::generate(&env);

    env.mock_all_auths();
    env.ledger().with_mut(|li| li.timestamp = 100);
    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-001");
    let metadata_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");
    client.register_property(&landlord, &property_id, &metadata_hash);
    client.verify_property(&admin, &property_id);

    let before = client.get_property(&property_id).unwrap();

    client.transfer_property(&landlord, &new_landlord, &property_id);

    let after = client.get_property(&property_id).unwrap();
    assert_eq!(after.landlord, new_landlord);
    assert_eq!(after.metadata_hash, before.metadata_hash);
    assert_eq!(after.verified, before.verified);
    assert_eq!(after.verified_at, before.verified_at);
    assert_eq!(after.registered_at, before.registered_at);
}

#[test]
fn test_property_count_unaffected_by_transfer() {
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
    assert_eq!(client.get_property_count(), 1);

    client.transfer_property(&landlord, &new_landlord, &property_id);
    assert_eq!(client.get_property_count(), 1);
}

#[test]
fn test_transfer_property_to_same_landlord_is_a_noop_success() {
    // Not explicitly disallowed by the spec: transferring to the current
    // landlord is treated as a valid (if pointless) no-op rather than an error.
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-001");
    let metadata_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");
    client.register_property(&landlord, &property_id, &metadata_hash);

    let result = client.try_transfer_property(&landlord, &landlord, &property_id);
    assert!(result.is_ok());

    let property = client.get_property(&property_id).unwrap();
    assert_eq!(property.landlord, landlord);
}

#[test]
fn test_multiple_sequential_transfers() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord_a = Address::generate(&env);
    let landlord_b = Address::generate(&env);
    let landlord_c = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-001");
    let metadata_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");
    client.register_property(&landlord_a, &property_id, &metadata_hash);

    client.transfer_property(&landlord_a, &landlord_b, &property_id);
    assert_eq!(
        client.get_property(&property_id).unwrap().landlord,
        landlord_b
    );

    client.transfer_property(&landlord_b, &landlord_c, &property_id);
    assert_eq!(
        client.get_property(&property_id).unwrap().landlord,
        landlord_c
    );
}

// ─── Property metadata updates ─────────────────────────────────────────────

#[test]
fn test_update_property_metadata_success() {
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
    let result = client.try_update_property_metadata(&landlord, &property_id, &new_metadata_hash);
    assert!(result.is_ok());

    let property = client.get_property(&property_id).unwrap();
    assert_eq!(property.metadata_hash, new_metadata_hash);
}

#[test]
fn test_update_property_metadata_resets_verification() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-001");
    let metadata_hash = String::from_str(&env, "QmOldHash");
    client.register_property(&landlord, &property_id, &metadata_hash);
    client.verify_property(&admin, &property_id);

    let verified_property = client.get_property(&property_id).unwrap();
    assert!(verified_property.verified);
    assert!(verified_property.verified_at.is_some());

    let new_metadata_hash = String::from_str(&env, "QmNewHash");
    client.update_property_metadata(&landlord, &property_id, &new_metadata_hash);

    let updated_property = client.get_property(&property_id).unwrap();
    assert!(!updated_property.verified);
    assert!(updated_property.verified_at.is_none());
}

#[test]
fn test_update_property_metadata_preserves_id_landlord_and_registered_at() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();
    env.ledger().with_mut(|li| li.timestamp = 500);
    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-001");
    let metadata_hash = String::from_str(&env, "QmOldHash");
    client.register_property(&landlord, &property_id, &metadata_hash);

    let new_metadata_hash = String::from_str(&env, "QmNewHash");
    client.update_property_metadata(&landlord, &property_id, &new_metadata_hash);

    let property = client.get_property(&property_id).unwrap();
    assert_eq!(property.property_id, property_id);
    assert_eq!(property.landlord, landlord);
    assert_eq!(property.registered_at, 500);
}

#[test]
fn test_update_property_metadata_multiple_times() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-001");
    let metadata_hash = String::from_str(&env, "QmHash0");
    client.register_property(&landlord, &property_id, &metadata_hash);

    let hashes = ["QmHash1", "QmHash2", "QmHash3"];
    for hash in hashes.iter() {
        let new_metadata_hash = String::from_str(&env, hash);
        client.update_property_metadata(&landlord, &property_id, &new_metadata_hash);

        let property = client.get_property(&property_id).unwrap();
        assert_eq!(property.metadata_hash, new_metadata_hash);
        assert!(!property.verified);
    }
}

#[test]
fn test_property_count_unaffected_by_metadata_update() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-001");
    let metadata_hash = String::from_str(&env, "QmOldHash");
    client.register_property(&landlord, &property_id, &metadata_hash);
    assert_eq!(client.get_property_count(), 1);

    let new_metadata_hash = String::from_str(&env, "QmNewHash");
    client.update_property_metadata(&landlord, &property_id, &new_metadata_hash);
    assert_eq!(client.get_property_count(), 1);
}

#[test]
fn test_new_landlord_can_update_metadata_after_transfer() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let old_landlord = Address::generate(&env);
    let new_landlord = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let property_id = String::from_str(&env, "PROP-001");
    let metadata_hash = String::from_str(&env, "QmOldHash");
    client.register_property(&old_landlord, &property_id, &metadata_hash);
    client.transfer_property(&old_landlord, &new_landlord, &property_id);

    let new_metadata_hash = String::from_str(&env, "QmNewHash");
    let result =
        client.try_update_property_metadata(&new_landlord, &property_id, &new_metadata_hash);
    assert!(result.is_ok());

    let property = client.get_property(&property_id).unwrap();
    assert_eq!(property.metadata_hash, new_metadata_hash);
}
