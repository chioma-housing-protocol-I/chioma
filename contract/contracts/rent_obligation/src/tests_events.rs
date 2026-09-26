//! Event emission tests for the Rent Obligation contract.
//!
//! Off-chain indexers depend on event shape (topics + data), so every event
//! defined in `events.rs` is asserted here on exact topic count/content and
//! on the presence and value of its data-section fields, matching the
//! topic-checking convention established in
//! `property_registry/src/tests_events.rs` and extending it to data. A
//! field renamed/removed on any event struct, a topic reordered, or a topic
//! demoted to data (or vice versa), changes the asserted shape here and
//! fails the test — this is the "schema change fails the test" requirement
//! from #1680.
//!
//! Note: `env.events().all()` only returns events emitted by the most
//! recent top-level contract invocation, so each assertion below is checked
//! immediately after the call it targets rather than as a running total.

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Events as _, Ledger},
    Address, Bytes, Env, Map, String, Symbol, TryFromVal, Val,
};

fn create_contract(env: &Env) -> TokenizedRentObligationContractClient<'_> {
    let contract_id = env.register(TokenizedRentObligationContract, ());
    TokenizedRentObligationContractClient::new(env, &contract_id)
}

fn topic_symbol(env: &Env, val: &Val) -> Symbol {
    Symbol::try_from_val(env, val).expect("topic[0] must decode as a Symbol event name")
}

fn topic_address(env: &Env, val: &Val) -> Address {
    Address::try_from_val(env, val).expect("topic must decode as an Address")
}

fn topic_string(env: &Env, val: &Val) -> String {
    String::try_from_val(env, val).expect("topic must decode as a String")
}

fn data_map(env: &Env, data: &Val) -> Map<Symbol, Val> {
    Map::try_from_val(env, data).expect("event data must decode as a map")
}

fn data_address(env: &Env, map: &Map<Symbol, Val>, key: &str) -> Address {
    let val = map
        .get(Symbol::new(env, key))
        .unwrap_or_else(|| panic!("event data missing expected key '{key}'"));
    Address::try_from_val(env, &val).unwrap_or_else(|_| panic!("data['{key}'] must be an Address"))
}

fn data_string(env: &Env, map: &Map<Symbol, Val>, key: &str) -> String {
    let val = map
        .get(Symbol::new(env, key))
        .unwrap_or_else(|| panic!("event data missing expected key '{key}'"));
    String::try_from_val(env, &val).unwrap_or_else(|_| panic!("data['{key}'] must be a String"))
}

fn data_u32(env: &Env, map: &Map<Symbol, Val>, key: &str) -> u32 {
    let val = map
        .get(Symbol::new(env, key))
        .unwrap_or_else(|| panic!("event data missing expected key '{key}'"));
    u32::try_from_val(env, &val).unwrap_or_else(|_| panic!("data['{key}'] must be a u32"))
}

#[test]
fn test_initialize_emits_contract_initialized_event() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);

    client.initialize();

    let events = env.events().all();
    assert_eq!(events.len(), 1);

    let event = events.last().unwrap();
    assert_eq!(event.0, client.address);
    // Topics: [event_name]
    assert_eq!(event.1.len(), 1);
    assert_eq!(
        topic_symbol(&env, &event.1.get(0).unwrap()),
        Symbol::new(&env, "initialized")
    );

    // Data: initialized_at (existence check only, timestamp value is
    // environment-dependent).
    let data = data_map(&env, &event.2);
    assert!(data.contains_key(Symbol::new(&env, "initialized_at")));
}

#[test]
fn test_mint_obligation_emits_obligation_minted_event() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    client.initialize();

    let landlord = Address::generate(&env);
    let agreement_id = String::from_str(&env, "agreement_001");

    client.mint_obligation(&agreement_id, &landlord);

    let events = env.events().all();
    assert_eq!(events.len(), 1);

    let event = events.last().unwrap();
    assert_eq!(event.0, client.address);
    // Topics: [event_name, landlord]
    assert_eq!(event.1.len(), 2);
    assert_eq!(
        topic_symbol(&env, &event.1.get(0).unwrap()),
        Symbol::new(&env, "minted")
    );
    assert_eq!(topic_address(&env, &event.1.get(1).unwrap()), landlord);

    // Data: agreement_id, minted_at
    let data = data_map(&env, &event.2);
    assert_eq!(data_string(&env, &data, "agreement_id"), agreement_id);
    assert!(data.contains_key(Symbol::new(&env, "minted_at")));
}

