//! Role-Based Access Control tests for the Rent Obligation contract.
//!
//! Verifies that only authorized roles can create or modify obligations:
//! landlords mint their own obligations, only the current owner can
//! transfer or burn an obligation, and admin-only actions are restricted
//! to the configured admin address.

use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{Address, Env, String};

use crate::{TokenizedRentObligationContract, TokenizedRentObligationContractClient};

fn setup(env: &Env) -> TokenizedRentObligationContractClient<'_> {
    let contract_id = env.register(TokenizedRentObligationContract, ());
    let client = TokenizedRentObligationContractClient::new(env, &contract_id);
    client.initialize();
    client
}

// ── mint_obligation ─────────────────────────────────────────────────────────

#[test]
fn test_landlord_can_mint_own_obligation() {
    let env = Env::default();
    env.mock_all_auths();

    let client = setup(&env);
    let landlord = Address::generate(&env);
    let agreement_id = String::from_str(&env, "agreement_001");

    let result = client.try_mint_obligation(&agreement_id, &landlord);
    assert!(result.is_ok(), "landlord should be able to mint");
}

#[test]
#[should_panic]
fn test_mint_obligation_fails_without_landlord_auth() {
    let env = Env::default();

    let client = setup(&env);
    let landlord = Address::generate(&env);
    let agreement_id = String::from_str(&env, "agreement_001");

    // No auths mocked at all — landlord.require_auth() must panic
    client.mint_obligation(&agreement_id, &landlord);
}

// ── transfer_obligation ─────────────────────────────────────────────────────

#[test]
fn test_owner_can_transfer_obligation() {
    let env = Env::default();
    env.mock_all_auths();

    let client = setup(&env);
    let landlord = Address::generate(&env);
    let new_owner = Address::generate(&env);
    let agreement_id = String::from_str(&env, "agreement_001");

    client.mint_obligation(&agreement_id, &landlord);
    let result = client.try_transfer_obligation(&landlord, &new_owner, &agreement_id);
    assert!(result.is_ok(), "owner should be able to transfer");
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_non_owner_cannot_transfer_obligation() {
    let env = Env::default();
    env.mock_all_auths();

    let client = setup(&env);
    let landlord = Address::generate(&env);
    let attacker = Address::generate(&env);
    let new_owner = Address::generate(&env);
    let agreement_id = String::from_str(&env, "agreement_001");

    client.mint_obligation(&agreement_id, &landlord);
    // Attacker claims to be `from` but does not own the obligation.
    client.transfer_obligation(&attacker, &new_owner, &agreement_id);
}

// ── burn_nft ─────────────────────────────────────────────────────────────────

#[test]
#[should_panic]
fn test_burn_nft_fails_without_owner_auth() {
    let env = Env::default();

    let client = setup(&env);
    let landlord = Address::generate(&env);
    let agreement_id = String::from_str(&env, "agreement_001");

    env.mock_all_auths();
    client.mint_obligation(&agreement_id, &landlord);
    env.mock_auths(&[]);

    env.ledger().with_mut(|li| {
        li.timestamp = li.timestamp.saturating_add(1);
    });

    client.burn_nft(&agreement_id, &String::from_str(&env, "LeaseCompleted"));
}

// ── initialize_admin / update_admin ─────────────────────────────────────────

#[test]
fn test_initialize_admin_succeeds_once() {
    let env = Env::default();
    env.mock_all_auths();

    let client = setup(&env);
    let admin = Address::generate(&env);

    let result = client.try_initialize_admin(&admin);
    assert!(result.is_ok(), "first initialize_admin should succeed");
    assert_eq!(client.get_admin(), Some(admin));
}

#[test]
#[should_panic(expected = "Error(Contract, #11)")]
fn test_initialize_admin_cannot_be_called_twice() {
    let env = Env::default();
    env.mock_all_auths();

    let client = setup(&env);
    let admin = Address::generate(&env);

    client.initialize_admin(&admin);
    client.initialize_admin(&admin);
}

#[test]
fn test_current_admin_can_update_admin() {
    let env = Env::default();
    env.mock_all_auths();

    let client = setup(&env);
    let admin = Address::generate(&env);
    let new_admin = Address::generate(&env);

    client.initialize_admin(&admin);
    let result = client.try_update_admin(&admin, &new_admin);
    assert!(result.is_ok());
    assert_eq!(client.get_admin(), Some(new_admin));
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_update_admin_fails_for_non_admin() {
    let env = Env::default();
    env.mock_all_auths();

    let client = setup(&env);
    let admin = Address::generate(&env);
    let attacker = Address::generate(&env);
    let new_admin = Address::generate(&env);

    client.initialize_admin(&admin);
    client.update_admin(&attacker, &new_admin);
}

#[test]
#[should_panic(expected = "Error(Contract, #12)")]
fn test_update_admin_fails_if_admin_not_set() {
    let env = Env::default();
    env.mock_all_auths();

    let client = setup(&env);
    let caller = Address::generate(&env);
    let new_admin = Address::generate(&env);

    client.update_admin(&caller, &new_admin);
}

// ── admin_reassign_obligation ────────────────────────────────────────────────

#[test]
fn test_admin_can_reassign_obligation() {
    let env = Env::default();
    env.mock_all_auths();

    let client = setup(&env);
    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);
    let new_owner = Address::generate(&env);
    let agreement_id = String::from_str(&env, "agreement_001");

    client.initialize_admin(&admin);
    client.mint_obligation(&agreement_id, &landlord);

    let result = client.try_admin_reassign_obligation(&admin, &agreement_id, &new_owner);
    assert!(result.is_ok(), "admin should be able to reassign");
    assert_eq!(client.get_obligation_owner(&agreement_id), Some(new_owner));
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_non_admin_cannot_reassign_obligation() {
    let env = Env::default();
    env.mock_all_auths();

    let client = setup(&env);
    let admin = Address::generate(&env);
    let landlord = Address::generate(&env);
    let attacker = Address::generate(&env);
    let new_owner = Address::generate(&env);
    let agreement_id = String::from_str(&env, "agreement_001");

    client.initialize_admin(&admin);
    client.mint_obligation(&agreement_id, &landlord);

    client.admin_reassign_obligation(&attacker, &agreement_id, &new_owner);
}

#[test]
#[should_panic(expected = "Error(Contract, #12)")]
fn test_admin_reassign_obligation_fails_if_admin_not_set() {
    let env = Env::default();
    env.mock_all_auths();

    let client = setup(&env);
    let caller = Address::generate(&env);
    let landlord = Address::generate(&env);
    let new_owner = Address::generate(&env);
    let agreement_id = String::from_str(&env, "agreement_001");

    client.mint_obligation(&agreement_id, &landlord);

    client.admin_reassign_obligation(&caller, &agreement_id, &new_owner);
}
