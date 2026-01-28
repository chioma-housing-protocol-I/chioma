/// Storage operations for the Escrow contract.
/// Implements single-responsibility getter/setter helpers.
use soroban_sdk::{BytesN, Env, Vec};

use super::types::{DataKey, Escrow, ReleaseApproval};

/// Escrow storage management.
pub struct EscrowStorage;

impl EscrowStorage {
    /// Retrieve an escrow by ID.
    /// Returns None if escrow doesn't exist.
    pub fn get(env: &Env, id: &BytesN<32>) -> Option<Escrow> {
        let key = DataKey::Escrow(id.clone());
        env.storage().persistent().get::<_, Escrow>(&key)
    }

    /// Save or update an escrow.
    /// Updates existing escrow or creates a new one.
    pub fn save(env: &Env, escrow: &Escrow) {
        let key = DataKey::Escrow(escrow.id.clone());
        env.storage().persistent().set(&key, escrow);
    }

    /// Retrieve all approvals for an escrow release.
    /// Returns empty Vec if no approvals exist yet.
    pub fn get_approvals(env: &Env, escrow_id: &BytesN<32>) -> Vec<ReleaseApproval> {
        let key = DataKey::Approvals(escrow_id.clone());
        match env
            .storage()
            .persistent()
            .get::<_, Vec<ReleaseApproval>>(&key)
        {
            Some(approvals) => approvals,
            None => Vec::new(env),
        }
    }

    /// Add a new approval for fund release.
    /// Appends to existing approvals list.
    pub fn add_approval(env: &Env, escrow_id: &BytesN<32>, approval: ReleaseApproval) {
        let mut approvals = Self::get_approvals(env, escrow_id);
        approvals.push_back(approval);
        let key = DataKey::Approvals(escrow_id.clone());
        env.storage().persistent().set(&key, &approvals);
    }

    /// Clear all approvals for an escrow.
    /// Useful when transitioning to a new state (e.g., from Disputed back to Funded).
    pub fn clear_approvals(env: &Env, escrow_id: &BytesN<32>) {
        let key = DataKey::Approvals(escrow_id.clone());
        env.storage().persistent().remove(&key);
    }

    /// Get the current count of escrows created.
    pub fn get_count(env: &Env) -> u32 {
        env.storage()
            .instance()
            .get::<_, u32>(&DataKey::EscrowCount)
            .unwrap_or_default()
    }

    /// Increment escrow counter.
    pub fn increment_count(env: &Env) {
        let count = Self::get_count(env);
        env.storage()
            .instance()
            .set(&DataKey::EscrowCount, &(count + 1));
    }
}
