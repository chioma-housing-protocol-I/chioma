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
#[should_panic]
fn test_initialize_fails_without_admin_auth() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);

    client.initialize(&admin);
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
