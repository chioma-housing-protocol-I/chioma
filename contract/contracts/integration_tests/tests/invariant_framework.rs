//! Demonstrates the shared invariant framework against a real contract
//! function. Contract-local suites can adopt the same strategies and
//! assertions instead of repeating their own ranges and checks.

use invariant_testing::{assertions, strategies};
use payment::calculate_payment_split;
use proptest::prelude::*;

proptest! {
    #[test]
    fn commission_split_preserves_the_amount(
        amount in strategies::amount(),
        commission_bps in strategies::basis_points(),
    ) {
        let (landlord, agent) = calculate_payment_split(&amount, &commission_bps);

        assertions::assert_non_negative(landlord, "landlord share");
        assertions::assert_non_negative(agent, "agent share");
        assertions::assert_sum_preserved(&[landlord, agent], amount, "commission split");
    }

    #[test]
    fn a_higher_commission_never_increases_the_landlord_share(
        amount in strategies::positive_amount(),
        low_bps in 0u32..=5_000u32,
        high_bps in 5_000u32..=10_000u32,
    ) {
        let (landlord_low, _) = calculate_payment_split(&amount, &low_bps);
        let (landlord_high, _) = calculate_payment_split(&amount, &high_bps);

        assertions::assert_monotonic_non_decreasing(
            landlord_high,
            landlord_low,
            "landlord share vs commission",
        );
    }
}
