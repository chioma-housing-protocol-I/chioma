use super::*;
use crate::dispute::RentAgreement;
use soroban_sdk::{
    contract, contractimpl,
    testutils::{Address as _, Ledger},
    Address, Env, String,
};

// ── Weighted Voting Helpers ────────────────────────────────────────────────

/// Inject a pre-resolved dispute directly into storage so weighted-voting tests
/// can operate without cross-contract calls.
fn inject_open_dispute(env: &Env, client: &DisputeResolutionContractClient, dispute_id: &String) {
    env.as_contract(&client.address, || {
        let dispute = Dispute {
            agreement_id: dispute_id.clone(),
            details_hash: String::from_str(env, "QmWeightedTest"),
            raised_at: env.ledger().timestamp(),
            resolved: false,
            resolved_at: None,
            votes_favor_landlord: 0,
            votes_favor_tenant: 0,
            voters: soroban_sdk::Vec::new(env),
        };
        env.storage()
            .persistent()
            .set(&DataKey::Dispute(dispute_id.clone()), &dispute);
        env.storage().persistent().set(&DataKey::Initialized, &true);
    });
}

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

fn setup_appeal_ready_dispute(
    env: &Env,
) -> (
    DisputeResolutionContractClient<'_>,
    Address,
    String,
    Address,
    Address,
    Address,
) {
    let client = create_contract(env);
    let admin = Address::generate(env);
    let appellant = Address::generate(env);
    let dispute_id = String::from_str(env, "dispute-appeal-1");

    let original_arbiter_1 = Address::generate(env);
    let original_arbiter_2 = Address::generate(env);
    let original_arbiter_3 = Address::generate(env);

    let new_arbiter_1 = Address::generate(env);
    let new_arbiter_2 = Address::generate(env);
    let new_arbiter_3 = Address::generate(env);

    env.mock_all_auths();
    client.initialize(&admin, &3, &Address::generate(env));

    client.add_arbiter(&admin, &original_arbiter_1);
    client.add_arbiter(&admin, &original_arbiter_2);
    client.add_arbiter(&admin, &original_arbiter_3);
    client.add_arbiter(&admin, &new_arbiter_1);
    client.add_arbiter(&admin, &new_arbiter_2);
    client.add_arbiter(&admin, &new_arbiter_3);

    env.ledger().with_mut(|ledger| ledger.timestamp = 1_000_000);

    env.as_contract(&client.address, || {
        let mut voters = soroban_sdk::Vec::new(env);
        voters.push_back(original_arbiter_1);
        voters.push_back(original_arbiter_2);
        voters.push_back(original_arbiter_3);

        let dispute = Dispute {
            agreement_id: dispute_id.clone(),
            details_hash: String::from_str(env, "QmResolvedDispute"),
            raised_at: 900_000,
            resolved: true,
            resolved_at: Some(999_000),
            votes_favor_landlord: 2,
            votes_favor_tenant: 1,
            voters,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Dispute(dispute_id.clone()), &dispute);
    });

    (
        client,
        appellant,
        dispute_id,
        new_arbiter_1,
        new_arbiter_2,
        new_arbiter_3,
    )
}

#[test]
fn test_appeal_creation_selects_new_arbiters_and_charges_fee() {
    let env = Env::default();
    let (client, appellant, dispute_id, _, _, _) = setup_appeal_ready_dispute(&env);

    let appeal_id = client
        .try_create_appeal(
            &appellant,
            &dispute_id,
            &String::from_str(&env, "appeal reason"),
        )
        .unwrap()
        .unwrap();

    let appeal = client.get_appeal(&appeal_id).unwrap();
    assert_eq!(appeal.status, AppealStatus::Pending);
    assert_eq!(appeal.appeal_arbiters.len(), 3);

    let dispute = client.get_dispute(&dispute_id).unwrap();
    for arbiter in appeal.appeal_arbiters.iter() {
        assert!(!dispute.voters.contains(arbiter));
    }

    env.as_contract(&client.address, || {
        let fee_paid: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::AppealFeePaid(appeal_id.clone()))
            .unwrap();
        assert_eq!(fee_paid, 100);
    });
}

