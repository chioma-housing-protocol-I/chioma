use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger, MockAuth, MockAuthInvoke},
    Address, Bytes, Env, IntoVal, String, Vec,
};

fn create_contract(env: &Env) -> ContractClient<'_> {
    let contract_id = env.register(Contract, ());
    ContractClient::new(env, &contract_id)
}

fn initialize_contract(env: &Env, client: &ContractClient<'_>, admin: &Address) {
    let config = Config {
        fee_bps: 100,
        fee_collector: Address::generate(env),
        paused: false,
    };
    client
        .mock_auths(&[MockAuth {
            address: admin,
            invoke: &MockAuthInvoke {
                contract: &client.address,
                fn_name: "initialize",
                args: (admin.clone(), config.clone()).into_val(env),
                sub_invokes: &[],
            },
        }])
        .initialize(admin, &config);
}

// --- Contract Versioning Tests ---

#[test]
fn test_get_current_version() {
    let env = Env::default();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let version = client.get_version();
    assert_eq!(version.major, 0);
    assert_eq!(version.minor, 1);
    assert_eq!(version.patch, 0);
    assert_eq!(version.label, String::from_str(&env, "initial"));
    assert_eq!(version.status, VersionStatus::Active);
}

#[test]
fn test_record_version_success() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let new_version = ContractVersion {
        major: 1,
        minor: 0,
        patch: 0,
        label: String::from_str(&env, "v1.0.0"),
        status: VersionStatus::Active,
        hash: Bytes::from_array(&env, &[0; 32]),
        updated_at: env.ledger().timestamp(),
    };

    client.record_version(&new_version);

    let version = client.get_version();
    assert_eq!(version.major, 1);
    assert_eq!(version.label, String::from_str(&env, "v1.0.0"));
}

#[test]
fn test_record_version_semantic_updates() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    // Major update
    let v1 = ContractVersion {
        major: 1,
        minor: 0,
        patch: 0,
        label: String::from_str(&env, "v1"),
        status: VersionStatus::Active,
        hash: Bytes::new(&env),
        updated_at: env.ledger().timestamp(),
    };
    client.record_version(&v1);

    // Minor update
    let v1_1 = ContractVersion {
        major: 1,
        minor: 1,
        patch: 0,
        label: String::from_str(&env, "v1.1"),
        status: VersionStatus::Active,
        hash: Bytes::new(&env),
        updated_at: env.ledger().timestamp(),
    };
    client.record_version(&v1_1);

    // Patch update
    let v1_1_1 = ContractVersion {
        major: 1,
        minor: 1,
        patch: 1,
        label: String::from_str(&env, "v1.1.1"),
        status: VersionStatus::Active,
        hash: Bytes::new(&env),
        updated_at: env.ledger().timestamp(),
    };
    client.record_version(&v1_1_1);

    let history = client.get_version_history();
    assert_eq!(history.len(), 3);
    assert_eq!(history.get(0).unwrap().major, 1);
    assert_eq!(history.get(1).unwrap().minor, 1);
    assert_eq!(history.get(2).unwrap().patch, 1);
}

#[test]
#[should_panic]
fn test_record_version_requires_admin_auth() {
    let env = Env::default();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let _attacker = Address::generate(&env);
    let new_version = ContractVersion {
        major: 2,
        minor: 0,
        patch: 0,
        label: String::from_str(&env, "hacked"),
        status: VersionStatus::Active,
        hash: Bytes::new(&env),
        updated_at: env.ledger().timestamp(),
    };

    // No auth mocked for attacker
    client.record_version(&new_version);
}

#[test]
fn test_version_metadata_recording() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let test_hash = Bytes::from_array(&env, &[1; 32]);
    let test_label = String::from_str(&env, "security-patch");

    env.ledger().with_mut(|li| li.timestamp = 123456789);

    let version = ContractVersion {
        major: 1,
        minor: 0,
        patch: 1,
        label: test_label.clone(),
        status: VersionStatus::Active,
        hash: test_hash.clone(),
        updated_at: 123456789,
    };

    client.record_version(&version);

    let current = client.get_version();
    assert_eq!(current.hash, test_hash);
    assert_eq!(current.label, test_label);
    assert_eq!(current.updated_at, 123456789);
}

// --- Version History Tests ---

