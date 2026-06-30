//! Property-based tests for payment arithmetic invariants.
//!
//! Uses `proptest` to verify that `calculate_payment_split`,
//! `calculate_rent_for_period`, `compute_fee` (late fees), and related
//! math never violate key invariants regardless of input values.

use proptest::prelude::*;

use crate::late_fee::compute_fee;
use crate::payment_impl::{calculate_payment_split, calculate_rent_for_period};
use crate::types::{EscalationType, LateFeeConfig, RentEscalationConfig};

// ─── calculate_payment_split invariants ──────────────────────────────────────

proptest! {
    /// landlord + agent always equals the original amount.
    #[test]
    fn prop_split_sums_to_amount(
        amount in 0i128..1_000_000_000_000i128,
        commission_bps in 0u32..=10_000u32,
    ) {
        let (landlord, agent) = calculate_payment_split(&amount, &commission_bps);
        prop_assert_eq!(
            landlord + agent,
            amount,
            "landlord={landlord} + agent={agent} != amount={amount}"
        );
    }

    /// Landlord and agent shares are both non-negative.
    #[test]
    fn prop_split_shares_non_negative(
        amount in 0i128..1_000_000_000_000i128,
        commission_bps in 0u32..=10_000u32,
    ) {
        let (landlord, agent) = calculate_payment_split(&amount, &commission_bps);
        prop_assert!(landlord >= 0, "landlord={landlord} must be >= 0");
        prop_assert!(agent >= 0, "agent={agent} must be >= 0");
    }

    /// Zero commission: agent gets nothing, landlord gets everything.
    #[test]
    fn prop_split_zero_commission(
        amount in 0i128..1_000_000_000_000i128,
    ) {
        let (landlord, agent) = calculate_payment_split(&amount, &0u32);
        prop_assert_eq!(agent, 0);
        prop_assert_eq!(landlord, amount);
    }

    /// Full commission (10 000 bps = 100%): landlord gets nothing.
    #[test]
    fn prop_split_full_commission(
        amount in 0i128..1_000_000_000_000i128,
    ) {
        let (landlord, _agent) = calculate_payment_split(&amount, &10_000u32);
        prop_assert_eq!(landlord, 0);
    }

    /// Larger commission means a smaller landlord share.
    #[test]
    fn prop_split_larger_commission_smaller_landlord(
        amount in 1i128..1_000_000_000_000i128,
        bps_lo in 0u32..=4_999u32,
        bps_hi in 5_000u32..=10_000u32,
    ) {
        let (landlord_lo, _) = calculate_payment_split(&amount, &bps_lo);
        let (landlord_hi, _) = calculate_payment_split(&amount, &bps_hi);
        prop_assert!(
            landlord_hi <= landlord_lo,
            "landlord_hi={landlord_hi} must be <= landlord_lo={landlord_lo}"
        );
    }
}

// ─── calculate_rent_for_period invariants ────────────────────────────────────

proptest! {
    /// FixedAnnual: escalated rent is always >= base rent.
    #[test]
    fn prop_fixed_annual_rent_gte_base(
        base_rent in 0i128..1_000_000_000i128,
        payment_number in 1u32..=120u32,
        annual_rate_bps in 0u32..=10_000u32,
        payments_per_year in 1u32..=52u32,
    ) {
        let env = soroban_sdk::Env::default();
        let config = RentEscalationConfig {
            agreement_id: soroban_sdk::String::from_str(&env, "AGR-PROP"),
            annual_rate_bps,
            payments_per_year,
            escalation_type: EscalationType::FixedAnnual,
        };
        let rent = calculate_rent_for_period(base_rent, payment_number, &config);
        prop_assert!(
            rent >= base_rent,
            "rent={rent} must be >= base_rent={base_rent}"
        );
    }

    /// None escalation: rent always equals base rent regardless of config values.
    #[test]
    fn prop_none_escalation_constant_rent(
        base_rent in 0i128..1_000_000_000i128,
        payment_number in 1u32..=120u32,
        annual_rate_bps in 0u32..=10_000u32,
        payments_per_year in 1u32..=52u32,
    ) {
        let env = soroban_sdk::Env::default();
        let config = RentEscalationConfig {
            agreement_id: soroban_sdk::String::from_str(&env, "AGR-NONE"),
            annual_rate_bps,
            payments_per_year,
            escalation_type: EscalationType::None,
        };
        let rent = calculate_rent_for_period(base_rent, payment_number, &config);
        prop_assert_eq!(
            rent,
            base_rent,
            "None escalation: rent={rent} must equal base_rent={base_rent}"
        );
    }

    /// First payment period always equals base rent.
    #[test]
    fn prop_first_period_equals_base_rent(
        base_rent in 0i128..1_000_000_000i128,
        annual_rate_bps in 0u32..=10_000u32,
        payments_per_year in 1u32..=52u32,
    ) {
        let env = soroban_sdk::Env::default();
        let config = RentEscalationConfig {
            agreement_id: soroban_sdk::String::from_str(&env, "AGR-P1"),
            annual_rate_bps,
            payments_per_year,
            escalation_type: EscalationType::FixedAnnual,
        };
        let rent = calculate_rent_for_period(base_rent, 1, &config);
        prop_assert_eq!(rent, base_rent);
    }

    /// Zero escalation rate keeps rent constant across all periods.
    #[test]
    fn prop_zero_escalation_rate_constant_rent(
        base_rent in 0i128..1_000_000_000i128,
        payment_number in 1u32..=120u32,
        payments_per_year in 1u32..=52u32,
    ) {
        let env = soroban_sdk::Env::default();
        let config = RentEscalationConfig {
            agreement_id: soroban_sdk::String::from_str(&env, "AGR-ZERO"),
            annual_rate_bps: 0,
            payments_per_year,
            escalation_type: EscalationType::FixedAnnual,
        };
        let rent = calculate_rent_for_period(base_rent, payment_number, &config);
        prop_assert_eq!(rent, base_rent);
    }
}

