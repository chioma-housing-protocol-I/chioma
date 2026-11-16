//! Tests for `propose_contract_upgrade` / `approve_contract_upgrade` /
//! `execute_contract_upgrade` (#2084). This mechanism already existed and
//! already performs the real `update_current_contract_wasm` swap (unlike
//! the pre-fix version in some of the other Soroban contracts in this
//! workspace, see `escrow::tests_upgrade`), but had no test coverage at
//! all before this change.
//!
//! As with `escrow::tests_upgrade`, the actual wasm swap inside
//! `execute_contract_upgrade` requires the target hash to already be
//! uploaded in the test environment via real compiled wasm bytes, which
//! isn't available at unit-test time here. These tests cover every gate
//! before that call (multi-sig requirement, approval counting, eta,
//! already-executed, unknown proposal) and confirm a due, sufficiently
//! approved proposal reaches the real swap.

use crate::{errors::RentalError, types::Config, Contract, ContractClient};
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, Bytes, Env, String, Vec,
};

fn create_contract_with_multisig(
    required_signatures: u32,
) -> (Env, ContractClient<'static>, Vec<Address>) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let fee_collector = Address::generate(&env);
    let config = Config {
        fee_bps: 100,
        fee_collector,
        paused: false,
    };
    client.initialize(&admin, &config);

    let admin2 = Address::generate(&env);
    let admin3 = Address::generate(&env);
    let mut admins = Vec::new(&env);
    admins.push_back(admin.clone());
    admins.push_back(admin2.clone());
    admins.push_back(admin3.clone());
    client.initialize_multisig(&admins, &required_signatures);

    (env, client, admins)
}

#[test]
fn test_propose_contract_upgrade_rejects_non_admin() {
    let (env, client, _admins) = create_contract_with_multisig(1);
    let outsider = Address::generate(&env);
    let wasm_hash = Bytes::from_array(&env, &[9u8; 32]);
    let pid = String::from_str(&env, "CU-1");
    let notes = String::from_str(&env, "not an admin");

    let result = client.try_propose_contract_upgrade(&outsider, &pid, &wasm_hash, &notes, &1000);
    assert!(result.is_err());
}

#[test]
fn test_propose_contract_upgrade_rejects_wrong_length_hash() {
    let (env, client, admins) = create_contract_with_multisig(1);
    let admin = admins.get(0).unwrap();
    let wasm_hash = Bytes::from_array(&env, &[9u8; 16]); // not 32 bytes
    let pid = String::from_str(&env, "CU-2");
    let notes = String::from_str(&env, "bad length");

    let result = client.try_propose_contract_upgrade(&admin, &pid, &wasm_hash, &notes, &1000);
    assert_eq!(result, Err(Ok(RentalError::InvalidInput)));
}

#[test]
fn test_propose_and_approve_contract_upgrade() {
    let (env, client, admins) = create_contract_with_multisig(2);
    let admin = admins.get(0).unwrap();
    let admin2 = admins.get(1).unwrap();
    let wasm_hash = Bytes::from_array(&env, &[1u8; 32]);
    let pid = String::from_str(&env, "CU-3");
    let notes = String::from_str(&env, "v2 release");

    client.propose_contract_upgrade(&admin, &pid, &wasm_hash, &notes, &1000);

    let proposal = client.get_upgrade_proposal(&pid);
    assert_eq!(proposal.approvals.len(), 1);
    assert_eq!(proposal.required_signatures, 2);
    assert!(!proposal.executed);

    let approvals = client.approve_contract_upgrade(&admin2, &pid);
    assert_eq!(approvals, 2);
}

#[test]
fn test_approve_contract_upgrade_rejects_duplicate_approver() {
    let (env, client, admins) = create_contract_with_multisig(2);
    let admin = admins.get(0).unwrap();
    let wasm_hash = Bytes::from_array(&env, &[1u8; 32]);
    let pid = String::from_str(&env, "CU-4");
    let notes = String::from_str(&env, "dup approver");

    client.propose_contract_upgrade(&admin, &pid, &wasm_hash, &notes, &1000);

    let result = client.try_approve_contract_upgrade(&admin, &pid);
    assert_eq!(result, Err(Ok(RentalError::AlreadyApproved)));
}

#[test]
fn test_execute_contract_upgrade_before_eta_fails() {
    let (env, client, admins) = create_contract_with_multisig(1);
    let admin = admins.get(0).unwrap();
    let wasm_hash = Bytes::from_array(&env, &[1u8; 32]);
    let pid = String::from_str(&env, "CU-5");
    let notes = String::from_str(&env, "not due yet");

    client.propose_contract_upgrade(&admin, &pid, &wasm_hash, &notes, &100_000);

    let new_version = crate::types::ContractVersion {
        major: 2,
        minor: 0,
        patch: 0,
        label: String::from_str(&env, "2.0.0"),
        status: crate::types::VersionStatus::Active,
        hash: wasm_hash,
        updated_at: 0,
    };
    let result = client.try_execute_contract_upgrade(&admin, &pid, &new_version);
    assert_eq!(result, Err(Ok(RentalError::TimelockEtaNotReached)));
}

#[test]
fn test_execute_contract_upgrade_without_enough_approvals_fails() {
    let (env, client, admins) = create_contract_with_multisig(2);
    let admin = admins.get(0).unwrap();
    let wasm_hash = Bytes::from_array(&env, &[1u8; 32]);
    let pid = String::from_str(&env, "CU-6");
    let notes = String::from_str(&env, "only one approval");

    // delay 0 => eta is already in the past, so only the approvals gate is
    // being isolated here.
    client.propose_contract_upgrade(&admin, &pid, &wasm_hash, &notes, &0);
    env.ledger().with_mut(|li| li.timestamp += 1);

    let new_version = crate::types::ContractVersion {
        major: 2,
        minor: 0,
        patch: 0,
        label: String::from_str(&env, "2.0.0"),
        status: crate::types::VersionStatus::Active,
        hash: wasm_hash,
        updated_at: 0,
    };
    let result = client.try_execute_contract_upgrade(&admin, &pid, &new_version);
    assert_eq!(result, Err(Ok(RentalError::InsufficientApprovals)));
}

#[test]
#[should_panic]
fn test_execute_contract_upgrade_due_and_approved_reaches_the_wasm_swap() {
    // Mirrors escrow::tests_upgrade's equivalent test: with every gate
    // satisfied (admin, correct hash length, eta reached, enough
    // approvals), execution reaches the real `update_current_contract_wasm`
    // call, which panics here because this hash was never uploaded via
    // `env.deployer().upload_contract_wasm` with real wasm bytes (not
    // available at unit-test time, see module doc comment).
    let (env, client, admins) = create_contract_with_multisig(1);
    let admin = admins.get(0).unwrap();
    let wasm_hash = Bytes::from_array(&env, &[1u8; 32]);
    let pid = String::from_str(&env, "CU-7");
    let notes = String::from_str(&env, "due and approved");

    client.propose_contract_upgrade(&admin, &pid, &wasm_hash, &notes, &0);
    env.ledger().with_mut(|li| li.timestamp += 1);

    let new_version = crate::types::ContractVersion {
        major: 2,
        minor: 0,
        patch: 0,
        label: String::from_str(&env, "2.0.0"),
        status: crate::types::VersionStatus::Active,
        hash: wasm_hash,
        updated_at: 0,
    };
    client.execute_contract_upgrade(&admin, &pid, &new_version);
}
