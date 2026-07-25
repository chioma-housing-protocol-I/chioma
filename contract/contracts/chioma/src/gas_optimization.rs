//! Gas optimization utilities for the Chioma contract.
//!
//! Provides benchmarking structs and helper functions to estimate, track, and
//! reduce the computational cost of on-chain operations.
//!
//! Resolves: https://github.com/chioma-housing-protocol-I/chioma/issues/478

use soroban_sdk::{contracttype, Env, String, Vec};

use crate::errors::RentalError;
use crate::storage::DataKey;

// ─── Gas Metrics ─────────────────────────────────────────────────────────────

/// Tracks gas usage statistics for a named operation.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GasMetrics {
    /// Human-readable operation name (e.g. "make_payment_with_token").
    pub operation: String,
    /// Estimated average gas units consumed.
    pub average_gas: u64,
    /// Minimum observed gas units.
    pub min_gas: u64,
    /// Maximum observed gas units.
    pub max_gas: u64,
    /// Estimated optimisation potential as a percentage (0–100).
    pub optimization_potential: u32,
}

/// A concrete suggestion for reducing gas on a given operation.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OptimizationSuggestion {
    pub operation: String,
    pub suggestion: String,
    pub estimated_savings_percent: u32,
}

/// Logical operation identifiers used for gas estimation.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum OperationType {
    CreateAgreement,
    MakePayment,
    ReleaseEscrow,
    ResolveDispute,
    ProposeExtension,
}

// ─── Public API ───────────────────────────────────────────────────────────────

/// Return a static gas-cost estimate for the given operation type.
///
/// Values are conservative upper-bound estimates based on the number of
/// storage reads/writes each operation performs.
pub fn estimate_gas_cost(env: Env, operation: OperationType) -> Result<u64, RentalError> {
    // Each persistent storage read ≈ 5 000 gas units (Soroban approximation).
    // Each persistent storage write ≈ 10 000 gas units.
    // Token transfer (cross-contract call) ≈ 25 000 gas units.
    let estimate = match operation {
        OperationType::CreateAgreement => {
            // 1 duplicate-check read + 1 write + 1 TTL extend + 1 counter r/w
            5_000u64 + 10_000 + 2_000 + 5_000 + 10_000
        }
        OperationType::MakePayment => {
            // 1 agreement read + optional token-rate read + 1 token transfer
            // + 1 payment-record write + 1 agreement write + 2 TTL extends
            5_000u64 + 5_000 + 25_000 + 10_000 + 10_000 + 4_000
        }
        OperationType::ReleaseEscrow => {
            // 1 agreement read + 1 frozen-flag read + 1 token balance read
            // + 1 token transfer + 1 event
            5_000u64 + 5_000 + 5_000 + 25_000 + 1_000
        }
        OperationType::ResolveDispute => {
            // 2 reads + 1 write + 1 token transfer + 1 event
            10_000u64 + 10_000 + 25_000 + 1_000
        }
        OperationType::ProposeExtension => {
            // 1 agreement read + 1 extension write + 1 history r/w + 1 event
            5_000u64 + 10_000 + 5_000 + 10_000 + 1_000
        }
    };

    // Persist the estimate so get_gas_metrics can surface it.
    let op_name = operation_name(&env, &operation);
    let metrics = GasMetrics {
        operation: op_name.clone(),
        average_gas: estimate,
        min_gas: estimate.saturating_sub(estimate / 5),
        max_gas: estimate + estimate / 5,
        optimization_potential: optimization_potential_for(&operation),
    };
    // Use the operation name string directly as the storage key.
    env.storage()
        .instance()
        .set(&DataKey::GasMetrics(op_name), &metrics);

    Ok(estimate)
}

/// Return all persisted gas metrics.
pub fn get_gas_metrics(env: Env) -> Result<Vec<GasMetrics>, RentalError> {
    let ops = [
        OperationType::CreateAgreement,
        OperationType::MakePayment,
        OperationType::ReleaseEscrow,
        OperationType::ResolveDispute,
        OperationType::ProposeExtension,
    ];

    let mut result = Vec::new(&env);
    for op in ops.iter() {
        let op_name = operation_name(&env, op);
        if let Some(m) = env
            .storage()
            .instance()
            .get::<DataKey, GasMetrics>(&DataKey::GasMetrics(op_name))
        {
            result.push_back(m);
        }
    }
    Ok(result)
}

/// Return a concrete optimisation suggestion for the given operation.
pub fn optimize_operation(
    env: Env,
    operation: OperationType,
) -> Result<OptimizationSuggestion, RentalError> {
    let op_name = operation_name(&env, &operation);
    let (suggestion_text, savings) = match operation {
        OperationType::CreateAgreement => (
            "Batch input validation into a single pass; avoid re-reading AgreementCount before incrementing.",
            15u32,
        ),
        OperationType::MakePayment => (
            "Cache the agreement struct locally to avoid a second storage read on write-back; skip token-rate lookup when payment token matches agreement token.",
            25u32,
        ),
        OperationType::ReleaseEscrow => (
            "Combine the frozen-flag check and balance read into a single storage access path; skip transfer when balance is zero.",
            20u32,
        ),
        OperationType::ResolveDispute => (
            "Minimise state transitions by resolving in a single write; cache arbiter data in instance storage.",
            20u32,
        ),
        OperationType::ProposeExtension => (
            "Append to extension history in-place rather than reading the full Vec, modifying it, and writing it back.",
            15u32,
        ),
    };

    Ok(OptimizationSuggestion {
        operation: op_name,
        suggestion: String::from_str(&env, suggestion_text),
        estimated_savings_percent: savings,
    })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn operation_name(env: &Env, op: &OperationType) -> String {
    match op {
        OperationType::CreateAgreement => String::from_str(env, "create_agreement"),
        OperationType::MakePayment => String::from_str(env, "make_payment_with_token"),
        OperationType::ReleaseEscrow => String::from_str(env, "release_escrow_with_token"),
        OperationType::ResolveDispute => String::from_str(env, "resolve_dispute"),
        OperationType::ProposeExtension => String::from_str(env, "propose_extension"),
    }
}

fn optimization_potential_for(op: &OperationType) -> u32 {
    match op {
        OperationType::CreateAgreement => 15,
        OperationType::MakePayment => 25,
        OperationType::ReleaseEscrow => 20,
        OperationType::ResolveDispute => 20,
        OperationType::ProposeExtension => 15,
    }
}
