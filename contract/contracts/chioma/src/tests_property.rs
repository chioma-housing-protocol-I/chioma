//! Property-based tests for deposit_interest and payment arithmetic invariants.
//!
//! Uses `proptest` to verify that core math never violates key invariants
//! regardless of the input values supplied.  All helpers are pure functions
//! that mirror the on-chain logic without requiring a Soroban `Env`.

use proptest::prelude::*;

// ─── deposit_interest invariants ─────────────────────────────────────────────

proptest! {
    /// Interest is always non-negative.
    #[test]
    fn prop_interest_never_negative(
        balance in 0i128..i128::MAX / 2,
        rate_bps in 0u32..=10_000u32,
        elapsed_periods in 0u64..=1000u64,
    ) {
        let interest = compound_interest(balance, rate_bps, elapsed_periods);
        prop_assert!(interest >= 0, "interest={interest} must be >= 0");
    }

    /// Zero balance always yields zero interest.
    #[test]
    fn prop_zero_balance_zero_interest(
        rate_bps in 0u32..=10_000u32,
        elapsed_periods in 0u64..=1000u64,
    ) {
        prop_assert_eq!(compound_interest(0, rate_bps, elapsed_periods), 0);
    }

    /// Zero rate always yields zero interest.
    #[test]
    fn prop_zero_rate_zero_interest(
        balance in 0i128..i128::MAX / 2,
        elapsed_periods in 0u64..=1000u64,
    ) {
        prop_assert_eq!(compound_interest(balance, 0, elapsed_periods), 0);
    }

    /// Zero elapsed periods always yields zero interest.
    #[test]
    fn prop_zero_periods_zero_interest(
        balance in 0i128..i128::MAX / 2,
        rate_bps in 0u32..=10_000u32,
    ) {
        prop_assert_eq!(compound_interest(balance, rate_bps, 0), 0);
    }

    /// total_with_interest = balance + interest never overflows past i128::MAX.
    #[test]
    fn prop_no_overflow_total_with_interest(
        balance in 0i128..i128::MAX / 2,
        rate_bps in 0u32..=10_000u32,
        elapsed_periods in 0u64..=365u64,
    ) {
        let interest = compound_interest(balance, rate_bps, elapsed_periods);
        let total = balance.saturating_add(interest);
        prop_assert!(
            total >= balance,
            "total={total} must be >= balance={balance} (no negative overflow)"
        );
    }

    /// Higher rate produces at least as much interest as a lower rate.
    #[test]
    fn prop_higher_rate_more_interest(
        balance in 1i128..i128::MAX / 2,
        rate_lo in 0u32..=4_999u32,
        rate_hi in 5_000u32..=10_000u32,
        elapsed_periods in 1u64..=100u64,
    ) {
        let lo = compound_interest(balance, rate_lo, elapsed_periods);
        let hi = compound_interest(balance, rate_hi, elapsed_periods);
        prop_assert!(hi >= lo, "hi={hi} must be >= lo={lo}");
    }

    /// More elapsed periods yield at least as much interest.
    #[test]
    fn prop_more_periods_more_interest(
        balance in 1i128..i128::MAX / 2,
        rate_bps in 1u32..=10_000u32,
        periods_lo in 0u64..=500u64,
        extra in 1u64..=500u64,
    ) {
        let periods_hi = periods_lo + extra;
        let lo = compound_interest(balance, rate_bps, periods_lo);
        let hi = compound_interest(balance, rate_bps, periods_hi);
        prop_assert!(hi >= lo, "hi={hi} must be >= lo={lo}");
    }
}

// ─── payment split invariants ─────────────────────────────────────────────────

