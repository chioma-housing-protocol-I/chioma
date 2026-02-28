use super::*;
use crate::dispute::RentAgreement;
use soroban_sdk::{contract, contractimpl, testutils::Address as _, Address, Env, String};

/// Mock chioma contract that returns a valid RentAgreement for testing.
#[contract]
pub struct MockChiomaContract;

#[contractimpl]
impl MockChiomaContract {
    /// Returns a mock active RentAgreement for any agreement_id.
    /// The raiser must be set as either the tenant or landlord for
    /// raise_dispute authorization to pass.
    pub fn get_agr(env: Env, _agreement_id: String) -> Option<RentAgreement> {
        // Retrieve the pre-stored mock agreement
        env.storage().instance().get::<_, RentAgreement>(&0u32)
    }
}

fn create_contract(env: &Env) -> DisputeResolutionContractClient<'_> {
    let contract_id = env.register(DisputeResolutionContract, ());
    DisputeResolutionContractClient::new(env, &contract_id)
}

#[test]
fn test_successful_initialization() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let chioma_contract = Address::generate(&env);
    let min_votes = 3u32;

    env.mock_all_auths();

    let result = client.try_initialize(&admin, &min_votes, &chioma_contract);
    assert!(result.is_ok());

    let state = client.get_state().unwrap();
    assert_eq!(state.admin, admin);
    assert!(state.initialized);
    assert_eq!(state.min_votes_required, min_votes);
    assert_eq!(state.chioma_contract, chioma_contract);
}

#[test]
#[should_panic]
fn test_initialize_fails_without_admin_auth() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let chioma_contract = Address::generate(&env);

    client.initialize(&admin, &3, &chioma_contract);
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn test_double_initialization_fails() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let chioma_contract = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin, &3, &chioma_contract);
    client.initialize(&admin, &3, &chioma_contract);
}

#[test]
fn test_add_arbiter_success() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let arbiter = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin, &3, &Address::generate(&env));

    let result = client.try_add_arbiter(&admin, &arbiter);
    assert!(result.is_ok());

    let arbiter_info = client.get_arbiter(&arbiter).unwrap();
    assert_eq!(arbiter_info.address, arbiter);
    assert!(arbiter_info.active);

    assert_eq!(client.get_arbiter_count(), 1);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_add_arbiter_fails_when_not_admin() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let non_admin = Address::generate(&env);
    let arbiter = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin, &3, &Address::generate(&env));
    client.add_arbiter(&non_admin, &arbiter);
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn test_add_arbiter_fails_when_already_exists() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let arbiter = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin, &3, &Address::generate(&env));
    client.add_arbiter(&admin, &arbiter);
    client.add_arbiter(&admin, &arbiter);
}

// NOTE: Tests for raise_dispute require a mock chioma contract
// These tests are temporarily disabled until integration test setup is complete
// See INTEGRATION.md for cross-contract testing approach

/*
#[test]
fn test_raise_dispute_success() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin, &3, &Address::generate(&env));

    let agreement_id = String::from_str(&env, "agreement_001");
    let details_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

    let result = client.try_raise_dispute(&Address::generate(&env), &agreement_id, &details_hash);
    assert!(result.is_ok());

    let dispute = client.get_dispute(&agreement_id).unwrap();
    assert_eq!(dispute.agreement_id, agreement_id);
    assert_eq!(dispute.details_hash, details_hash);
    assert!(!dispute.resolved);
    assert_eq!(dispute.votes_favor_landlord, 0);
    assert_eq!(dispute.votes_favor_tenant, 0);
    assert!(dispute.get_outcome().is_none());
}
*/

// NOTE: Tests for raise_dispute require a mock chioma contract
// These tests are temporarily disabled until integration test setup is complete
// See INTEGRATION.md for cross-contract testing approach

/*
#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn test_raise_dispute_fails_when_already_exists() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let (mock_chioma, tenant, _landlord) = setup_mock_chioma(&env);

    env.mock_all_auths();

    client.initialize(&admin, &3, &mock_chioma);

    let agreement_id = String::from_str(&env, "agreement_001");
    let details_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

    client.raise_dispute(&tenant, &agreement_id, &details_hash);
    client.raise_dispute(&tenant, &agreement_id, &details_hash);
}
*/

/*
#[test]
#[should_panic(expected = "Error(Contract, #10)")]
fn test_raise_dispute_fails_with_empty_details_hash() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin, &3, &Address::generate(&env));

    let agreement_id = String::from_str(&env, "agreement_001");
    let details_hash = String::from_str(&env, "");

    client.raise_dispute(&Address::generate(&env), &agreement_id, &details_hash);
}
*/