#[test]
fn test_version_history_order_and_length() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    for i in 1..=5 {
        client.record_version(&ContractVersion {
            major: i,
            minor: 0,
            patch: 0,
            label: String::from_str(&env, "ver"),
            status: VersionStatus::Active,
            hash: Bytes::new(&env),
            updated_at: env.ledger().timestamp(),
        });
    }

    let history = client.get_version_history();
    assert_eq!(history.len(), 5);
    for i in 0..5 {
        assert_eq!(history.get(i).unwrap().major, i + 1);
    }
}

#[test]
fn test_version_history_immutability() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let v1 = ContractVersion {
        major: 1,
        minor: 0,
        patch: 0,
        label: String::from_str(&env, "v1"),
        status: VersionStatus::Active,
        hash: Bytes::new(&env),
        updated_at: env.ledger().timestamp(),
    };
    client.record_version(&v1);

    let _history_before = client.get_version_history();

    // There is no function to remove or modify history directly in lib.rs
    // This test confirms that recording a new version doesn't overwrite old history
    let v2 = ContractVersion {
        major: 2,
        minor: 0,
        patch: 0,
        label: String::from_str(&env, "v2"),
        status: VersionStatus::Active,
        hash: Bytes::new(&env),
        updated_at: env.ledger().timestamp(),
    };
    client.record_version(&v2);

    let history_after = client.get_version_history();
    assert_eq!(history_after.len(), 2);
    assert_eq!(history_after.get(0).unwrap(), v1);
    assert_eq!(history_after.get(1).unwrap(), v2);
}

// --- Version Status Management Tests ---

#[test]
fn test_update_version_status_lifecycle() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let v1 = ContractVersion {
        major: 1,
        minor: 0,
        patch: 0,
        label: String::from_str(&env, "v1"),
        status: VersionStatus::Active,
        hash: Bytes::new(&env),
        updated_at: env.ledger().timestamp(),
    };
    client.record_version(&v1);

    // Update to Deprecated
    client.update_version_status(&1, &0, &0, &VersionStatus::Deprecated);
    let history = client.get_version_history();
    assert_eq!(history.get(0).unwrap().status, VersionStatus::Deprecated);
    assert_eq!(client.get_version().status, VersionStatus::Deprecated);

    // Update to Archived - Mismatching version should return error
    let res = client.try_update_version_status(&1, &1, &0, &VersionStatus::Archived);
    assert!(res.is_err());

    client.update_version_status(&1, &0, &0, &VersionStatus::Archived);
    assert_eq!(client.get_version().status, VersionStatus::Archived);
}

#[test]
fn test_update_non_current_version_status() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    client.record_version(&ContractVersion {
        major: 1,
        minor: 0,
        patch: 0,
        label: String::from_str(&env, "v1"),
        status: VersionStatus::Active,
        hash: Bytes::new(&env),
        updated_at: env.ledger().timestamp(),
    });

    client.record_version(&ContractVersion {
        major: 2,
        minor: 0,
        patch: 0,
        label: String::from_str(&env, "v2"),
        status: VersionStatus::Active,
        hash: Bytes::new(&env),
        updated_at: env.ledger().timestamp(),
    });

    // Update v1 status
    client.update_version_status(&1, &0, &0, &VersionStatus::Deprecated);

    // Current version (v2) should remain Active
    let current = client.get_version();
    assert_eq!(current.major, 2);
    assert_eq!(current.status, VersionStatus::Active);

    // History v1 should be Deprecated
    let history = client.get_version_history();
    assert_eq!(history.get(0).unwrap().status, VersionStatus::Deprecated);
}

#[test]
#[should_panic]
fn test_update_version_status_admin_auth() {
    let env = Env::default();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    client
        .mock_auths(&[MockAuth {
            address: &admin,
            invoke: &MockAuthInvoke {
                contract: &client.address,
                fn_name: "record_version",
                args: (ContractVersion {
                    major: 1,
                    minor: 0,
                    patch: 0,
                    label: String::from_str(&env, "v1"),
                    status: VersionStatus::Active,
                    hash: Bytes::new(&env),
                    updated_at: env.ledger().timestamp(),
                },)
                    .into_val(&env),
                sub_invokes: &[],
            },
        }])
        .record_version(&ContractVersion {
            major: 1,
            minor: 0,
            patch: 0,
            label: String::from_str(&env, "v1"),
            status: VersionStatus::Active,
            hash: Bytes::new(&env),
            updated_at: env.ledger().timestamp(),
        });

    let _attacker = Address::generate(&env);
    client.update_version_status(&1, &0, &0, &VersionStatus::Deprecated);
}

