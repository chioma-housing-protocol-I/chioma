//! Property-based tests for the Dispute Resolution contract's weighted
//! voting invariant (#1562): an arbiter's computed voting weight must never
//! be zero (an arbiter must always be able to cast a vote that counts for
//! something), and increasing either rating or experience must never
//! *decrease* an arbiter's weight.
//!
//! Each proptest case drives a fresh, real `DisputeResolutionContract`
//! instance through a real `Env`, exercising `set_arbiter_stats` and
//! `get_voting_weight` end-to-end rather than mirroring the formula in a
//! pure function.

use super::*;
use proptest::prelude::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

fn create_contract(env: &Env) -> DisputeResolutionContractClient<'_> {
    let contract_id = env.register(DisputeResolutionContract, ());
    DisputeResolutionContractClient::new(env, &contract_id)
}

fn weight_for(rating: u32, disputes_resolved: u32) -> u32 {
    let env = Env::default();
    let client = create_contract(&env);
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let arbiter = Address::generate(&env);
    client.initialize(&admin, &3, &Address::generate(&env));
    client.add_arbiter(&admin, &arbiter);
    client.set_arbiter_stats(&admin, &arbiter, &rating, &disputes_resolved);

    client.get_voting_weight(&arbiter).total_weight
}

proptest! {
    /// An arbiter's computed voting weight is never zero, across the entire
    /// valid input space (rating 0-100, any disputes_resolved count) -- a
    /// dispute_resolution-specific state-machine invariant: an active
    /// arbiter must always be able to cast a vote that counts.
    #[test]
    fn prop_voting_weight_never_zero(
        rating in 0u32..=100u32,
        disputes_resolved in 0u32..=10_000u32,
    ) {
        let weight = weight_for(rating, disputes_resolved);
        prop_assert!(weight >= 1, "weight={weight} must be >= 1 for rating={rating}, disputes_resolved={disputes_resolved}");
    }

    /// Holding experience fixed, a strictly higher rating must never
    /// produce a strictly lower voting weight.
    #[test]
    fn prop_higher_rating_never_decreases_weight(
        rating_lo in 0u32..=99u32,
        rating_hi in 1u32..=100u32,
        disputes_resolved in 0u32..=200u32,
    ) {
        prop_assume!(rating_hi > rating_lo);
        let weight_lo = weight_for(rating_lo, disputes_resolved);
        let weight_hi = weight_for(rating_hi, disputes_resolved);
        prop_assert!(
            weight_hi >= weight_lo,
            "rating_hi={rating_hi} (weight={weight_hi}) must be >= rating_lo={rating_lo} (weight={weight_lo})"
        );
    }

    /// Holding rating fixed, resolving more disputes must never produce a
    /// strictly lower voting weight.
    #[test]
    fn prop_more_experience_never_decreases_weight(
        rating in 0u32..=100u32,
        disputes_lo in 0u32..=500u32,
        extra in 1u32..=500u32,
    ) {
        let disputes_hi = disputes_lo + extra;
        let weight_lo = weight_for(rating, disputes_lo);
        let weight_hi = weight_for(rating, disputes_hi);
        prop_assert!(
            weight_hi >= weight_lo,
            "disputes_hi={disputes_hi} (weight={weight_hi}) must be >= disputes_lo={disputes_lo} (weight={weight_lo})"
        );
    }
}