// ─── compute_fee (late fee) invariants ───────────────────────────────────────

proptest! {
    /// Late fee is always non-negative.
    #[test]
    fn prop_late_fee_non_negative(
        base_amount in 0i128..1_000_000_000i128,
        days_late in 0u32..=365u32,
        late_fee_pct in 0u32..=100u32,
        grace_period_days in 0u32..=30u32,
        max_late_fee in 0i128..1_000_000_000i128,
    ) {
        let env = soroban_sdk::Env::default();
        let config = LateFeeConfig {
            agreement_id: soroban_sdk::String::from_str(&env, "AGR-FEE"),
            late_fee_percentage: late_fee_pct,
            grace_period_days,
            max_late_fee,
            compounding: false,
        };
        let fee = compute_fee(&config, base_amount, days_late);
        prop_assert!(fee >= 0, "fee={fee} must be >= 0");
    }

    /// Within the grace period, the late fee is always zero.
    #[test]
    fn prop_within_grace_period_zero_fee(
        base_amount in 0i128..1_000_000_000i128,
        grace_period_days in 1u32..=30u32,
        late_fee_pct in 1u32..=100u32,
    ) {
        let env = soroban_sdk::Env::default();
        let config = LateFeeConfig {
            agreement_id: soroban_sdk::String::from_str(&env, "AGR-GRACE"),
            late_fee_percentage: late_fee_pct,
            grace_period_days,
            max_late_fee: 0,
            compounding: false,
        };
        // days_late == grace_period_days means still within grace (not exceeded)
        let fee = compute_fee(&config, base_amount, grace_period_days);
        prop_assert_eq!(fee, 0, "within grace period fee must be zero");
    }

    /// Late fee never exceeds the configured max_late_fee (when max > 0).
    #[test]
    fn prop_late_fee_capped_at_max(
        base_amount in 1i128..1_000_000_000i128,
        days_late in 30u32..=365u32,
        late_fee_pct in 1u32..=100u32,
        max_late_fee in 1i128..100_000i128,
    ) {
        let env = soroban_sdk::Env::default();
        let config = LateFeeConfig {
            agreement_id: soroban_sdk::String::from_str(&env, "AGR-CAP"),
            late_fee_percentage: late_fee_pct,
            grace_period_days: 0,
            max_late_fee,
            compounding: false,
        };
        let fee = compute_fee(&config, base_amount, days_late);
        prop_assert!(
            fee <= max_late_fee,
            "fee={fee} must be <= max_late_fee={max_late_fee}"
        );
    }

    /// Zero base amount always yields zero fee.
    #[test]
    fn prop_zero_base_amount_zero_fee(
        days_late in 0u32..=365u32,
        late_fee_pct in 0u32..=100u32,
        grace_period_days in 0u32..=30u32,
    ) {
        let env = soroban_sdk::Env::default();
        let config = LateFeeConfig {
            agreement_id: soroban_sdk::String::from_str(&env, "AGR-ZERO"),
            late_fee_percentage: late_fee_pct,
            grace_period_days,
            max_late_fee: 0,
            compounding: false,
        };
        let fee = compute_fee(&config, 0, days_late);
        prop_assert_eq!(fee, 0, "zero base amount must yield zero fee");
    }
}
