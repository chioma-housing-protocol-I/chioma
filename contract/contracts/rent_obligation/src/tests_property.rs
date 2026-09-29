//! Property-based tests for the Rent Obligation (NFT) contract's core
//! state-machine invariants (#1562):
//!
//! 1. An obligation NFT can only ever be minted once per `agreement_id`; a
//!    second mint attempt must never overwrite the original owner/record.
//! 2. Burning is a strictly one-way transition: once an obligation is
//!    burned, a second burn attempt must always fail and must never
//!    overwrite the original burn record (who burned it, when, or why).
//!
//! Each proptest case drives a fresh, real
//! `TokenizedRentObligationContract` instance through a real `Env`.

use super::*;
use proptest::prelude::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, Env, String,
};

fn create_contract(env: &Env) -> TokenizedRentObligationContractClient<'_> {
    let contract_id = env.register(TokenizedRentObligationContract, ());
    TokenizedRentObligationContractClient::new(env, &contract_id)
}

const VALID_REASONS: [&str; 4] = [
    "LeaseCompleted",
    "AgreementTerminated",
    "DisputeResolved",
    "UserRequested",
];

proptest! {
    /// Minting an obligation for an `agreement_id` that already has one
    /// must always fail, and must never change who owns the original
    /// obligation, regardless of which (possibly different) landlord
    /// attempts the second mint.
    #[test]
    fn prop_double_mint_never_overwrites_owner(
        same_landlord in any::<bool>(),
    ) {
        let env = Env::default();
        let client = create_contract(&env);
        env.mock_all_auths();
        client.initialize();

        let landlord_a = Address::generate(&env);
        let landlord_b = if same_landlord {
            landlord_a.clone()
        } else {
            Address::generate(&env)
        };
        let agreement_id = String::from_str(&env, "agr-proptest-mint");

        client.mint_obligation(&agreement_id, &landlord_a);
        let original = client.get_obligation(&agreement_id).unwrap();

        let second = client.try_mint_obligation(&agreement_id, &landlord_b);
        prop_assert_eq!(
            second,
            Err(Ok(ObligationError::ObligationAlreadyExists)),
            "re-minting an existing agreement_id must always fail"
        );

        let after = client.get_obligation(&agreement_id).unwrap();
        prop_assert_eq!(after, original, "rejected re-mint must not mutate the stored obligation");
    }

    /// Once an obligation is burned, a second burn attempt (with any valid
    /// reason string) must always fail, and the original burn record must
    /// be completely unchanged afterwards -- burning is one-way.
    #[test]
    fn prop_burn_is_one_way(
        first_reason_idx in 0usize..VALID_REASONS.len(),
        second_reason_idx in 0usize..VALID_REASONS.len(),
    ) {
        let env = Env::default();
        let client = create_contract(&env);
        env.mock_all_auths();
        client.initialize();

        let landlord = Address::generate(&env);
        let agreement_id = String::from_str(&env, "agr-proptest-burn");
        client.mint_obligation(&agreement_id, &landlord);

        // burn_nft requires ledger time to have advanced past minted_at.
        env.ledger().with_mut(|li| {
            li.timestamp = li.timestamp.saturating_add(1);
        });

        let first_reason = String::from_str(&env, VALID_REASONS[first_reason_idx]);
        client.burn_nft(&agreement_id, &first_reason);
        let original_record = client.get_burn_record(&agreement_id);

        let second_reason = String::from_str(&env, VALID_REASONS[second_reason_idx]);
        let second = client.try_burn_nft(&agreement_id, &second_reason);
        prop_assert_eq!(
            second,
            Err(Ok(ObligationError::AlreadyBurned)),
            "burning an already-burned obligation must always fail"
        );

        let after_record = client.get_burn_record(&agreement_id);
        prop_assert_eq!(
            after_record, original_record,
            "rejected second burn must not overwrite the original burn record"
        );
    }
}