/*
#[test]
fn test_vote_on_dispute_success() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let arbiter = Address::generate(&env);
    let (mock_chioma, tenant, _landlord) = setup_mock_chioma(&env);

    env.mock_all_auths();

    client.initialize(&admin, &3, &mock_chioma);
    client.add_arbiter(&admin, &arbiter);

    let agreement_id = String::from_str(&env, "agreement_001");
    let details_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

    client.raise_dispute(&tenant, &agreement_id, &details_hash);

    let result = client.try_vote_on_dispute(&arbiter, &agreement_id, &true);
    assert!(result.is_ok());

    let dispute = client.get_dispute(&agreement_id).unwrap();
    assert_eq!(dispute.votes_favor_landlord, 1);
    assert_eq!(dispute.votes_favor_tenant, 0);

    let vote = client.get_vote(&agreement_id, &arbiter).unwrap();
    assert_eq!(vote.arbiter, arbiter);
    assert_eq!(vote.agreement_id, agreement_id);
    assert!(vote.favor_landlord);
}
*/

/*
#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_vote_fails_when_not_arbiter() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let non_arbiter = Address::generate(&env);
    let (mock_chioma, tenant, _landlord) = setup_mock_chioma(&env);

    env.mock_all_auths();

    client.initialize(&admin, &3, &mock_chioma);

    let agreement_id = String::from_str(&env, "agreement_001");
    let details_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

    client.raise_dispute(&tenant, &agreement_id, &details_hash);
    client.vote_on_dispute(&non_arbiter, &agreement_id, &true);
}
*/

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
fn test_vote_fails_when_dispute_not_found() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let arbiter = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin, &3, &Address::generate(&env));
    client.add_arbiter(&admin, &arbiter);

    let agreement_id = String::from_str(&env, "agreement_001");

    client.vote_on_dispute(&arbiter, &agreement_id, &true);
}

/*
#[test]
#[should_panic(expected = "Error(Contract, #9)")]
fn test_vote_fails_when_already_voted() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let arbiter = Address::generate(&env);
    let (mock_chioma, tenant, _landlord) = setup_mock_chioma(&env);

    env.mock_all_auths();

    client.initialize(&admin, &3, &mock_chioma);
    client.add_arbiter(&admin, &arbiter);

    let agreement_id = String::from_str(&env, "agreement_001");
    let details_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

    client.raise_dispute(&tenant, &agreement_id, &details_hash);
    client.vote_on_dispute(&arbiter, &agreement_id, &true);
    client.vote_on_dispute(&arbiter, &agreement_id, &false);
}
*/

/*
#[test]
fn test_resolve_dispute_favor_landlord() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let arbiter1 = Address::generate(&env);
    let arbiter2 = Address::generate(&env);
    let arbiter3 = Address::generate(&env);
    let (mock_chioma, tenant, _landlord) = setup_mock_chioma(&env);

    env.mock_all_auths();

    client.initialize(&admin, &3, &mock_chioma);
    client.add_arbiter(&admin, &arbiter1);
    client.add_arbiter(&admin, &arbiter2);
    client.add_arbiter(&admin, &arbiter3);

    let agreement_id = String::from_str(&env, "agreement_001");
    let details_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

    client.raise_dispute(&tenant, &agreement_id, &details_hash);

    client.vote_on_dispute(&arbiter1, &agreement_id, &true);
    client.vote_on_dispute(&arbiter2, &agreement_id, &true);
    client.vote_on_dispute(&arbiter3, &agreement_id, &false);

    let outcome = client.resolve_dispute(&agreement_id);
    assert_eq!(outcome, DisputeOutcome::FavorLandlord);

    let dispute = client.get_dispute(&agreement_id).unwrap();
    assert!(dispute.resolved);
    assert!(dispute.resolved_at.is_some());
    assert_eq!(
        dispute.get_outcome().unwrap(),
        DisputeOutcome::FavorLandlord
    );
    assert_eq!(dispute.votes_favor_landlord, 2);
    assert_eq!(dispute.votes_favor_tenant, 1);
}
*/

/*
#[test]
fn test_resolve_dispute_favor_tenant() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let arbiter1 = Address::generate(&env);
    let arbiter2 = Address::generate(&env);
    let arbiter3 = Address::generate(&env);
    let (mock_chioma, tenant, _landlord) = setup_mock_chioma(&env);

    env.mock_all_auths();

    client.initialize(&admin, &3, &mock_chioma);
    client.add_arbiter(&admin, &arbiter1);
    client.add_arbiter(&admin, &arbiter2);
    client.add_arbiter(&admin, &arbiter3);

    let agreement_id = String::from_str(&env, "agreement_001");
    let details_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

    client.raise_dispute(&tenant, &agreement_id, &details_hash);

    client.vote_on_dispute(&arbiter1, &agreement_id, &false);
    client.vote_on_dispute(&arbiter2, &agreement_id, &false);
    client.vote_on_dispute(&arbiter3, &agreement_id, &true);

    let outcome = client.resolve_dispute(&agreement_id);
    assert_eq!(outcome, DisputeOutcome::FavorTenant);

    let dispute = client.get_dispute(&agreement_id).unwrap();
    assert!(dispute.resolved);
    assert_eq!(dispute.get_outcome().unwrap(), DisputeOutcome::FavorTenant);
    assert_eq!(dispute.votes_favor_landlord, 1);
    assert_eq!(dispute.votes_favor_tenant, 2);
}
*/