#[test]
fn test_transfer_obligation_emits_obligation_transferred_event() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    client.initialize();

    let landlord = Address::generate(&env);
    let new_owner = Address::generate(&env);
    let agreement_id = String::from_str(&env, "agreement_001");

    client.mint_obligation(&agreement_id, &landlord);
    client.transfer_obligation(&landlord, &new_owner, &agreement_id);

    let events = env.events().all();
    assert_eq!(events.len(), 1);

    let event = events.last().unwrap();
    assert_eq!(event.0, client.address);
    // Topics: [event_name, from, to]
    assert_eq!(event.1.len(), 3);
    assert_eq!(
        topic_symbol(&env, &event.1.get(0).unwrap()),
        Symbol::new(&env, "transferred")
    );
    assert_eq!(topic_address(&env, &event.1.get(1).unwrap()), landlord);
    assert_eq!(topic_address(&env, &event.1.get(2).unwrap()), new_owner);

    // Data: agreement_id
    let data = data_map(&env, &event.2);
    assert_eq!(data_string(&env, &data, "agreement_id"), agreement_id);
}

#[test]
fn test_burn_nft_emits_obligation_burned_event() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    client.initialize();

    let landlord = Address::generate(&env);
    let agreement_id = String::from_str(&env, "agreement_001");
    let reason = String::from_str(&env, "LeaseCompleted");

    client.mint_obligation(&agreement_id, &landlord);

    env.ledger().with_mut(|li| {
        li.timestamp = li.timestamp.saturating_add(1);
    });

    client.burn_nft(&agreement_id, &reason);

    let events = env.events().all();
    assert_eq!(events.len(), 1);

    let event = events.last().unwrap();
    assert_eq!(event.0, client.address);
    // Topics: [event_name, owner]
    assert_eq!(event.1.len(), 2);
    assert_eq!(
        topic_symbol(&env, &event.1.get(0).unwrap()),
        Symbol::new(&env, "burned")
    );
    assert_eq!(topic_address(&env, &event.1.get(1).unwrap()), landlord);

    // Data: token_id, reason
    let data = data_map(&env, &event.2);
    assert_eq!(data_string(&env, &data, "token_id"), agreement_id);
    assert_eq!(data_string(&env, &data, "reason"), reason);
}

#[test]
fn test_initialize_admin_emits_admin_initialized_event() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    client.initialize();

    let admin = Address::generate(&env);

    client.initialize_admin(&admin);

    let events = env.events().all();
    assert_eq!(events.len(), 1);

    let event = events.last().unwrap();
    assert_eq!(event.0, client.address);
    // Topics: [event_name, admin]
    assert_eq!(event.1.len(), 2);
    assert_eq!(
        topic_symbol(&env, &event.1.get(0).unwrap()),
        Symbol::new(&env, "admin_initialized")
    );
    assert_eq!(topic_address(&env, &event.1.get(1).unwrap()), admin);

    let data = data_map(&env, &event.2);
    assert!(data.contains_key(Symbol::new(&env, "initialized_at")));
}

#[test]
fn test_update_admin_emits_admin_updated_event() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    client.initialize();

    let admin = Address::generate(&env);
    let new_admin = Address::generate(&env);
    client.initialize_admin(&admin);

    client.update_admin(&admin, &new_admin);

    let events = env.events().all();
    assert_eq!(events.len(), 1);

    let event = events.last().unwrap();
    assert_eq!(event.0, client.address);
    // Topics: [event_name, old_admin, new_admin]
    assert_eq!(event.1.len(), 3);
    assert_eq!(
        topic_symbol(&env, &event.1.get(0).unwrap()),
        Symbol::new(&env, "admin_updated")
    );
    assert_eq!(topic_address(&env, &event.1.get(1).unwrap()), admin);
    assert_eq!(topic_address(&env, &event.1.get(2).unwrap()), new_admin);

    let data = data_map(&env, &event.2);
    assert!(data.contains_key(Symbol::new(&env, "updated_at")));
}

#[test]
fn test_admin_reassign_obligation_emits_obligation_admin_reassigned_event() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    client.initialize();

    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);
    let new_owner = Address::generate(&env);
    let agreement_id = String::from_str(&env, "agreement_001");

    client.initialize_admin(&admin);
    client.mint_obligation(&agreement_id, &landlord);

    client.admin_reassign_obligation(&admin, &agreement_id, &new_owner);

    let events = env.events().all();
    assert_eq!(events.len(), 1);

    let event = events.last().unwrap();
    assert_eq!(event.0, client.address);
    // Topics: [event_name, agreement_id]
    assert_eq!(event.1.len(), 2);
    assert_eq!(
        topic_symbol(&env, &event.1.get(0).unwrap()),
        Symbol::new(&env, "admin_reassigned")
    );
    assert_eq!(topic_string(&env, &event.1.get(1).unwrap()), agreement_id);

    // Data: admin, previous_owner, new_owner
    let data = data_map(&env, &event.2);
    assert_eq!(data_address(&env, &data, "admin"), admin);
    assert_eq!(data_address(&env, &data, "previous_owner"), landlord);
    assert_eq!(data_address(&env, &data, "new_owner"), new_owner);
}