#[test]
fn test_appeal_voting_and_resolution_approved_refunds_fee() {
    let env = Env::default();
    let (client, appellant, dispute_id, arbiter_1, arbiter_2, arbiter_3) =
        setup_appeal_ready_dispute(&env);

    let appeal_id = client
        .try_create_appeal(
            &appellant,
            &dispute_id,
            &String::from_str(&env, "wrong original outcome"),
        )
        .unwrap()
        .unwrap();

    assert!(client
        .try_vote_on_appeal(&arbiter_1, &appeal_id, &DisputeOutcome::FavorTenant)
        .is_ok());
    assert!(client
        .try_vote_on_appeal(&arbiter_2, &appeal_id, &DisputeOutcome::FavorTenant)
        .is_ok());
    assert!(client
        .try_vote_on_appeal(&arbiter_3, &appeal_id, &DisputeOutcome::FavorLandlord)
        .is_ok());

    assert!(client.try_resolve_appeal(&appeal_id).is_ok());

    let appeal = client.get_appeal(&appeal_id).unwrap();
    assert_eq!(appeal.status, AppealStatus::Approved);
    assert!(appeal.resolved_at.is_some());

    env.as_contract(&client.address, || {
        let refunded: bool = env
            .storage()
            .persistent()
            .get(&DataKey::AppealFeeRefunded(appeal_id.clone()))
            .unwrap();
        assert!(refunded);
    });
}

#[test]
fn test_appeal_cancellation() {
    let env = Env::default();
    let (client, appellant, dispute_id, _, _, _) = setup_appeal_ready_dispute(&env);

    let appeal_id = client
        .try_create_appeal(
            &appellant,
            &dispute_id,
            &String::from_str(&env, "cancel this appeal"),
        )
        .unwrap()
        .unwrap();

    assert!(client.try_cancel_appeal(&appellant, &appeal_id).is_ok());

    let appeal = client.get_appeal(&appeal_id).unwrap();
    assert_eq!(appeal.status, AppealStatus::Cancelled);
}

#[test]
fn test_appeal_window_expired() {
    let env = Env::default();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let appellant = Address::generate(&env);
    let dispute_id = String::from_str(&env, "dispute-expired");

    env.mock_all_auths();
    client.initialize(&admin, &3, &Address::generate(&env));

    let old_arbiter_1 = Address::generate(&env);
    let old_arbiter_2 = Address::generate(&env);
    let old_arbiter_3 = Address::generate(&env);
    let new_arbiter_1 = Address::generate(&env);
    let new_arbiter_2 = Address::generate(&env);
    let new_arbiter_3 = Address::generate(&env);
    client.add_arbiter(&admin, &old_arbiter_1);
    client.add_arbiter(&admin, &old_arbiter_2);
    client.add_arbiter(&admin, &old_arbiter_3);
    client.add_arbiter(&admin, &new_arbiter_1);
    client.add_arbiter(&admin, &new_arbiter_2);
    client.add_arbiter(&admin, &new_arbiter_3);

    env.ledger().with_mut(|ledger| ledger.timestamp = 2_000_000);
    env.as_contract(&client.address, || {
        let mut voters = soroban_sdk::Vec::new(&env);
        voters.push_back(old_arbiter_1);
        voters.push_back(old_arbiter_2);
        voters.push_back(old_arbiter_3);

        let dispute = Dispute {
            agreement_id: dispute_id.clone(),
            details_hash: String::from_str(&env, "QmResolvedOld"),
            raised_at: 500_000,
            resolved: true,
            resolved_at: Some(1_000_000),
            votes_favor_landlord: 2,
            votes_favor_tenant: 1,
            voters,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Dispute(dispute_id.clone()), &dispute);
    });

    let result = client.try_create_appeal(
        &appellant,
        &dispute_id,
        &String::from_str(&env, "too late appeal"),
    );
    assert_eq!(result, Err(Ok(DisputeError::AppealWindowExpired)));
}