/*
#[test]
#[should_panic(expected = "Error(Contract, #11)")]
fn test_resolve_dispute_fails_with_insufficient_votes() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let arbiter1 = Address::generate(&env);
    let (mock_chioma, tenant, _landlord) = setup_mock_chioma(&env);

    env.mock_all_auths();

    client.initialize(&admin, &3, &mock_chioma);
    client.add_arbiter(&admin, &arbiter1);

    let agreement_id = String::from_str(&env, "agreement_001");
    let details_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

    client.raise_dispute(&tenant, &agreement_id, &details_hash);
    client.vote_on_dispute(&arbiter1, &agreement_id, &true);

    client.resolve_dispute(&agreement_id);
}
*/

/*
#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn test_resolve_dispute_fails_when_already_resolved() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let arbiter1 = Address::generate(&env);
    let arbiter2 = Address::generate(&env);
    let arbiter3 = Address::generate(&env);
    let (mock_chioma, tenant, _landlord) = setup_mock_chioma(&env);

    env.mock_all_auths();

    client.initialize(&admin, &3, &mock_chioma);
    client.add_arbiter(&admin, &arbiter1);
    client.add_arbiter(&admin, &arbiter2);
    client.add_arbiter(&admin, &arbiter3);

    let agreement_id = String::from_str(&env, "agreement_001");
    let details_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

    client.raise_dispute(&tenant, &agreement_id, &details_hash);

    client.vote_on_dispute(&arbiter1, &agreement_id, &true);
    client.vote_on_dispute(&arbiter2, &agreement_id, &true);
    client.vote_on_dispute(&arbiter3, &agreement_id, &false);

    client.resolve_dispute(&agreement_id);
    client.resolve_dispute(&agreement_id);
}
*/

/*
#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn test_vote_fails_after_dispute_resolved() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let arbiter1 = Address::generate(&env);
    let arbiter2 = Address::generate(&env);
    let arbiter3 = Address::generate(&env);
    let arbiter4 = Address::generate(&env);
    let (mock_chioma, tenant, _landlord) = setup_mock_chioma(&env);

    env.mock_all_auths();

    client.initialize(&admin, &3, &mock_chioma);
    client.add_arbiter(&admin, &arbiter1);
    client.add_arbiter(&admin, &arbiter2);
    client.add_arbiter(&admin, &arbiter3);
    client.add_arbiter(&admin, &arbiter4);

    let agreement_id = String::from_str(&env, "agreement_001");
    let details_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

    client.raise_dispute(&tenant, &agreement_id, &details_hash);

    client.vote_on_dispute(&arbiter1, &agreement_id, &true);
    client.vote_on_dispute(&arbiter2, &agreement_id, &true);
    client.vote_on_dispute(&arbiter3, &agreement_id, &false);

    client.resolve_dispute(&agreement_id);

    client.vote_on_dispute(&arbiter4, &agreement_id, &false);
}
*/

/*
#[test]
fn test_multiple_disputes() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);
    let arbiter1 = Address::generate(&env);
    let arbiter2 = Address::generate(&env);
    let arbiter3 = Address::generate(&env);
    let (mock_chioma, tenant, _landlord) = setup_mock_chioma(&env);

    env.mock_all_auths();

    client.initialize(&admin, &3, &mock_chioma);
    client.add_arbiter(&admin, &arbiter1);
    client.add_arbiter(&admin, &arbiter2);
    client.add_arbiter(&admin, &arbiter3);

    let agreement_id1 = String::from_str(&env, "agreement_001");
    let agreement_id2 = String::from_str(&env, "agreement_002");
    let details_hash = String::from_str(&env, "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco");

    client.raise_dispute(&tenant, &agreement_id1, &details_hash);
    client.raise_dispute(&tenant, &agreement_id2, &details_hash);

    client.vote_on_dispute(&arbiter1, &agreement_id1, &true);
    client.vote_on_dispute(&arbiter2, &agreement_id1, &true);
    client.vote_on_dispute(&arbiter3, &agreement_id1, &false);

    client.vote_on_dispute(&arbiter1, &agreement_id2, &false);
    client.vote_on_dispute(&arbiter2, &agreement_id2, &false);
    client.vote_on_dispute(&arbiter3, &agreement_id2, &true);

    let outcome1 = client.resolve_dispute(&agreement_id1);
    assert_eq!(outcome1, DisputeOutcome::FavorLandlord);

    let outcome2 = client.resolve_dispute(&agreement_id2);
    assert_eq!(outcome2, DisputeOutcome::FavorTenant);
}
*/

#[test]
fn test_get_arbiter_count() {
    let env = Env::default();
    let client = create_contract(&env);

    let admin = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin, &3, &Address::generate(&env));

    assert_eq!(client.get_arbiter_count(), 0);

    let arbiter1 = Address::generate(&env);
    client.add_arbiter(&admin, &arbiter1);
    assert_eq!(client.get_arbiter_count(), 1);

    let arbiter2 = Address::generate(&env);
    client.add_arbiter(&admin, &arbiter2);
    assert_eq!(client.get_arbiter_count(), 2);

    let arbiter3 = Address::generate(&env);
    client.add_arbiter(&admin, &arbiter3);
    assert_eq!(client.get_arbiter_count(), 3);
}