#[test]
fn test_propose_upgrade_emits_upgrade_proposed_event() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    client.initialize();

    let proposer = Address::generate(&env);
    let proposal_id = String::from_str(&env, "upgrade_001");
    let wasm_hash = Bytes::from_array(&env, &[7u8; 32]);
    let notes = String::from_str(&env, "Routine upgrade");
    let delay_seconds: u64 = 3600;

    client.propose_upgrade(&proposer, &proposal_id, &wasm_hash, &notes, &delay_seconds);

    let events = env.events().all();
    assert_eq!(events.len(), 1);

    let event = events.last().unwrap();
    assert_eq!(event.0, client.address);
    // Topics: [event_name, proposal_id]
    assert_eq!(event.1.len(), 2);
    assert_eq!(
        topic_symbol(&env, &event.1.get(0).unwrap()),
        Symbol::new(&env, "upgrade_proposed")
    );
    assert_eq!(topic_string(&env, &event.1.get(1).unwrap()), proposal_id);

    // Data: proposer, eta, created_at
    let data = data_map(&env, &event.2);
    assert_eq!(data_address(&env, &data, "proposer"), proposer);
    assert!(data.contains_key(Symbol::new(&env, "eta")));
    assert!(data.contains_key(Symbol::new(&env, "created_at")));
}

#[test]
fn test_approve_upgrade_emits_upgrade_approved_event() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    client.initialize();

    let proposer = Address::generate(&env);
    let approver = Address::generate(&env);
    let proposal_id = String::from_str(&env, "upgrade_001");
    let wasm_hash = Bytes::from_array(&env, &[7u8; 32]);
    let notes = String::from_str(&env, "Routine upgrade");

    client.propose_upgrade(&proposer, &proposal_id, &wasm_hash, &notes, &3600u64);
    client.approve_upgrade(&approver, &proposal_id);

    let events = env.events().all();
    assert_eq!(events.len(), 1);

    let event = events.last().unwrap();
    assert_eq!(event.0, client.address);
    // Topics: [event_name, proposal_id]
    assert_eq!(event.1.len(), 2);
    assert_eq!(
        topic_symbol(&env, &event.1.get(0).unwrap()),
        Symbol::new(&env, "upgrade_approved")
    );
    assert_eq!(topic_string(&env, &event.1.get(1).unwrap()), proposal_id);

    // Data: approver, approval_count (proposer's initial approval + this
    // one = 2)
    let data = data_map(&env, &event.2);
    assert_eq!(data_address(&env, &data, "approver"), approver);
    assert_eq!(data_u32(&env, &data, "approval_count"), 2u32);
}

#[test]
fn test_execute_upgrade_emits_upgrade_executed_event() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    client.initialize();

    let proposer = Address::generate(&env);
    let executor = Address::generate(&env);
    let proposal_id = String::from_str(&env, "upgrade_001");
    let wasm_hash = Bytes::from_array(&env, &[7u8; 32]);
    let notes = String::from_str(&env, "Routine upgrade");
    let delay_seconds: u64 = 3600;

    client.propose_upgrade(&proposer, &proposal_id, &wasm_hash, &notes, &delay_seconds);

    env.ledger().with_mut(|li| {
        li.timestamp = li.timestamp.saturating_add(delay_seconds + 1);
    });

    client.execute_upgrade(&executor, &proposal_id);

    let events = env.events().all();
    assert_eq!(events.len(), 1);

    let event = events.last().unwrap();
    assert_eq!(event.0, client.address);
    // Topics: [event_name, proposal_id]
    assert_eq!(event.1.len(), 2);
    assert_eq!(
        topic_symbol(&env, &event.1.get(0).unwrap()),
        Symbol::new(&env, "upgrade_executed")
    );
    assert_eq!(topic_string(&env, &event.1.get(1).unwrap()), proposal_id);

    // Data: executor, executed_at
    let data = data_map(&env, &event.2);
    assert_eq!(data_address(&env, &data, "executor"), executor);
    assert!(data.contains_key(Symbol::new(&env, "executed_at")));
}

/// A failed call must not publish its event — a reverted `mint_obligation`
/// (duplicate agreement_id) must not emit `ObligationMinted` a second time.
#[test]
fn test_failed_call_does_not_emit_event() {
    let env = Env::default();
    env.mock_all_auths();
    let client = create_contract(&env);
    client.initialize();

    let landlord = Address::generate(&env);
    let agreement_id = String::from_str(&env, "agreement_001");

    client.mint_obligation(&agreement_id, &landlord);
    // Drain the first mint's event so only the (attempted, reverted) second
    // call's events are visible below.
    let _ = env.events().all();

    let result = client.try_mint_obligation(&agreement_id, &landlord);
    assert!(result.is_err());

    let events = env.events().all();
    assert!(events.is_empty());
}