#[test]
fn test_dispute_timeout_auto_resolve_and_config() {
    let env = Env::default();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let agreement_id = String::from_str(&env, "dispute-timeout-1");
    env.mock_all_auths();

    client.initialize(&admin, &3, &Address::generate(&env));
    client.set_timeout_config(
        &admin,
        &TimeoutConfig {
            escrow_timeout_days: 14,
            dispute_timeout_days: 1,
            payment_timeout_days: 7,
        },
    );

    env.ledger().with_mut(|l| l.timestamp = 1_000);
    env.as_contract(&client.address, || {
        let dispute = Dispute {
            agreement_id: agreement_id.clone(),
            details_hash: String::from_str(&env, "QmTimeout"),
            raised_at: 1_000,
            resolved: false,
            resolved_at: None,
            votes_favor_landlord: 0,
            votes_favor_tenant: 0,
            voters: soroban_sdk::Vec::new(&env),
        };
        env.storage()
            .persistent()
            .set(&DataKey::Dispute(agreement_id.clone()), &dispute);
    });

    env.ledger().with_mut(|l| l.timestamp = 1_000 + 2 * 86_400);
    let outcome = client.resolve_dispute_on_timeout(&agreement_id);
    assert_eq!(outcome, DisputeOutcome::FavorTenant);

    let stored = client.get_dispute(&agreement_id).unwrap();
    assert!(stored.resolved);
    assert!(stored.resolved_at.is_some());
}

// ── Weighted Voting Tests ──────────────────────────────────────────────────

#[test]
fn test_set_arbiter_stats() {
    let env = Env::default();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let arbiter = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin, &3, &Address::generate(&env));
    client.add_arbiter(&admin, &arbiter);

    let result = client.try_set_arbiter_stats(&admin, &arbiter, &80, &50);
    assert!(result.is_ok());
}

#[test]
#[should_panic(expected = "Error(Contract, #26)")]
fn test_set_arbiter_stats_invalid_rating() {
    let env = Env::default();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let arbiter = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin, &3, &Address::generate(&env));
    client.add_arbiter(&admin, &arbiter);
    // rating > 100 should fail with InvalidRating
    client.set_arbiter_stats(&admin, &arbiter, &101, &0);
}

#[test]
fn test_calculate_voting_weight_default_stats() {
    let env = Env::default();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let arbiter = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin, &3, &Address::generate(&env));
    client.add_arbiter(&admin, &arbiter);

    // Default stats: rating=50, disputes_resolved=0
    // rating_mult = 50×2 = 100; exp_mult = 0 → computed=0 → clamped to 1
    let vw = client.get_voting_weight(&arbiter);
    assert_eq!(vw.base_weight, 100);
    assert_eq!(vw.rating_multiplier, 100); // 50×2
    assert_eq!(vw.experience_multiplier, 0);
    assert_eq!(vw.total_weight, 1); // minimum
}

#[test]
fn test_calculate_voting_weight_with_stats() {
    let env = Env::default();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let arbiter = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin, &3, &Address::generate(&env));
    client.add_arbiter(&admin, &arbiter);

    // rating=100, disputes_resolved=100
    // rating_mult = 100×2 = 200; exp_mult = min(100×2,200) = 200
    // total = 200×200/100 = 400
    client.set_arbiter_stats(&admin, &arbiter, &100, &100);
    let vw = client.get_voting_weight(&arbiter);
    assert_eq!(vw.rating_multiplier, 200);
    assert_eq!(vw.experience_multiplier, 200);
    assert_eq!(vw.total_weight, 400);
}

#[test]
fn test_calculate_voting_weight_experience_cap() {
    let env = Env::default();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let arbiter = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin, &3, &Address::generate(&env));
    client.add_arbiter(&admin, &arbiter);

    // disputes_resolved=999 should cap exp_mult at 200
    client.set_arbiter_stats(&admin, &arbiter, &50, &999);
    let vw = client.get_voting_weight(&arbiter);
    assert_eq!(vw.experience_multiplier, 200);
    // total = 100×200/100 = 200
    assert_eq!(vw.total_weight, 200);
}

#[test]
fn test_vote_on_dispute_weighted_records_vote() {
    let env = Env::default();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let arbiter = Address::generate(&env);
    let dispute_id = String::from_str(&env, "weighted-dispute-1");

    env.mock_all_auths();
    client.initialize(&admin, &1, &Address::generate(&env));
    client.add_arbiter(&admin, &arbiter);
    client.set_arbiter_stats(&admin, &arbiter, &100, &100);
    inject_open_dispute(&env, &client, &dispute_id);

    let result =
        client.try_vote_on_dispute_weighted(&arbiter, &dispute_id, &DisputeOutcome::FavorLandlord);
    assert!(result.is_ok());

    let votes = client.get_dispute_votes_weighted(&dispute_id);
    assert_eq!(votes.len(), 1);
    assert_eq!(votes.get(0).unwrap().weight, 400);
    assert_eq!(votes.get(0).unwrap().vote, DisputeOutcome::FavorLandlord);
}

