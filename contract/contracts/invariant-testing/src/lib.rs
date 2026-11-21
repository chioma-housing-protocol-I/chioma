//! Shared building blocks for property-based invariant tests across Chioma
//! contracts.
//!
//! Each contract owns its invariants, but the input domains and the shape of
//! the assertions are the same everywhere. Keeping those pieces here avoids
//! copy-pasted ranges and subtly different checks. See
//! `docs/testing/INVARIANT-TESTING.md` for the conventions.

use proptest::prelude::*;

/// Reusable input domains for invariant tests.
pub mod strategies {
    use super::*;

    /// Stroops amounts, bounded so multiplication by basis points stays safely
    /// inside `i128` for the arithmetic under test.
    pub fn amount() -> impl Strategy<Value = i128> {
        0i128..1_000_000_000_000i128
    }

    /// Non-zero amounts for ratio tests that divide by the amount.
    pub fn positive_amount() -> impl Strategy<Value = i128> {
        1i128..1_000_000_000_000i128
    }

    /// Basis points, inclusive of both 0% and 100%.
    pub fn basis_points() -> impl Strategy<Value = u32> {
        0u32..=10_000u32
    }
}

/// Reusable assertions with a consistent failure message.
pub mod assertions {
    /// Assert a balance or share is never negative.
    pub fn assert_non_negative(value: i128, context: &str) {
        assert!(value >= 0, "{context}: {value} must be >= 0");
    }

    /// Assert that component parts add back up to the original whole.
    pub fn assert_sum_preserved(parts: &[i128], whole: i128, context: &str) {
        let sum: i128 = parts.iter().copied().sum();
        assert_eq!(
            sum, whole,
            "{context}: parts {parts:?} sum to {sum}, expected {whole}"
        );
    }

    /// Assert `upper >= lower`; useful for monotonicity with the inputs
    /// ordered so the expected larger value is passed last.
    pub fn assert_monotonic_non_decreasing(lower: i128, upper: i128, context: &str) {
        assert!(upper >= lower, "{context}: {upper} must be >= {lower}");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    proptest! {
        #[test]
        fn amounts_are_bounded(value in strategies::amount()) {
            assertions::assert_non_negative(value, "amount");
            prop_assert!(value < 1_000_000_000_000);
        }

        #[test]
        fn positive_amounts_are_never_zero(value in strategies::positive_amount()) {
            prop_assert!(value > 0);
        }

        #[test]
        fn basis_points_stay_in_range(value in strategies::basis_points()) {
            prop_assert!(value <= 10_000);
        }
    }

    #[test]
    fn sum_assertion_accepts_a_preserved_whole() {
        assertions::assert_sum_preserved(&[40, 60], 100, "split");
    }

    #[test]
    #[should_panic(expected = "split")]
    fn sum_assertion_rejects_a_lost_amount() {
        assertions::assert_sum_preserved(&[40, 50], 100, "split");
    }
}