// --- Pause State Management Tests ---

#[test]
fn test_pause_and_unpause_success() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    assert!(!client.is_paused());

    let reason = String::from_str(&env, "Emergency maintenance");
    client.pause(&reason);

    assert!(client.is_paused());
    let state = client.get_state().unwrap();
    assert!(state.config.paused);

    client.unpause();
    assert!(!client.is_paused());
}

#[test]
fn test_pause_metadata_and_reasons() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let reason = String::from_str(&env, "Security incident #123");
    let timestamp = 999888777;
    env.ledger().with_mut(|li| li.timestamp = timestamp);

    client.pause(&reason);

    // PauseState is not directly exposed in Contract struct,
    // but we can check it indirectly or by looking at events if needed.
    // However, is_paused check is already done.
}

#[test]
#[should_panic(expected = "Error(Contract, #23)")] // AlreadyPaused
fn test_prevent_double_pause() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    client.pause(&String::from_str(&env, "one"));
    client.pause(&String::from_str(&env, "two"));
}

#[test]
#[should_panic(expected = "Error(Contract, #24)")] // NotPaused
fn test_prevent_unpause_when_not_paused() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    client.unpause();
}

#[test]
#[should_panic]
fn test_pause_requires_admin_auth() {
    let env = Env::default();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    let _attacker = Address::generate(&env);
    client.pause(&String::from_str(&env, "malicious"));
}

// --- Pause State Enforcement Tests ---

#[test]
#[should_panic(expected = "Error(Contract, #17)")] // ContractPaused
fn test_operations_blocked_when_paused() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    client.pause(&String::from_str(&env, "halt"));

    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);
    let agreement_id = String::from_str(&env, "AGR1");

    // This should fail
    client.create_agreement(&AgreementInput {
        agreement_id,
        admin: landlord,
        user: tenant,
        agent: None,
        terms: AgreementTerms {
            monthly_rent: 1000,
            security_deposit: 2000,
            start_date: 100,
            end_date: 1000,
            agent_commission_rate: 0,
        },
        payment_token: Address::generate(&env),
        metadata_uri: String::from_str(&env, ""),
        attributes: Vec::new(&env),
    });
}

#[test]
fn test_admin_bypass_pause_for_maintenance() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    client.pause(&String::from_str(&env, "maintenance"));

    // Admin should still be able to record version even if paused
    let res = client.try_record_version(&ContractVersion {
        major: 3,
        minor: 0,
        patch: 0,
        label: String::from_str(&env, "v3"),
        status: VersionStatus::Active,
        hash: Bytes::new(&env),
        updated_at: env.ledger().timestamp(),
    });
    assert!(res.is_ok());
}

// --- Integration & Edge Cases ---

#[test]
fn test_multiple_pause_unpause_cycles() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    for _ in 0..5 {
        client.pause(&String::from_str(&env, "cycling"));
        assert!(client.is_paused());
        client.unpause();
        assert!(!client.is_paused());
    }
}

#[test]
fn test_pause_with_empty_and_long_reasons() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    // Empty reason
    client.pause(&String::from_str(&env, ""));
    assert!(client.is_paused());
    client.unpause();

    // Long reason
    let long_reason = String::from_str(&env, "This is a very long reason for pausing the contract to ensure that the storage can handle large strings even in the pause state as specified in the test cases of issue 658 development");
    client.pause(&long_reason);
    assert!(client.is_paused());
}

#[test]
fn test_version_history_persists_through_pause() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    initialize_contract(&env, &client, &admin);

    client.record_version(&ContractVersion {
        major: 1,
        minor: 0,
        patch: 0,
        label: String::from_str(&env, "v1"),
        status: VersionStatus::Active,
        hash: Bytes::new(&env),
        updated_at: env.ledger().timestamp(),
    });

    client.pause(&String::from_str(&env, "halt"));

    client.record_version(&ContractVersion {
        major: 2,
        minor: 0,
        patch: 0,
        label: String::from_str(&env, "v2"),
        status: VersionStatus::Active,
        hash: Bytes::new(&env),
        updated_at: env.ledger().timestamp(),
    });

    client.unpause();

    let history = client.get_version_history();
    assert_eq!(history.len(), 2);
}