#[test]
#[should_panic(expected = "Error(Contract, #9)")]
fn test_vote_on_dispute_weighted_already_voted() {
    let env = Env::default();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let arbiter = Address::generate(&env);
    let dispute_id = String::from_str(&env, "weighted-dispute-dupe");

    env.mock_all_auths();
    client.initialize(&admin, &1, &Address::generate(&env));
    client.add_arbiter(&admin, &arbiter);
    inject_open_dispute(&env, &client, &dispute_id);

    client.vote_on_dispute_weighted(&arbiter, &dispute_id, &DisputeOutcome::FavorLandlord);
    // second vote should fail
    client.vote_on_dispute_weighted(&arbiter, &dispute_id, &DisputeOutcome::FavorTenant);
}

#[test]
fn test_resolve_dispute_weighted_favor_landlord() {
    let env = Env::default();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let arbiter1 = Address::generate(&env);
    let arbiter2 = Address::generate(&env);
    let arbiter3 = Address::generate(&env);
    let dispute_id = String::from_str(&env, "weighted-resolve-1");

    env.mock_all_auths();
    client.initialize(&admin, &3, &Address::generate(&env));
    client.add_arbiter(&admin, &arbiter1);
    client.add_arbiter(&admin, &arbiter2);
    client.add_arbiter(&admin, &arbiter3);

    // arbiter1: rating=100, disputes=100 → weight=400
    // arbiter2: rating=100, disputes=100 → weight=400
    // arbiter3: rating=50, disputes=50   → weight=100
    client.set_arbiter_stats(&admin, &arbiter1, &100, &100);
    client.set_arbiter_stats(&admin, &arbiter2, &100, &100);
    client.set_arbiter_stats(&admin, &arbiter3, &50, &50);

    inject_open_dispute(&env, &client, &dispute_id);

    client.vote_on_dispute_weighted(&arbiter1, &dispute_id, &DisputeOutcome::FavorLandlord);
    client.vote_on_dispute_weighted(&arbiter2, &dispute_id, &DisputeOutcome::FavorLandlord);
    client.vote_on_dispute_weighted(&arbiter3, &dispute_id, &DisputeOutcome::FavorTenant);

    // FavorLandlord: 800  vs  FavorTenant: 100
    let outcome = client.resolve_dispute_weighted(&dispute_id);
    assert_eq!(outcome, DisputeOutcome::FavorLandlord);

    let dispute = client.get_dispute(&dispute_id).unwrap();
    assert!(dispute.resolved);
}

#[test]
fn test_resolve_dispute_weighted_favor_tenant() {
    let env = Env::default();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let arbiter1 = Address::generate(&env);
    let arbiter2 = Address::generate(&env);
    let arbiter3 = Address::generate(&env);
    let dispute_id = String::from_str(&env, "weighted-resolve-2");

    env.mock_all_auths();
    client.initialize(&admin, &3, &Address::generate(&env));
    client.add_arbiter(&admin, &arbiter1);
    client.add_arbiter(&admin, &arbiter2);
    client.add_arbiter(&admin, &arbiter3);

    client.set_arbiter_stats(&admin, &arbiter1, &100, &100); // weight=400
    client.set_arbiter_stats(&admin, &arbiter2, &100, &100); // weight=400
    client.set_arbiter_stats(&admin, &arbiter3, &50, &50); // weight=100

    inject_open_dispute(&env, &client, &dispute_id);

    // high-weight arbiters vote for tenant
    client.vote_on_dispute_weighted(&arbiter1, &dispute_id, &DisputeOutcome::FavorTenant);
    client.vote_on_dispute_weighted(&arbiter2, &dispute_id, &DisputeOutcome::FavorTenant);
    client.vote_on_dispute_weighted(&arbiter3, &dispute_id, &DisputeOutcome::FavorLandlord);

    let outcome = client.resolve_dispute_weighted(&dispute_id);
    assert_eq!(outcome, DisputeOutcome::FavorTenant);
}

