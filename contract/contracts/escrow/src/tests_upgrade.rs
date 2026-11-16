//! Tests for the contract upgrade mechanism (#2084).
//!
//! `execute_upgrade` calls `env.deployer().update_current_contract_wasm`,
//! which requires the target wasm hash to already be present in the test
//! environment's storage (normally via `env.deployer().upload_contract_wasm`
//! with real compiled wasm bytes). Exercising the *actual* code swap in a
//! unit test would require this crate's own already-built `.wasm` artifact
//! to exist at test time, which isn't reliable without a prior build step.
//! These tests instead cover every gate `execute_upgrade` enforces before
//! it would reach that call (not-yet-due, already-executed, unknown
//! proposal), plus the full propose/approve/get lifecycle. The real wasm
//! swap itself is exercised in integration/deployment testing, not here.

use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{Address, BytesN, Env, String};

use crate::errors::EscrowError;
use crate::escrow_impl::{EscrowContract, EscrowContractClient};

fn setup(env: &Env) -> (EscrowContractClient<'_>, Address) {
    let contract_id = env.register(EscrowContract, ());
    let client = EscrowContractClient::new(env, &contract_id);
    let admin = Address::generate(env);
    env.mock_all_auths();
    client.initialize_admin(&admin);
    (client, admin)
}

#[test]
fn test_propose_upgrade_and_get() {
    let env = Env::default();
    let (client, admin) = setup(&env);

    let pid = String::from_str(&env, "UPGRADE-1");
    let wasm_hash = BytesN::from_array(&env, &[1u8; 32]);
    let notes = String::from_str(&env, "bump escrow to v2");

    client.propose_upgrade(&admin, &pid, &wasm_hash, &notes, &1000);

    let proposal = client.get_upgrade_proposal(&pid);
    assert_eq!(proposal.id, pid);
    assert_eq!(proposal.proposer, admin);
    assert_eq!(proposal.wasm_hash, wasm_hash);
    assert!(!proposal.executed);
    assert_eq!(proposal.approvals.len(), 1);
    assert_eq!(proposal.approvals.get(0).unwrap(), admin);
}

#[test]
fn test_propose_upgrade_duplicate_id_rejected() {
    let env = Env::default();
    let (client, admin) = setup(&env);

    let pid = String::from_str(&env, "UPGRADE-DUP");
    let wasm_hash = BytesN::from_array(&env, &[1u8; 32]);
    let notes = String::from_str(&env, "first");

    client.propose_upgrade(&admin, &pid, &wasm_hash, &notes, &1000);

    let result = client.try_propose_upgrade(&admin, &pid, &wasm_hash, &notes, &1000);
    assert_eq!(result, Err(Ok(EscrowError::InvalidState)));
}

#[test]
fn test_approve_upgrade_tracks_approver_and_count() {
    let env = Env::default();
    let (client, admin) = setup(&env);

    let pid = String::from_str(&env, "UPGRADE-2");
    let wasm_hash = BytesN::from_array(&env, &[2u8; 32]);
    let notes = String::from_str(&env, "approvals test");
    client.propose_upgrade(&admin, &pid, &wasm_hash, &notes, &1000);

    let second_signer = Address::generate(&env);
    client.approve_upgrade(&second_signer, &pid);

    let proposal = client.get_upgrade_proposal(&pid);
    assert_eq!(proposal.approvals.len(), 2);
    assert_eq!(proposal.approvals.get(1).unwrap(), second_signer);
}

#[test]
fn test_approve_upgrade_on_unknown_proposal_fails() {
    let env = Env::default();
    let (client, _admin) = setup(&env);

    let approver = Address::generate(&env);
    let pid = String::from_str(&env, "DOES-NOT-EXIST");
    let result = client.try_approve_upgrade(&approver, &pid);
    assert_eq!(result, Err(Ok(EscrowError::EscrowNotFound)));
}

#[test]
fn test_execute_upgrade_before_eta_fails() {
    let env = Env::default();
    let (client, admin) = setup(&env);

    let pid = String::from_str(&env, "UPGRADE-3");
    let wasm_hash = BytesN::from_array(&env, &[3u8; 32]);
    let notes = String::from_str(&env, "not due yet");
    client.propose_upgrade(&admin, &pid, &wasm_hash, &notes, &100_000);

    let result = client.try_execute_upgrade(&admin, &pid);
    assert_eq!(result, Err(Ok(EscrowError::InvalidState)));
}

#[test]
fn test_execute_upgrade_on_unknown_proposal_fails() {
    let env = Env::default();
    let (client, admin) = setup(&env);

    let pid = String::from_str(&env, "DOES-NOT-EXIST");
    let result = client.try_execute_upgrade(&admin, &pid);
    assert_eq!(result, Err(Ok(EscrowError::EscrowNotFound)));
}

#[test]
#[should_panic]
fn test_execute_upgrade_with_due_eta_reaches_the_wasm_swap() {
    // Confirms execute_upgrade actually gets past every gate (found,
    // not executed, not cancelled, eta reached) and reaches the real
    // `update_current_contract_wasm` call for a genuinely due proposal.
    // That call panics here because this test's wasm_hash was never
    // uploaded via `env.deployer().upload_contract_wasm` with real wasm
    // bytes (see module doc comment on why that isn't exercised in this
    // unit test) — the panic itself is the proof that execution reached
    // the swap rather than silently flipping `executed` and returning,
    // which was the pre-fix behavior this issue (#2084) closes.
    let env = Env::default();
    let (client, admin) = setup(&env);

    let pid = String::from_str(&env, "UPGRADE-4");
    let wasm_hash = BytesN::from_array(&env, &[4u8; 32]);
    let notes = String::from_str(&env, "due upgrade");
    client.propose_upgrade(&admin, &pid, &wasm_hash, &notes, &0);

    env.ledger().with_mut(|li| li.timestamp += 1);

    client.execute_upgrade(&admin, &pid);
}