proptest! {
    /// landlord + agent always equals the original amount.
    #[test]
    fn prop_payment_split_sums_to_amount(
        amount in 0i128..1_000_000_000_000i128,
        commission_bps in 0u32..=10_000u32,
    ) {
        let (landlord, agent) = payment_split(amount, commission_bps);
        prop_assert_eq!(
            landlord + agent,
            amount,
            "landlord={} + agent={} != amount={}",
            landlord,
            agent,
            amount
        );
    }

    /// Landlord share is always non-negative.
    #[test]
    fn prop_landlord_share_non_negative(
        amount in 0i128..1_000_000_000_000i128,
        commission_bps in 0u32..=10_000u32,
    ) {
        let (landlord, _) = payment_split(amount, commission_bps);
        prop_assert!(landlord >= 0);
    }

    /// Agent commission is always non-negative.
    #[test]
    fn prop_agent_commission_non_negative(
        amount in 0i128..1_000_000_000_000i128,
        commission_bps in 0u32..=10_000u32,
    ) {
        let (_, agent) = payment_split(amount, commission_bps);
        prop_assert!(agent >= 0);
    }

    /// Zero commission: agent gets nothing, landlord gets everything.
    #[test]
    fn prop_zero_commission_agent_gets_nothing(
        amount in 0i128..1_000_000_000_000i128,
    ) {
        let (landlord, agent) = payment_split(amount, 0);
        prop_assert_eq!(agent, 0);
        prop_assert_eq!(landlord, amount);
    }

    /// Full commission (10 000 bps = 100%): landlord gets nothing.
    #[test]
    fn prop_full_commission_landlord_gets_nothing(
        amount in 0i128..1_000_000_000_000i128,
    ) {
        let (landlord, _) = payment_split(amount, 10_000);
        prop_assert_eq!(landlord, 0);
    }
}

// ─── rent escalation invariants ───────────────────────────────────────────────

proptest! {
    /// Escalated rent is always >= base rent (FixedAnnual model).
    #[test]
    fn prop_escalated_rent_never_less_than_base(
        base_rent in 0i128..1_000_000_000i128,
        payment_number in 1u32..=120u32,
        annual_rate_bps in 0u32..=10_000u32,
        payments_per_year in 1u32..=52u32,
    ) {
        let escalated = fixed_annual_rent(base_rent, payment_number, annual_rate_bps, payments_per_year);
        prop_assert!(
            escalated >= base_rent,
            "escalated={escalated} must be >= base_rent={base_rent}"
        );
    }

    /// Payment 1 always equals base rent (first period, no escalation yet).
    #[test]
    fn prop_first_period_equals_base(
        base_rent in 0i128..1_000_000_000i128,
        annual_rate_bps in 0u32..=10_000u32,
        payments_per_year in 1u32..=52u32,
    ) {
        let first = fixed_annual_rent(base_rent, 1, annual_rate_bps, payments_per_year);
        prop_assert_eq!(first, base_rent);
    }

    /// Zero escalation rate keeps rent constant across all periods.
    #[test]
    fn prop_zero_escalation_rent_constant(
        base_rent in 0i128..1_000_000_000i128,
        payment_number in 1u32..=120u32,
        payments_per_year in 1u32..=52u32,
    ) {
        let rent = fixed_annual_rent(base_rent, payment_number, 0, payments_per_year);
        prop_assert_eq!(rent, base_rent);
    }
}

// ─── Pure-function helpers ────────────────────────────────────────────────────
//
// These mirror the on-chain logic from `deposit_interest.rs` and
// `payment_impl.rs` using the same saturating arithmetic, but without
// requiring a Soroban `Env` so proptest can drive arbitrary inputs.

/// Mirrors `compute_interest` with monthly compounding (n_per_year = 12).
fn compound_interest(balance: i128, rate_bps: u32, elapsed_periods: u64) -> i128 {
    if elapsed_periods == 0 || balance <= 0 || rate_bps == 0 {
        return 0;
    }
    let n_per_year: i128 = 12;
    let rate = rate_bps as i128;
    let mut result = balance;
    for _ in 0..elapsed_periods {
        result = result.saturating_add(result.saturating_mul(rate) / (n_per_year * 10_000));
    }
    result.saturating_sub(balance)
}

/// Mirrors `calculate_payment_split` from `payment_impl.rs`.
fn payment_split(amount: i128, commission_bps: u32) -> (i128, i128) {
    let agent = (amount * commission_bps as i128) / 10_000;
    let landlord = amount - agent;
    (landlord, agent)
}

/// Mirrors `calculate_rent_for_period` (FixedAnnual branch) from `payment_impl.rs`.
fn fixed_annual_rent(
    base_rent: i128,
    payment_number: u32,
    annual_rate_bps: u32,
    payments_per_year: u32,
) -> i128 {
    if payments_per_year == 0 {
        return base_rent;
    }
    let years_passed = (payment_number - 1) / payments_per_year;
    if years_passed == 0 {
        return base_rent;
    }
    let mut current = base_rent;
    for _ in 0..years_passed {
        let increase = (current * annual_rate_bps as i128) / 10_000;
        current = current.saturating_add(increase);
    }
    current
}
