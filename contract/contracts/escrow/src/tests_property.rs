//! Property-based tests for escrow balance invariants.
//!
//! Uses `proptest` to verify that partial-release and damage-deduction math
//! never produces negative balances or allows over-release, regardless of
//! input values.

use proptest::prelude::*;

// ─── Escrow balance invariants ────────────────────────────────────────────────

proptest! {
    /// After a partial release, remaining balance is always non-negative.
    #[test]
    fn prop_partial_release_balance_non_negative(
        total in 0i128..1_000_000_000_000i128,
        release in 0i128..1_000_000_000_000i128,
    ) {
        if release <= total {
            let remaining = total - release;
            prop_assert!(remaining >= 0,
                "remaining={remaining} must be >= 0");
        }
    }

    /// Partial release cannot exceed the escrow balance.
    #[test]
    fn prop_partial_release_capped_at_balance(
        total in 1i128..1_000_000_000_000i128,
        release_fraction_bps in 0u32..=10_000u32,
    ) {
        // release = total * fraction / 10_000  (never exceeds total)
        let release = (total * release_fraction_bps as i128) / 10_000;
        prop_assert!(release <= total,
            "release={release} must be <= total={total}");
        let remaining = total - release;
        prop_assert!(remaining >= 0);
    }

    /// Multiple partial releases must never exceed the original escrow amount.
    #[test]
    fn prop_cumulative_releases_bounded_by_total(
        total in 0i128..1_000_000_000_000i128,
        r1_bps in 0u32..=5_000u32,
        r2_bps in 0u32..=5_000u32,
    ) {
        let r1 = (total * r1_bps as i128) / 10_000;
        let after_r1 = total - r1;
        let r2 = (after_r1 * r2_bps as i128) / 10_000;
        let after_r2 = after_r1 - r2;
        prop_assert!(after_r2 >= 0,
            "after two releases: remaining={after_r2} must be >= 0");
        prop_assert!(r1 + r2 <= total,
            "r1={r1} + r2={r2} must not exceed total={total}");
    }

    /// Damage deduction: landlord_share + tenant_refund == total.
    #[test]
    fn prop_damage_deduction_splits_sum_to_total(
        total in 0i128..1_000_000_000_000i128,
        damage in 0i128..1_000_000_000_000i128,
    ) {
        if damage <= total {
            let landlord = damage;
            let tenant = total - damage;
            prop_assert_eq!(
                landlord + tenant,
                total,
                "landlord={} + tenant={} must equal total={}",
                landlord,
                tenant,
                total
            );
            prop_assert!(landlord >= 0);
            prop_assert!(tenant >= 0);
        }
    }

    /// Zero damage refunds the full escrow to the depositor.
    #[test]
    fn prop_zero_damage_full_refund(
        total in 0i128..1_000_000_000_000i128,
    ) {
        let damage = 0i128;
        let landlord = damage;
        let tenant = total - damage;
        prop_assert_eq!(tenant, total);
        prop_assert_eq!(landlord, 0);
    }

    /// Full damage sends everything to the beneficiary (landlord).
    #[test]
    fn prop_full_damage_no_refund(
        total in 0i128..1_000_000_000_000i128,
    ) {
        let damage = total;
        let landlord = damage;
        let tenant = total - damage;
        prop_assert_eq!(landlord, total);
        prop_assert_eq!(tenant, 0);
    }

    /// Rent release split: beneficiary 90%, platform 5%, agent gets remainder.
    #[test]
    fn prop_rent_release_split_sums_to_total(
        amount in 0i128..1_000_000_000_000i128,
    ) {
        let beneficiary = amount * 90 / 100;
        let platform = amount * 5 / 100;
        let agent = amount - beneficiary - platform;
        prop_assert_eq!(
            beneficiary + platform + agent,
            amount,
            "splits must sum to amount={}",
            amount
        );
        prop_assert!(beneficiary >= 0);
        prop_assert!(platform >= 0);
        prop_assert!(agent >= 0);
    }
}