#[test]
fn test_resolve_dispute_weighted_tie_breaking() {
    let env = Env::default();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let arbiter1 = Address::generate(&env);
    let arbiter2 = Address::generate(&env);
    let dispute_id = String::from_str(&env, "weighted-tie-1");

    env.mock_all_auths();
    client.initialize(&admin, &2, &Address::generate(&env));
    client.add_arbiter(&admin, &arbiter1);
    client.add_arbiter(&admin, &arbiter2);

    // equal weights so both sides tie
    client.set_arbiter_stats(&admin, &arbiter1, &100, &100); // weight=400
    client.set_arbiter_stats(&admin, &arbiter2, &100, &100); // weight=400

    inject_open_dispute(&env, &client, &dispute_id);

    // first vote → FavorLandlord (should win on tie)
    env.ledger().with_mut(|l| l.timestamp = 1000);
    client.vote_on_dispute_weighted(&arbiter1, &dispute_id, &DisputeOutcome::FavorLandlord);

    env.ledger().with_mut(|l| l.timestamp = 2000);
    client.vote_on_dispute_weighted(&arbiter2, &dispute_id, &DisputeOutcome::FavorTenant);

    // 400 vs 400 → tie broken by first vote → FavorLandlord
    let outcome = client.resolve_dispute_weighted(&dispute_id);
    assert_eq!(outcome, DisputeOutcome::FavorLandlord);
}

#[test]
fn test_resolve_dispute_weighted_insufficient_votes() {
    let env = Env::default();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let arbiter1 = Address::generate(&env);
    let dispute_id = String::from_str(&env, "weighted-insuf-1");

    env.mock_all_auths();
    client.initialize(&admin, &3, &Address::generate(&env));
    client.add_arbiter(&admin, &arbiter1);
    inject_open_dispute(&env, &client, &dispute_id);

    client.vote_on_dispute_weighted(&arbiter1, &dispute_id, &DisputeOutcome::FavorLandlord);

    // only 1 voter, need 3
    let result = client.try_resolve_dispute_weighted(&dispute_id);
    assert_eq!(result, Err(Ok(DisputeError::InsufficientVotes)));
}

#[test]
fn test_weight_update_reflected_in_new_votes() {
    let env = Env::default();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let arbiter = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin, &1, &Address::generate(&env));
    client.add_arbiter(&admin, &arbiter);

    // First check: default stats
    let vw1 = client.get_voting_weight(&arbiter);
    assert_eq!(vw1.total_weight, 1);

    // Admin updates the arbiter's stats
    client.set_arbiter_stats(&admin, &arbiter, &100, &100);
    let vw2 = client.get_voting_weight(&arbiter);
    assert_eq!(vw2.total_weight, 400);
}

#[test]
fn test_dispute_timeout_not_reached() {
    let env = Env::default();
    let client = create_contract(&env);
    let admin = Address::generate(&env);
    let agreement_id = String::from_str(&env, "dispute-timeout-2");
    env.mock_all_auths();

    client.initialize(&admin, &3, &Address::generate(&env));
    client.set_timeout_config(
        &admin,
        &TimeoutConfig {
            escrow_timeout_days: 14,
            dispute_timeout_days: 30,
            payment_timeout_days: 7,
        },
    );

    env.ledger().with_mut(|l| l.timestamp = 10_000);
    env.as_contract(&client.address, || {
        let dispute = Dispute {
            agreement_id: agreement_id.clone(),
            details_hash: String::from_str(&env, "QmNoTimeout"),
            raised_at: 10_000,
            resolved: false,
            resolved_at: None,
            votes_favor_landlord: 1,
            votes_favor_tenant: 0,
            voters: soroban_sdk::Vec::new(&env),
        };
        env.storage()
            .persistent()
            .set(&DataKey::Dispute(agreement_id.clone()), &dispute);
    });

    env.ledger().with_mut(|l| l.timestamp = 10_000 + 5 * 86_400);
    let result = client.try_resolve_dispute_on_timeout(&agreement_id);
    assert_eq!(result, Err(Ok(DisputeError::TimeoutNotReached)));
}
